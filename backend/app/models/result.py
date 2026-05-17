from sqlalchemy import Column, String, Float, Integer, ForeignKey, JSON, DateTime, text
from sqlalchemy.orm import relationship
from app.models.base import Base, UUIDMixin

class Result(Base, UUIDMixin):
    __tablename__ = "results"
    
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False, index=True)
    task = relationship("Task", back_populates="results")
    
    model_name = Column(String, index=True, nullable=False)
    dataset_name = Column(String, index=True, nullable=True)
    
    score = Column(Float, nullable=True)
    metrics = Column(JSON, nullable=True)
    
    config_content = Column(String, nullable=True)
    log_content = Column(String, nullable=True)
    
    report_file = Column(String, nullable=True)
    html_report_file = Column(String, nullable=True)
    
    samples = relationship("SampleResult", back_populates="result", cascade="all, delete-orphan")

class SampleResult(Base, UUIDMixin):
    __tablename__ = "sample_results"
    
    result_id = Column(String, ForeignKey("results.id"), nullable=False, index=True)
    result = relationship("Result", back_populates="samples")
    
    question_id = Column(String, index=True, nullable=True)
    category = Column(String, index=True, nullable=True)
    dimension = Column(String, index=True, nullable=True)
    severity = Column(String, index=True, nullable=True)
    
    prompt = Column(String, nullable=False)
    response = Column(String, nullable=False)
    reference = Column(String, nullable=True)
    
    is_passed = Column(String, nullable=True) # "passed", "failed", "unknown"
    score = Column(Float, nullable=True)
    
    raw_data = Column(JSON, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=text('now()'), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=text('now()'), nullable=True)
