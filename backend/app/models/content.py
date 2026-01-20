# from sqlalchemy import Column, Integer, String, Text, Float, JSON, DateTime
# from sqlalchemy.sql import func
# from app.core.database import Base

# class Content(Base):
#     __tablename__ = "content"

#     id = Column(Integer, primary_key=True)
#     source = Column(String, nullable=False)
#     source_ref = Column(String)
#     original_text = Column(Text, nullable=False)
#     original_language = Column(String)
#     timestamp = Column(String)
#     location_name = Column(String)
#     latitude = Column(Float)
#     longitude = Column(Float)
#     raw_metadata = Column(JSON)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())



from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean
from datetime import datetime
from app.core.database import Base


class Content(Base):
    __tablename__ = "content"

    id = Column(Integer, primary_key=True, index=True)

    # Source info
    source = Column(String, index=True)
    source_ref = Column(Text)

    # Raw text
    original_text = Column(Text)

    # LLM outputs (can be NULL initially)
    original_language = Column(String, nullable=True)
    translated_text = Column(Text, nullable=True)
    aspect = Column(String, nullable=True)
    sentiment = Column(String, nullable=True)

    # Status tracking
    is_processed = Column(Boolean, default=False)
    processed_at = Column(DateTime, nullable=True)

    # Context
    timestamp = Column(String)
    location_name = Column(String, nullable=True)
    raw_metadata = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
