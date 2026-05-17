# -*- coding: utf-8 -*-
"""
Single-sample retry service.

Re-invokes the target model for a specific SampleResult, optionally re-judges
the new response, and updates the database in place while preserving history.
"""
import asyncio
import copy
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.model_config import ModelConfig
from app.models.result import Result, SampleResult
from app.models.task import Task

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Prompt parsing
# ------------------------------------------------------------------

def parse_system_and_user(prompt: str) -> Tuple[str, str]:
    """Split a stored prompt into system and user parts.

    EvalScope safety datasets format:
        **System**: <system prompt> **User**: <user prompt>
    Falls back to a simple ``\\n\\n`` split when the markers are absent.
    """
    m = re.search(r"\*\*System\*\*:\s*([\s\S]*?)\*\*User\*\*:\s*([\s\S]*)$", prompt)
    if m:
        return (m.group(1) or "").strip(), (m.group(2) or "").strip()

    parts = prompt.split("\n\n", 1)
    if len(parts) == 2 and len(parts[0].strip()) > 0:
        return parts[0].strip(), parts[1].strip()
    return "", prompt.strip()


def build_messages(system: str, user: str) -> List[Dict[str, str]]:
    msgs: List[Dict[str, str]] = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.append({"role": "user", "content": user})
    return msgs


# ------------------------------------------------------------------
# Model invocation
# ------------------------------------------------------------------

async def call_openai_model(
    api_url: str,
    api_key: Optional[str],
    model_id: str,
    messages: List[Dict[str, str]],
    generation_config: Optional[Dict[str, Any]] = None,
) -> str:
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if api_key and api_key != "EMPTY":
        headers["Authorization"] = f"Bearer {api_key}"

    chat_url = api_url.rstrip("/")
    if chat_url.endswith("/v1"):
        chat_url = f"{chat_url}/chat/completions"
    elif not chat_url.endswith("/chat/completions"):
        chat_url = f"{chat_url}/v1/chat/completions"

    payload: Dict[str, Any] = {
        "model": model_id,
        "messages": messages,
    }
    if generation_config:
        for k in ("temperature", "max_tokens", "top_p"):
            if k in generation_config and generation_config[k] is not None:
                payload[k] = generation_config[k]

    async with httpx.AsyncClient() as client:
        resp = await client.post(chat_url, headers=headers, json=payload, timeout=120.0)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def call_custom_model(
    api_url: str,
    api_key: Optional[str],
    model_id: str,
    messages: List[Dict[str, str]],
    custom_api_config: Dict[str, Any],
    generation_config: Optional[Dict[str, Any]] = None,
) -> str:
    from app.services.custom_model_adapter import safe_render_template, extract_by_path

    cfg = custom_api_config
    gen = generation_config or {}

    prompt_text = "\n".join(f"{m['role']}: {m['content']}" for m in messages)
    last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    system_text = "\n".join(m["content"] for m in messages if m["role"] == "system")

    mapping = cfg.get("message_mapping", {})
    role_field = mapping.get("role_field", "role")
    content_field = mapping.get("content_field", "content")
    role_mapping = mapping.get("role_mapping", {})
    mapped = []
    for m in messages:
        mapped.append({
            role_field: role_mapping.get(m["role"], m["role"]),
            content_field: m["content"],
        })

    template_vars: Dict[str, Any] = {
        "prompt": prompt_text,
        "system_prompt": system_text,
        "user_prompt": last_user,
        "messages_json": json.dumps(mapped, ensure_ascii=False),
        "model": model_id,
        "max_tokens": gen.get("max_tokens", 2048),
        "temperature": gen.get("temperature", 0.7),
        "top_p": gen.get("top_p", 1.0),
        "top_k": gen.get("top_k", 50),
    }

    body_template = cfg.get("request_body_template", '{"prompt":"{{ prompt }}","model":"{{ model }}"}')
    rendered = safe_render_template(body_template, template_vars)
    try:
        request_body = json.loads(rendered)
    except json.JSONDecodeError:
        request_body = rendered

    headers: Dict[str, str] = {"Content-Type": "application/json"}
    extra_headers = cfg.get("request_headers")
    if isinstance(extra_headers, dict):
        headers.update(extra_headers)

    auth_type = cfg.get("auth_type", "bearer")
    key = api_key or ""
    if key and key != "EMPTY":
        if auth_type == "bearer":
            headers["Authorization"] = f"Bearer {key}"
        elif auth_type == "custom_header":
            headers[cfg.get("auth_header_name", "X-Api-Key")] = key

    method = cfg.get("request_method", "POST").upper()
    url = api_url.rstrip("/")

    if auth_type == "query_param" and key and key != "EMPTY":
        param_name = cfg.get("auth_query_param_name", "key")
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}{param_name}={key}"

    async with httpx.AsyncClient() as client:
        resp = await client.request(
            method, url, headers=headers,
            json=request_body if isinstance(request_body, dict) else None,
            content=request_body if not isinstance(request_body, dict) else None,
            timeout=120.0,
        )
        resp.raise_for_status()

    response_type = cfg.get("response_type", "json")
    if response_type == "text":
        return resp.text.strip()

    data = resp.json()
    content_path = cfg.get("response_content_path", "")
    if content_path:
        return str(extract_by_path(data, content_path))
    return json.dumps(data, ensure_ascii=False)


# ------------------------------------------------------------------
# Judge invocation
# ------------------------------------------------------------------

async def call_judge_model(
    judge_args: Dict[str, Any],
    prompt: str,
    response: str,
    reference: str,
) -> Tuple[float, str, str]:
    """Call the judge model via EvalScope's ``LLMJudge`` and return
    ``(score, is_passed, explanation)``.

    By delegating to ``LLMJudge`` we guarantee the same prompt template,
    score extraction and scoring logic as the original EvalScope evaluation.
    """
    model_id = judge_args.get("model_id", "")
    api_url = judge_args.get("api_url", "")

    if not api_url or not model_id:
        return simple_score(response, reference)

    _, user_query = parse_system_and_user(prompt)

    judge_kwargs: Dict[str, Any] = {
        "model_id": model_id,
        "api_url": api_url,
    }
    for key in ("api_key", "system_prompt", "prompt_template", "score_type",
                "score_pattern", "score_mapping", "generation_config", "model_args"):
        if key in judge_args:
            judge_kwargs[key] = judge_args[key]

    def _run_judge() -> Tuple[float, str]:
        from evalscope.metrics import LLMJudge

        llm_judge = LLMJudge(**judge_kwargs)
        judge_prompt = llm_judge.build_prompt(
            pred=response,
            gold=reference,
            question=user_query,
        )
        judge_response = llm_judge.judge(judge_prompt)
        judge_score = llm_judge.get_score(judge_response)
        return judge_score, judge_response

    score, raw_judge_text = await asyncio.to_thread(_run_judge)

    explanation = f"LLM judge: {raw_judge_text}"
    is_passed = "passed" if score > 0 else "failed"
    return score, is_passed, explanation


# ------------------------------------------------------------------
# Simple scoring (no judge)
# ------------------------------------------------------------------

def simple_score(response: str, reference: str) -> Tuple[float, str, str]:
    if not reference:
        return 0.0, "unknown", ""

    resp_clean = response.strip().lower()
    ref_clean = reference.strip().lower()

    if resp_clean == ref_clean:
        return 1.0, "passed", "Exact match"

    ref_letter = re.search(r"^[A-Da-d]$", ref_clean)
    if ref_letter:
        resp_letter = re.search(r"\b([A-Da-d])\b", resp_clean)
        if resp_letter and resp_letter.group(1).lower() == ref_clean:
            return 1.0, "passed", f"Answer letter match: {ref_clean.upper()}"
        return 0.0, "failed", f"Expected {ref_clean.upper()}, got: {response[:100]}"

    if ref_clean in resp_clean:
        return 1.0, "passed", "Reference found in response"

    return 0.0, "failed", "No match with reference"


# ------------------------------------------------------------------
# Aggregate score recalculation
# ------------------------------------------------------------------

def recalculate_result_score(db: Session, result: Result) -> None:
    samples = db.query(SampleResult).filter(SampleResult.result_id == result.id).all()
    if not samples:
        return

    total = len(samples)
    passed = sum(1 for s in samples if s.is_passed == "passed")
    avg_score = sum(s.score or 0.0 for s in samples) / total

    result.score = avg_score

    if result.metrics and isinstance(result.metrics, dict):
        result.metrics = {**result.metrics, "retry_recalculated": True}

    db.flush()


# ------------------------------------------------------------------
# Judge config resolution
# ------------------------------------------------------------------

def _resolve_judge_args(config: Dict[str, Any], db: Session) -> Optional[Dict[str, Any]]:
    """Build a flat judge_args dict from the task config.

    The frontend stores judge config under ``config.judge_model`` (a nested
    dict with ``model_config_id``, ``model_id``, ``api_url``, etc.).
    EvalScope's ``evalscope.py`` transforms this into ``task_cfg['judge_model_args']``
    at runtime but does NOT persist the transformed version back to ``task.config``.

    This helper mirrors that transformation so the retry path can call the
    judge model correctly.

    Also supports the legacy ``config.judge_model_args`` key in case it
    was persisted by an older code path.
    """
    legacy = config.get("judge_model_args")
    if isinstance(legacy, dict) and legacy.get("model_id") and legacy.get("api_url"):
        return legacy

    judge_model = config.get("judge_model")
    if not isinstance(judge_model, dict) or not judge_model.get("model_id"):
        return None

    args: Dict[str, Any] = {}
    args["model_id"] = judge_model.get("model_id", "")

    model_config_id = judge_model.get("model_config_id")
    db_api_url: Optional[str] = None
    db_api_key: Optional[str] = None
    if model_config_id:
        judge_obj = db.query(ModelConfig).filter(ModelConfig.id == model_config_id).first()
        if judge_obj:
            args["model_id"] = judge_obj.evalscope_model_id
            db_api_url = judge_obj.api_url
            db_api_key = judge_obj.api_key

    args["api_url"] = judge_model.get("api_url") or db_api_url or ""
    api_key = judge_model.get("api_key") or db_api_key
    if api_key and api_key != "EMPTY":
        args["api_key"] = api_key

    for field in ("system_prompt", "prompt_template", "score_type", "score_pattern",
                  "score_mapping", "generation_config", "model_args"):
        val = judge_model.get(field)
        if val:
            args[field] = val

    return args if args.get("api_url") else None


# ------------------------------------------------------------------
# Main retry function
# ------------------------------------------------------------------

async def retry_single_sample(
    sample: SampleResult,
    result: Result,
    task: Task,
    db: Session,
) -> SampleResult:
    config = task.config or {}

    model_id_pk = config.get("model_id")
    evalscope_model_id = config.get("model")
    api_url = config.get("api_url")
    api_key = config.get("api_key")
    generation_config = config.get("generation_config")
    is_custom = False
    custom_api_config: Optional[Dict[str, Any]] = None

    if model_id_pk:
        model_obj = db.query(ModelConfig).filter(ModelConfig.id == model_id_pk).first()
        if not model_obj:
            raise ValueError("模型配置不存在或已被删除，无法重试")
        evalscope_model_id = model_obj.evalscope_model_id
        api_url = model_obj.api_url
        api_key = model_obj.api_key
        if getattr(model_obj, "api_protocol", "openai") == "custom":
            is_custom = True
            custom_api_config = model_obj.custom_api_config or {}
        if model_obj.generation_config and not generation_config:
            generation_config = model_obj.generation_config

    if not api_url:
        raise ValueError("模型未配置 API 地址，无法重试")

    system, user = parse_system_and_user(sample.prompt or "")
    messages = build_messages(system, user)

    old_explanation = ""
    old_raw = sample.raw_data or {}
    old_ss = old_raw.get("sample_score", {})
    if isinstance(old_ss, dict):
        old_inner = old_ss.get("score", {})
        if isinstance(old_inner, dict):
            old_explanation = old_inner.get("explanation", "")

    old_record = {
        "response": sample.response,
        "score": sample.score,
        "is_passed": sample.is_passed,
        "explanation": old_explanation,
        "retried_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info("Retrying sample %s via %s model %s", sample.id, "custom" if is_custom else "openai", evalscope_model_id)

    if is_custom:
        new_response = await call_custom_model(
            api_url=api_url,
            api_key=api_key,
            model_id=evalscope_model_id or "",
            messages=messages,
            custom_api_config=custom_api_config or {},
            generation_config=generation_config,
        )
    else:
        new_response = await call_openai_model(
            api_url=api_url,
            api_key=api_key,
            model_id=evalscope_model_id or "",
            messages=messages,
            generation_config=generation_config,
        )

    judge_args = _resolve_judge_args(config, db)
    if judge_args and judge_args.get("model_id") and judge_args.get("api_url"):
        logger.info("Retrying sample %s with judge model %s", sample.id, judge_args.get("model_id"))
        new_score, new_is_passed, explanation = await call_judge_model(
            judge_args=judge_args,
            prompt=sample.prompt or "",
            response=new_response,
            reference=sample.reference or "",
        )
    else:
        new_score, new_is_passed, explanation = simple_score(
            new_response, sample.reference or ""
        )

    raw_data = copy.deepcopy(sample.raw_data) if sample.raw_data else {}
    history: list = raw_data.get("retry_history", [])
    history.append(old_record)
    raw_data["retry_history"] = history

    if explanation:
        score_obj = raw_data.get("sample_score", {})
        if isinstance(score_obj, dict):
            inner = score_obj.get("score", {})
            if isinstance(inner, dict):
                inner["explanation"] = explanation
                inner["prediction"] = new_response
                score_obj["score"] = inner
            raw_data["sample_score"] = score_obj
        else:
            raw_data["retry_explanation"] = explanation

    sample.response = new_response
    sample.score = new_score
    sample.is_passed = new_is_passed
    sample.retry_count = (sample.retry_count or 0) + 1
    sample.raw_data = raw_data
    flag_modified(sample, "raw_data")

    db.flush()

    recalculate_result_score(db, result)
    db.commit()
    db.refresh(sample)

    logger.info(
        "Sample %s retry completed: score=%.2f is_passed=%s retry_count=%d",
        sample.id, new_score, new_is_passed, sample.retry_count,
    )
    return sample


# ------------------------------------------------------------------
# Promote a historical version to current
# ------------------------------------------------------------------

def promote_history_version(
    sample: SampleResult,
    result: Result,
    history_index: int,
    db: Session,
) -> SampleResult:
    """Swap a historical version into the current slot.

    The current response is placed back into ``retry_history`` at the
    position the promoted entry occupied so that no data is lost.
    """
    raw_data = copy.deepcopy(sample.raw_data) if sample.raw_data else {}
    history: list = raw_data.get("retry_history", [])

    if history_index < 0 or history_index >= len(history):
        raise ValueError(f"history_index {history_index} 超出范围 (0..{len(history) - 1})")

    selected = history[history_index]
    if not isinstance(selected, dict):
        raise ValueError("历史记录格式异常")

    cur_explanation = ""
    cur_ss = raw_data.get("sample_score", {})
    if isinstance(cur_ss, dict):
        cur_inner = cur_ss.get("score", {})
        if isinstance(cur_inner, dict):
            cur_explanation = cur_inner.get("explanation", "")

    current_snapshot = {
        "response": sample.response,
        "score": sample.score,
        "is_passed": sample.is_passed,
        "explanation": cur_explanation,
        "retried_at": datetime.now(timezone.utc).isoformat(),
    }

    history[history_index] = current_snapshot
    raw_data["retry_history"] = history

    promoted_explanation = selected.get("explanation", "")
    if promoted_explanation:
        ss = raw_data.get("sample_score", {})
        if isinstance(ss, dict):
            inner = ss.get("score", {})
            if isinstance(inner, dict):
                inner["explanation"] = promoted_explanation
                ss["score"] = inner
            raw_data["sample_score"] = ss

    sample.response = selected.get("response", "")
    sample.score = selected.get("score")
    sample.is_passed = selected.get("is_passed")
    sample.raw_data = raw_data
    flag_modified(sample, "raw_data")

    db.flush()
    recalculate_result_score(db, result)
    db.commit()
    db.refresh(sample)

    logger.info("Sample %s promoted history[%d] to current", sample.id, history_index)
    return sample
