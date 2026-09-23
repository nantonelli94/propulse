"""
PROPULSE API - FastAPI backend for resistance prediction.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

from backend.models.geometry import ShipGeometry, SpeedSweepRequest
from backend.methods import predict_resistance, speed_sweep

app = FastAPI(
    title="PROPULSE API",
    description="Conceptual ship resistance & power prediction",
    version="1.0.0",
    contact={"name": "Nicolas Antonelli", "url": "https://github.com/nantonelli94/propulse"},
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SinglePredictionRequest(BaseModel):
    geometry: ShipGeometry
    Vs: float
    method: str = "holtrop1982"


class SinglePredictionResponse(BaseModel):
    Vs: float
    V_knots: float
    Fn: float
    Re: float
    Rf: float
    Rw: float
    Rv: float
    Ra: float
    Rapp: float
    Rw_add: float
    Rt: float
    Pe: float
    Pd: float
    EHP: float
    SHP: float
    DHP: float
    etaH: float
    etaO: float
    etaR: float
    etaB: float
    etaD: float
    Cf: float


class SpeedSweepResponse(BaseModel):
    results: List[SinglePredictionResponse]
    method: str
    Vmin: float
    Vmax: float
    n_points: int


@app.get("/")
async def root():
    return {
        "name": "PROPULSE",
        "version": "1.0.0",
        "description": "Conceptual ship resistance & power prediction",
        "docs": "/docs",
        "endpoints": ["/predict", "/sweep", "/methods", "/health"],
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/methods")
async def list_methods():
    return {
        "methods": [
            {
                "id": "holtrop1982",
                "name": "Holtrop & Mennen (1982)",
                "description": "Classic approximate power prediction method. Widely used in conceptual design.",
                "accuracy": "±5-10% for displacement ships",
                "range": "Fn 0.15-0.45, Cp 0.55-0.85",
            },
            {
                "id": "holtrop2001",
                "name": "Holtrop (2001)",
                "description": "Revised method with updated coefficients for improved accuracy.",
                "accuracy": "±4-8% for displacement ships",
                "range": "Fn 0.15-0.50, Cp 0.55-0.85",
            },
            {
                "id": "ittc1978",
                "name": "ITTC 1978",
                "description": "ITTC Recommended Procedure 14.302-01. Uses ITTC 1957 friction line.",
                "accuracy": "±6-12% for displacement ships",
                "range": "Fn 0.15-0.45",
            },
        ]
    }


@app.post("/predict", response_model=SinglePredictionResponse)
async def predict(request: SinglePredictionRequest):
    """Run a single resistance prediction at a given speed."""
    try:
        result = predict_resistance(request.geometry, request.Vs, request.method)
        return SinglePredictionResponse(
            Vs=result.Vs,
            V_knots=result.V_knots,
            Fn=result.Fn,
            Re=result.Re,
            Rf=result.resistance.Rf,
            Rw=result.resistance.Rw,
            Rv=result.resistance.Rv,
            Ra=result.resistance.Ra,
            Rapp=result.resistance.Rapp,
            Rw_add=result.resistance.Rw_add,
            Rt=result.Rt,
            Pe=result.Pe,
            Pd=result.Pd,
            EHP=result.EHP,
            SHP=result.SHP,
            DHP=result.DHP,
            etaH=result.propulsion.etaH,
            etaO=result.propulsion.etaO,
            etaR=result.propulsion.etaR,
            etaB=result.propulsion.etaB,
            etaD=result.propulsion.etaD,
            Cf=result.Cf,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/sweep", response_model=SpeedSweepResponse)
async def sweep(request: SpeedSweepRequest):
    """Run a resistance prediction over a speed range."""
    try:
        results = speed_sweep(
            request.geometry,
            request.Vmin,
            request.Vmax,
            request.n_points,
            request.method,
        )
        responses = [
            SinglePredictionResponse(
                Vs=r.Vs, V_knots=r.V_knots, Fn=r.Fn, Re=r.Re,
                Rf=r.resistance.Rf, Rw=r.resistance.Rw, Rv=r.resistance.Rv,
                Ra=r.resistance.Ra, Rapp=r.resistance.Rapp, Rw_add=r.resistance.Rw_add,
                Rt=r.Rt, Pe=r.Pe, Pd=r.Pd, EHP=r.EHP, SHP=r.SHP, DHP=r.DHP,
                etaH=r.propulsion.etaH, etaO=r.propulsion.etaO,
                etaR=r.propulsion.etaR, etaB=r.propulsion.etaB, etaD=r.propulsion.etaD,
                Cf=r.Cf,
            )
            for r in results
        ]
        return SpeedSweepResponse(
            results=responses,
            method=request.method,
            Vmin=request.Vmin,
            Vmax=request.Vmax,
            n_points=request.n_points,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
