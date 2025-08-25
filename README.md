## Realtime Geographical Compass (Flask + HTML/CSS/JS)

A mobile-friendly, realtime compass that uses **Device Orientation** + **Geolocation** to show your current heading and a **target direction** (North / Qibla / Custom Lat-Lon). Built with **Flask** (Python) and vanilla **HTML/CSS/JS**.

> Works best on a smartphone with motion sensors. On iOS you must tap **Enable Sensors** due to permission requirements.

---

## Features
- Live **heading** from device sensors (DeviceOrientation / webkitCompassHeading)
- Live **location** (lat, lon, accuracy, speed) using `navigator.geolocation`
- **Targets**:
  - **North** (0°)
  - **Qibla** (Kaaba: 21.4225, 39.8262)
  - **Custom** (enter any latitude/longitude)
- Shows **bearing** and **distance** (Haversine) to target
- Modern UI, smooth needle animations
- Flask server for local development & LAN sharing

---

## Project Structure
```
geocompass_realtime/
│── app.py
│── README.md
│── templates/
│     └── index.html
│── static/
│     ├── style.css
│     └── main.js
```

---

## Quick Start

### 1) Install & Run
```bash
pip install flask
python app.py
```
Open: `http://localhost:5000/`

**Mobile test on same Wi‑Fi**: find your computer’s LAN IP (e.g. `192.168.0.10`) and open `http://<LAN-IP>:5000/` on your phone.

> **Sensors & HTTPS**: Many browsers require **HTTPS or localhost** for motion/geo sensors. Running via `localhost` is fine. For phone over LAN, consider a self‑signed HTTPS dev proxy or use Android Chrome flags for testing only.

### 2) Enable Sensors
- On iOS (Safari): tap **Enable Sensors** when prompted.
- Make a **figure‑8** motion to calibrate the compass.
- Avoid magnets/metal surfaces.

---

## How It Works (Math)
- **Heading**: taken from `DeviceOrientationEvent`. On iOS, `webkitCompassHeading` is used; on Android, `event.alpha` (best‑effort).
- **Bearing** (initial great‑circle azimuth):
  ```js
  bearing = atan2( sin(Δλ)·cos(φ2),
                   cos(φ1)·cos(φ2) + sin(φ1)·sin(φ2)·cos(Δλ) )
  ```
- **Distance**: Haversine formula with Earth radius ≈ 6371.0088 km.
- **Qibla**: fixed Kaaba coordinates (21.4225, 39.8262); bearing/distance computed from your live location.

> Note: Magnetic vs True North can differ by local **declination**. This demo does not apply declination correction; you can add a geomagnetic model (e.g., WMM) if needed.

---

## Files Overview
- `app.py` — Flask server (binds `0.0.0.0:5000` so phone on LAN can access)
- `templates/index.html` — Markup + layout
- `static/style.css` — Styling (modern glassy dial)
- `static/main.js` — Sensors, target logic, math, UI updates

---

## Browser & Device Notes
- **iOS**: Requires user gesture (`Enable Sensors`) to grant motion permissions.
- **Android/Chrome**: Usually works on localhost; may need **HTTPS** for LAN testing depending on version.
- **Desktop**: Most desktops lack motion sensors—heading will be `—` but geolocation can still show.

---

## Extend Ideas
- Apply **geomagnetic declination** to approximate True North
- Add a basemap (Leaflet/Mapbox) to visualize target line
- Make it a **PWA**: installable, offline assets
- Record and plot heading/location time series

---

## Privacy
- All sensor data stays in your browser; no backend API endpoints collect any data in this demo.


© mdkhademali