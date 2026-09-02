import { useLocation, useNavigate } from 'react-router-dom';
import MapView from './components/map/MapView';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();

  const scenario = location.state?.scenario;
  const estimate = location.state?.estimate;
  const forecast = location.state?.forecast;
  const hazardPrediction = location.state?.hazardPrediction;

  if (!scenario || !estimate) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-300 font-sans">
        <div className="text-center">
          <div className="text-4xl mb-3">◌</div>
          <p className="mb-4">No threat-estimation result is loaded.</p>
          <button
            type="button"
            onClick={() => navigate('/configure')}
            className="px-5 py-2 rounded bg-white text-slate-950 font-bold cursor-pointer hover:bg-slate-200 transition-colors"
          >
            CREATE SCENARIO
          </button>
        </div>
      </div>
    );
  }

  // --- 1. Extract Grid Data & Physical Attributes ---
  const latitude = Number(scenario.facility?.latitude ?? 13.0827);
  const longitude = Number(scenario.facility?.longitude ?? 80.2707);
  const configuration = scenario.facility?.configuration ?? 'single_tank';
  const hazardType = scenario.hazard?.type ?? 'thermal_radiation';
  const hazardLabel = hazardType === 'blast_overpressure' ? 'BLAST OVERPRESSURE' : 'THERMAL RADIATION';
  const unit = hazardType === 'blast_overpressure' ? 'kPa' : 'kW/m²';

  const envForecast = forecast?.environmental_forecast || {};
  const threatAssessment = forecast?.threat_assessment || {};

  const windDirection = Number(
    estimate.wind?.direction_from_deg ??
    envForecast.wind_direction_deg ??
    scenario.environment?.wind_direction_deg ??
    135
  );
  const windSpeed = Number(
    estimate.wind?.speed_m_s ??
    envForecast.wind_speed_ms ??
    scenario.environment?.wind_speed_mps ??
    8
  );
  const downwind = (windDirection + 180) % 360;

  const blastProb = hazardPrediction?.blast_probability;
  const threatLevel = hazardPrediction?.threat_level ?? 'ELEVATED';
  const tankVolume =
    hazardPrediction?.tank_volume_m3 ??
    Math.round(
      Math.PI * Math.pow(Number(scenario.facility?.diameter_m || 20) / 2, 2) * Number(scenario.facility?.height_m || 15)
    );
  const recommendedApproach = estimate.lower_hazard_approach_direction ?? 'SW';

  // --- 2. Extract Discrete Grid Square GeoJSON & Routing ---
  const gridGeoJson =
    estimate.geojson?.type === 'FeatureCollection'
      ? estimate.geojson
      : { type: 'FeatureCollection', features: estimate.geojson?.features || [] };

  const cellCount = estimate.metadata?.feature_count ?? gridGeoJson.features?.length ?? 0;
  const severityZones = Array.isArray(estimate.severity_zones) ? estimate.severity_zones : [];
  const rescueRoute = hazardPrediction?.rescue_route || forecast?.tactical_routing?.safe_approach_route || [];

  return (
    <div className="min-h-[calc(100vh-100px)] pb-6 font-sans text-gray-200 max-w-7xl mx-auto px-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div>
          <div className="text-[10px] font-mono tracking-[.25em] text-red-400 mb-1">
            THERMAVECTOR / CELLULAR GRID ESTIMATION
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Discrete Grid Exposure Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            25m cell grid resolution · {cellCount} active exposure cells · {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          <span className="px-3 py-1.5 rounded border border-green-900 bg-green-950/30 text-green-300">
            ● GRID GENERATED
          </span>
          <span className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-300">
            {configuration === 'dual_tank' ? 'DUAL TANK ARRAY' : 'SINGLE TANK'}
          </span>
          <span className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-orange-300">
            {hazardLabel}
          </span>
          <span className="px-3 py-1.5 rounded border border-sky-900 bg-sky-950/40 text-sky-300">
            WIND {windSpeed.toFixed(1)} m/s · {windDirection.toFixed(0)}°
          </span>
          {threatLevel && (
            <span
              className={`px-3 py-1.5 rounded border font-bold ${
                threatLevel === 'CRITICAL'
                  ? 'border-red-900 bg-red-950/50 text-red-400 animate-pulse'
                  : 'border-yellow-900 bg-yellow-950/40 text-yellow-300'
              }`}
            >
              THREAT: {threatLevel}
            </span>
          )}
        </div>
      </div>

      {/* TOP METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-3">
        {[
          ['ACTIVE CELLS', `${cellCount}`, 'squares', 'text-amber-400'],
          ['BLAST PROB', `${blastProb ?? '--'}%`, 'chance', 'text-orange-400'],
          ['HOOP STRESS', `${threatAssessment.hoop_stress_pa ? (threatAssessment.hoop_stress_pa / 1000000).toFixed(2) : '--'}`, 'MPa', 'text-yellow-400'],
          ['TANK VOLUME', `${tankVolume ?? '--'}`, 'm³', 'text-sky-300'],
          ['TIME TO FAIL', `~${threatAssessment.time_to_failure_min ?? '--'}`, 'mins', 'text-red-400'],
          ['SAFE VECTOR', `↙ ${recommendedApproach}`, 'sector', 'text-green-400'],
        ].map(([label, value, unitLabel, color]) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 shadow-md">
            <div className="text-[9px] font-mono text-slate-500 tracking-wider">{label}</div>
            <div className={`mt-1 font-black font-mono text-sm ${color}`}>
              {value} <span className="text-[9px] text-slate-600">{unitLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3.3fr)_minmax(300px,1fr)] gap-3">
        {/* LEFT: MAP VIEW WITH SQUARE GRID CELLS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative min-h-[620px] shadow-xl">
          <MapView
            center={[latitude, longitude]}
            facilityPosition={[latitude, longitude]}
            windDirection={windDirection}
            windSpeed={windSpeed}
            hazardGeoJson={gridGeoJson}
            hazardType={hazardType}
            configuration={configuration}
            recommendedApproach={recommendedApproach}
            tankDiameter={scenario.facility?.diameter_m}
            tankHeight={scenario.facility?.height_m}
            severityZones={severityZones}
            rescueRoute={rescueRoute}
          />
        </div>

        {/* RIGHT: SIDEBAR PANELS */}
        <div className="space-y-3">
          {/* SEVERITY ZONE CELL METRICS */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                Grid Hazard Matrix
              </h3>
              <span className="text-[9px] font-mono text-red-400 bg-red-950/40 border border-red-900/50 px-2 py-0.5 rounded">
                CELL SIZE: 25m
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Critical Tier */}
              <div className="bg-red-950/30 border border-red-900/60 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-red-500/10 rounded-bl-full pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-red-400 uppercase">Critical Zone</span>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  </div>
                  <div className="text-lg font-black text-white font-mono mt-1">
                    {severityZones.find((z) => z.severity === 'critical')?.cell_count ?? 0}{' '}
                    <span className="text-xs text-red-400 font-normal">cells</span>
                  </div>
                </div>
                <div className="mt-2 text-[9px] text-red-300/80 font-mono border-t border-red-900/40 pt-1.5">
                  &gt; {hazardType === 'blast_overpressure' ? '55.2 kPa' : '10.0 kW/m²'}
                </div>
              </div>

              {/* High Risk Tier */}
              <div className="bg-orange-950/30 border border-orange-900/60 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-orange-500/10 rounded-bl-full pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-orange-400 uppercase">High Zone</span>
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  </div>
                  <div className="text-lg font-black text-white font-mono mt-1">
                    {severityZones.find((z) => z.severity === 'high')?.cell_count ?? 0}{' '}
                    <span className="text-xs text-orange-400 font-normal">cells</span>
                  </div>
                </div>
                <div className="mt-2 text-[9px] text-orange-300/80 font-mono border-t border-orange-900/40 pt-1.5">
                  {hazardType === 'blast_overpressure' ? '24.1 - 55.2 kPa' : '5.0 - 10.0 kW/m²'}
                </div>
              </div>

              {/* Moderate Exposure Tier */}
              <div className="bg-yellow-950/30 border border-yellow-900/60 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-yellow-500/10 rounded-bl-full pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase">Moderate Zone</span>
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  </div>
                  <div className="text-lg font-black text-white font-mono mt-1">
                    {severityZones.find((z) => z.severity === 'moderate')?.cell_count ?? 0}{' '}
                    <span className="text-xs text-yellow-400 font-normal">cells</span>
                  </div>
                </div>
                <div className="mt-2 text-[9px] text-yellow-300/80 font-mono border-t border-yellow-900/40 pt-1.5">
                  {hazardType === 'blast_overpressure' ? '6.9 - 24.1 kPa' : '2.0 - 5.0 kW/m²'}
                </div>
              </div>

              {/* Safe Buffer Tier */}
              <div className="bg-emerald-950/30 border border-emerald-900/60 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Safe Approach</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="text-lg font-black text-white font-mono mt-1">↙ {recommendedApproach}</div>
                </div>
                <div className="mt-2 text-[9px] text-emerald-300/80 font-mono border-t border-emerald-900/40 pt-1.5 flex justify-between">
                  <span>VECTOR:</span>
                  <span className="font-bold text-green-400">LEAST HAZARD</span>
                </div>
              </div>
            </div>

            {/* Emergency Banner */}
            <div
              className={`mt-2.5 border rounded-lg p-3 flex items-center gap-3 ${
                threatLevel === 'CRITICAL'
                  ? 'bg-red-950/50 border-red-600/50'
                  : 'bg-orange-950/50 border-orange-600/50'
              }`}
            >
              <div className="text-xl animate-bounce">🚨</div>
              <div className="flex-1">
                <div
                  className={`text-[10px] font-black uppercase tracking-wider font-mono ${
                    threatLevel === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'
                  }`}
                >
                  Grid Cell Evacuation Threshold
                </div>
                <div className="text-[10px] text-slate-300">
                  Total bounded perimeter covers {cellCount * 625} m² across discrete assessment points.
                </div>
              </div>
            </div>
          </section>

          {/* RESPONSE GUIDANCE */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-black text-xs uppercase tracking-widest">Tactical Routing</h3>
              <span className="text-[9px] font-mono text-green-400 border border-green-900 bg-green-950/30 px-2 py-1 rounded">
                CALCULATED
              </span>
            </div>
            <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-3">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">Recommended Staging Approach</div>
              <div className="text-3xl font-black text-green-400 mt-1">↙ {recommendedApproach}</div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Discrete grid cell flux modeling determined this bearing yields lowest environmental accumulation.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-slate-950 rounded border border-slate-800 p-2">
                <div className="text-[9px] text-slate-600">WIND FROM</div>
                <div className="font-mono text-sky-300 text-sm mt-1">{windDirection.toFixed(0)}°</div>
              </div>
              <div className="bg-slate-950 rounded border border-slate-800 p-2">
                <div className="text-[9px] text-slate-600">DOWNWIND</div>
                <div className="font-mono text-sky-300 text-sm mt-1">{downwind.toFixed(0)}°</div>
              </div>
            </div>
          </section>

          {/* COMPUTATIONAL PROVENANCE */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-3">Model Provenance</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono">
              <div>
                <span className="text-slate-600">RESOLUTION</span>
                <div className="text-slate-300 mt-0.5">25m Cells (500m Box)</div>
              </div>
              <div>
                <span className="text-slate-600">ALGORITHM</span>
                <div className="text-slate-300 mt-0.5">Point Source Flux Matrix</div>
              </div>
              <div>
                <span className="text-slate-600">VECTOR MATH</span>
                <div className="text-slate-300 mt-0.5">Atmospheric Attenuation</div>
              </div>
              <div>
                <span className="text-slate-600">UNIT</span>
                <div className="text-slate-300 mt-0.5">{unit}</div>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={() => navigate('/configure')}
            className="w-full py-3 rounded-lg bg-white text-slate-950 font-black text-xs tracking-widest hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ← RUN ANOTHER SCENARIO
          </button>
        </div>
      </div>
    </div>
  );
}