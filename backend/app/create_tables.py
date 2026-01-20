from app.core.database import engine, Base
from app.models.content import Content

Base.metadata.create_all(bind=engine)
