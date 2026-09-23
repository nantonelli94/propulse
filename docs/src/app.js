// PROPULSE Frontend Application - Client-side calculations
// All resistance prediction runs in the browser (no backend needed)

// ============== Calculation Engine ==============

function frictionCoefficient(Re) {
    if (Re < 1e5) Re = 1e5;
    return 0.075 / (Math.log10(Re) - 2) ** 2;
}

function frictionCoefficient2011(Re) {
    if (Re < 1e5) Re = 1e5;
    let Cf = 0.075 / (Math.log10(Re) - 2) ** 2;
    if (Re > 1e9) Cf *= 0.9;
    return Cf;
}

function wettedSurface(geom) {
    const L = geom.LWL, B = geom.B, T = geom.T;
    const Cb = geom.Cb, Cm = geom.Cm, Cp = geom.Cp, Cwp = geom.Cwp;
    const S = (L * (2 * T + B) * Math.sqrt(Cm)
        * (0.453 + 0.4425 * Cb - 0.2862 * Cm
            - 0.003467 * B / T + 0.3696 * Cwp)
        + 2.38 * (Cb / Cp));
    return S;
}

function waveResistance(geom, Vs) {
    const L = geom.LWL, B = geom.B, T = geom.T;
    const Cb = geom.Cb, Cp = geom.Cp, LCB = geom.LCB;
    const rho = geom.rho, g = geom.g;
    const S = wettedSurface(geom);

    let Fn = Vs / Math.sqrt(g * L);
    if (Fn < 0.1) Fn = 0.1;

    const c1 = 0.0015 * (Cb ** 0.5) * (T / B) ** 0.2 * (L / B) ** 0.1;
    const c2 = Math.exp(-0.5 * Fn ** (-0.9));
    const c3 = 1.0 + 0.02 * (Cp - 0.65) ** 2 + 0.001 * (Cb - 0.7) ** 2;
    let c4 = 1.0;
    if (Fn > 0.45) c4 = 1.0 - 0.5 * (Fn - 0.45) / 0.05;
    let c5;
    if (LCB < 0) {
        c5 = 1.0 + 0.0015 * (-LCB);
    } else {
        c5 = 1.0 + 0.0015 * LCB;
    }
    let transomCorr = 1.0;
    if (geom.has_transom && Fn > 0.35) transomCorr = 1.0 + 0.02 * (Fn - 0.35) ** 2;

    const Cw = c1 * c2 * c3 * c4 * c5 * transomCorr;
    return Cw * 0.5 * rho * Vs ** 2 * S;
}

function viscousResistance(geom, Vs) {
    const L = geom.LWL, T = geom.T, B = geom.B;
    const Cb = geom.Cb, rho = geom.rho;
    const S = wettedSurface(geom);
    const Re = Vs * L / geom.nu;
    const Rf = 0.5 * rho * Vs ** 2 * S * frictionCoefficient(Re);
    const k1 = 0.0947 * (Cb ** 1.281) * (T / B) ** 0.444;
    return k1 * Rf;
}

function additionalResistance(geom, Vs) {
    const rho = geom.rho;
    const S = wettedSurface(geom);
    const Caa = geom.windage_coeff;
    return 0.5 * rho * Vs ** 2 * S * Caa * 1e-3;
}

function appendageResistance(geom, Vs) {
    const rho = geom.rho;
    const S = wettedSurface(geom);
    const Re = Vs * geom.LWL / geom.nu;
    const Cf = frictionCoefficient(Re);
    let Rapp = 0.0;

    // Bulbous bow: additional resistance based on bulb geometry
    if (geom.has_bulbous_bow && geom.bulb_area > 0) {
        // Simplified Holtrop approach: Rb = k_b * (Ab / (L * T)) * 0.5 * rho * Vs^2 * S * Cf
        const k_b = 0.5 + 0.02 * (geom.bulb_height / geom.T);
        Rapp += k_b * (geom.bulb_area / (geom.LWL * geom.T)) * 0.5 * rho * Vs ** 2 * S * Cf;
    }

    // Transom stern: wave-making contribution at high Fn
    if (geom.has_transom && geom.transom_area > 0) {
        const Fn = Vs / Math.sqrt(geom.g * geom.LWL);
        if (Fn > 0.35) {
            const k_t = 0.02 * (Fn - 0.35) ** 2;
            Rapp += k_t * 0.5 * rho * Vs ** 2 * S;
        }
    }

    // Skeg: resistance proportional to skeg area
    if (geom.has_skeg && geom.skeg_area > 0) {
        const k_s = 0.0947 * (geom.Cb ** 1.281) * (geom.T / geom.B) ** 0.444;
        Rapp += k_s * (geom.skeg_area / S) * 0.5 * rho * Vs ** 2 * S * Cf;
    }

    // Shaft struts: resistance based on strut geometry
    if (geom.has_strut && geom.strut_area > 0) {
        const k_st = 0.08 + 0.002 * (geom.strut_angle || 0);
        Rapp += k_st * (geom.strut_area / S) * 0.5 * rho * Vs ** 2 * S * Cf;
    }

    // Stabilizer fins: resistance based on fin geometry
    if (geom.has_stabilizer && geom.fin_area > 0) {
        const k_f = 0.06 + 0.001 * ((geom.fin_span / geom.fin_chord) || 1);
        Rapp += k_f * (geom.fin_area / S) * 0.5 * rho * Vs ** 2 * S * Cf;
    }

    // Fallback to simplified k2 if no specific parameters
    if (Rapp === 0.0) {
        let k2 = 1.0;
        if (geom.has_bulbous_bow) k2 += 0.05;
        if (geom.has_transom) k2 += 0.02;
        if (geom.has_skeg) k2 += 0.03;
        if (geom.has_strut) k2 += 0.04;
        if (geom.has_stabilizer) k2 += 0.02;
        Rapp = 0.5 * rho * Vs ** 2 * S * k2 * Cf * 0.01;
    }

    return Rapp;
}

function hullEfficiency(geom) {
    const Cb = geom.Cb, Cp = geom.Cp, Z = geom.Z;
    const shaftAngle = geom.shaft_angle;
    let w = 0.1 * Cb + 0.2 * (1 - Cp);
    if (Z === 3) w *= 1.05;
    else if (Z === 4) w *= 1.0;
    else if (Z === 5) w *= 0.98;
    else if (Z >= 6) w *= 0.95;
    let t = 0.05 * w + 0.02 * shaftAngle;
    if (geom.has_bulbous_bow) t *= 0.95;
    const etaH = (1 - t) / (1 - w);
    return Math.max(0.4, Math.min(1.0, etaH));
}

function openWaterEfficiency(geom) {
    const P_D = geom.P_D, Ae_Ao = geom.Ae_Ao, Z = geom.Z;
    let etaO = 0.7 * (1 - 0.02 * (0.8 - P_D) ** 2 - 0.03 * (0.7 - Ae_Ao) ** 2);
    etaO *= (1 + 0.01 * (Z - 4));
    return Math.max(0.3, Math.min(0.85, etaO));
}

function rotativeEfficiency(geom) {
    let etaR = 1.0;
    if (geom.has_strut) etaR = 0.98;
    if (geom.shaft_angle > 0) etaR *= (1 - 0.005 * geom.shaft_angle);
    return etaR;
}

function shaftBearingEfficiency(geom) {
    let etaB = 0.99;
    if (geom.has_strut) etaB = 0.98;
    if (geom.shaft_angle > 5) etaB *= 0.995;
    return etaB;
}

function predictResistance(geom, Vs_knots, method) {
    const L = geom.LWL, g = geom.g;
    const rho = geom.rho;
    const S = wettedSurface(geom);

    // Convert knots to m/s
    const Vs = Vs_knots * 0.514444;

    const Fn = Vs / Math.sqrt(g * L);
    const Re = Vs * L / geom.nu;

    let Cf;
    if (method === 'holtrop2001') {
        Cf = frictionCoefficient2011(Re);
    } else {
        Cf = frictionCoefficient(Re);
    }

    const Rf = 0.5 * rho * Vs ** 2 * S * Cf;
    const Rw = waveResistance(geom, Vs);
    const Rv = viscousResistance(geom, Vs);
    const Ra = additionalResistance(geom, Vs);
    const Rapp = appendageResistance(geom, Vs);

    let Rw_add = 0.0;
    if (geom.has_transom && Fn > 0.35) {
        Rw_add = Math.max(0.0, 0.5 * rho * Vs ** 2 * S * 0.01 * (Fn - 0.35));
    }

    const Rt = Rf + Rw + Rv + Ra + Rapp + Rw_add;
    const Pe = Rt * Vs;

    const etaH = hullEfficiency(geom);
    const etaO = openWaterEfficiency(geom);
    const etaR = rotativeEfficiency(geom);
    const etaB = shaftBearingEfficiency(geom);
    const etaD = etaH * etaO * etaR * etaB;

    const Pd = Pe / etaD;

    return {
        Vs: Vs,
        V_knots: Vs * 1.94384,
        Fn: Fn,
        Re: Re,
        Rf: Rf,
        Rw: Rw,
        Rv: Rv,
        Ra: Ra,
        Rapp: Rapp,
        Rw_add: Rw_add,
        Rt: Rt,
        Pe: Pe,
        Pd: Pd,
        EHP: Pe / 745.7,
        SHP: Pd / 745.7,
        DHP: Pd / 745.7,
        etaH: etaH,
        etaO: etaO,
        etaR: etaR,
        etaB: etaB,
        etaD: etaD,
        Cf: Cf
    };
}

// ============== UI Helpers ==============

function getGeometry() {
    const geom = {
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

    // Appendage parameters
    if (geom.has_bulbous_bow) {
        geom.bulb_area = parseFloat(document.getElementById('bulb_area').value) || 0;
        geom.bulb_height = parseFloat(document.getElementById('bulb_height').value) || 0;
        geom.bulb_xpos = parseFloat(document.getElementById('bulb_xpos').value) || 0;
        geom.bulb_volume = parseFloat(document.getElementById('bulb_volume').value) || 0;
    }
    if (geom.has_transom) {
        geom.transom_area = parseFloat(document.getElementById('transom_area').value) || 0;
        geom.transom_draft = parseFloat(document.getElementById('transom_draft').value) || 0;
        geom.transom_width = parseFloat(document.getElementById('transom_width').value) || 0;
    }
    if (geom.has_skeg) {
        geom.skeg_area = parseFloat(document.getElementById('skeg_area').value) || 0;
        geom.skeg_length = parseFloat(document.getElementById('skeg_length').value) || 0;
        geom.skeg_height = parseFloat(document.getElementById('skeg_height').value) || 0;
        geom.skeg_xpos = parseFloat(document.getElementById('skeg_xpos').value) || 0;
    }
    if (geom.has_strut) {
        geom.strut_area = parseFloat(document.getElementById('strut_area').value) || 0;
        geom.strut_length = parseFloat(document.getElementById('strut_length').value) || 0;
        geom.strut_angle = parseFloat(document.getElementById('strut_angle').value) || 0;
        geom.strut_chord = parseFloat(document.getElementById('strut_chord').value) || 0;
    }
    if (geom.has_stabilizer) {
        geom.fin_area = parseFloat(document.getElementById('fin_area').value) || 0;
        geom.fin_span = parseFloat(document.getElementById('fin_span').value) || 0;
        geom.fin_chord = parseFloat(document.getElementById('fin_chord').value) || 0;
        geom.fin_xpos = parseFloat(document.getElementById('fin_xpos').value) || 0;
    }

    return geom;
}

// Toggle appendage parameter panels
function setupAppendageToggles() {
    const toggles = [
        { checkbox: 'has_bulbous_bow', panel: 'bulbous_bow_params' },
        { checkbox: 'has_transom', panel: 'transom_params' },
        { checkbox: 'has_skeg', panel: 'skeg_params' },
        { checkbox: 'has_strut', panel: 'strut_params' },
        { checkbox: 'has_stabilizer', panel: 'stabilizer_params' },
    ];
    toggles.forEach(({ checkbox, panel }) => {
        const cb = document.getElementById(checkbox);
        const p = document.getElementById(panel);
        if (!cb || !p) return;
        cb.addEventListener('change', () => {
            p.style.display = cb.checked ? 'block' : 'none';
        });
        // Initialize state
        p.style.display = cb.checked ? 'block' : 'none';
    });
}

function setupSchematicRedraw() {
    // Redraw schematic when key geometry values change
    const geometryInputs = ['LWL', 'B', 'T', 'D', 'Cp', 'Cb'];
    geometryInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', drawShipSchematic);
            el.addEventListener('input', debounce(drawShipSchematic, 300));
        }
    });

    // Redraw when appendage toggles change
    ['has_bulbous_bow', 'has_transom', 'has_skeg', 'has_strut', 'has_stabilizer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', drawShipSchematic);
    });
}

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

function formatNumber(value, unit, decimals = 2) {
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(decimals)} M${unit}`;
    else if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(decimals)} k${unit}`;
    return `${value.toFixed(decimals)} ${unit}`;
}

// ============== Display Results ==============

function displayResult(data) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="results-grid">
            <div class="result-card"><h3>Total Resistance</h3><span class="value">${formatNumber(data.Rt, 'N')}</span></div>
            <div class="result-card"><h3>Effective Power</h3><span class="value">${formatNumber(data.Pe, 'W')}</span></div>
            <div class="result-card"><h3>Delivered Power</h3><span class="value">${formatNumber(data.Pd, 'W')}</span></div>
            <div class="result-card"><h3>Speed</h3><span class="value">${data.V_knots.toFixed(2)}</span><span class="unit">knots</span></div>
            <div class="result-card"><h3>Froude Number</h3><span class="value">${data.Fn.toFixed(4)}</span></div>
            <div class="result-card"><h3>Reynolds Number</h3><span class="value">${formatNumber(data.Re, '', 0)}</span></div>
            <div class="result-card"><h3>Friction Coeff</h3><span class="value">${data.Cf.toFixed(5)}</span></div>
            <div class="result-card"><h3>Hull Efficiency</h3><span class="value">${(data.etaH * 100).toFixed(1)}</span><span class="unit">%</span></div>
            <div class="result-card"><h3>Propeller Efficiency</h3><span class="value">${(data.etaO * 100).toFixed(1)}</span><span class="unit">%</span></div>
            <div class="result-card"><h3>Delivered Efficiency</h3><span class="value">${(data.etaD * 100).toFixed(1)}</span><span class="unit">%</span></div>
            <div class="result-card"><h3>EHP</h3><span class="value">${formatNumber(data.EHP, 'W', 0)}</span></div>
            <div class="result-card"><h3>SHP</h3><span class="value">${formatNumber(data.SHP, 'W', 0)}</span></div>
        </div>
        <h3 style="margin-top:24px;color:var(--primary);">Resistance Components</h3>
        <div class="results-grid">
            <div class="result-card"><h3>Frictional Rf</h3><span class="value">${formatNumber(data.Rf, 'N')}</span></div>
            <div class="result-card"><h3>Wave Rw</h3><span class="value">${formatNumber(data.Rw, 'N')}</span></div>
            <div class="result-card"><h3>Viscous Rv</h3><span class="value">${formatNumber(data.Rv, 'N')}</span></div>
            <div class="result-card"><h3>Additional Ra</h3><span class="value">${formatNumber(data.Ra, 'N')}</span></div>
            <div class="result-card"><h3>Appendage Rapp</h3><span class="value">${formatNumber(data.Rapp, 'N')}</span></div>
            <div class="result-card"><h3>Transom Rw_add</h3><span class="value">${formatNumber(data.Rw_add, 'N')}</span></div>
        </div>
        <div class="chart-container" style="margin-top:24px;"><canvas id="singleChart"></canvas></div>
    `;

    destroyChart('singleChart');

    const ctx = document.getElementById('singleChart').getContext('2d');
    window.singleChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Rf', 'Rw', 'Rv', 'Ra', 'Rapp', 'Rw_add'],
            datasets: [{
                label: 'Resistance [kN]',
                data: [data.Rf / 1000, data.Rw / 1000, data.Rv / 1000, data.Ra / 1000, data.Rapp / 1000, data.Rw_add / 1000],
                backgroundColor: ['#ef4444', '#00b4d8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
                borderColor: ['#dc2626', '#0077b6', '#059669', '#d97706', '#7c3aed', '#db2777'],
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Resistance Components [kN]', font: { size: 16 } },
                legend: { display: false },
            },
            scales: {
                x: { title: { display: true, text: 'Component' } },
                y: { title: { display: true, text: 'Resistance [kN]' }, beginAtZero: true },
            },
        },
    });
}

function displaySweep(results, method, Vmin, Vmax, nPoints) {
    const container = document.getElementById('resultsContainer');
    const speeds = results.map(r => r.V_knots.toFixed(2));
    const rt = results.map(r => r.Rt / 1000);
    const pe = results.map(r => r.Pe / 1000);
    const pd = results.map(r => r.Pd / 1000);

    container.innerHTML = `
        <div class="chart-container"><canvas id="sweepChart"></canvas></div>
        <div class="results-grid" style="margin-top:16px;">
            <div class="result-card"><h3>Method</h3><span class="value" style="font-size:1rem">${method}</span></div>
            <div class="result-card"><h3>Speed Range</h3><span class="value">${Vmin.toFixed(1)} - ${Vmax.toFixed(1)} m/s</span></div>
            <div class="result-card"><h3>Points</h3><span class="value">${nPoints}</span></div>
        </div>
    `;

    destroyChart('sweepChart');

    const ctx = document.getElementById('sweepChart').getContext('2d');

    window.sweepChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: speeds,
            datasets: [
                { label: 'Total Resistance [kN]', data: rt, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4 },
                { label: 'Effective Power [kW]', data: pe, borderColor: '#00b4d8', backgroundColor: 'rgba(0,180,216,0.1)', fill: true, tension: 0.4 },
                { label: 'Delivered Power [kW]', data: pd, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { title: { display: true, text: 'Resistance & Power vs Speed', font: { size: 16 } }, legend: { position: 'top' } },
            scales: {
                x: { title: { display: true, text: 'Speed [knots]' } },
                y: { title: { display: true, text: 'Value' }, beginAtZero: true },
            },
        },
    });
}

function destroyChart(chartVar) {
    if (window[chartVar] && typeof window[chartVar].destroy === 'function') {
        window[chartVar].destroy();
        window[chartVar] = null;
    }
}

function showLoading() {
    document.getElementById('resultsContainer').innerHTML = '<div class="loading"><div class="spinner"></div><p>Running prediction...</p></div>';
}

function showError(msg) {
    document.getElementById('resultsContainer').innerHTML = `<div class="error">${msg}</div>`;
}

// ============== Event Handlers ==============

async function predictSingle() {
    showLoading();
    try {
        const geom = getGeometry();
        const Vs_knots = parseFloat(document.getElementById('Vs').value);
        const method = document.getElementById('method').value;
        const data = predictResistance(geom, Vs_knots, method);
        displayResult(data);
    } catch (e) {
        showError(`Prediction failed: ${e.message}`);
    }
}

async function runSweep() {
    showLoading();
    try {
        const geom = getGeometry();
        const Vmin_knots = parseFloat(document.getElementById('Vmin').value);
        const Vmax_knots = parseFloat(document.getElementById('Vmax').value);
        const nPoints = parseInt(document.getElementById('n_points').value);
        const method = document.getElementById('method').value;

        const results = [];
        for (let i = 0; i < nPoints; i++) {
            const Vs_knots = Vmin_knots + (Vmax_knots - Vmin_knots) * i / (nPoints - 1);
            results.push(predictResistance(geom, Vs_knots, method));
        }
        displaySweep(results, method, Vmin_knots, Vmax_knots, nPoints);
    } catch (e) {
        showError(`Sweep failed: ${e.message}`);
    }
}

document.getElementById('predictBtn').addEventListener('click', predictSingle);
document.getElementById('sweepBtn').addEventListener('click', runSweep);

window.addEventListener('load', () => {
    setupAppendageToggles();
    setupSchematicRedraw();
    drawShipSchematic();
    document.getElementById('resultsContainer').innerHTML = '<p class="placeholder">Configure your hull geometry and click <strong>Predict Single Speed</strong> or <strong>Run Speed Sweep</strong> to begin.</p>';
});

// ============== Ship Schematic Drawing ==============

function drawShipSchematic() {
    const canvas = document.getElementById('shipCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Get geometry
    const LWL = parseFloat(document.getElementById('LWL').value) || 100;
    const B = parseFloat(document.getElementById('B').value) || 15;
    const T = parseFloat(document.getElementById('T').value) || 5;
    const D = parseFloat(document.getElementById('D').value) || 3.5;
    const Cb = parseFloat(document.getElementById('Cb').value) || 0.7;
    const Cp = parseFloat(document.getElementById('Cp').value) || 0.65;

    // Scale
    const margin = 60;
    const scaleX = (W - 2 * margin) / LWL;
    const scaleY = (H - 2 * margin) / (B * 1.2);
    const scale = Math.min(scaleX, scaleY);

    const shipL = LWL * scale;
    const shipB = B * scale;
    const shipD = D * scale;
    const shipT = T * scale;

    const startX = (W - shipL) / 2;
    const startY = margin + shipB / 2;

    // Waterline
    const waterlineY = startY + shipT / 2;

    // Baseline
    const baselineY = startY - shipT / 2;

    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const y = margin + i * (H - 2 * margin) / 10;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(W - margin, y);
        ctx.stroke();
    }
    for (let i = 0; i <= 10; i++) {
        const x = margin + i * (W - 2 * margin) / 10;
        ctx.beginPath();
        ctx.moveTo(x, margin);
        ctx.lineTo(x, H - margin);
        ctx.stroke();
    }

    // Draw ship hull (side view)
    ctx.strokeStyle = '#1e3a5c';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(30, 58, 92, 0.08)';

    ctx.beginPath();

    // Bottom line (keel)
    ctx.moveTo(startX + shipL * 0.05, baselineY);
    ctx.lineTo(startX + shipL * 0.95, baselineY);

    // Stern (AP) - afterbody
    ctx.lineTo(startX + shipL, baselineY - shipT * 0.15);
    ctx.lineTo(startX + shipL, waterlineY);

    // Deck line
    ctx.lineTo(startX + shipL * 0.08, waterlineY);

    // Bow (FP) - forebody
    ctx.quadraticCurveTo(
        startX + shipL * 0.02, waterlineY - shipT * 0.3,
        startX, waterlineY - shipT * 0.1
    );

    // Close path
    ctx.lineTo(startX + shipL * 0.05, baselineY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bulbous bow
    if (document.getElementById('has_bulbous_bow').checked) {
        ctx.fillStyle = '#00b4d8';
        ctx.strokeStyle = '#0077b6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(
            startX - shipL * 0.02,
            baselineY - shipT * 0.05,
            shipL * 0.015,
            shipT * 0.08,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
    }

    // Waterline
    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX - 10, waterlineY);
    ctx.lineTo(startX + shipL + 10, waterlineY);
    ctx.stroke();

    // Baseline
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(startX - 10, baselineY);
    ctx.lineTo(startX + shipL + 10, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draft line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(startX + shipL * 0.05, baselineY);
    ctx.lineTo(startX + shipL * 0.05, waterlineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#1e3a5c';
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.textAlign = 'center';

    // AP (Aft Perpendicular)
    ctx.fillText('AP', startX + shipL + 20, baselineY + 5);

    // FP (Forward Perpendicular)
    ctx.fillText('FP', startX - 20, baselineY + 5);

    // Baseline label
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText('Baseline', startX + shipL + 35, baselineY + 5);

    // Waterline label
    ctx.fillStyle = '#0077b6';
    ctx.fillText('Waterline', startX + shipL + 45, waterlineY - 5);

    // Draft arrow
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX + shipL * 0.05 - 8, baselineY);
    ctx.lineTo(startX + shipL * 0.05 - 8, waterlineY);
    ctx.stroke();
    // Arrow heads
    ctx.beginPath();
    ctx.moveTo(startX + shipL * 0.05 - 12, waterlineY);
    ctx.lineTo(startX + shipL * 0.05 - 8, waterlineY);
    ctx.lineTo(startX + shipL * 0.05 - 12, baselineY);
    ctx.stroke();

    // Midship mark
    const midX = startX + shipL / 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(midX, baselineY);
    ctx.lineTo(midX, waterlineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Length dimension
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, baselineY + 25);
    ctx.lineTo(startX + shipL, baselineY + 25);
    ctx.stroke();
    // End ticks
    ctx.beginPath();
    ctx.moveTo(startX, baselineY + 20);
    ctx.lineTo(startX, baselineY + 30);
    ctx.moveTo(startX + shipL, baselineY + 20);
    ctx.lineTo(startX + shipL, baselineY + 30);
    ctx.stroke();

    // LWL label
    ctx.fillStyle = '#475569';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText(`LWL = ${LWL.toFixed(1)} m`, startX + shipL / 2, baselineY + 40);

    // Title
    ctx.fillStyle = '#1e3a5c';
    ctx.font = 'bold 16px Segoe UI, sans-serif';
    ctx.fillText('Side View (Profile)', W / 2, 25);

    // Superstructure (simplified)
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    const ssWidth = shipL * 0.15;
    const ssHeight = shipT * 0.4;
    const ssX = startX + shipL * 0.75;
    const ssY = waterlineY - ssHeight;
    ctx.fillRect(ssX, ssY, ssWidth, ssHeight);
    ctx.strokeRect(ssX, ssY, ssWidth, ssHeight);

    // Bridge
    ctx.fillStyle = '#94a3b8';
    const bridgeWidth = shipL * 0.08;
    const bridgeHeight = shipT * 0.25;
    ctx.fillRect(ssX + ssWidth * 0.2, waterlineY - bridgeHeight - ssHeight, bridgeWidth, bridgeHeight);
    ctx.strokeRect(ssX + ssWidth * 0.2, waterlineY - bridgeHeight - ssHeight, bridgeWidth, bridgeHeight);

    // Funnel
    ctx.fillStyle = '#475569';
    ctx.fillRect(ssX + ssWidth * 0.5, waterlineY - bridgeHeight - ssHeight - shipT * 0.15, shipL * 0.02, shipT * 0.15);
}
