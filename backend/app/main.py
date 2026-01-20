from fastapi import FastAPI
from app.api.routers import youtube

app = FastAPI(title="Infrastructure Sentiment Backend")

app.include_router(youtube.router)
