"""
Ship geometry and environmental parameters.
All units: SI (metres, seconds, kilograms, cubic metres).
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional


class ShipGeometry(BaseModel):
    """Hull geometric parameters for resistance prediction."""

    LWL: float = Field(..., gt=0, le=400, description="Length between perpendiculars [m]")
    B: float = Field(..., gt=0, le=80, description="Beam [m]")
    T: float = Field(..., gt=0, le=30, description="Draft [m]")
    D: float = Field(..., gt=0, le=40, description="Propeller diameter [m]")
    Cp: float = Field(..., gt=0.5, le=0.95, description="Prismatic coefficient")
    Cb: float = Field(..., gt=0.4, le=0.95, description="Block coefficient")
    Cm: float = Field(..., gt=0.7, le=0.99, description="Midship coefficient")
    Cwp: float = Field(..., gt=0.6, le=0.95, description="Waterplane coefficient")
    LCB: float = Field(..., ge=-10, le=10, description="LCB forward of midship [% LWL]")
    S: float = Field(..., gt=0, description="Wetted surface area [m²]")
    Disp: float = Field(..., gt=0, description="Displacement volume [m³]")
    Vs: float = Field(..., gt=0, le=30, description="Ship speed [m/s]")

    # Appendages
    has_bulbous_bow: bool = Field(True, description="Bulbous bow present")
    has_transom: bool = Field(False, description="Transom stern")
    has_skeg: bool = Field(False, description="Skeg present")
    has_strut: bool = Field(False, description="Shaft struts present")
    has_stabilizer: bool = Field(False, description="Stabilizer fins present")

    # Propeller
    Z: int = Field(4, ge=2, le=7, description="Number of blades")
    P_D: float = Field(0.8, gt=0.4, le=1.5, description="Pitch ratio P/D")
    Ae_Ao: float = Field(0.7, gt=0.2, le=1.2, description="Expanded area ratio Ae/Ao")
    shaft_angle: float = Field(0.0, ge=0, le=15, description="Shaft inclination [deg]")

    # Environment
    rho: float = Field(1025.0, gt=900, le=1100, description="Water density [kg/m³]")
    nu: float = Field(1.188e-6, gt=1e-7, le=1e-4, description="Kinematic viscosity [m²/s]")
    g: float = Field(9.81, gt=9.0, le=10.0, description="Gravity [m/s²]")

    # Resistance increments
    roughness_k: float = Field(150e-6, gt=0, le=1e-3, description="Hull roughness k [m]")
    windage_coeff: float = Field(1.0, gt=0, le=2.0, description="Windage coefficient Caa")
    air_density: float = Field(1.225, gt=0.5, le=2.0, description="Air density [kg/m³]")

    @field_validator("D")
    @classmethod
    def validate_propeller_diameter(cls, v, info):
        if "T" in info.data and v > info.data["T"] * 1.8:
            raise ValueError("Propeller diameter seems too large relative to draft")
        return v


class SpeedSweepRequest(BaseModel):
    """Request a resistance prediction over a speed range."""

    geometry: ShipGeometry
    Vmin: float = Field(1.0, gt=0, le=30, description="Min speed [m/s]")
    Vmax: float = Field(15.0, gt=0, le=30, description="Max speed [m/s]")
    n_points: int = Field(50, ge=10, le=500, description="Number of speed points")
    method: Literal["holtrop1982", "holtrop2001", "ittc1978"] = Field(
        "holtrop1982", description="Prediction method"
    )
    temperature: float = Field(15.0, ge=0, le=40, description="Water temperature [°C]")
    salinity: float = Field(35.0, ge=0, le=45, description="Salinity [ppt]")
    sea_state: int = Field(0, ge=0, le=9, description="Sea state (Beaufort)")
    depth: float = Field(100.0, gt=0, le=1000, description="Water depth [m]")
