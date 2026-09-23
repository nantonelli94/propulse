# PROPULSE — Conceptual Ship Resistance & Power Prediction

Open-source tool for resistance and propulsive efficiency prediction in the conceptual design phase of displacement ships.

## Features

- **3 prediction methods**: Holtrop & Mennen (1982), Holtrop (2001), ITTC 1978
- **Resistance components**: frictional, wave-making, viscous, appendage, additional
- **Propulsion efficiencies**: hull, propeller open-water, rotative, shaft bearing
- **Speed sweep**: full resistance and power curves over a speed range
- **Modern web UI**: interactive charts, bilingual (EN/ES)
- **REST API**: integrate with your own design workflows

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js (for frontend dev server)

### Install

```bash
# Clone the repository
git clone https://github.com/nantonelli94/propulse.git
cd propulse

# Install backend dependencies
pip install -r backend/requirements.txt

# Start the backend (port 8000)
python main.py
```

### Run Frontend

```bash
cd frontend
python -m http.server 3000
# Open http://localhost:3000
```

### Run Tests

```bash
cd backend
pytest tests/ -v
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| GET | `/methods` | List available methods |
| POST | `/predict` | Single speed prediction |
| POST | `/sweep` | Speed sweep prediction |

### Example API Call

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "geometry": {
      "LWL": 100, "B": 15, "T": 5, "D": 3.5,
      "Cp": 0.65, "Cb": 0.70, "Cm": 0.85, "Cwp": 0.75,
      "LCB": 0, "S": 1800, "Disp": 3500, "Vs": 8,
      "rho": 1025, "nu": 1.188e-6, "g": 9.81,
      "Z": 4, "P_D": 0.8, "Ae_Ao": 0.7, "shaft_angle": 0,
      "has_bulbous_bow": true, "has_transom": false,
      "has_skeg": false, "has_strut": false, "has_stabilizer": false,
      "roughness_k": 150e-6, "windage_coeff": 1.0, "air_density": 1.225
    },
    "Vs": 8.0,
    "method": "holtrop1982"
  }'
```

## Methods

### Holtrop & Mennen (1982)

Classic approximate power prediction method widely used in conceptual design.

- **Range**: Fn 0.15–0.45, Cp 0.55–0.85
- **Accuracy**: ±5–10% for displacement ships
- **Best for**: General cargo, tankers, bulk carriers

### Holtrop (2001)

Revised method with updated coefficients.

- **Range**: Fn 0.15–0.50, Cp 0.55–0.85
- **Accuracy**: ±4–8% for displacement ships
- **Best for**: Higher-speed displacement ships

### ITTC 1978

ITTC Recommended Procedure 14.302-01.

- **Range**: Fn 0.15–0.45
- **Accuracy**: ±6–12% for displacement ships
- **Best for**: Benchmark comparisons, validation

## Project Structure

```
propulse/
├── backend/
│   ├── api/
│   │   └── main.py          # FastAPI application
│   ├── models/
│   │   └── geometry.py      # Pydantic data models
│   ├── methods/
│   │   └── __init__.py      # Resistance prediction methods
│   ├── tests/
│   │   └── test_methods.py  # Unit tests
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── assets/
│   │   └── style.css
│   └── src/
│       └── app.js
├── docs/
│   ├── methods/
│   └── examples/
├── data/
│   ├── examples/
│   └── validation/
├── scripts/
├── main.py
└── README.md
```

## License

MIT License — see [LICENSE](LICENSE) for details.

## References

1. Holtrop, J., & Mennen, G. G. J. (1982). "An approximate power prediction method." *International Shipbuilding Progress*, 29(335).
2. ITTC (1978). "ITTC Recommended Procedures: Performance Prediction Method." 14th International Towing Tank Conference.
3. Holtrop, J. (2001). "Ship design: resistance and propulsion." Delft University of Technology.

## Author

**Nicolas Antonelli** — Naval Architect & CFD Engineer

- GitHub: [@nantonelli94](https://github.com/nantonelli94)
- LinkedIn: [Nicolas Antonelli](https://linkedin.com/in/nantonelli94)

---

*PROPULSE is a community-driven open-source project. Contributions, bug reports, and feature requests are welcome!*
