// --- Utilities ---
const clampDeg = d => ((d % 360) + 360) % 360;

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

function bearingBetween(lat1, lon1, lat2, lon2) {
  // great-circle initial bearing (forward azimuth)
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const dLambda = toRad(lon2 - lon1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1)*Math.cos(phi2) + Math.sin(phi1)*Math.sin(phi2)*Math.cos(dLambda);
  return clampDeg(toDeg(Math.atan2(y, x)));
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0088;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// --- DOM ---
const headingEl = document.getElementById('heading');
const headingSrcEl = document.getElementById('headingSrc');
const latEl = document.getElementById('lat');
const lonEl = document.getElementById('lon');
const accEl = document.getElementById('acc');
const spdEl = document.getElementById('spd');
const targetNameEl = document.getElementById('targetName');
const bearingEl = document.getElementById('bearing');
const distanceEl = document.getElementById('distance');

const needleNorth = document.getElementById('needleNorth');
const needleTarget = document.getElementById('needleTarget');

const enableBtn = document.getElementById('enableSensors');
const useTrueNorth = document.getElementById('useTrueNorth');

const targetSelect = document.getElementById('targetSelect');
const customLat = document.getElementById('customLat');
const customLon = document.getElementById('customLon');
const setCustom = document.getElementById('setCustom');

// Build minor ticks
(function buildTicks() {
  const ticks = document.getElementById('ticks');
  for (let i = 0; i < 360; i += 10) {
    const t = document.createElement('div');
    t.className = 'tick';
    if (i % 30 === 0) t.style.height = '16px';
    if (i % 90 === 0) t.style.height = '0px'; // majors handled separately
    t.style.transform = `rotate(${i}deg) translateY(8px)`;
    ticks.appendChild(t);
  }
})();

// --- State ---
let heading = null;      // degrees CW from North
let headingSrc = '—';
let position = null;     // { lat, lon, accuracy, speed }
let target = { name: 'North', lat: null, lon: null }; // North= bearing 0

// Qibla target (Kaaba)
const KAABA = { lat: 21.4225, lon: 39.8262 };

// Update UI needles & readouts
function render() {
  if (heading != null) {
    headingEl.textContent = heading.toFixed(0);
    headingSrcEl.textContent = `source: ${headingSrc}`;
    // North needle points to North relative to device top => rotate by -heading
    needleNorth.style.transform = `rotate(${-heading}deg)`;
  } else {
    headingEl.textContent = '—';
    headingSrcEl.textContent = 'source: —';
  }

  let bearing = 0, distance = NaN;
  if (position) {
    latEl.textContent = position.lat.toFixed(6);
    lonEl.textContent = position.lon.toFixed(6);
    accEl.textContent = position.accuracy != null ? position.accuracy.toFixed(0) : '—';
    spdEl.textContent = position.speed != null && !Number.isNaN(position.speed) ? position.speed.toFixed(2) : '—';

    if (target.name === 'North') {
      bearing = 0;
      distance = NaN;
    } else {
      const [tlat, tlon] = [target.lat, target.lon];
      if (typeof tlat === 'number' && typeof tlon === 'number') {
        bearing = bearingBetween(position.lat, position.lon, tlat, tlon);
        distance = haversineKm(position.lat, position.lon, tlat, tlon);
      }
    }
  }
  // show target info
  targetNameEl.textContent = target.name;
  bearingEl.textContent = Number.isFinite(bearing) ? bearing.toFixed(0) : '—';
  distanceEl.textContent = Number.isFinite(distance) ? distance.toFixed(1) : '—';

  // Rotate target needle to (bearing - heading). If heading unknown, point to absolute bearing from North.
  const rel = heading != null ? clampDeg(bearing - heading) : bearing;
  needleTarget.style.transform = `rotate(${rel}deg)`;
}

// --- Sensors ---

// iOS 13+ requires user gesture to request permission
async function requestIOSPermissionIfNeeded() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') {
    try {
      const response = await D.requestPermission();
      return response === 'granted';
    } catch (e) {
      console.warn('DeviceOrientation permission error:', e);
      return false;
    }
  }
  return true;
}

// Get heading from sensors
function startOrientation() {
  // Prefer webkitCompassHeading (iOS Safari)
  window.addEventListener('deviceorientation', (e) => {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') {
      h = e.webkitCompassHeading; // already degrees CW from North (true or magnetic depending on device)
      headingSrc = useTrueNorth.checked ? 'iOS (approx true)' : 'iOS';
    } else if (e.absolute === true && typeof e.alpha === 'number') {
      // alpha: 0 means North, increasing clockwise on some Androids when absolute
      // We'll assume CW from North, but many devices differ. This is a best-effort.
      h = 360 - e.alpha; // convert to CW from North
      headingSrc = e.absolute ? 'Absolute alpha' : 'Alpha (relative)';
    } else if (typeof e.alpha === 'number') {
      h = 360 - e.alpha;
      headingSrc = 'Alpha (relative)';
    }

    if (typeof h === 'number' && Number.isFinite(h)) {
      heading = clampDeg(h);
      render();
    }
  }, { capture: true, passive: true });
}

// Geolocation
function startGeolocation() {
  if (!('geolocation' in navigator)) {
    console.warn('Geolocation not supported');
    return;
  }
  navigator.geolocation.watchPosition((pos) => {
    const c = pos.coords;
    position = {
      lat: c.latitude,
      lon: c.longitude,
      accuracy: c.accuracy,
      speed: c.speed
    };
    render();
  }, (err) => {
    console.error('Geolocation error', err);
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
}

// Target selection logic
function setTargetFromUI() {
  const v = targetSelect.value;
  if (v === 'north') {
    target = { name: 'North', lat: null, lon: null };
    customLat.style.display = 'none';
    customLon.style.display = 'none';
    setCustom.style.display = 'none';
  } else if (v === 'qibla') {
    target = { name: 'Qibla', lat: KAABA.lat, lon: KAABA.lon };
    customLat.style.display = 'none';
    customLon.style.display = 'none';
    setCustom.style.display = 'none';
  } else {
    customLat.style.display = '';
    customLon.style.display = '';
    setCustom.style.display = '';
  }
  render();
}

targetSelect.addEventListener('change', setTargetFromUI);
setCustom.addEventListener('click', () => {
  const lat = parseFloat(customLat.value);
  const lon = parseFloat(customLon.value);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    target = { name: `Custom (${lat.toFixed(3)}, ${lon.toFixed(3)})`, lat, lon };
    targetNameEl.textContent = target.name;
    render();
  } else {
    alert('Enter valid latitude and longitude');
  }
});

enableBtn.addEventListener('click', async () => {
  const ok = await requestIOSPermissionIfNeeded();
  if (!ok) {
    alert('Permission denied. Please allow motion & orientation access in Safari settings.');
    return;
  }
  startOrientation();
  startGeolocation();
  enableBtn.disabled = true;
  enableBtn.textContent = 'Sensors Active';
});

// Initial render
render();
