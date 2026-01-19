from sqlalchemy import create_engine, Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./data.db"  # use PostgreSQL later

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()

class RawFeedback(Base):
    __tablename__ = "raw_feedback"

    id = Column(Integer, primary_key=True)
    source = Column(String)
    original_text = Column(Text)
    metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProcessedFeedback(Base):
    __tablename__ = "processed_feedback"

    id = Column(Integer, primary_key=True)
    raw_id = Column(Integer)
    llm_output = Column(JSON)
    processed_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)
