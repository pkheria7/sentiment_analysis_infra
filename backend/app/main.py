from fastapi import FastAPI
from app.api.routers import youtube
from app.api.routers import processing
from app.api.routers import analytics
from app.api.routers import reddit
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Infrastructure Sentiment Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(youtube.router)
app.include_router(reddit.router)
app.include_router(processing.router)
app.include_router(analytics.router)