import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  Circle,
  Polyline,
  Polygon,
  useMap,
} from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './mapView.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [12.9719, 79.1602];

const DEFAULT_SEVERITY = {
  critical: { fill: '#ef4444', border: '#ff6b6b', label: 'CRITICAL' },
  high: { fill: '#f97316', border: '#fb923c', label: 'HIGH' },
  moderate: { fill: '#eab308', border: '#fde047', label: 'MODERATE' },
};

const COMPASS = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

function destination(lat, lon, bearingDeg, distanceM) {
  const R = 6371000;
  const b = (bearingDeg * Math.PI) / 180;
  const p1 = (lat * Math.PI) / 180;
  const l1 = (lon * Math.PI) / 180;
  const d = distanceM / R;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(
    Math.sin(b) * Math.sin(d) * Math.cos(p1),
    Math.cos(d) - Math.sin(p1) * Math.sin(p2),
  );
  return [(p2 * 180) / Math.PI, (l2 * 180) / Math.PI];
}

function offsetPosition(center, eastM, northM) {
  const east = destination(center[0], center[1], 90, Math.abs(eastM));
  const north = destination(east[0], east[1], northM >= 0 ? 0 : 180, Math.abs(northM));
  return north;
}

function ZoneStyle(feature) {
  const severity = feature?.properties?.severity;
  const s = DEFAULT_SEVERITY[severity] ?? DEFAULT_SEVERITY.moderate;
  return {
    fillColor: s.fill,
    fillOpacity: severity === 'critical' ? 0.55 : severity === 'high' ? 0.43 : 0.31,
    color: s.border,
    opacity: 0.9,
    weight: severity === 'critical' ? 2.4 : 1.35,
  };
}

function MapAutoFit({ hazardGeoJson, center, rescueRoute }) {
  const map = useMap();
  useEffect(() => {
    const latLngs = [];

    if (hazardGeoJson?.features?.length) {
      const geoLayer = L.geoJSON(hazardGeoJson);
      const b = geoLayer.getBounds();
      if (b.isValid()) {
        latLngs.push(b.getSouthWest(), b.getNorthEast());
      }
    }

    if (rescueRoute?.length) {
      rescueRoute.forEach((pt) => latLngs.push(L.latLng(pt[0], pt[1])));
    }

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16, animate: true, duration: 0.7 });
        return;
      }
    }

    map.setView(center, 14, { animate: false });
  }, [hazardGeoJson, center, rescueRoute, map]);

  return null;
}

function ScaleControl() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.scale({ imperial: false, metric: true, position: 'bottomleft', maxWidth: 120 });
    control.addTo(map);
    return () => control.remove();
  }, [map]);
  return null;
}

function MapTheme({ darkMode }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const tilePane = map.getPane('tilePane');

    if (darkMode) {
      container.classList.add('night-map');
      tilePane?.classList.add('night-map');
    } else {
      container.classList.remove('night-map');
      tilePane?.classList.remove('night-map');
    }
  }, [map, darkMode]);

  return null;
}

function FacilityOverlay({ position, configuration, diameter, height }) {
  const icon = useMemo(() => L.divIcon({
    className: 'facility-marker-wrapper',
    html: '<div class="facility-radar"><div class="facility-ring facility-ring-1"></div><div class="facility-ring facility-ring-2"></div><div class="facility-core">⚠</div></div>',
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  }), []);

  return (
    <Marker position={position} icon={icon} zIndexOffset={1000}>
      <Popup>
        <div className="map-popup">
          <div className="popup-kicker">SOURCE FACILITY</div>
          <strong>{configuration === 'dual_tank' ? 'DUAL TANK ARRAY' : 'SINGLE TANK'}</strong>
          <div className="popup-muted">Ø {diameter} m · H {height} m</div>
          <div className="popup-muted">Modeled hazard origin</div>
        </div>
      </Popup>
    </Marker>
  );
}

function FacilityGeometry({ center, configuration, diameter, height }) {
  const d = Number(diameter) || 20;
  const h = Number(height) || 15;
  const isDual = configuration === 'dual_tank';
  const sourceDiameter = isDual ? d / Math.sqrt(2) : d;
  const separation = Math.max(d * 1.5, sourceDiameter * 2);
  const offsets = isDual ? [-separation / 2, separation / 2] : [0];

  return (
    <>
      {offsets.map((east, index) => {
        const position = offsetPosition(center, east, 0);
        return (
          <Circle
            key={`tank-${index}`}
            center={position}
            radius={sourceDiameter / 2}
            pathOptions={{ color: '#f8fafc', weight: 2, opacity: 0.9, dashArray: '5 4', fillColor: '#0f172a', fillOpacity: 0.28 }}
          >
            <Popup>
              <div className="map-popup">
                <div className="popup-kicker">FACILITY GEOMETRY</div>
                <strong>{isDual ? `TANK ${index === 0 ? 'A' : 'B'}` : 'PRIMARY TANK'}</strong>
                <div className="popup-muted">Ø {sourceDiameter.toFixed(1)} m · H {h.toFixed(1)} m</div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}

function WindOverlay({ center, direction, speed }) {
  const downwind = (Number(direction) + 180) % 360;
  const endpoint = destination(center[0], center[1], downwind, 430);
  const left = destination(center[0], center[1], (downwind - 12 + 360) % 360, 285);
  const right = destination(center[0], center[1], (downwind + 12) % 360, 285);
  const arrowRotation = downwind - 90;

  const arrowIcon = L.divIcon({
    className: 'wind-arrow-wrapper',
    html: `<div class="wind-arrow" style="transform: rotate(${arrowRotation}deg)">➤</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  return (
    <>
      <Polygon
        positions={[center, left, endpoint, right]}
        pathOptions={{ color: '#38bdf8', weight: 1, opacity: 0.22, fillColor: '#38bdf8', fillOpacity: 0.035, dashArray: '6 8' }}
      />
      <Polyline
        positions={[center, endpoint]}
        pathOptions={{ color: '#38bdf8', weight: 3, opacity: 0.95, dashArray: '11 8', className: 'wind-vector-line' }}
      />
      <Marker position={endpoint} icon={arrowIcon} interactive={false} />
    </>
  );
}

function ApproachOverlay({ center, direction }) {
  if (!direction || direction === 'N/A' || direction === 'NA') return null;
  const bearing = COMPASS[String(direction).toUpperCase()];
  if (bearing === undefined) return null;
  const outer = destination(center[0], center[1], bearing, 350);
  const rotation = bearing - 90;
  return (
    <>
      <Polyline positions={[outer, center]} pathOptions={{ color: '#22c55e', weight: 2.5, opacity: 0.9, dashArray: '5 8' }} />
      <Marker
        position={outer}
        icon={L.divIcon({ className: 'approach-marker-wrapper', html: `<div class="approach-marker" style="transform:rotate(${rotation}deg)">➤</div>`, iconSize: [34, 34], iconAnchor: [17, 17] })}
      >
        <Popup>
          <div className="map-popup">
            <div className="popup-kicker">RESPONSE GUIDANCE</div>
            <strong>{String(direction).toUpperCase()} APPROACH</strong>
            <div className="popup-muted">Lowest modeled sector exposure.</div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

function NavigationOverlay({ route }) {
  if (!route || route.length === 0) return null;

  const startPoint = route[0];
  const endPoint = route[route.length - 1];

  const trackerIcon = L.divIcon({
    className: 'tracker-marker-wrapper',
    html: `
      <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(34, 197, 94, 0.25); border:1.5px solid #22c55e;"></div>
        <div style="width:22px; height:22px; border-radius:50%; background:#16a34a; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 10px #22c55e;">
          <div style="width:0; height:0; border-left:4px solid transparent; border-right:4px solid transparent; border-bottom:8px solid #ffffff; transform: rotate(-45deg);"></div>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  return (
    <>
      <Polyline
        positions={route}
        pathOptions={{
          color: '#22c55e',
          weight: 3.5,
          opacity: 0.95,
          dashArray: '8 7',
        }}
      />
      <Marker position={startPoint} icon={trackerIcon} zIndexOffset={1100}>
        <Popup>
          <div className="map-popup">
            <div className="popup-kicker">TACTICAL EVACUATION ROUTE</div>
            <strong>DISPATCH STAGING ORIGIN</strong>
            <div className="popup-muted">Safest computed transit waypoint</div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = 14,
  facilityPosition = DEFAULT_CENTER,
  hazardGeoJson = null,
  windDirection = 135,
  windSpeed = 8,
  hazardType = 'thermal',
  configuration = 'single_tank',
  recommendedApproach = 'N/A',
  tankDiameter = 20,
  tankHeight = 15,
  severityZones = [],
  rescueRoute = [],
}) {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('thermavector-map-theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('thermavector-map-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const isBlast = hazardType === 'blast' || hazardType === 'blast_overpressure';
  const unit = isBlast ? 'kPa' : 'kW/m²';
  const downwind = (Number(windDirection) + 180) % 360;
  const thresholds = Object.fromEntries(severityZones.map((z) => [z.severity, z.threshold]));

  return (
    <div className="map-wrapper">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        zoomControl
        className="threat-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapTheme darkMode={darkMode} />
        <ScaleControl />
        <MapAutoFit hazardGeoJson={hazardGeoJson} center={center} rescueRoute={rescueRoute} />

        {[100, 250, 500].map((r) => (
          <Circle
            key={r}
            center={facilityPosition}
            radius={r}
            pathOptions={{ color: '#94a3b8', weight: 1, opacity: r === 100 ? 0.3 : 0.17, dashArray: '4 8', fill: false }}
          />
        ))}

        <FacilityGeometry center={facilityPosition} configuration={configuration} diameter={tankDiameter} height={tankHeight} />
        <FacilityOverlay position={facilityPosition} configuration={configuration} diameter={tankDiameter} height={tankHeight} />
        <WindOverlay center={facilityPosition} direction={windDirection} speed={windSpeed} />
        <ApproachOverlay center={facilityPosition} direction={recommendedApproach} />

        {rescueRoute?.length > 0 && <NavigationOverlay route={rescueRoute} />}

        {hazardGeoJson?.type === 'FeatureCollection' && (
          <GeoJSON
            key={JSON.stringify(hazardGeoJson)}
            data={hazardGeoJson}
            style={ZoneStyle}
            onEachFeature={(feature, layer) => {
              const severity = feature?.properties?.severity;
              const intensity = feature?.properties?.intensity;
              const featureUnit = feature?.properties?.unit || unit;
              const s = DEFAULT_SEVERITY[severity] ?? DEFAULT_SEVERITY.moderate;
              layer.bindPopup(
                `<div class="map-popup">
                   <div class="popup-severity ${severity || ''}">${s.label}</div>
                   <div class="popup-value">${intensity ?? 'N/A'} <span>${featureUnit}</span></div>
                   <div class="popup-muted">25 m × 25 m modeled grid cell</div>
                 </div>`
              );
              layer.on({
                mouseover: (event) => {
                  event.target.setStyle({ weight: 3.5, fillOpacity: Math.min((ZoneStyle(feature).fillOpacity || 0.3) + 0.13, 0.78) });
                  event.target.bringToFront();
                },
                mouseout: (event) => event.target.setStyle(ZoneStyle(feature)),
              });
            }}
          />
        )}
      </MapContainer>

      <button
        type="button"
        className="map-theme-toggle"
        onClick={() => setDarkMode((value) => !value)}
        title={darkMode ? 'Switch to light map' : 'Switch to night map'}
      >
        <span className="theme-icon">{darkMode ? '☀' : '☾'}</span>
        <span>{darkMode ? 'DAY MAP' : 'NIGHT MAP'}</span>
      </button>

      <div className="map-hud map-hud-top-left">
        <div className="hud-status"><span className="hud-dot"></span> LIVE MODEL OUTPUT</div>
        <div className="hud-title">EXPOSURE FIELD</div>
        <div className="hud-subtitle">25 m × 25 m computational grid</div>
      </div>

      <div className="map-hud map-hud-top-right">
        <div className="hud-row"><span>WIND FROM</span><strong>{Number(windDirection).toFixed(0)}°</strong></div>
        <div className="hud-row"><span>SPEED</span><strong>{Number(windSpeed).toFixed(1)} m/s</strong></div>
        <div className="hud-row"><span>DOWNWIND</span><strong>{downwind.toFixed(0)}°</strong></div>
        <div className="hud-row"><span>GRID</span><strong>{hazardGeoJson?.features?.length ?? 0} cells</strong></div>
      </div>

      <div className="map-legend">
        <div className="legend-title">THREAT INTENSITY · {unit}</div>
        {Object.entries(DEFAULT_SEVERITY).map(([key, value]) => (
          <div className="legend-item" key={key}>
            <span className={`legend-box ${key}`} />
            <span>{value.label}</span>
            <span className="legend-threshold">{thresholds[key] ?? '—'}</span>
          </div>
        ))}
        <div className="legend-divider"></div>
        <div className="legend-foot"><span className="legend-line wind-line"></span> Downwind exposure vector</div>
        <div className="legend-foot"><span className="legend-line approach-line"></span> Lower-risk approach</div>
        {rescueRoute?.length > 0 && (
          <div className="legend-foot">
            <span className="legend-line" style={{ background: '#22c55e', borderTop: '2px dashed #22c55e', height: '0' }}></span> Evacuation / Approach Path
          </div>
        )}
        <div className="legend-foot"><span className="legend-tank"></span> Tank footprint</div>
      </div>

      <div className="wind-label">
        <span className="wind-icon">➤</span> WIND VECTOR · FROM {Number(windDirection).toFixed(0)}° → {downwind.toFixed(0)}°
      </div>
    </div>
  );
}