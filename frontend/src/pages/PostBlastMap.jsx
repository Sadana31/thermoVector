import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon path issue in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function PostBlastMap() {
  const facilityLat = 13.0827;
  const facilityLng = 80.2707;

  const [timeOffset, setTimeOffset] = useState(0);
  const [tankDiameter, setTankDiameter] = useState(15);
  const [tankHeight, setTankHeight] = useState(12);
  const [windDeg, setWindDeg] = useState(60);
  const [windSpeed, setWindSpeed] = useState(15);
  const [mapStyle, setMapStyle] = useState('street');

  const [hazardData, setHazardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Native Leaflet references
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const tileLayerRef = useRef(null);

  const tileUrls = {
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  // 1. Initialize Map ONCE
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      const map = L.map(mapRef.current, {
        center: [facilityLat, facilityLng],
        zoom: 14,
        zoomControl: false
      });

      tileLayerRef.current = L.tileLayer(tileUrls.street, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      layerGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Handle Base Map Tile Style Switch
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = L.tileLayer(tileUrls[mapStyle], { maxZoom: 19, attribution: '© Map Contributors' }).addTo(mapInstanceRef.current);
    }
  }, [mapStyle]);

  // 3. Fetch Data & Render Native Layers
  const updatePrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/predict-hazard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: facilityLat,
          lng: facilityLng,
          wind_deg: parseFloat(windDeg),
          wind_speed: parseFloat(windSpeed),
          tank_diameter: parseFloat(tankDiameter),
          tank_height: parseFloat(tankHeight),
          time_offset_min: parseInt(timeOffset)
        })
      });

      if (!response.ok) throw new Error('Failed to connect to backend hazard prediction API.');

      const data = await response.json();
      setHazardData(data);

      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();

        // Incident Epicenter Marker
        L.circleMarker([facilityLat, facilityLng], { radius: 8, color: '#ffffff', fillColor: '#ef4444', fillOpacity: 1 })
          .addTo(layerGroupRef.current)
          .bindPopup("<b>Incident Epicenter</b>");

        // Staging Unit Marker
        if (data.staging_point) {
          L.circleMarker(data.staging_point, { radius: 8, color: '#ffffff', fillColor: '#00e5ff', fillOpacity: 1 })
            .addTo(layerGroupRef.current)
            .bindPopup("<b>Rescue Staging Unit</b>");
        }

        // Hazard Zones (GeoJSON)
        if (data.zones) {
          data.zones.forEach(zone => {
            L.geoJSON(zone, {
              style: {
                color: zone.properties.color,
                fillColor: zone.properties.color,
                fillOpacity: zone.properties.opacity,
                weight: 2
              }
            }).addTo(layerGroupRef.current);
          });
        }

        // Rescue Path Polyline
        if (data.rescue_route) {
          L.polyline(data.rescue_route, {
            color: '#00e5ff',
            weight: 5,
            opacity: 0.9,
            dashArray: '8, 8'
          }).addTo(layerGroupRef.current);
        }
      }

    } catch (err) {
      console.error(err);
      setError('Error fetching post-blast data. Ensure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updatePrediction();
  }, [timeOffset, tankDiameter, tankHeight, windDeg, windSpeed]);

  const threatLevel = hazardData?.threat_level || 'EVALUATING';
  const blastProb = hazardData?.blast_probability ?? 0.0;
  const tankVolume = hazardData?.tank_volume_m3 ?? 0;

  return (
    <div className="absolute inset-0 w-screen h-screen overflow-hidden font-sans bg-[#0f172a] text-[#f8fafc]">
      
      {/* NATIVE LEAFLET CONTAINER (No react-leaflet hooks wrapper) */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full z-0" />

      {/* FLOATING SIDEBAR PANEL */}
      <div className="absolute top-5 left-5 z-[1000] w-[360px] max-h-[calc(100vh-40px)] overflow-y-auto bg-[rgba(15,23,42,0.92)] backdrop-blur-[14px] border border-white/15 rounded-2xl p-6 shadow-2xl">
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider">DER-02 Emergency Response</h2>
          <span className="bg-[#ef444422] text-[#f87171] border border-[#ef444455] px-2.5 py-1 rounded-full text-[11px] font-bold">
            STATUS: {threatLevel}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setMapStyle('street')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${mapStyle === 'street' ? 'bg-[#0284c7] text-white border-[#38bdf8]' : 'bg-[#1e293b] text-[#94a3b8] border-[#334155]'}`}
          >
            Street Map
          </button>
          <button 
            onClick={() => setMapStyle('dark')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${mapStyle === 'dark' ? 'bg-[#0284c7] text-white border-[#38bdf8]' : 'bg-[#1e293b] text-[#94a3b8] border-[#334155]'}`}
          >
            Dark Map
          </button>
          <button 
            onClick={() => setMapStyle('sat')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${mapStyle === 'sat' ? 'bg-[#0284c7] text-white border-[#38bdf8]' : 'bg-[#1e293b] text-[#94a3b8] border-[#334155]'}`}
          >
            Satellite
          </button>
        </div>

        <div className="bg-[rgba(30,41,59,0.7)] border border-white/10 rounded-xl p-4 mb-4 flex justify-between items-center">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#94a3b8] font-semibold">Predicted Blast Risk P(Blast)</div>
            <div className="text-2xl font-bold text-[#38bdf8]">{blastProb}%</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#94a3b8] font-semibold text-right">Est. Volume</div>
            <div className="text-sm font-bold text-[#38bdf8] text-right">{tankVolume.toLocaleString()} m³</div>
          </div>
        </div>

        {loading && <div className="text-xs text-[#38bdf8] mb-3 animate-pulse">Running post-blast simulations...</div>}
        {error && <div className="text-xs text-red-400 mb-3 font-bold">{error}</div>}

        <div className="mb-4">
          <div className="flex justify-between mb-1.5 text-xs font-medium text-slate-200">
            <span>Prediction Timeline</span>
            <span className="text-[#38bdf8] font-bold">T + {timeOffset} Mins ({(timeOffset / 60.0).toFixed(1)} hrs)</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="120" 
            step="30" 
            value={timeOffset}
            onChange={(e) => setTimeOffset(e.target.value)}
            className="w-full h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-1.5 text-xs font-medium text-slate-200">
            <span>Tank Diameter</span>
            <span className="text-[#38bdf8] font-bold">{tankDiameter} m</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="40" 
            value={tankDiameter}
            onChange={(e) => setTankDiameter(e.target.value)}
            className="w-full h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-1.5 text-xs font-medium text-slate-200">
            <span>Tank Height</span>
            <span className="text-[#38bdf8] font-bold">{tankHeight} m</span>
          </div>
          <input 
            type="range" 
            min="4" 
            max="30" 
            value={tankHeight}
            onChange={(e) => setTankHeight(e.target.value)}
            className="w-full h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-1.5 text-xs font-medium text-slate-200">
            <span>Wind Direction (Origin)</span>
            <span className="text-[#38bdf8] font-bold">{windDeg}°</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="360" 
            value={windDeg}
            onChange={(e) => setWindDeg(e.target.value)}
            className="w-full h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
          />
        </div>

        <div className="mb-5">
          <div className="flex justify-between mb-1.5 text-xs font-medium text-slate-200">
            <span>Wind Velocity</span>
            <span className="text-[#38bdf8] font-bold">{windSpeed} m/s</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="35" 
            value={windSpeed}
            onChange={(e) => setWindSpeed(e.target.value)}
            className="w-full h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
          />
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2.5">Standard Emergency Hazard Zones</div>
          <div className="flex items-center text-xs mb-2 text-slate-200">
            <div className="w-3.5 h-3.5 rounded bg-[#ef4444] mr-2.5 shrink-0"></div> Critical Danger Zone (Red)
          </div>
          <div className="flex items-center text-xs mb-2 text-slate-200">
            <div className="w-3.5 h-3.5 rounded bg-[#f97316] mr-2.5 shrink-0"></div> High Hazard Zone (Orange)
          </div>
          <div className="flex items-center text-xs mb-2 text-slate-200">
            <div className="w-3.5 h-3.5 rounded bg-[#eab308] mr-2.5 shrink-0"></div> Moderate Risk Zone (Yellow)
          </div>
          <div className="flex items-center text-xs mb-2 text-slate-200">
            <div className="w-3.5 h-3.5 rounded bg-[#22c55e] mr-2.5 shrink-0"></div> Safe Buffer Zone (Green)
          </div>
          <div className="flex items-center text-xs text-slate-200">
            <div className="w-4 h-1 bg-[#00e5ff] rounded mr-2.5 shrink-0"></div> Shortest Safest Rescue Path
          </div>
        </div>

      </div>

    </div>
  );
}