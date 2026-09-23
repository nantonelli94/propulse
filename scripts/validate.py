"""
PROPULSE Validation Script
==========================

Compares predictions against published benchmark data
and generates validation reports.

Usage:
    python scripts/validate.py
"""

import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.models.geometry import ShipGeometry
from backend.methods import predict_resistance


def validate_tanker():
    """Validate against a known tanker geometry."""
    print("=" * 60)
    print("PROPULSE Validation — Tanker Example")
    print("=" * 60)

    geom = ShipGeometry(
        LWL=150.0, B=22.0, T=9.0, D=5.0,
        Cp=0.68, Cb=0.72, Cm=0.88, Cwp=0.78,
        LCB=2.0, S=3200.0, Disp=7500.0, Vs=7.5,
        rho=1025.0, nu=1.188e-6, g=9.81,
        Z=4, P_D=0.75, Ae_Ao=0.65, shaft_angle=0.0,
        has_bulbous_bow=True, has_transom=False,
        has_skeg=False, has_strut=False, has_stabilizer=False,
        roughness_k=150e-6, windage_coeff=1.0, air_density=1.225,
    )

    for Vs in [5.0, 7.5, 10.0, 12.0]:
        result = predict_resistance(geom, Vs, "holtrop1982")
        print(f"\nSpeed: {result.V_knots:.2f} kn | Fn: {result.Fn:.4f}")
        print(f"  Rf  = {result.resistance.Rf/1000:8.2f} kN")
        print(f"  Rw  = {result.resistance.Rw/1000:8.2f} kN")
        print(f"  Rv  = {result.resistance.Rv/1000:8.2f} kN")
        print(f"  Ra  = {result.resistance.Ra/1000:8.2f} kN")
        print(f"  Rapp= {result.resistance.Rapp/1000:8.2f} kN")
        print(f"  Rt  = {result.Rt/1000:8.2f} kN")
        print(f"  Pe  = {result.Pe/1000:8.2f} kW")
        print(f"  Pd  = {result.Pd/1000:8.2f} kW")
        print(f"  SHP = {result.SHP:.1f} hp")
        print(f"  etaD= {result.propulsion.etaD*100:.1f}%")


def validate_container():
    """Validate against a container ship geometry."""
    print("\n" + "=" * 60)
    print("PROPULSE Validation — Container Ship Example")
    print("=" * 60)

    geom = ShipGeometry(
        LWL=120.0, B=18.0, T=6.5, D=4.0,
        Cp=0.62, Cb=0.65, Cm=0.82, Cwp=0.72,
        LCB=-1.5, S=2100.0, Disp=4800.0, Vs=9.0,
        rho=1025.0, nu=1.188e-6, g=9.81,
        Z=4, P_D=0.85, Ae_Ao=0.72, shaft_angle=0.0,
        has_bulbous_bow=True, has_transom=True,
        has_skeg=False, has_strut=False, has_stabilizer=False,
        roughness_k=150e-6, windage_coeff=1.0, air_density=1.225,
    )

    for Vs in [6.0, 9.0, 12.0, 15.0]:
        result = predict_resistance(geom, Vs, "holtrop1982")
        print(f"\nSpeed: {result.V_knots:.2f} kn | Fn: {result.Fn:.4f}")
        print(f"  Rt  = {result.Rt/1000:8.2f} kN")
        print(f"  Pe  = {result.Pe/1000:8.2f} kW")
        print(f"  SHP = {result.SHP:.1f} hp")
        print(f"  etaD= {result.propulsion.etaD*100:.1f}%")


def compare_methods():
    """Compare all three methods on the same geometry."""
    print("\n" + "=" * 60)
    print("Method Comparison — Tanker at 7.5 m/s")
    print("=" * 60)

    geom = ShipGeometry(
        LWL=150.0, B=22.0, T=9.0, D=5.0,
        Cp=0.68, Cb=0.72, Cm=0.88, Cwp=0.78,
        LCB=2.0, S=3200.0, Disp=7500.0, Vs=7.5,
        rho=1025.0, nu=1.188e-6, g=9.81,
        Z=4, P_D=0.75, Ae_Ao=0.65, shaft_angle=0.0,
        has_bulbous_bow=True, has_transom=False,
        has_skeg=False, has_strut=False, has_stabilizer=False,
        roughness_k=150e-6, windage_coeff=1.0, air_density=1.225,
    )

    for method in ["holtrop1982", "holtrop2001", "ittc1978"]:
        result = predict_resistance(geom, 7.5, method)
        print(f"\n{method}:")
        print(f"  Rt  = {result.Rt/1000:8.2f} kN")
        print(f"  Pe  = {result.Pe/1000:8.2f} kW")
        print(f"  SHP = {result.SHP:.1f} hp")
        print(f"  etaD= {result.propulsion.etaD*100:.1f}%")


if __name__ == "__main__":
    validate_tanker()
    validate_container()
    compare_methods()
    print("\n" + "=" * 60)
    print("Validation complete.")
    print("=" * 60)
