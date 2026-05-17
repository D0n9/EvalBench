# -*- coding: utf-8 -*-
from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field, model_validator

MODEL_TYPES = [
    ("LLM", "大语言模型"),
    ("VLM", "多模态大模型"),
    ("Embedding", "Embedding模型"),
    ("CLIP", "CLIP模型"),
]

API_PROTOCOLS = [
    ("openai", "OpenAI API"),
    ("custom", "自定义 API"),
]

class ModelConfigBase(BaseModel):
    name: str = Field(..., example="Qwen Plus")
    evalscope_model_id: str = Field(..., example="qwen-plus")
    api_url: Optional[str] = Field(None, example="https://dashscope.aliyuncs.com/compatible-mode/v1")
    api_protocol: Literal["openai", "custom"] = Field(default="openai")
    custom_api_config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Custom API adapter configuration (only used when api_protocol='custom')",
    )
    generation_config: Optional[Dict[str, Any]] = Field(None, example={"temperature": 0.0, "max_tokens": 2048})
    model_types: List[str] = Field(default=["LLM"], example=["LLM"])
    is_public: bool = False
    is_readonly: bool = False

    @model_validator(mode="after")
    def _validate_custom_api_template(self) -> "ModelConfigBase":
        if self.api_protocol == "custom" and self.custom_api_config:
            tpl = self.custom_api_config.get("request_body_template", "")
            if tpl:
                from app.services.custom_model_adapter import validate_template
                validate_template(tpl)
        return self

class ModelConfigCreate(ModelConfigBase):
    api_key: Optional[str] = None

class ModelConfigUpdate(ModelConfigBase):
    api_key: Optional[str] = None

class ModelTestConnection(BaseModel):
    api_url: str
    api_key: Optional[str] = None
    model_id: Optional[str] = None
    api_protocol: Literal["openai", "custom"] = Field(default="openai")
    custom_api_config: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def _validate_custom_api_template(self) -> "ModelTestConnection":
        if self.api_protocol == "custom" and self.custom_api_config:
            tpl = self.custom_api_config.get("request_body_template", "")
            if tpl:
                from app.services.custom_model_adapter import validate_template
                validate_template(tpl)
        return self

class ModelConfigInDBBase(ModelConfigBase):
    id: str
    team_id: str
    creator_id: str

    class Config:
        from_attributes = True

class ModelConfig(ModelConfigInDBBase):
    pass
