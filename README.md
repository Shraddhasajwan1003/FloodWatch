# FloodWatch India (Project 103)
## National Flood Intelligence & Emergency Safe-Route Platform

An end-to-end, India-wide flood monitoring, risk assessment, forecasting, and emergency safe-route decision-support web application.

---

## 🌟 Key Features

1. **National Interactive Flood Map**
   - Centered on India with real OpenStreetMap tiles.
   - Layers for monitored districts, river telemetry points, official warnings, citizen road hazards, and designated shelters/hospitals.
   - Click any point or district pin to inspect live telemetry and explainable risk breakdown.

2. **Explainable 4-Level Flood Risk Scoring**
   - **GREEN** (Below Warning, 0–24)
   - **YELLOW** (Watch, 25–49)
   - **ORANGE** (High Risk, 50–74)
   - **RED** (Severe Risk, 75–100)
   - Full mathematical breakdown: recent 1h rain, 6h rain, forecast 24h rain, river level vs danger mark, citizen reports.
   - **Statutory Precedence:** Official NDMA / IMD alerts take precedence and cannot be downgraded by internal scores.
   - **Data Integrity:** Missing data is explicitly reported as gaps, never defaulted to zero or false safety.

3. **Emergency Safe-Route Planner**
   - Powered by OSRM driving engine.
   - Compares **Fastest Route** vs. **Lower Flood Exposure Route** vs. **Balanced Alternative**.
   - Identifies reported waterlogged road closures and submerged underpasses.
   - Quick navigation to nearby verified hospitals and evacuation shelters.

4. **River Telemetry & Basin Discharge Monitoring**
   - Basin monitoring for Brahmaputra, Yamuna, Ganga, Mahanadi, and Periyar rivers.
   - 7-day GloFAS hydrodynamic discharge forecasts (m³/s) with local warning and danger marks.
   - Transparent disclaimer distinguishing model telemetry from Central Water Commission (CWC) staff gauge observations.

5. **24-Hour & 7-Day Rainfall & Flood Outlook**
   - 48-hour hourly precipitation curves from Open-Meteo.
   - 7-day weather outlook with distinct hydrological flood risk matrix.
   - Clear scientific separation between atmospheric rainfall forecasts and street inundation.

6. **Citizen Incident Reporting**
   - Motorists and residents can report street waterlogging, submerged underpasses, or road closures with photos.
   - Reports enter as **UNVERIFIED** to prevent duplicate manipulation, corroborated by spatial clustering, and expire after 3 hours.

7. **Ground-Truth AI Flood Assistant**
   - Grounded decision-support chatbot explaining risk scores, river metrics, underpass hazards, and official alert sources.
   - Operates 100% locally with rule-based explainability — zero paid API keys required.

8. **Bilingual & Accessible**
   - English and Hindi (हिन्दी) translations with i18next.
   - A+ font size accessibility toggle, high contrast badge colors, and keyboard focus outlines.

---

## 🏛️ Architecture & Tech Stack

```text
Frontend (React 19 + TypeScript + Vite + Tailwind CSS v4 + React-Leaflet + Recharts)
                              │
                    REST API (JSON over HTTP)
                              ▼
Backend (FastAPI + Python 3.11 + Pydantic v2 + SQLAlchemy 2.0 Async + SQLite/PostGIS)
   ├─ Weather & Rainfall ────── Open-Meteo Forecast API (Live, CC BY 4.0)
   ├─ River Discharge ───────── Open-Meteo Flood API / GloFAS (Live, CC BY 4.0)
   ├─ Geocoding ─────────────── OpenStreetMap Nominatim
   ├─ Safe Routing Engine ───── Project OSRM Public Driving Router
   ├─ Risk Scoring Service ──── Explainable Weighted Heuristic (v1)
   └─ Database ──────────────── SQLite (Dev) / PostgreSQL + PostGIS (Prod)
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Start the Backend API
Open a terminal in `D:\Flood\backend`:
```powershell
# Navigate to backend
cd D:\Flood\backend

# Run the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend will:
- Automatically initialize database tables (`FloodWatch.db`)
- Seed reference administrative data (all 36 Indian states/UTs, monitored districts, river stations, initial data sources, and verified hospitals)
- Serve interactive OpenAPI docs at: **http://127.0.0.1:8000/api/docs**

### 2. Start the Frontend
Open a second terminal in `D:\Flood\frontend`:
```powershell
# Navigate to frontend
cd D:\Flood\frontend

# Start Vite development server
npm run dev
```
Open your browser at: **http://localhost:5173**

---

## ☁️ Production Deployment (Vercel + Render)

Deploy the Vite frontend to Vercel and the FastAPI API to Render. The backend
uses SQLite locally, but use Render PostgreSQL for production data so it
survives service restarts and redeploys.

### 1. Create the Render database

1. In the [Render Dashboard](https://dashboard.render.com/), create a PostgreSQL
   database in the same region as the backend web service.
2. Copy its **Internal Database URL**. Render supplies a URL beginning with
   `postgres://` or `postgresql://`; for this async SQLAlchemy app, use the same
   credentials and host, but change the scheme to
   `postgresql+asyncpg://`.

### 2. Deploy the backend to Render

Create a **Web Service** connected to this repository and configure:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Python |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

Add these environment variables to the web service:

| Key | Value |
|---|---|
| `DATABASE_URL` | Render PostgreSQL URL with the `postgresql+asyncpg://` scheme |
| `ALLOWED_ORIGINS` | JSON array of the Vercel site origins, e.g. `["https://your-app.vercel.app"]` |
| `DEBUG` | `false` |
| `SECRET_KEY` | A unique random secret; generate locally with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |

If you use a custom Vercel domain, include that exact origin in `ALLOWED_ORIGINS`
as well. Origins must include `https://` and must not have a trailing slash.
After deployment, check `https://<your-render-service>.onrender.com/api/health`;
interactive API documentation is at `/api/docs`.

### 3. Deploy the frontend to Vercel

1. Import the same repository in Vercel.
2. Set **Root Directory** to `frontend` and use:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add this environment variable before deploying:

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com/api/v1` |

   The variable must include `/api/v1`. Vite reads it at build time, so redeploy
   after changing it.
4. Once Vercel gives you the site URL, add that URL to the Render service's
   `ALLOWED_ORIGINS` value and redeploy/restart the backend.

`frontend/vercel.json` sends app routes to the Vite entry point so URLs such as
`/map` also work when opened or refreshed directly.

### Production notes

- Render's local filesystem is ephemeral unless you attach a persistent disk.
  Uploaded report photos are currently stored in `backend/uploads`; to retain
  photos across deploys, mount a Render persistent disk there and set
  `UPLOAD_DIR` to that mount path. Alternatively, use object storage for uploads.
- Render free web services may sleep when idle, so the first API request after
  inactivity can take longer. Use an always-on service for production/emergency
  use.
- SQLite is suitable for local development only on ephemeral hosting. The
  backend creates database tables and seeds reference data when it starts.

---

## 🧪 Running Automated Tests

To run the complete backend test suite:
```powershell
cd D:\Flood\backend
python -m pytest tests/
```
All 7 unit and integration tests will execute and verify:
- Four-level risk classification calculation
- Official warning override precedence
- Missing input integrity handling
- Health and status endpoints
- Nationwide state and district location queries
- Data source transparency registry

To run the frontend production build:
```powershell
cd D:\Flood\frontend
npm run build
```

---

## 📋 Data Sources & Limitations

| Source | Provider | Access Method | Status | Notes |
|---|---|---|---|---|
| Open-Meteo Forecast | Open-Meteo GmbH | REST API (Free, CC BY 4.0) | ✅ Integrated | High resolution weather reanalysis & forecast |
| Open-Meteo Flood | GloFAS / Copernicus CEMS | REST API (Free, CC BY 4.0) | ✅ Integrated | River discharge hydrodynamic model |
| Nominatim | OpenStreetMap | REST API (ODbL) | ✅ Integrated | Geocoding with country restriction to India |
| Routing Engine | Project OSRM | REST API | ✅ Integrated | Route alternatives with hazard buffer intersection |
| Central Water Commission (CWC) | Ministry of Jal Shakti | Restricted Portal | ⚠️ Documented Gap | No unrestricted open public REST API |
| NDMA SACHET | NDMA India | Web Feed | ✅ Supported | Official warning metadata structure |

---

## 🛡️ License & Safety Disclaimer
This project is an educational decision-support platform built for emergency awareness. It is not an official replacement for statutory emergency announcements or statutory evacuation orders issued by the National Disaster Management Authority (NDMA) or District Disaster Management Authorities (DDMAs).
