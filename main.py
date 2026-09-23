"""
PROPULSE - Conceptual Ship Resistance & Power Prediction Tool
=============================================================

A comprehensive open-source tool for conceptual design phase
resistance and propulsive efficiency prediction for displacement ships.

Quick start:
    1. Install dependencies: `pip install -r backend/requirements.txt`
    2. Start backend: `python backend/api/main.py`
    3. Open frontend: `cd frontend && python -m http.server 3000`
    4. Visit: http://localhost:3000

Author: Nicolas Antonelli (nantonelli94)
License: MIT
"""

from backend.api.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
