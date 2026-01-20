from fastapi import FastAPI
from app.api.routers import youtube
from app.api.routers import processing
from app.api.routers import analytics



app = FastAPI(title="Infrastructure Sentiment Backend")

app.include_router(youtube.router)
app.include_router(processing.router)
app.include_router(analytics.router)