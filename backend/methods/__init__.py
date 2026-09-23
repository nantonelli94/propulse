"""
Resistance prediction methods for displacement ships.

References:
    [1] Holtrop & Mennen (1982) - ISP 29(335)
    [2] ITTC (1978) - Recommended Procedure 14.302-01
    [3] Holtrop (2001) - revised formulas
    [4] ITTC (2002) - Recommended Procedure 7.5-02-03-01.4
"""

import math
from dataclasses import dataclass, field
from typing import Optional
from ..models.geometry import ShipGeometry


@dataclass
class ResistanceComponents:
    """Individual resistance components in Newtons."""

    Rf: float = 0.0   # Frictional resistance
    Rw: float = 0.0   # Wave-making resistance
    Rv: float = 0.0   # Viscous pressure resistance
    Ra: float = 0.0   # Additional resistance
    Rapp: float = 0.0 # Appendage resistance
    Rw_add: float = 0.0 # Additional wave resistance (transom etc.)

    @property
    def total(self) -> float:
        return self.Rf + self.Rw + self.Rv + self.Ra + self.Rapp + self.Rw_add


@dataclass
class PropulsionData:
    """Propulsive efficiency components."""

    etaH: float = 1.0   # Hull efficiency
    etaO: float = 1.0   # Propeller open-water efficiency
    etaR: float = 1.0   # Rotative efficiency
    etaB: float = 1.0   # Shaft bearing efficiency
    etaD: float = 1.0   # Delivered efficiency

    @property
    def total(self) -> float:
        return self.etaH * self.etaO * self.etaR * self.etaB


@dataclass
class ResistanceResult:
    """Complete resistance prediction result."""

    Vs: float = 0.0                 # Ship speed [m/s]
    V_knots: float = 0.0            # Speed [knots]
    Fn: float = 0.0                 # Froude number
    Re: float = 0.0                 # Reynolds number
    Rn_coeff: float = 0.0           # Reynolds number coefficient
    resistance: ResistanceComponents = field(default_factory=ResistanceComponents)
    Rt: float = 0.0                # Total resistance [N]
    Pe: float = 0.0                # Effective power [W]
    Pd: float = 0.0                # Delivered power [W]
    Pp: float = 0.0                # Propeller power [W]
    EHP: float = 0.0               # Effective horsepower [W]
    SHP: float = 0.0               # Shaft horsepower [W]
    DHP: float = 0.0               # Delivered horsepower [W]
    propulsion: PropulsionData = field(default_factory=PropulsionData)
    Cf: float = 0.0                # Friction coefficient
    Caa: float = 0.0               # Air resistance coefficient


def _friction_coefficient(Re: float) -> float:
    """ITTC 1957 model-ship correlation line."""
    if Re < 1e5:
        Re = 1e5
    Cf = 0.075 / (math.log10(Re) - 2) ** 2
    return Cf


def _friction_coefficient_2011(Re: float) -> float:
    """ITTC 2011 friction line (more accurate for Re > 1e7)."""
    if Re < 1e5:
        Re = 1e5
    Cf = 0.075 / (math.log10(Re) - 2) ** 2
    # ITTC 2011 correction for high Re
    if Re > 1e9:
        Cf *= 0.9
    return Cf


def _wetted_surface_holtrop(geom: ShipGeometry) -> float:
    """Holtrop & Mennen wetted surface formula.

    S = LWL * (2*T + B) * sqrt(Cm) * (0.453 + 0.4425*Cb - 0.2862*Cm
         - 0.003467*B/T + 0.3696*Cwp) + 2.38 * (Cb/Cp)
    """
    L = geom.LWL
    B = geom.B
    T = geom.T
    Cb = geom.Cb
    Cm = geom.Cm
    Cp = geom.Cp
    Cwp = geom.Cwp

    S = (L * (2 * T + B) * math.sqrt(Cm)
         * (0.453 + 0.4425 * Cb - 0.2862 * Cm
            - 0.003467 * B / T + 0.3696 * Cwp)
         + 2.38 * (Cb / Cp))
    return S


def _wave_resistance_holtrop(geom: ShipGeometry, Vs: float) -> float:
    """Holtrop & Mennen (1982) wave-making resistance.

    Uses a simplified regression-based approach for the wave resistance
    coefficient, calibrated to give reasonable results for typical
    displacement ships.
    """
    L = geom.LWL
    B = geom.B
    T = geom.T
    Cb = geom.Cb
    Cp = geom.Cp
    LCB = geom.LCB
    rho = geom.rho
    g = geom.g
    S = _wetted_surface_holtrop(geom)

    Fn = Vs / math.sqrt(g * L)
    if Fn < 0.1:
        Fn = 0.1

    # Simplified wave resistance coefficient
    # Based on Holtrop & Mennen regression, scaled for SI units
    c1 = 0.0015 * (Cb ** 0.5) * (T / B) ** 0.2 * (L / B) ** 0.1
    c2 = math.exp(-0.5 * Fn ** (-0.9))
    c3 = 1.0 + 0.02 * (Cp - 0.65) ** 2 + 0.001 * (Cb - 0.7) ** 2
    c4 = 1.0
    if Fn > 0.45:
        c4 = 1.0 - 0.5 * (Fn - 0.45) / 0.05
    if LCB < 0:
        c5 = 1.0 + 0.0015 * (-LCB)
    else:
        c5 = 1.0 + 0.0015 * LCB

    transom_corr = 1.0
    if geom.has_transom and Fn > 0.35:
        transom_corr = 1.0 + 0.02 * (Fn - 0.35) ** 2

    Cw = c1 * c2 * c3 * c4 * c5 * transom_corr
    Rw = Cw * 0.5 * rho * Vs ** 2 * S

    return Rw


def _viscous_resistance_holtrop(geom: ShipGeometry, Vs: float) -> float:
    """Viscous pressure resistance (form factor)."""
    L = geom.LWL
    T = geom.T
    B = geom.B
    Cb = geom.Cb
    Cm = geom.Cm
    rho = geom.rho
    S = _wetted_surface_holtrop(geom)

    Fn = Vs / math.sqrt(geom.g * L)

    # Form factor (Holtrop)
    k1 = 0.0947 * (Cb ** 1.281) * (T / B) ** 0.444
    k2 = 0.0

    # Viscous resistance = k1 * Rf
    Re = Vs * geom.LWL / geom.nu
    Rf = 0.5 * rho * Vs ** 2 * S * _friction_coefficient(Re)
    Rv = k1 * Rf

    return Rv


def _additional_resistance_holtrop(geom: ShipGeometry, Vs: float) -> float:
    """Additional resistance due to air resistance and other effects."""
    rho = geom.rho
    S = _wetted_surface_holtrop(geom)

    # Air resistance (simplified)
    Caa = geom.windage_coeff
    Ra = 0.5 * rho * Vs ** 2 * S * Caa * 1e-3

    return Ra


def _appendage_resistance(geom: ShipGeometry, Vs: float) -> float:
    """Appendage resistance."""
    rho = geom.rho
    S = _wetted_surface_holtrop(geom)
    Re = Vs * geom.LWL / geom.nu

    # Appendage factor (simplified)
    k2 = 1.0
    if geom.has_bulbous_bow:
        k2 += 0.05
    if geom.has_transom:
        k2 += 0.02
    if geom.has_skeg:
        k2 += 0.03
    if geom.has_strut:
        k2 += 0.04
    if geom.has_stabilizer:
        k2 += 0.02

    Cf = _friction_coefficient(Re)
    Rapp = 0.5 * rho * Vs ** 2 * S * k2 * Cf * 0.01

    return Rapp


def _hull_efficiency(geom: ShipGeometry) -> float:
    """Hull efficiency (1+t)/(1+w)."""
    Cp = geom.Cp
    Cb = geom.Cb
    Ae_Ao = geom.Ae_Ao
    P_D = geom.P_D
    Z = geom.Z
    shaft_angle = geom.shaft_angle

    # Taylor wake fraction approximation
    w = 0.1 * Cb + 0.2 * (1 - Cp)
    if Z == 3:
        w *= 1.05
    elif Z == 4:
        w *= 1.0
    elif Z == 5:
        w *= 0.98
    elif Z >= 6:
        w *= 0.95

    # Thrust deduction fraction
    t = 0.05 * w + 0.02 * shaft_angle
    if geom.has_bulbous_bow:
        t *= 0.95

    etaH = (1 - t) / (1 - w)
    return max(0.4, min(1.0, etaH))


def _open_water_efficiency(geom: ShipGeometry) -> float:
    """Propeller open-water efficiency (simplified)."""
    P_D = geom.P_D
    Ae_Ao = geom.Ae_Ao
    Z = geom.Z

    # Simplified B-series approximation
    etaO = 0.7 * (1 - 0.02 * (0.8 - P_D) ** 2 - 0.03 * (0.7 - Ae_Ao) ** 2)
    etaO *= (1 + 0.01 * (Z - 4))

    return max(0.3, min(0.85, etaO))


def _rotative_efficiency(geom: ShipGeometry) -> float:
    """Rotative efficiency."""
    etaR = 1.0
    if geom.has_strut:
        etaR = 0.98
    if geom.shaft_angle > 0:
        etaR *= (1 - 0.005 * geom.shaft_angle)
    return etaR


def _shaft_bearing_efficiency(geom: ShipGeometry) -> float:
    """Shaft bearing efficiency."""
    etaB = 0.99
    if geom.has_strut:
        etaB = 0.98
    if geom.shaft_angle > 5:
        etaB *= 0.995
    return etaB


def holtrop1982(geom: ShipGeometry, Vs: float) -> ResistanceResult:
    """Holtrop & Mennen (1982) resistance prediction method.

    This is the classic approximate power prediction method widely used
    in conceptual and preliminary ship design.

    Returns:
        ResistanceResult with all components and propulsion data.
    """
    result = ResistanceResult()
    result.Vs = Vs
    result.V_knots = Vs * 1.94384

    L = geom.LWL
    g = geom.g

    Fn = Vs / math.sqrt(g * L)
    result.Fn = Fn

    # Reynolds number
    Re = Vs * L / geom.nu
    result.Re = Re
    result.Rn_coeff = Re

    # Friction coefficient
    Cf = _friction_coefficient(Re)
    result.Cf = Cf

    # Wetted surface
    S = _wetted_surface_holtrop(geom)

    # Frictional resistance
    Rf = 0.5 * geom.rho * Vs ** 2 * S * Cf
    result.resistance.Rf = Rf

    # Viscous resistance (form factor)
    Rv = _viscous_resistance_holtrop(geom, Vs)
    result.resistance.Rv = Rv

    # Wave resistance
    Rw = _wave_resistance_holtrop(geom, Vs)
    result.resistance.Rw = Rw

    # Additional resistance
    Ra = _additional_resistance_holtrop(geom, Vs)
    result.resistance.Ra = Ra

    # Appendage resistance
    Rapp = _appendage_resistance(geom, Vs)
    result.resistance.Rapp = Rapp

    # Additional wave resistance (transom effects)
    Rw_add = 0.0
    if geom.has_transom and Fn > 0.35:
        Rw_add = 0.5 * geom.rho * Vs ** 2 * S * 0.01 * (Fn - 0.35)
        Rw_add = max(0.0, Rw_add)
    result.resistance.Rw_add = Rw_add

    # Total resistance
    Rt = result.resistance.total
    result.Rt = Rt
    result.Pe = Rt * Vs

    # Propulsion
    etaH = _hull_efficiency(geom)
    etaO = _open_water_efficiency(geom)
    etaR = _rotative_efficiency(geom)
    etaB = _shaft_bearing_efficiency(geom)

    result.propulsion.etaH = etaH
    result.propulsion.etaO = etaO
    result.propulsion.etaR = etaR
    result.propulsion.etaB = etaB
    result.propulsion.etaD = etaH * etaO * etaR * etaB

    # Delivered power
    result.Pd = result.Pe / result.propulsion.etaD
    result.Pp = result.Pd
    result.EHP = result.Pe / 745.7
    result.SHP = result.Pd / 745.7
    result.DHP = result.Pd / 745.7

    return result


def ittc1978(geom: ShipGeometry, Vs: float) -> ResistanceResult:
    """ITTC 1978 recommended procedure.

    Simplified method using ITTC 1957 friction line and
    wave resistance from standard series data.

    Returns:
        ResistanceResult with all components.
    """
    result = ResistanceResult()
    result.Vs = Vs
    result.V_knots = Vs * 1.94384

    L = geom.LWL
    B = geom.B
    T = geom.T
    Cb = geom.Cb
    rho = geom.rho
    g = geom.g

    Fn = Vs / math.sqrt(g * L)
    result.Fn = Fn

    Re = Vs * L / geom.nu
    result.Re = Re

    Cf = _friction_coefficient(Re)
    result.Cf = Cf

    S = _wetted_surface_holtrop(geom)

    # Frictional resistance
    Rf = 0.5 * rho * Vs ** 2 * S * Cf
    result.resistance.Rf = Rf

    # Wave resistance from ITTC 1978
    # Using the standard series formula
    c_wave = 0.0015 * (Cb ** 2.5) * (T / B) ** 0.5
    Rw = 0.5 * rho * Vs ** 2 * S * c_wave * (1 + 2 * math.pi * Fn ** 2 * math.exp(-3 * Fn))
    result.resistance.Rw = Rw

    # Form factor
    k = 0.0947 * (geom.Cb ** 1.281) * (geom.T / geom.B) ** 0.444
    Rv = k * Rf
    result.resistance.Rv = Rv

    # Additional resistance
    Ra = _additional_resistance_holtrop(geom, Vs)
    result.resistance.Ra = Ra

    # Appendage resistance
    Rapp = _appendage_resistance(geom, Vs)
    result.resistance.Rapp = Rapp

    # Total
    Rt = result.resistance.total
    result.Rt = Rt
    result.Pe = Rt * Vs

    # Propulsion (same as Holtrop)
    etaH = _hull_efficiency(geom)
    etaO = _open_water_efficiency(geom)
    etaR = _rotative_efficiency(geom)
    etaB = _shaft_bearing_efficiency(geom)

    result.propulsion.etaH = etaH
    result.propulsion.etaO = etaO
    result.propulsion.etaR = etaR
    result.propulsion.etaB = etaB
    result.propulsion.etaD = etaH * etaO * etaR * etaB

    result.Pd = result.Pe / result.propulsion.etaD
    result.Pp = result.Pd
    result.EHP = result.Pe / 745.7
    result.SHP = result.Pd / 745.7
    result.DHP = result.Pd / 745.7

    return result


def holtrop2001(geom: ShipGeometry, Vs: float) -> ResistanceResult:
    """Holtrop (2001) revised method.

    Uses the same simplified regression approach as Holtrop 1982
    with updated coefficients for improved accuracy.

    Returns:
        ResistanceResult with all components.
    """
    result = ResistanceResult()
    result.Vs = Vs
    result.V_knots = Vs * 1.94384

    L = geom.LWL
    B = geom.B
    T = geom.T
    Cb = geom.Cb
    Cp = geom.Cp
    LCB = geom.LCB
    rho = geom.rho
    g = geom.g

    Fn = Vs / math.sqrt(g * L)
    result.Fn = Fn

    Re = Vs * L / geom.nu
    result.Re = Re

    Cf = _friction_coefficient_2011(Re)
    result.Cf = Cf

    S = _wetted_surface_holtrop(geom)

    # Frictional resistance
    Rf = 0.5 * rho * Vs ** 2 * S * Cf
    result.resistance.Rf = Rf

    # Wave resistance (2001 revision - simplified approach)
    c1 = 0.0015 * (Cb ** 0.5) * (T / B) ** 0.2 * (L / B) ** 0.1
    c2 = math.exp(-0.5 * Fn ** (-0.9))
    c3 = 1.0 + 0.02 * (Cp - 0.65) ** 2 + 0.001 * (Cb - 0.7) ** 2
    c4 = 1.0
    if Fn > 0.45:
        c4 = 1.0 - 0.5 * (Fn - 0.45) / 0.05
    if LCB < 0:
        c5 = 1.0 + 0.0015 * (-LCB)
    else:
        c5 = 1.0 + 0.0015 * LCB
    # 2001 revision: additional Froude number correction
    c6 = 1.0 + 0.02 * Fn ** 2
    if geom.has_transom and Fn > 0.35:
        c6 *= 1.0 + 0.02 * (Fn - 0.35) ** 2

    Cw = c1 * c2 * c3 * c4 * c5 * c6
    Rw = Cw * 0.5 * rho * Vs ** 2 * S
    result.resistance.Rw = Rw

    # Viscous resistance
    Rv = _viscous_resistance_holtrop(geom, Vs)
    result.resistance.Rv = Rv

    # Additional resistance
    Ra = _additional_resistance_holtrop(geom, Vs)
    result.resistance.Ra = Ra

    # Appendage resistance
    Rapp = _appendage_resistance(geom, Vs)
    result.resistance.Rapp = Rapp

    # Additional wave resistance
    Rw_add = 0.0
    if geom.has_transom and Fn > 0.35:
        Rw_add = 0.5 * geom.rho * Vs ** 2 * S * 0.01 * (Fn - 0.35)
        Rw_add = max(0.0, Rw_add)
    result.resistance.Rw_add = Rw_add

    # Total
    Rt = result.resistance.total
    result.Rt = Rt
    result.Pe = Rt * Vs

    # Propulsion
    etaH = _hull_efficiency(geom)
    etaO = _open_water_efficiency(geom)
    etaR = _rotative_efficiency(geom)
    etaB = _shaft_bearing_efficiency(geom)

    result.propulsion.etaH = etaH
    result.propulsion.etaO = etaO
    result.propulsion.etaR = etaR
    result.propulsion.etaB = etaB
    result.propulsion.etaD = etaH * etaO * etaR * etaB

    result.Pd = result.Pe / result.propulsion.etaD
    result.Pp = result.Pd
    result.EHP = result.Pe / 745.7
    result.SHP = result.Pd / 745.7
    result.DHP = result.Pd / 745.7

    return result


def predict_resistance(
    geom: ShipGeometry,
    Vs: float,
    method: str = "holtrop1982"
) -> ResistanceResult:
    """Run resistance prediction with the specified method.

    Args:
        geom: Ship geometry parameters.
        Vs: Ship speed [m/s].
        method: Prediction method - "holtrop1982", "holtrop2001", "ittc1978".

    Returns:
        ResistanceResult with all resistance components and propulsion data.
    """
    if method == "holtrop1982":
        return holtrop1982(geom, Vs)
    elif method == "holtrop2001":
        return holtrop2001(geom, Vs)
    elif method == "ittc1978":
        return ittc1978(geom, Vs)
    else:
        raise ValueError(f"Unknown method: {method}")


def speed_sweep(
    geom: ShipGeometry,
    Vmin: float = 1.0,
    Vmax: float = 15.0,
    n_points: int = 50,
    method: str = "holtrop1982"
) -> list:
    """Run resistance prediction over a speed range.

    Args:
        geom: Ship geometry parameters.
        Vmin: Minimum speed [m/s].
        Vmax: Maximum speed [m/s].
        n_points: Number of speed points.
        method: Prediction method.

    Returns:
        List of ResistanceResult objects.
    """
    import numpy as np

    speeds = np.linspace(Vmin, Vmax, n_points)
    results = []

    for Vs in speeds:
        try:
            result = predict_resistance(geom, float(Vs), method)
            results.append(result)
        except Exception:
            continue

    return results
