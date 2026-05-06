from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="candidate", nullable=False) # 'candidate' or 'hr'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    cvs = relationship("CV", back_populates="user")

class CV(Base):
    __tablename__ = "cvs"
    id = Column(String, primary_key=True, index=True) # Will use the job_id as string
    user_id = Column(Integer, ForeignKey("users.id"))
    file_name = Column(String, nullable=False)
    candidate_name = Column(String, nullable=True)  # Name extracted from PDF
    status = Column(String, default="Ready")
    overall_score = Column(Float, nullable=True)
    parse_quality = Column(String, nullable=True) # JSON serialized dict
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="cvs")
