"""Extract prompt/response fields from EvalScope jsonl rows (1.5 input string, 1.6+ messages)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional


def _message_content(msg: Dict[str, Any]) -> str:
    content = msg.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "text" and part.get("text"):
                parts.append(str(part["text"]))
            elif "text" in part:
                parts.append(str(part["text"]))
        return "\n".join(parts)
    if content is None:
        return ""
    return str(content)


def _format_messages_as_prompt(messages: List[Any]) -> str:
    system_parts: List[str] = []
    user_parts: List[str] = []
    for item in messages:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or "").lower()
        text = _message_content(item).strip()
        if not text:
            continue
        if role == "system":
            system_parts.append(text)
        elif role == "user":
            user_parts.append(text)
    if system_parts and user_parts:
        system_block = "\n\n".join(system_parts)
        user_block = "\n\n".join(user_parts)
        return f"**System**: {system_block}\n\n**User**: {user_block}"
    if user_parts:
        return "\n\n".join(user_parts)
    if system_parts:
        return "\n\n".join(system_parts)
    return ""


def extract_prompt_from_sample(sample_data: Dict[str, Any]) -> str:
    """Prompt text for DB/UI; supports legacy ``input`` and EvalScope 1.6 ``messages``."""
    inp = sample_data.get("input")
    if isinstance(inp, str) and inp.strip():
        return inp
    if isinstance(inp, list) and inp:
        return _format_messages_as_prompt(inp)
    messages = sample_data.get("messages")
    if isinstance(messages, list) and messages:
        return _format_messages_as_prompt(messages)
    return ""


def extract_response_from_sample(sample_data: Dict[str, Any], fallback: str = "") -> str:
    if fallback and str(fallback).strip():
        return str(fallback).strip()

    messages = sample_data.get("messages")
    if isinstance(messages, list):
        for item in reversed(messages):
            if not isinstance(item, dict):
                continue
            if str(item.get("role") or "").lower() == "assistant":
                text = _message_content(item).strip()
                if text:
                    return text

    model_output = sample_data.get("model_output")
    if isinstance(model_output, dict):
        choices = model_output.get("choices")
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                message = first.get("message")
                if isinstance(message, dict):
                    text = _message_content(message).strip()
                    if text:
                        return text
        completion = model_output.get("completion")
        if completion is not None and str(completion).strip():
            return str(completion).strip()

    for key in ("prediction", "output"):
        val = sample_data.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return ""
