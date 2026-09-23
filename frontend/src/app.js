// PROPULSE Frontend Application
const API_BASE = 'http://localhost:8000';

// Utility: get all form values
function getGeometry() {
    return {
        LWL: parseFloat(document.getElementById('LWL').value),
        B: parseFloat(document.getElementById('B').value),
        T: parseFloat(document.getElementById('T').value),
        D: parseFloat(document.getElementById('D').value),
        Cp: parseFloat(document.getElementById('Cp').value),
        Cb: parseFloat(document.getElementById('Cb').value),
        Cm: parseFloat(document.getElementById('Cm').value),
        Cwp: parseFloat(document.getElementById('Cwp').value),
        LCB: parseFloat(document.getElementById('LCB').value),
        S: parseFloat(document.getElementById('S').value),
        Disp: parseFloat(document.getElementById('Disp').value),
        Vs: parseFloat(document.getElementById('Vs').value),
        has_bulbous_bow: document.getElementById('has_bulbous_bow').checked,
        has_transom: document.getElementById('has_transom').checked,
        has_skeg: document.getElementById('has_skeg').checked,
        has_strut: document.getElementById('has_strut').checked,
        has_stabilizer: document.getElementById('has_stabilizer').checked,
        Z: parseInt(document.getElementById('Z').value),
        P_D: parseFloat(document.getElementById('P_D').value),
        Ae_Ao: parseFloat(document.getElementById('Ae_Ao').value),
        shaft_angle: parseFloat(document.getElementById('shaft_angle').value),
        rho: parseFloat(document.getElementById('rho').value),
        nu: parseFloat(document.getElementById('nu').value),
        g: parseFloat(document.getElementById('g').value),
        roughness_k: parseFloat(document.getElementById('roughness_k').value),
        windage_coeff: parseFloat(document.getElementById('windage_coeff').value),
        air_density: parseFloat(document.getElementById('air_density').value),
    };
}

// Format number with units
function formatNumber(value, unit, decimals = 2) {
    if (Math.abs(value) >= 1e6) {
        return `${(value / 1e6).toFixed(decimals)} M${unit}`;
    } else if (Math.abs(value) >= 1e3) {
        return `${(value / 1e3).toFixed(decimals)} k${unit}`;
    }
    return `${value.toFixed(decimals)} ${unit}`;
}

// Display single prediction result
function displayResult(data) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="results-grid">
            <div class="result-card">
                <h3>Total Resistance</h3>
                <span class="value">${formatNumber(data.Rt, 'N')}</span>
            </div>
            <div class="result-card">
                <h3>Effective Power</h3>
                <span class="value">${formatNumber(data.Pe, 'W')}</span>
            </div>
            <div class="result-card">
                <h3>Delivered Power</h3>
                <span class="value">${formatNumber(data.Pd, 'W')}</span>
            </div>
            <div class="result-card">
                <h3>Speed</h3>
                <span class="value">${data.V_knots.toFixed(2)}</span>
                <span class="unit">knots</span>
            </div>
            <div class="result-card">
                <h3>Froude Number</h3>
                <span class="value">${data.Fn.toFixed(4)}</span>
            </div>
            <div class="result-card">
                <h3>Reynolds Number</h3>
                <span class="value">${formatNumber(data.Re, '', 0)}</span>
            </div>
            <div class="result-card">
                <h3>Friction Coeff</h3>
                <span class="value">${data.Cf.toFixed(5)}</span>
            </div>
            <div class="result-card">
                <h3>Hull Efficiency</h3>
                <span class="value">${(data.etaH * 100).toFixed(1)}</span>
                <span class="unit">%</span>
            </div>
            <div class="result-card">
                <h3>Propeller Efficiency</h3>
                <span class="value">${(data.etaO * 100).toFixed(1)}</span>
                <span class="unit">%</span>
            </div>
            <div class="result-card">
                <h3>Delivered Efficiency</h3>
                <span class="value">${(data.etaD * 100).toFixed(1)}</span>
                <span class="unit">%</span>
            </div>
            <div class="result-card">
                <h3>EHP</h3>
                <span class="value">${formatNumber(data.EHP, 'W', 0)}</span>
            </div>
            <div class="result-card">
                <h3>SHP</h3>
                <span class="value">${formatNumber(data.SHP, 'W', 0)}</span>
            </div>
        </div>
        <h3 style="margin-top:24px;color:var(--primary);">Resistance Components</h3>
        <div class="results-grid">
            <div class="result-card">
                <h3>Frictional Rf</h3>
                <span class="value">${formatNumber(data.Rf, 'N')}</span>
            </div>
            <div class="result-card">
                <h3>Wave Rw</h3>
                <span class="value">${formatNumber(data.Rw, 'N')}</span>
            </div>
            <div class="result-card">
                <h3>Viscous Rv</h3>
                <span class="value">${formatNumber(data.Rv, 'N')}</span>
            </div>
            <div class="result-card">
                <h3>Additional Ra</h3>
                <span class="value">${formatNumber(data.Ra, 'N')}</span>
            </div>
            <div class="result-card">
                <h3>Appendage Rapp</h3>
                <span class="value">${formatNumber(data.Rapp, 'N')}</span>
            </div>
            <div class="result-card">
                <h3>Transom Rw_add</h3>
                <span class="value">${formatNumber(data.Rw_add, 'N')}</span>
            </div>
        </div>
    `;
}

// Display sweep results with chart
function displaySweep(data) {
    const container = document.getElementById('resultsContainer');
    const speeds = data.results.map(r => r.V_knots.toFixed(2));
    const rt = data.results.map(r => r.Rt / 1000);
    const pe = data.results.map(r => r.Pe / 1000);
    const pd = data.results.map(r => r.Pd / 1000);

    container.innerHTML = `
        <div class="chart-container">
            <canvas id="sweepChart"></canvas>
        </div>
        <div class="results-grid" style="margin-top:16px;">
            <div class="result-card">
                <h3>Method</h3>
                <span class="value" style="font-size:1rem">${data.method}</span>
            </div>
            <div class="result-card">
                <h3>Speed Range</h3>
                <span class="value">${data.Vmin.toFixed(1)} - ${data.Vmax.toFixed(1)} m/s</span>
            </div>
            <div class="result-card">
                <h3>Points</h3>
                <span class="value">${data.n_points}</span>
            </div>
        </div>
    `;

    // Create chart
    const ctx = document.getElementById('sweepChart').getContext('2d');
    if (window.sweepChart) window.sweepChart.destroy();

    window.sweepChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: speeds,
            datasets: [
                {
                    label: 'Total Resistance [kN]',
                    data: rt,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: 'Effective Power [kW]',
                    data: pe,
                    borderColor: '#00b4d8',
                    backgroundColor: 'rgba(0,180,216,0.1)',
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: 'Delivered Power [kW]',
                    data: pd,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                title: { display: true, text: 'Resistance & Power vs Speed', font: { size: 16 } },
                legend: { position: 'top' },
            },
            scales: {
                x: { title: { display: true, text: 'Speed [knots]' } },
                y: { title: { display: true, text: 'Value' }, beginAtZero: true },
            },
        },
    });
}

// Show loading state
function showLoading() {
    document.getElementById('resultsContainer').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Running prediction...</p>
        </div>
    `;
}

// Show error
function showError(msg) {
    document.getElementById('resultsContainer').innerHTML = `<div class="error">${msg}</div>`;
}

// Predict single speed
async function predictSingle() {
    showLoading();
    const geometry = getGeometry();
    const Vs = parseFloat(document.getElementById('Vs').value);
    const method = document.getElementById('method').value;

    try {
        const response = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geometry, Vs, method }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        displayResult(data);
    } catch (e) {
        showError(`Prediction failed: ${e.message}`);
    }
}

// Run speed sweep
async function runSweep() {
    showLoading();
    const geometry = getGeometry();
    const Vmin = parseFloat(document.getElementById('Vmin').value);
    const Vmax = parseFloat(document.getElementById('Vmax').value);
    const n_points = parseInt(document.getElementById('n_points').value);
    const method = document.getElementById('method').value;

    try {
        const response = await fetch(`${API_BASE}/sweep`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geometry, Vmin, Vmax, n_points, method }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        displaySweep(data);
    } catch (e) {
        showError(`Sweep failed: ${e.message}`);
    }
}

// Event listeners
document.getElementById('predictBtn').addEventListener('click', predictSingle);
document.getElementById('sweepBtn').addEventListener('click', runSweep);

// Demo on load
window.addEventListener('load', () => {
    document.getElementById('resultsContainer').innerHTML = `
        <p class="placeholder">
            Configure your hull geometry and click <strong>Predict Single Speed</strong>
            or <strong>Run Speed Sweep</strong> to begin.
        </p>
    `;
});
