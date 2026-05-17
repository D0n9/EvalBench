import json
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx

from app.api import deps
from app.crud import crud_model
from app.models.user import User
from app.schemas.model_config import ModelConfig, ModelConfigCreate, ModelConfigUpdate, ModelTestConnection
from app.services.custom_model_adapter import safe_render_template

router = APIRouter()

@router.get("/", response_model=List[ModelConfig])
def read_models(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Retrieve model configs accessible by the user.
    """
    models = crud_model.get_models_for_user(db, current_user, skip, limit)
    return models

@router.post("/", response_model=ModelConfig)
def create_model(
    *,
    db: Session = Depends(deps.get_db),
    model_in: ModelConfigCreate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Create new model config.
    """
    if not current_user.team_id:
        raise HTTPException(
            status_code=400,
            detail="You must belong to a team to create a model configuration."
        )
    model = crud_model.create_model(db=db, obj_in=model_in, current_user=current_user)
    return model

@router.post("/test-connection")
async def test_connection(
    *,
    model_in: ModelTestConnection,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Submit an async job to test API connection for a model config.

    Returns HTTP 202 with a ``job_id``.  Poll ``GET /jobs/{job_id}``
    until ``status`` is ``completed`` or ``failed``.
    """
    if not model_in.api_url:
        raise HTTPException(status_code=400, detail="API URL is required for connection testing")

    from fastapi.responses import JSONResponse
    from app.services.job_manager import submit as submit_job

    async def _do_test() -> dict:
        if model_in.api_protocol == "custom":
            return await _test_custom_connection(model_in)
        else:
            return await _test_openai_connection(model_in)

    try:
        job_id = submit_job(_do_test())
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return JSONResponse(
        status_code=202,
        content={"job_id": job_id, "status": "pending"},
    )


async def _test_openai_connection(model_in: ModelTestConnection) -> dict:
    """Test connection to an OpenAI-compatible endpoint."""
    if not model_in.model_id:
        raise HTTPException(status_code=400, detail="Model ID is required for connection testing")

    headers = {"Content-Type": "application/json"}
    if model_in.api_key and model_in.api_key != "EMPTY":
        headers["Authorization"] = f"Bearer {model_in.api_key}"

    chat_url = model_in.api_url.rstrip("/")
    if chat_url.endswith("/v1"):
        chat_url = f"{chat_url}/chat/completions"
    elif not chat_url.endswith("/chat/completions"):
        chat_url = f"{chat_url}/v1/chat/completions"

    test_payload = {
        "model": model_in.model_id,
        "messages": [
            {"role": "user", "content": "Hi, please reply with just the word 'OK' to test the connection."}
        ],
        "max_tokens": 10,
        "temperature": 0.1,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(chat_url, headers=headers, json=test_payload, timeout=30.0)

            if response.status_code == 200:
                try:
                    response_data = response.json()
                    if "choices" in response_data and len(response_data["choices"]) > 0:
                        return {
                            "status": "success",
                            "message": f"Connection successful! Model responded: '{response_data['choices'][0]['message']['content'][:50]}...'",
                        }
                    else:
                        return {"status": "error", "message": "Invalid response format from API"}
                except Exception:
                    return {"status": "error", "message": "Failed to parse API response"}
            elif response.status_code == 401:
                return {"status": "error", "message": "Authentication failed - invalid API key"}
            elif response.status_code == 403:
                return {"status": "error", "message": "Access forbidden - check API permissions"}
            elif response.status_code == 404:
                return {"status": "error", "message": f"Model '{model_in.model_id}' not found at endpoint"}
            elif response.status_code == 429:
                return {"status": "error", "message": "Rate limit exceeded - try again later"}
            else:
                error_detail = ""
                try:
                    error_data = response.json()
                    error_detail = error_data.get("error", {}).get("message", response.text)
                except Exception:
                    error_detail = response.text
                return {"status": "error", "message": f"HTTP {response.status_code}: {error_detail}"}

    except httpx.TimeoutException:
        return {"status": "error", "message": "Connection timeout - API took too long to respond"}
    except httpx.ConnectError as e:
        return {"status": "error", "message": f"Connection failed - {str(e)}. Please check the API URL"}
    except httpx.RequestError as e:
        return {"status": "error", "message": f"Request failed - {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error - {str(e)}"}


async def _test_custom_connection(model_in: ModelTestConnection) -> dict:
    """Test connection to a custom (non-OpenAI) HTTP API using configured template."""
    cfg = model_in.custom_api_config or {}
    body_template = cfg.get("request_body_template", "")
    if not body_template:
        return {"status": "error", "message": "Request body template is required for custom API testing"}

    template_vars = {
        "prompt": "Hi, please reply with just the word 'OK' to test the connection.",
        "system_prompt": "",
        "user_prompt": "Hi, please reply with just the word 'OK' to test the connection.",
        "messages_json": json.dumps([{"role": "user", "content": "Hi, please reply with just the word 'OK' to test the connection."}]),
        "model": model_in.model_id or "test-model",
        "max_tokens": 10,
        "temperature": 0.1,
        "top_p": 1.0,
        "top_k": 50,
    }

    try:
        rendered = safe_render_template(body_template, template_vars)
        request_body = json.loads(rendered)
    except ValueError as e:
        return {"status": "error", "message": f"Template security check failed: {str(e)}"}
    except json.JSONDecodeError:
        return {"status": "error", "message": "Request body template rendered to invalid JSON"}
    except Exception as e:
        return {"status": "error", "message": f"Template rendering failed: {str(e)}"}

    headers: dict[str, str] = {"Content-Type": "application/json"}
    extra_headers = cfg.get("request_headers")
    if isinstance(extra_headers, dict):
        headers.update(extra_headers)

    auth_type = cfg.get("auth_type", "bearer")
    api_key = model_in.api_key or ""
    if api_key and api_key != "EMPTY":
        if auth_type == "bearer":
            headers["Authorization"] = f"Bearer {api_key}"
        elif auth_type == "custom_header":
            header_name = cfg.get("auth_header_name", "X-Api-Key")
            headers[header_name] = api_key

    method = cfg.get("request_method", "POST").upper()
    url = model_in.api_url.rstrip("/")

    if auth_type == "query_param" and api_key and api_key != "EMPTY":
        param_name = cfg.get("auth_query_param_name", "key")
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}{param_name}={api_key}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.request(method, url, headers=headers, json=request_body, timeout=30.0)

            if response.status_code == 200:
                response_type = cfg.get("response_type", "json")
                content_path = cfg.get("response_content_path", "")

                if response_type == "text":
                    text = response.text.strip()
                    return {"status": "success", "message": f"Connection successful! Response: '{text[:80]}...'"}

                try:
                    data = response.json()
                except Exception:
                    return {"status": "error", "message": "API returned 200 but response is not valid JSON"}

                if content_path:
                    try:
                        from app.services.custom_model_adapter import extract_by_path
                        extracted = extract_by_path(data, content_path)
                        text = str(extracted)[:80]
                        return {"status": "success", "message": f"Connection successful! Extracted: '{text}...'"}
                    except (KeyError, IndexError, ValueError, TypeError) as exc:
                        return {
                            "status": "error",
                            "message": f"API responded OK but response path '{content_path}' extraction failed: {exc}",
                        }
                else:
                    return {"status": "success", "message": f"Connection successful! Response: {json.dumps(data, ensure_ascii=False)[:80]}..."}
            else:
                error_detail = response.text[:200]
                return {"status": "error", "message": f"HTTP {response.status_code}: {error_detail}"}

    except httpx.TimeoutException:
        return {"status": "error", "message": "Connection timeout - API took too long to respond"}
    except httpx.ConnectError as e:
        return {"status": "error", "message": f"Connection failed - {str(e)}. Please check the API URL"}
    except httpx.RequestError as e:
        return {"status": "error", "message": f"Request failed - {str(e)}"}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error - {str(e)}"}

@router.put("/{model_id}", response_model=ModelConfig)
def update_model(
    model_id: str,
    db: Session = Depends(deps.get_db),
    model_in: ModelConfigUpdate = ...,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update a model config.
    """
    from app.models.model_config import ModelConfig as ModelConfigModel
    model = deps.get_resource_or_404(db, ModelConfigModel, model_id, current_user)
    deps.validate_resource_modification(model, current_user)
    
    # Only superuser can change readonly status
    if not current_user.is_superuser:
        if model_in.is_readonly != model.is_readonly:
            raise HTTPException(
                status_code=403,
                detail="Only superuser can change readonly status"
            )
    
    model = crud_model.update_model(db=db, model_id=model_id, obj_in=model_in)
    return model

@router.delete("/{model_id}", response_model=ModelConfig)
def delete_model(
    model_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Delete a model config.
    """
    from app.models.model_config import ModelConfig as ModelConfigModel
    model = deps.get_resource_or_404(db, ModelConfigModel, model_id, current_user)
    deps.validate_resource_modification(model, current_user)
    
    model = crud_model.delete_model(db=db, model_id=model_id)
    return model
