# -*- coding: utf-8 -*-
"""
Custom HTTP Model Adapter for EvalScope.

Implements EvalScope's ModelAPI interface to support non-OpenAI HTTP REST APIs
via configurable Jinja2 request templates, message field mapping, and response
path extraction.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional

import requests
from jinja2.sandbox import ImmutableSandboxedEnvironment

from evalscope.api.messages import ChatMessage
from evalscope.api.model import GenerateConfig, ModelAPI, ModelOutput
from evalscope.api.registry import register_model_api
from evalscope.api.tool import ToolChoice, ToolInfo

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Jinja2 sandboxed environment (shared, stateless, thread-safe)
# ---------------------------------------------------------------------------
_sandbox_env = ImmutableSandboxedEnvironment(
    autoescape=False,
    keep_trailing_newline=False,
    extensions=[],
)

_DANGEROUS_PATTERN = re.compile(
    r"__\w+__|"                    # dunder attributes (__class__, __mro__, ...)
    r"\battr\s*\(|"                # attr() filter used to bypass attribute restrictions
    r"\bgetattr\s*\(|"            # getattr() call
    r"\bsetattr\s*\(|"            # setattr() call
    r"\bimport\b|"                # import statements
    r"\bos\b|"                    # os module access
    r"\bsubprocess\b|"            # subprocess module
    r"\beval\s*\(|"               # eval()
    r"\bexec\s*\(|"               # exec()
    r"\bopen\s*\(|"               # open()
    r"\bcompile\s*\(|"            # compile()
    r"\bglobals\s*\(|"            # globals()
    r"\blocals\s*\(",             # locals()
    re.IGNORECASE,
)


def validate_template(template_str: str) -> None:
    """Raise ValueError if template contains suspicious patterns.

    This is a defense-in-depth check on top of SandboxedEnvironment.
    The sandbox already blocks attribute access, but we reject obviously
    malicious templates early so users get a clear error instead of
    a cryptic sandbox SecurityError at render time.
    """
    match = _DANGEROUS_PATTERN.search(template_str)
    if match:
        raise ValueError(
            f"Template contains forbidden pattern: '{match.group()}'. "
            "Dunder attributes, import, eval/exec, and OS-level functions are not allowed."
        )


def safe_render_template(template_str: str, variables: Dict[str, Any]) -> str:
    """Render a Jinja2 template inside an immutable sandbox with pre-validation."""
    validate_template(template_str)
    tpl = _sandbox_env.from_string(template_str)
    return tpl.render(**variables)

DEFAULT_BODY_TEMPLATE = '{ "prompt": "{{ prompt }}", "model": "{{ model }}" }'
DEFAULT_MESSAGE_MAPPING = {
    "role_field": "role",
    "content_field": "content",
    "role_mapping": {
        "system": "system",
        "user": "user",
        "assistant": "assistant",
    },
}


def extract_by_path(data: Any, path: str) -> Any:
    """Extract a value from nested dict/list using dot-separated path with array index support.

    Examples:
        "text"                       -> data["text"]
        "data.result.text"           -> data["data"]["result"]["text"]
        "outputs.0.text"             -> data["outputs"][0]["text"]
        "choices.0.message.content"  -> data["choices"][0]["message"]["content"]
    """
    for key in path.split("."):
        if isinstance(data, list):
            data = data[int(key)]
        elif isinstance(data, dict):
            data = data[key]
        else:
            raise ValueError(f"Cannot traverse into {type(data)} with key '{key}'")
    return data


@register_model_api(name="custom_api")
class CustomHttpModelAPI(ModelAPI):
    """Generic HTTP adapter driven by user-supplied configuration."""

    def __init__(
        self,
        model_name: str,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        config: GenerateConfig = GenerateConfig(),
        **model_args: Dict[str, Any],
    ) -> None:
        super().__init__(model_name, base_url, api_key, config)
        self.custom_config: Dict[str, Any] = model_args.get("custom_api_config", {})
        self.model_args = model_args
        self._session = requests.Session()

    # ------------------------------------------------------------------
    # Public API required by EvalScope
    # ------------------------------------------------------------------

    def generate(
        self,
        input: List[ChatMessage],
        tools: List[ToolInfo],
        tool_choice: ToolChoice,
        config: GenerateConfig,
    ) -> ModelOutput:
        template_vars = self._build_template_vars(input, config)

        body_template = self.custom_config.get("request_body_template", DEFAULT_BODY_TEMPLATE)
        rendered_body = self._render_template(body_template, template_vars)

        try:
            request_body = json.loads(rendered_body)
        except json.JSONDecodeError:
            request_body = rendered_body

        headers = self._build_headers()
        method = self.custom_config.get("request_method", "POST").upper()
        url = self.base_url or ""

        logger.debug("CustomHttpModelAPI request: %s %s body=%s", method, url, rendered_body[:500])

        try:
            resp = self._session.request(
                method=method,
                url=url,
                headers=headers,
                json=request_body if isinstance(request_body, dict) else None,
                data=request_body if not isinstance(request_body, dict) else None,
                timeout=60,
            )
            resp.raise_for_status()
        except requests.RequestException as exc:
            logger.error("Custom API request failed: %s", exc)
            return ModelOutput.from_content(model=self.model_name, content=f"[ERROR] {exc}")

        content = self._extract_response(resp)
        return ModelOutput.from_content(model=self.model_name, content=content)

    # ------------------------------------------------------------------
    # Template variable construction
    # ------------------------------------------------------------------

    def _build_template_vars(
        self, messages: List[ChatMessage], config: GenerateConfig
    ) -> Dict[str, Any]:
        input_format = self.custom_config.get("input_format", "prompt")

        system_parts: List[str] = []
        user_parts: List[str] = []
        all_parts: List[str] = []
        last_user_content = ""

        for msg in messages:
            role = getattr(msg, "role", "user")
            content = getattr(msg, "content", str(msg))
            all_parts.append(f"{role}: {content}")
            if role == "system":
                system_parts.append(content)
            elif role == "user":
                user_parts.append(content)
                last_user_content = content

        separator = self.custom_config.get("message_separator", "\n")
        prompt_text = separator.join(all_parts)

        mapped_messages = self._apply_message_mapping(messages)
        messages_json = json.dumps(mapped_messages, ensure_ascii=False)

        gen_cfg = config.__dict__ if hasattr(config, "__dict__") else {}
        vars_dict: Dict[str, Any] = {
            "prompt": prompt_text,
            "system_prompt": "\n".join(system_parts),
            "user_prompt": last_user_content,
            "messages_json": messages_json,
            "model": self.model_name,
            "max_tokens": gen_cfg.get("max_tokens") or gen_cfg.get("max_new_tokens") or 2048,
            "temperature": gen_cfg.get("temperature", 0.7),
            "top_p": gen_cfg.get("top_p", 1.0),
            "top_k": gen_cfg.get("top_k", 50),
        }
        return vars_dict

    # ------------------------------------------------------------------
    # Message field mapping
    # ------------------------------------------------------------------

    def _apply_message_mapping(self, messages: List[ChatMessage]) -> List[Dict[str, str]]:
        mapping = self.custom_config.get("message_mapping", DEFAULT_MESSAGE_MAPPING)
        role_field = mapping.get("role_field", "role")
        content_field = mapping.get("content_field", "content")
        role_mapping = mapping.get("role_mapping", {})

        result = []
        for msg in messages:
            role = getattr(msg, "role", "user")
            content = getattr(msg, "content", str(msg))
            mapped_role = role_mapping.get(role, role)
            result.append({role_field: mapped_role, content_field: content})
        return result

    # ------------------------------------------------------------------
    # Jinja2 template rendering (sandboxed)
    # ------------------------------------------------------------------

    @staticmethod
    def _render_template(template_str: str, variables: Dict[str, Any]) -> str:
        return safe_render_template(template_str, variables)

    # ------------------------------------------------------------------
    # Headers and authentication
    # ------------------------------------------------------------------

    def _build_headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {"Content-Type": "application/json"}

        extra = self.custom_config.get("request_headers")
        if isinstance(extra, dict):
            headers.update(extra)

        auth_type = self.custom_config.get("auth_type", "bearer")
        api_key = self.api_key or ""

        if not api_key:
            return headers

        if auth_type == "bearer":
            headers["Authorization"] = f"Bearer {api_key}"
        elif auth_type == "custom_header":
            header_name = self.custom_config.get("auth_header_name", "X-Api-Key")
            headers[header_name] = api_key
        # query_param auth is handled in the URL, not headers

        return headers

    # ------------------------------------------------------------------
    # Response extraction
    # ------------------------------------------------------------------

    def _extract_response(self, resp: requests.Response) -> str:
        response_type = self.custom_config.get("response_type", "json")

        if response_type == "text":
            return resp.text.strip()

        try:
            data = resp.json()
        except (json.JSONDecodeError, ValueError):
            logger.warning("Failed to parse response as JSON, returning raw text")
            return resp.text.strip()

        content_path = self.custom_config.get("response_content_path", "")
        if not content_path:
            return json.dumps(data, ensure_ascii=False)

        try:
            extracted = extract_by_path(data, content_path)
            return str(extracted) if not isinstance(extracted, str) else extracted
        except (KeyError, IndexError, ValueError, TypeError) as exc:
            logger.error("Failed to extract response at path '%s': %s", content_path, exc)
            return json.dumps(data, ensure_ascii=False)
