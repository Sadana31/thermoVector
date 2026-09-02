import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Configure() {
  const navigate = useNavigate();
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  // 1. State Contract
  const [scenario, setScenario] = useState({
    facility: {
      configuration: 'single_tank',
      latitude: 13.0827,
      longitude: 80.2707,
      diameter_m: 20,
      height_m: 15,
      wall_thickness_m: 0.015,
      fuel_mass_kg: 50000,
    },
    environment: {
      wind_speed_mps: 8.0,
      wind_direction_deg: 135,
      target_time: '2026-09-02T14:30',
    },
    hazard: {
      type: 'thermal_radiation',
    }
  });

  // 2. Derived Calculations
  const calculatedVolume = Math.round(
    Math.PI * Math.pow(scenario.facility.diameter_m / 2, 2) * scenario.facility.height_m
  );

  // 3. Handlers
  const updateFacility = (field, value) => {
    setScenario(prev => ({
      ...prev,
      facility: {
        ...prev.facility,
        [field]: Number(value) || value
      }
    }));
    setError(null);
  };

  const updateEnv = (field, value) => {
    setScenario(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [field]: field === 'target_time' ? value : Number(value)
      }
    }));
    setError(null);
  };

  const handleCalculate = async () => {
    if (scenario.facility.diameter_m <= 0) return setError('⚠ Diameter must be greater than 0.');
    if (scenario.facility.height_m <= 0) return setError('⚠ Height must be greater than 0.');
    if (scenario.environment.wind_speed_mps < 0 || scenario.environment.wind_speed_mps > 100) {
      return setError('⚠ Wind speed must be between 0 and 100 m/s.');
    }
    if (scenario.environment.wind_direction_deg < 0 || scenario.environment.wind_direction_deg >= 360) {
      return setError('⚠ Wind direction must be between 0° and 359.9°.');
    }
    if (scenario.facility.latitude < -90 || scenario.facility.latitude > 90) {
      return setError('⚠ Latitude must be between -90° and 90°.');
    }
    if (scenario.facility.longitude < -180 || scenario.facility.longitude > 180) {
      return setError('⚠ Longitude must be between -180° and 180°.');
    }

    setIsCalculating(true);
    setError(null);

    // Format time for Pandas/FastAPI
    const formattedTime = scenario.environment.target_time.includes('T')
      ? scenario.environment.target_time.replace('T', ' ') + ':00'
      : '2026-09-02 14:30:00';

    // Map UI labels to backend FastAPI Enums
    const configEnum = scenario.facility.configuration === 'dual_tank' ? 'dual' : 'single';
    const hazardEnum = scenario.hazard.type === 'blast_overpressure' ? 'blast' : 'thermal';

    // 1. Grid Heatmap Estimate Payload (/api/v1/estimate)
    const estimatePayload = {
      latitude: Number(scenario.facility.latitude),
      longitude: Number(scenario.facility.longitude),
      configuration: configEnum,
      hazard_type: hazardEnum,
      wind_speed_m_s: Number(scenario.environment.wind_speed_mps),
      wind_direction_deg: Number(scenario.environment.wind_direction_deg),
      tank_diameter_m: Number(scenario.facility.diameter_m),
      tank_height_m: Number(scenario.facility.height_m),
      fuel_mass_kg: Number(scenario.facility.fuel_mass_kg),
    };

    // 2. ML Forecast Payload (/api/predict-scenario)
    const scenarioPayload = {
      target_time: formattedTime,
      lat: Number(scenario.facility.latitude),
      lng: Number(scenario.facility.longitude),
      fuel_mass_kg: Number(scenario.facility.fuel_mass_kg),
      tank_diameter_m: Number(scenario.facility.diameter_m),
      wall_thickness_m: Number(scenario.facility.wall_thickness_m),
    };

    // 3. Post-Blast Temporal Hazard Payload (/api/predict-hazard)
    const hazardPayload = {
      lat: Number(scenario.facility.latitude),
      lng: Number(scenario.facility.longitude),
      wind_deg: Number(scenario.environment.wind_direction_deg),
      wind_speed: Number(scenario.environment.wind_speed_mps),
      tank_diameter: Number(scenario.facility.diameter_m),
      tank_height: Number(scenario.facility.height_m),
      time_offset_min: 30,
    };

    const readableError = (data, status) => {
      if (Array.isArray(data?.detail)) {
        return data.detail.map((item) => {
          const field = Array.isArray(item.loc) ? item.loc.slice(1).join('.') : 'input';
          return `${field}: ${item.msg}`;
        }).join(' • ');
      }
      if (typeof data?.detail === 'object' && data.detail !== null) return JSON.stringify(data.detail);
      return data?.detail || `Threat estimation failed (${status}).`;
    };

    try {
      const [estimateRes, scenarioRes, hazardRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(estimatePayload),
        }),
        fetch('http://127.0.0.1:8000/api/predict-scenario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scenarioPayload),
        }),
        fetch('http://127.0.0.1:8000/api/predict-hazard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hazardPayload),
        }),
      ]);

      const estimateData = await estimateRes.json();
      const scenarioData = await scenarioRes.json();
      const hazardData = await hazardRes.json();

      if (!estimateRes.ok) throw new Error(readableError(estimateData, estimateRes.status));
      if (!scenarioRes.ok) throw new Error(readableError(scenarioData, scenarioRes.status));
      if (!hazardRes.ok) throw new Error(readableError(hazardData, hazardRes.status));

      navigate('/results', {
        state: {
          scenario,
          estimate: estimateData, // Contains geojson.features with the square grid cells
          forecast: scenarioData,
          hazardPrediction: hazardData,
          comparison: {
            single: estimateData,
            dual: estimateData,
          },
        },
      });
    } catch (err) {
      console.error('ESTIMATE ERROR:', err);
      setError(err.message || 'Unable to connect to backend.');
      setIsCalculating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider w-max transition-colors">
          <span>←</span> Back to Home
        </Link>
        <h1 className="text-3xl font-black text-white tracking-wide uppercase mb-1">
          New Scenario
        </h1>
        <p className="text-slate-400">
          Configure facility, environmental, and hazard conditions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN - FORM CONTROLS */}
        <div className="lg:col-span-8 space-y-6">

          {/* 01 FACILITY */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-slate-950/50 px-6 py-3 border-b border-slate-800 flex items-center gap-4">
              <span className="text-slate-500 font-mono text-xl">01</span>
              <div>
                <h2 className="text-white font-bold uppercase tracking-widest text-sm">
                  Facility
                </h2>
                <p className="text-xs text-slate-500">
                  Define the facility and source geometry.
                </p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">
                    Configuration
                  </label>
                  <select
                    value={scenario.facility.configuration}
                    onChange={(e) =>
                      updateFacility('configuration', e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  >
                    <option value="single_tank">Single Tank</option>
                    <option value="dual_tank">Dual Tank Array</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={scenario.facility.latitude}
                      onChange={(e) =>
                        updateFacility('latitude', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={scenario.facility.longitude}
                      onChange={(e) =>
                        updateFacility('longitude', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5 bg-slate-950/30 p-5 rounded border border-slate-800/50">
                <h3 className="text-xs font-mono text-slate-400 uppercase border-b border-slate-800 pb-2">
                  Tank Geometry
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Diameter (m)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={scenario.facility.diameter_m}
                      onChange={(e) =>
                        updateFacility('diameter_m', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-center focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Height (m)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={scenario.facility.height_m}
                      onChange={(e) =>
                        updateFacility('height_m', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-center focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Fuel Mass (kg)</div>
                    <input
                      type="number"
                      step="1000"
                      value={scenario.facility.fuel_mass_kg}
                      onChange={(e) => updateFacility('fuel_mass_kg', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-center focus:outline-none focus:border-red-500 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">
                      Volume (Calc)
                    </div>
                    <div className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-slate-400 font-mono text-center cursor-not-allowed text-xs">
                      {calculatedVolume.toLocaleString()} m³
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 02 ENVIRONMENT */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-slate-950/50 px-6 py-3 border-b border-slate-800 flex items-center gap-4">
              <span className="text-slate-500 font-mono text-xl">02</span>
              <div>
                <h2 className="text-white font-bold uppercase tracking-widest text-sm">
                  Environment & Time
                </h2>
                <p className="text-xs text-slate-500">
                  Define prevailing conditions and forecast horizon.
                </p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">
                    Target Forecast Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scenario.environment.target_time}
                    onChange={(e) =>
                      updateEnv('target_time', e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">
                    Wind Speed (m/s)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={scenario.environment.wind_speed_mps}
                    onChange={(e) =>
                      updateEnv('wind_speed_mps', e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">
                    Wind Direction (°)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="359"
                    value={scenario.environment.wind_direction_deg}
                    onChange={(e) =>
                      updateEnv('wind_direction_deg', e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>

              {/* LIVE COMPASS */}
              <div className="flex flex-col items-center justify-center bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                <div className="relative w-32 h-32 rounded-full border border-slate-700 flex items-center justify-center bg-slate-900/50">
                  <span className="absolute top-1 text-[10px] text-slate-500 font-mono">N</span>
                  <span className="absolute bottom-1 text-[10px] text-slate-500 font-mono">S</span>
                  <span className="absolute left-1 text-[10px] text-slate-500 font-mono">W</span>
                  <span className="absolute right-1 text-[10px] text-slate-500 font-mono">E</span>

                  <div
                    className="absolute inset-0 transition-transform duration-300 ease-out flex items-center justify-center"
                    style={{
                      transform: `rotate(${scenario.environment.wind_direction_deg}deg)`
                    }}
                  >
                    <div className="h-full w-1 flex flex-col items-center justify-start pt-2">
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-blue-500"></div>
                      <div className="w-1 h-14 bg-gradient-to-t from-transparent to-blue-500/80"></div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs font-mono text-blue-400 bg-blue-950/30 px-3 py-1 rounded border border-blue-900/50">
                  Wind arriving from {scenario.environment.wind_direction_deg}°
                </div>
              </div>
            </div>
          </section>

          {/* 03 HAZARD SCENARIO */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-slate-950/50 px-6 py-3 border-b border-slate-800 flex items-center gap-4">
              <span className="text-slate-500 font-mono text-xl">03</span>
              <div>
                <h2 className="text-white font-bold uppercase tracking-widest text-sm">
                  Hazard Scenario
                </h2>
                <p className="text-xs text-slate-500">
                  Select the hazard model to evaluate.
                </p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thermal Card */}
              <div
                onClick={() =>
                  setScenario(prev => ({
                    ...prev,
                    hazard: { type: 'thermal_radiation' }
                  }))
                }
                className={`cursor-pointer border p-5 rounded-lg transition-all ${
                  scenario.hazard.type === 'thermal_radiation'
                    ? 'bg-orange-950/20 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-2">🔥</div>

                <h3
                  className={`font-bold uppercase tracking-wider text-sm mb-1 ${
                    scenario.hazard.type === 'thermal_radiation'
                      ? 'text-orange-400'
                      : 'text-slate-300'
                  }`}
                >
                  Thermal Radiation
                </h3>

                <p className="text-xs text-slate-500 mb-4">
                  Heat exposure estimation
                </p>

                {scenario.hazard.type === 'thermal_radiation' && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-orange-900/30">
                    <div className="text-[10px] uppercase text-slate-500 mb-2">
                      Engineering Thresholds (kW/m²)
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-red-400">🔴 Critical</span>
                      <span className="font-mono text-slate-400">&gt; 10.0</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-400">🟠 High</span>
                      <span className="font-mono text-slate-400">5.0 - 10.0</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-yellow-400">🟡 Moderate</span>
                      <span className="font-mono text-slate-400">2.0 - 5.0</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Blast Card */}
              <div
                onClick={() =>
                  setScenario(prev => ({
                    ...prev,
                    hazard: { type: 'blast_overpressure' }
                  }))
                }
                className={`cursor-pointer border p-5 rounded-lg transition-all ${
                  scenario.hazard.type === 'blast_overpressure'
                    ? 'bg-red-950/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-2">💥</div>

                <h3
                  className={`font-bold uppercase tracking-wider text-sm mb-1 ${
                    scenario.hazard.type === 'blast_overpressure'
                      ? 'text-red-400'
                      : 'text-slate-300'
                  }`}
                >
                  Blast Overpressure
                </h3>

                <p className="text-xs text-slate-500 mb-4">
                  Explosion pressure estimation
                </p>

                {scenario.hazard.type === 'blast_overpressure' && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-red-900/30">
                    <div className="text-[10px] uppercase text-slate-500 mb-2">
                      Engineering Thresholds (kPa)
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-red-400">🔴 Critical</span>
                      <span className="font-mono text-slate-400">&gt; 55.2</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-400">🟠 High</span>
                      <span className="font-mono text-slate-400">24.1 - 55.2</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-yellow-400">🟡 Moderate</span>
                      <span className="font-mono text-slate-400">6.9 - 24.1</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN - SUMMARY & SUBMIT */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-6">

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">
                Live Preview
              </h3>
              <div className="aspect-square bg-slate-950 border border-slate-800 rounded flex items-center justify-center relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none transition-transform duration-500"
                  style={{
                    transform: `rotate(${scenario.environment.wind_direction_deg}deg)`
                  }}
                >
                  <div className="absolute top-1/4 left-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-blue-400 -translate-x-1/2"></div>
                  <div className="absolute top-1/4 left-1/2 w-1 h-32 bg-blue-400 -translate-x-1/2 mt-[20px]"></div>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="text-4xl drop-shadow-lg">🏭</div>
                  <div className="mt-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded border border-slate-700 text-[10px] font-mono text-slate-300">
                    Ø {scenario.facility.diameter_m}m × {scenario.facility.height_m}m
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-sm">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">
                Scenario Summary
              </h3>

              <ul className="space-y-3 text-slate-300">
                <li className="flex justify-between">
                  <span className="text-slate-500">Config</span>
                  <span className="capitalize">
                    {scenario.facility.configuration.replace('_', ' ')}
                  </span>
                </li>

                <li className="flex justify-between">
                  <span className="text-slate-500">Hazard</span>
                  <span className="capitalize font-medium text-white">
                    {scenario.hazard.type.replace('_', ' ')}
                  </span>
                </li>

                <li className="flex justify-between">
                  <span className="text-slate-500">Wind Vector</span>
                  <span className="font-mono">
                    {scenario.environment.wind_speed_mps} m/s @ {scenario.environment.wind_direction_deg}°
                  </span>
                </li>

                <li className="flex justify-between">
                  <span className="text-slate-500">Coordinates</span>
                  <span className="font-mono text-xs">
                    {scenario.facility.latitude}, {scenario.facility.longitude}
                  </span>
                </li>
              </ul>

              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-2 text-green-500 text-xs">
                <span>✓</span> Grid Estimation API Configured
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/50 text-red-400 px-4 py-3 rounded text-sm flex items-start gap-2">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className={`w-full relative overflow-hidden px-6 py-5 font-black transition-all duration-300 rounded uppercase tracking-widest text-sm flex items-center justify-center gap-3
                ${
                  isCalculating
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                    : 'bg-white text-slate-950 hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] cursor-pointer'
                }
              `}
            >
              {isCalculating ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-slate-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  COMPUTING GRID ESTIMATION...
                </>
              ) : (
                <>
                  [ CALCULATE THREAT ZONES ] <span className="text-lg">→</span>
                </>
              )}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}