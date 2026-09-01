import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon path issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function ThreatEstimatorMap() {
  const facilityLat = 13.0827;
  const facilityLng = 80.2707;

  // Interactive Control States
  const [targetTime, setTargetTime] = useState('2026-09-02T14:30');
  const [windSpeed, setWindSpeed] = useState(8.0);
  const [windDirection, setWindDirection] = useState(135.0);
  const [temperature, setTemperature] = useState(32.0);

  // API Response States
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Native Leaflet references
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Initialize Map ONCE
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      const map = L.map(mapRef.current, {
        center: [facilityLat, facilityLng],
        zoom: 17,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

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

  // Fetch from FastAPI Master ML API & Update Map Overlays
  const updateMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const formattedTime = targetTime.replace('T', ' ') + ':00';

      const response = await fetch('http://127.0.0.1:8000/api/predict-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_time: formattedTime,
          lat: facilityLat,
          lng: facilityLng,
          fuel_mass_kg: 14000,
          tank_diameter_m: 15.0,
          wall_thickness_m: 0.015,
          wind_speed_ms: parseFloat(windSpeed),
          wind_direction_deg: parseFloat(windDirection),
          temperature_c: parseFloat(temperature)
        })
      });

      if (!response.ok) throw new Error('Failed to connect to backend prediction API.');

      const data = await response.json();
      setPredictions(data);

      // Render native map overlays
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();

        // Target Marker
        L.marker([facilityLat, facilityLng])
          .addTo(layerGroupRef.current)
          .bindPopup("<b>Target Tank</b>");

        // Danger Zone Polygon
        if (data.geojson && data.geojson.danger_zone) {
          L.geoJSON(data.geojson.danger_zone, {
            style: { color: '#ff3333', fillColor: '#ff3333', fillOpacity: 0.6, weight: 2 }
          }).addTo(layerGroupRef.current);
        }

        // Moderate Zone Polygon
        if (data.geojson && data.geojson.moderate_zone) {
          L.geoJSON(data.geojson.moderate_zone, {
            style: { color: '#ffaa00', fillColor: '#ffaa00', fillOpacity: 0.4, weight: 2 }
          }).addTo(layerGroupRef.current);
        }
      }

    } catch (err) {
      console.error(err);
      setError('Error fetching predictions. Ensure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch whenever any parameter changes
  useEffect(() => {
    updateMapData();
  }, [targetTime, windSpeed, windDirection, temperature]);

  return (
    <div className="absolute inset-0 w-screen h-screen overflow-hidden font-sans bg-slate-950">
      
      {/* NATIVE LEAFLET MAP CONTAINER */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full z-0" />

      {/* TOP CONTROLS BAR */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur-md px-8 py-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center gap-6 text-gray-200">
        <div className="text-sm font-black uppercase tracking-wider text-red-500 mr-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
          Threat Control Hub:
        </div>

        <div className="flex flex-col">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Forecast Time</label>
          <input 
            type="datetime-local" 
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            className="border border-slate-700 rounded-xl px-3.5 py-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono shadow-inner"
          />
        </div>

        <div className="flex flex-col w-36">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Wind Speed (m/s)</label>
          <input 
            type="number" 
            step="0.5"
            value={windSpeed}
            onChange={(e) => setWindSpeed(e.target.value)}
            className="border border-slate-700 rounded-xl px-3.5 py-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono shadow-inner"
          />
        </div>

        <div className="flex flex-col w-36">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Wind Direction (°)</label>
          <input 
            type="number" 
            min="0" 
            max="360"
            value={windDirection}
            onChange={(e) => setWindDirection(e.target.value)}
            className="border border-slate-700 rounded-xl px-3.5 py-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono shadow-inner"
          />
        </div>

        <div className="flex flex-col w-36">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Temp (°C)</label>
          <input 
            type="number" 
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="border border-slate-700 rounded-xl px-3.5 py-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono shadow-inner"
          />
        </div>
      </div>

      {/* BOTTOM METRICS & LEGEND HUD */}
      <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none flex flex-col md:flex-row justify-between items-end gap-4">
        
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-5 rounded-2xl shadow-2xl text-xs text-slate-200 w-full md:w-[380px] space-y-2">
          <div className="font-bold text-slate-400 border-b border-slate-800 pb-2 mb-2 uppercase tracking-wider flex justify-between text-sm">
            <span>Simulation Diagnostics</span>
            <span className="text-red-400">LIVE FEED</span>
          </div>
          
          {loading && <em className="text-blue-400">Computing ML simulation...</em>}
          {error && <p className="text-red-400 font-bold">{error}</p>}

          {!loading && predictions && (
            <>
              <p className="flex justify-between text-sm"><span>Model Weather:</span> <b className="text-white">{predictions.environmental_forecast.temperature_c}°C, {predictions.environmental_forecast.humidity_pct}% Hum</b></p>
              <p className="flex justify-between text-sm"><span>Active Wind:</span> <b className="text-white">{predictions.environmental_forecast.wind_speed_ms} m/s @ {predictions.environmental_forecast.wind_direction_deg}°</b></p>
              <p className="flex justify-between text-sm"><span>Internal Stress:</span> <b className="text-white">{(predictions.threat_assessment.hoop_stress_pa / 1000000).toFixed(2)} MPa</b></p>
              <p className="text-red-400 font-bold pt-2 border-t border-slate-800 flex justify-between text-sm">
                <span>Time to Failure:</span> 
                <span>~{predictions.threat_assessment.time_to_failure_min} mins</span>
              </p>
            </>
          )}
        </div>

        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-4 rounded-2xl shadow-2xl text-xs text-slate-200 flex items-center gap-5">
          <div className="font-bold uppercase tracking-wider text-slate-400 border-r border-slate-800 pr-4">Zones</div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 bg-[#ff3333] opacity-80 rounded-md inline-block shadow-sm"></span> Lethal Zone (10+ psi)
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 bg-[#ffaa00] opacity-80 rounded-md inline-block shadow-sm"></span> Injury Zone (1+ psi)
          </div>
        </div>

      </div>

    </div>
  );
}