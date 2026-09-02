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

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
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

function FacilityOverlay({ position, configuration, diameter, height }) {
  const icon = useMemo(() => L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:54px; height:54px;">
        <div style="position:absolute; inset:8px; border:1px solid rgba(239,68,68,0.55); border-radius:50%;"></div>
        <div style="position:absolute; inset:15px; display:grid; place-items:center; border-radius:50%; background:#dc2626; border:2px solid #fee2e2; color:white; font-size:15px; box-shadow:0 0 20px rgba(239,68,68,0.8);">⚠</div>
      </div>
    `,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  }), []);

  return (
    <Marker position={position} icon={icon} zIndexOffset={1000}>
      <Popup>
        <div style={{ minWidth: '145px', fontFamily: 'monospace' }}>
          <div style={{ color: '#64748b', fontSize: '9px', letterSpacing: '0.12em', marginBottom: '5px' }}>SOURCE FACILITY</div>
          <strong style={{ color: '#0f172a' }}>{configuration === 'dual_tank' ? 'DUAL TANK ARRAY' : 'SINGLE TANK'}</strong>
          <div style={{ color: '#64748b', fontSize: '9px', marginTop: '4px' }}>Ø {diameter} m · H {height} m</div>
          <div style={{ color: '#64748b', fontSize: '9px' }}>Modeled hazard origin</div>
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
              <div style={{ minWidth: '145px', fontFamily: 'monospace' }}>
                <div style={{ color: '#64748b', fontSize: '9px', letterSpacing: '0.12em', marginBottom: '5px' }}>FACILITY GEOMETRY</div>
                <strong style={{ color: '#0f172a' }}>{isDual ? `TANK ${index === 0 ? 'A' : 'B'}` : 'PRIMARY TANK'}</strong>
                <div style={{ color: '#64748b', fontSize: '9px', marginTop: '4px' }}>Ø {sourceDiameter.toFixed(1)} m · H {h.toFixed(1)} m</div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}

function WindOverlay({ center, direction }) {
  const downwind = (Number(direction) + 180) % 360;
  const endpoint = destination(center[0], center[1], downwind, 430);
  const left = destination(center[0], center[1], (downwind - 12 + 360) % 360, 285);
  const right = destination(center[0], center[1], (downwind + 12) % 360, 285);
  const arrowRotation = downwind - 90;

  const arrowIcon = L.divIcon({
    className: '',
    html: `<div style="width:34px; height:34px; display:grid; place-items:center; color:#38bdf8; font-size:27px; line-height:1; transform: rotate(${arrowRotation}deg); text-shadow:0 0 12px rgba(56,189,248,0.9);">➤</div>`,
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
        pathOptions={{ color: '#38bdf8', weight: 3, opacity: 0.95, dashArray: '11 8' }}
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
        icon={L.divIcon({
          className: '',
          html: `<div style="width:32px; height:32px; display:grid; place-items:center; border-radius:50%; background:rgba(20,83,45,0.94); border:1px solid #4ade80; color:#86efac; font-size:18px; box-shadow:0 0 18px rgba(34,197,94,0.45); transform:rotate(${rotation}deg);">➤</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })}
      >
        <Popup>
          <div style={{ minWidth: '145px', fontFamily: 'monospace' }}>
            <div style={{ color: '#64748b', fontSize: '9px', letterSpacing: '0.12em', marginBottom: '5px' }}>RESPONSE GUIDANCE</div>
            <strong style={{ color: '#0f172a' }}>{String(direction).toUpperCase()} APPROACH</strong>
            <div style={{ color: '#64748b', fontSize: '9px', marginTop: '4px' }}>Lowest modeled sector exposure.</div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

function NavigationOverlay({ route }) {
  if (!route || route.length === 0) return null;
  const startPoint = route[0];

  const trackerIcon = L.divIcon({
    className: '',
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
          <div style={{ minWidth: '145px', fontFamily: 'monospace' }}>
            <div style={{ color: '#64748b', fontSize: '9px', letterSpacing: '0.12em', marginBottom: '5px' }}>TACTICAL EVACUATION ROUTE</div>
            <strong style={{ color: '#0f172a' }}>DISPATCH STAGING ORIGIN</strong>
            <div style={{ color: '#64748b', fontSize: '9px', marginTop: '4px' }}>Safest computed transit waypoint</div>
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
  // Defaults to dark mode for the tactical command look
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('thermavector-map-theme');
    return saved !== null ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('thermavector-map-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const isBlast = hazardType === 'blast' || hazardType === 'blast_overpressure';
  const unit = isBlast ? 'kPa' : 'kW/m²';
  const downwind = (Number(windDirection) + 180) % 360;
  const thresholds = Object.fromEntries(severityZones.map((z) => [z.severity, z.threshold]));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '560px', overflow: 'hidden', borderRadius: '12px', background: '#020617' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        zoomControl
        style={{ width: '100%', height: '100%', minHeight: '620px', background: '#090d16' }}
      >
        {/* NATIVE HIGH-CONTRAST DARK / LIGHT TILE SWITCH */}
        {darkMode ? (
          <TileLayer
            key="carto-dark"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
        ) : (
          <TileLayer
            key="osm-standard"
            attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

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
              layer.bindPopup(`
                <div style="min-width:145px; font-family:monospace;">
                  <div style="font-weight:900; font-size:12px; margin-bottom:3px; color:${s.fill};">${s.label}</div>
                  <div style="font-weight:900; font-size:16px; color:#0f172a;">${intensity ?? 'N/A'} <span style="font-size:10px; font-weight:600;">${featureUnit}</span></div>
                  <div style="color:#64748b; font-size:9px; margin-top:4px;">25 m × 25 m modeled grid cell</div>
                </div>
              `);
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

      {/* THEME TOGGLE BUTTON */}
      <button
        type="button"
        onClick={() => setDarkMode((v) => !v)}
        style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(2,6,23,0.88)',
          border: '1px solid rgba(148,163,184,0.3)',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span>{darkMode ? '☀' : '☾'}</span>
        <span>{darkMode ? 'DAY MAP' : 'NIGHT MAP'}</span>
      </button>

      {/* TOP LEFT HUD */}
      <div style={{
        position: 'absolute',
        top: '14px',
        left: '14px',
        zIndex: 500,
        pointerEvents: 'none',
        background: 'rgba(2,6,23,0.88)',
        border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: '8px',
        padding: '10px 14px',
        backdropFilter: 'blur(8px)',
        color: '#e2e8f0',
        fontFamily: 'monospace',
      }}>
        <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '9px', letterSpacing: '0.12em' }}>● LIVE MODEL OUTPUT</div>
        <div style={{ fontWeight: 900, fontSize: '14px', marginTop: '4px', letterSpacing: '0.08em' }}>EXPOSURE FIELD</div>
        <div style={{ color: '#64748b', fontSize: '9px', marginTop: '2px' }}>25 m × 25 m computational grid</div>
      </div>

      {/* TOP RIGHT HUD */}
      <div style={{
        position: 'absolute',
        top: '60px',
        right: '14px',
        zIndex: 500,
        pointerEvents: 'none',
        background: 'rgba(2,6,23,0.88)',
        border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: '8px',
        padding: '8px 12px',
        minWidth: '160px',
        backdropFilter: 'blur(8px)',
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#94a3b8',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>WIND FROM</span><strong style={{ color: '#7dd3fc' }}>{Number(windDirection).toFixed(0)}°</strong></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>SPEED</span><strong style={{ color: '#7dd3fc' }}>{Number(windSpeed).toFixed(1)} m/s</strong></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>DOWNWIND</span><strong style={{ color: '#7dd3fc' }}>{downwind.toFixed(0)}°</strong></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>GRID</span><strong style={{ color: '#7dd3fc' }}>{hazardGeoJson?.features?.length ?? 0} cells</strong></div>
      </div>

      {/* MAP LEGEND */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        left: '14px',
        zIndex: 500,
        width: '220px',
        padding: '12px',
        borderRadius: '8px',
        background: 'rgba(2,6,23,0.92)',
        border: '1px solid rgba(148,163,184,0.2)',
        backdropFilter: 'blur(8px)',
        color: '#cbd5e1',
        fontFamily: 'monospace',
        fontSize: '10px',
      }}>
        <div style={{ color: '#f8fafc', fontSize: '9px', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '8px' }}>THREAT INTENSITY · {unit}</div>
        {Object.entries(DEFAULT_SEVERITY).map(([key, value]) => (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: value.fill, border: '1px solid rgba(255,255,255,0.3)' }} />
            <span>{value.label}</span>
            <span style={{ color: '#64748b' }}>{thresholds[key] ?? '—'}</span>
          </div>
        ))}
        <div style={{ height: '1px', background: 'rgba(148,163,184,0.15)', margin: '8px 0' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', marginTop: '4px' }}>
          <span style={{ width: '16px', height: '2px', background: '#38bdf8' }}></span> Downwind exposure vector
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', marginTop: '4px' }}>
          <span style={{ width: '16px', height: '2px', background: '#22c55e' }}></span> Lower-risk approach
        </div>
        {rescueRoute?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', marginTop: '4px' }}>
            <span style={{ width: '16px', height: '0', borderTop: '2px dashed #22c55e' }}></span> Evacuation / Approach Path
          </div>
        )}
      </div>

      {/* WIND FOOTER LABEL */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        right: '14px',
        zIndex: 500,
        padding: '7px 11px',
        borderRadius: '6px',
        background: 'rgba(2,6,23,0.88)',
        border: '1px solid rgba(56,189,248,0.3)',
        color: '#7dd3fc',
        fontWeight: 700,
        fontFamily: 'monospace',
        fontSize: '9px',
        pointerEvents: 'none',
      }}>
        ➤ WIND VECTOR · FROM {Number(windDirection).toFixed(0)}° → {downwind.toFixed(0)}°
      </div>
    </div>
  );
}