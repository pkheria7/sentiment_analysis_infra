from sqlalchemy import Column, Integer, String, Text, Float, JSON, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class Content(Base):
    __tablename__ = "content"

    id = Column(Integer, primary_key=True)
    source = Column(String, nullable=False)
    source_ref = Column(String)
    original_text = Column(Text, nullable=False)
    original_language = Column(String)
    timestamp = Column(String)
    location_name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    raw_metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
