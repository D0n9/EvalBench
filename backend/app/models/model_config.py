from sqlalchemy import Column, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, UUIDMixin

class ModelConfig(Base, UUIDMixin):
    __tablename__ = "model_configs"

    name = Column(String, index=True, nullable=False)  # Alias name in platform
    evalscope_model_id = Column(String, nullable=False) # e.g. "qwen-plus", "deepseek-chat"
    api_url = Column(String, nullable=True) # e.g. "https://api.deepseek.com/v1"
    api_key = Column(String, nullable=True) # Encrypted or stored safely

    # API protocol: "openai" (default, OpenAI-compatible) or "custom" (non-standard HTTP API)
    api_protocol = Column(String, default="openai", nullable=False)
    # Configuration for custom API adapters (Jinja2 template, message mapping, response parsing)
    custom_api_config = Column(JSON, nullable=True)

    # Optional default config
    generation_config = Column(JSON, nullable=True) # e.g. {"temperature": 0.0, "max_tokens": 2048}

    # Model type classification: LLM, VLM, Embedding, CLIP
    model_types = Column(JSON, nullable=True, default=["LLM"]) # Default to LLM

    # Resource control
    is_public = Column(Boolean, default=False)
    is_readonly = Column(Boolean, default=False)

    # Relationships
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    team = relationship("Team", back_populates="model_configs")

    creator_id = Column(String, ForeignKey("users.username"), nullable=False)
    creator = relationship("User", back_populates="created_models")
