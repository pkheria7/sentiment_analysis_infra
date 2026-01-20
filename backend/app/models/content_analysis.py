from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class ContentAnalysis(Base):
    __tablename__ = "content_analysis"

    id = Column(Integer, primary_key=True)
    content_id = Column(Integer, ForeignKey("content.id"), nullable=False)

    translated_text = Column(Text, nullable=False)
    transliterated_text = Column(Text)
    detected_language = Column(String)

    aspect = Column(String)
    soft_sentiment = Column(Float)
    final_sentiment = Column(String)
    confidence = Column(Float)

    processed_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())