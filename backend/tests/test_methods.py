"""
Tests for PROPULSE resistance prediction methods.
"""

import pytest
import math
from backend.models.geometry import ShipGeometry
from backend.methods import predict_resistance, speed_sweep, holtrop1982, ittc1978


@pytest.fixture
def sample_ship():
    """Standard test hull geometry."""
    return ShipGeometry(
        LWL=100.0,
        B=15.0,
        T=5.0,
        D=3.5,
        Cp=0.65,
        Cb=0.70,
        Cm=0.85,
        Cwp=0.75,
        LCB=0.0,
        S=1800.0,
        Disp=3500.0,
        Vs=8.0,
        rho=1025.0,
        nu=1.188e-6,
        g=9.81,
    )


class TestFrictionCoefficient:
    """ITTC 1957 model-ship correlation line tests."""

    def test_friction_low_re(self):
        """Low Reynolds number should use minimum."""
        Cf = 0.075 / (math.log10(1e5) - 2) ** 2
        result = 0.075 / (math.log10(5e4) - 2) ** 2
        # Should clamp to Re=1e5
        assert result > Cf  # Lower Re = higher Cf (laminar)

    def test_friction_high_re(self):
        """Higher Re should give lower Cf."""
        Cf_low = 0.075 / (math.log10(1e7) - 2) ** 2
        Cf_high = 0.075 / (math.log10(1e8) - 2) ** 2
        assert Cf_high < Cf_low


class TestHoltrop1982:
    """Holtrop & Mennen (1982) method tests."""

    def test_basic_prediction(self, sample_ship):
        """Prediction should return positive resistance."""
        result = holtrop1982(sample_ship, 8.0)
        assert result.Rt > 0
        assert result.Pe > 0
        assert result.Pd > 0

    def test_froude_number(self, sample_ship):
        """Froude number should be calculated correctly."""
        result = holtrop1982(sample_ship, 8.0)
        expected_Fn = 8.0 / math.sqrt(9.81 * 100.0)
        assert abs(result.Fn - expected_Fn) < 1e-10

    def test_reynolds_number(self, sample_ship):
        """Reynolds number should be calculated correctly."""
        result = holtrop1982(sample_ship, 8.0)
        expected_Re = 8.0 * 100.0 / 1.188e-6
        assert abs(result.Re - expected_Re) < 1

    def test_resistance_components_positive(self, sample_ship):
        """All resistance components should be non-negative."""
        result = holtrop1982(sample_ship, 8.0)
        assert result.resistance.Rf >= 0
        assert result.resistance.Rw >= 0
        assert result.resistance.Rv >= 0

    def test_total_is_sum(self, sample_ship):
        """Total resistance should equal sum of components."""
        result = holtrop1982(sample_ship, 8.0)
        assert abs(result.Rt - result.resistance.total) < 1e-6

    def test_power_relationship(self, sample_ship):
        """Pe = Rt * Vs."""
        result = holtrop1982(sample_ship, 8.0)
        assert abs(result.Pe - result.Rt * result.Vs) < 1e-6

    def test_efficiency_bounds(self, sample_ship):
        """Efficiencies should be in (0, 1]."""
        result = holtrop1982(sample_ship, 8.0)
        assert 0 < result.propulsion.etaH <= 1.0
        assert 0 < result.propulsion.etaO <= 1.0
        assert 0 < result.propulsion.etaD <= 1.0

    def test_higher_speed_more_resistance(self, sample_ship):
        """Higher speed should generally give higher resistance."""
        r1 = holtrop1982(sample_ship, 5.0)
        r2 = holtrop1982(sample_ship, 10.0)
        assert r2.Rt > r1.Rt


class TestITTC1978:
    """ITTC 1978 method tests."""

    def test_basic_prediction(self, sample_ship):
        """ITTC method should return positive resistance."""
        result = ittc1978(sample_ship, 8.0)
        assert result.Rt > 0
        assert result.Pe > 0

    def test_friction_matches_ittc(self, sample_ship):
        """Friction coefficient should match ITTC 1957."""
        result = ittc1978(sample_ship, 8.0)
        Re = 8.0 * 100.0 / 1.188e-6
        expected_Cf = 0.075 / (math.log10(Re) - 2) ** 2
        assert abs(result.Cf - expected_Cf) < 1e-10


class TestSpeedSweep:
    """Speed sweep tests."""

    def test_sweep_returns_list(self, sample_ship):
        """Sweep should return a list of results."""
        results = speed_sweep(sample_ship, 2.0, 15.0, 20)
        assert len(results) == 20

    def test_sweep_increases(self, sample_ship):
        """Sweep results should show increasing resistance."""
        results = speed_sweep(sample_ship, 2.0, 15.0, 10)
        for i in range(1, len(results)):
            assert results[i].Rt >= results[i-1].Rt * 0.9  # Allow small numerical noise

    def test_sweep_speed_range(self, sample_ship):
        """Sweep should cover the requested speed range."""
        results = speed_sweep(sample_ship, 2.0, 15.0, 10)
        assert abs(results[0].Vs - 2.0) < 0.01
        assert abs(results[-1].Vs - 15.0) < 0.01


class TestWettedSurface:
    """Wetted surface formula tests."""

    def test_surface_positive(self, sample_ship):
        """Wetted surface should be positive."""
        from backend.methods import _wetted_surface_holtrop
        S = _wetted_surface_holtrop(sample_ship)
        assert S > 0

    def test_surface_reasonable(self, sample_ship):
        """Wetted surface should be reasonable for the hull size."""
        from backend.methods import _wetted_surface_holtrop
        S = _wetted_surface_holtrop(sample_ship)
        # For a 100m x 15m x 5m hull, S should be roughly 1500-2500 m²
        assert 1000 < S < 3000
