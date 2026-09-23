from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.main import app

__all__ = ["app"]
