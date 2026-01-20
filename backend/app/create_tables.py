from app.core.database import engine, Base
from app.models.content import Content
from app.models.content_analysis import ContentAnalysis

Base.metadata.create_all(bind=engine)
