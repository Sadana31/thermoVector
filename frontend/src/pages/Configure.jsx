import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Configure() {
  const navigate = useNavigate();
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  // 1. State Contract (Matches the JSON spec for the backend)
  const [scenario, setScenario] = useState({
    facility: {
      configuration: 'single_tank',
      latitude: 13.0827,
      longitude: 80.2707,
      diameter_m: 20,
      height_m: 15,
    },
    environment: {
      wind_speed_mps: 8.0,
      wind_direction_deg: 135,
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
    setScenario(prev => ({ ...prev, facility: { ...prev.facility, [field]: Number(value) || value } }));
    setError(null);
  };

  const updateEnv = (field, value) => {
    setScenario(prev => ({ ...prev, environment: { ...prev.environment, [field]: Number(value) } }));
    setError(null);
  };

  const handleCalculate = () => {
    // Validation
    if (scenario.facility.diameter_m <= 0) return setError("⚠ Diameter must be greater than 0.");
    if (scenario.facility.height_m <= 0) return setError("⚠ Height must be greater than 0.");
    if (scenario.environment.wind_speed_mps < 0) return setError("⚠ Wind speed cannot be negative.");
    if (scenario.facility.latitude < -90 || scenario.facility.latitude > 90) return setError("⚠ Latitude must be between -90° and 90°.");
    if (scenario.facility.longitude < -180 || scenario.facility.longitude > 180) return setError("⚠ Longitude must be between -180° and 180°.");

    setIsCalculating(true);
    
    // Simulate API delay / Engine calculation time for effect
    setTimeout(() => {
      // In reality, you'd pass the JSON payload to Context, Redux, or state via navigate
      console.log("PAYLOAD DISPATCHED:", JSON.stringify(scenario, null, 2));
      navigate('/results');
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-2 mb-4 text-sm uppercase tracking-wider w-max transition-colors">
          <span>←</span> Back to Home
        </Link>
        <h1 className="text-3xl font-black text-white tracking-wide uppercase mb-1">New Scenario</h1>
        <p className="text-slate-400">Configure facility, environmental, and hazard conditions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN - FORM CONTROLS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 01 FACILITY */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-slate-950/50 px-6 py-3 border-b border-slate-800 flex items-center gap-4">
              <span className="text-slate-500 font-mono text-xl">01</span>
              <div>
                <h2 className="text-white font-bold uppercase tracking-widest text-sm">Facility</h2>
                <p className="text-xs text-slate-500">Define the facility and source geometry.</p>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Configuration</label>
                  <select 
                    value={scenario.facility.configuration}
                    onChange={(e) => updateFacility('configuration', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  >
                    <option value="single_tank">Single Tank</option>
                    <option value="multiple_tanks" disabled>Multiple Tanks (Pro Version)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Latitude</label>
                    <input type="number" step="0.0001" value={scenario.facility.latitude} onChange={(e) => updateFacility('latitude', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Longitude</label>
                    <input type="number" step="0.0001" value={scenario.facility.longitude} onChange={(e) => updateFacility('longitude', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-red-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-5 bg-slate-950/30 p-5 rounded border border-slate-800/50">
                <h3 className="text-xs font-mono text-slate-400 uppercase border-b border-slate-800 pb-2">Tank Geometry</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Diameter (m)</label>
                    <input type="number" min="1" value={scenario.facility.diameter_m} onChange={(e) => updateFacility('diameter_m', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-center focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Height (m)</label>
                    <input type="number" min="1" value={scenario.facility.height_m} onChange={(e) => updateFacility('height_m', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-center focus:outline-none focus:border-red-500" />
                  </div>
                </div>
                <div className="pt-2">
                  <div className="text-xs text-slate-500 mb-1">Estimated Volume (Calculated)</div>
                  <div className="w-full bg-slate-950/50 border border-slate-800 rounded p-2 text-slate-400 font-mono text-center cursor-not-allowed">
                    {calculatedVolume.toLocaleString()} m³
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
                <h2 className="text-white font-bold uppercase tracking-widest text-sm">Environment</h2>
                <p className="text-xs text-slate-500">Define prevailing wind conditions (origin direction).</p>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Wind Speed (m/s)</label>
                  <input type="number" step="0.1" min="0" value={scenario.environment.wind_speed_mps} onChange={(e) => updateEnv('wind_speed_mps', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Wind Direction (°)</label>
                  <input type="number" min="0" max="359" value={scenario.environment.wind_direction_deg} onChange={(e) => updateEnv('wind_direction_deg', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              {/* LIVE COMPASS */}
              <div className="flex flex-col items-center justify-center bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                <div className="relative w-32 h-32 rounded-full border border-slate-700 flex items-center justify-center bg-slate-900/50">
                  <span className="absolute top-1 text-[10px] text-slate-500 font-mono">N</span>
                  <span className="absolute bottom-1 text-[10px] text-slate-500 font-mono">S</span>
                  <span className="absolute left-1 text-[10px] text-slate-500 font-mono">W</span>
                  <span className="absolute right-1 text-[10px] text-slate-500 font-mono">E</span>
                  
                  {/* Rotating Arrow Container */}
                  <div 
                    className="absolute inset-0 transition-transform duration-300 ease-out flex items-center justify-center"
                    style={{ transform: `rotate(${scenario.environment.wind_direction_deg}deg)` }}
                  >
                    {/* The arrow points FROM the bottom TO the top inside the rotated container */}
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
                <h2 className="text-white font-bold uppercase tracking-widest text-sm">Hazard Scenario</h2>
                <p className="text-xs text-slate-500">Select the hazard model to evaluate.</p>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thermal Card */}
              <div 
                onClick={() => setScenario(prev => ({...prev, hazard: {type: 'thermal_radiation'}}))}
                className={`cursor-pointer border p-5 rounded-lg transition-all ${
                  scenario.hazard.type === 'thermal_radiation' 
                  ? 'bg-orange-950/20 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-2">🔥</div>
                <h3 className={`font-bold uppercase tracking-wider text-sm mb-1 ${scenario.hazard.type === 'thermal_radiation' ? 'text-orange-400' : 'text-slate-300'}`}>Thermal Radiation</h3>
                <p className="text-xs text-slate-500 mb-4">Heat exposure estimation</p>
                
                {scenario.hazard.type === 'thermal_radiation' && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-orange-900/30">
                    <div className="text-[10px] uppercase text-slate-500 mb-2">Engineering Thresholds (kW/m²)</div>
                    <div className="flex justify-between text-xs"><span className="text-red-400">🔴 Critical</span><span className="font-mono text-slate-400">&gt; 10.0</span></div>
                    <div className="flex justify-between text-xs"><span className="text-orange-400">🟠 High</span><span className="font-mono text-slate-400">5.0 - 10.0</span></div>
                    <div className="flex justify-between text-xs"><span className="text-yellow-400">🟡 Moderate</span><span className="font-mono text-slate-400">2.0 - 5.0</span></div>
                  </div>
                )}
              </div>

              {/* Blast Card */}
              <div 
                onClick={() => setScenario(prev => ({...prev, hazard: {type: 'blast_overpressure'}}))}
                className={`cursor-pointer border p-5 rounded-lg transition-all ${
                  scenario.hazard.type === 'blast_overpressure' 
                  ? 'bg-red-950/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-2">💥</div>
                <h3 className={`font-bold uppercase tracking-wider text-sm mb-1 ${scenario.hazard.type === 'blast_overpressure' ? 'text-red-400' : 'text-slate-300'}`}>Blast Overpressure</h3>
                <p className="text-xs text-slate-500 mb-4">Explosion pressure estimation</p>
                
                {scenario.hazard.type === 'blast_overpressure' && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-red-900/30">
                    <div className="text-[10px] uppercase text-slate-500 mb-2">Engineering Thresholds (psi)</div>
                    <div className="flex justify-between text-xs"><span className="text-red-400">🔴 Critical</span><span className="font-mono text-slate-400">&gt; 8.0</span></div>
                    <div className="flex justify-between text-xs"><span className="text-orange-400">🟠 High</span><span className="font-mono text-slate-400">3.5 - 8.0</span></div>
                    <div className="flex justify-between text-xs"><span className="text-yellow-400">🟡 Moderate</span><span className="font-mono text-slate-400">1.0 - 3.5</span></div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN - SUMMARY & SUBMIT (STICKY) */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            
            {/* LIVE PREVIEW VISUAL */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Live Preview</h3>
              <div className="aspect-square bg-slate-950 border border-slate-800 rounded flex items-center justify-center relative overflow-hidden">
                 {/* Visual Wind Vector */}
                 <div 
                    className="absolute inset-0 opacity-20 pointer-events-none transition-transform duration-500"
                    style={{ transform: `rotate(${scenario.environment.wind_direction_deg}deg)` }}
                  >
                    <div className="absolute top-1/4 left-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-blue-400 -translate-x-1/2"></div>
                    <div className="absolute top-1/4 left-1/2 w-1 h-32 bg-blue-400 -translate-x-1/2 mt-[20px]"></div>
                 </div>
                 
                 {/* Facility Visual */}
                 <div className="relative z-10 flex flex-col items-center">
                   <div className="text-4xl drop-shadow-lg">🏭</div>
                   <div className="mt-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded border border-slate-700 text-[10px] font-mono text-slate-300">
                     Ø {scenario.facility.diameter_m}m × {scenario.facility.height_m}m
                   </div>
                 </div>
              </div>
            </div>

            {/* SCENARIO SUMMARY */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-sm">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Scenario Summary</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex justify-between">
                  <span className="text-slate-500">Config</span>
                  <span className="capitalize">{scenario.facility.configuration.replace('_', ' ')}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Hazard</span>
                  <span className="capitalize font-medium text-white">{scenario.hazard.type.replace('_', ' ')}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Wind Vector</span>
                  <span className="font-mono">{scenario.environment.wind_speed_mps} m/s @ {scenario.environment.wind_direction_deg}°</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Coordinates</span>
                  <span className="font-mono text-xs">{scenario.facility.latitude}, {scenario.facility.longitude}</span>
                </li>
              </ul>
              
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-2 text-green-500 text-xs">
                <span>✓</span> Configuration complete
              </div>
            </div>

            {/* ERROR DISPLAY */}
            {error && (
              <div className="bg-red-950/50 border border-red-500/50 text-red-400 px-4 py-3 rounded text-sm flex items-start gap-2">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* ACTION BUTTON */}
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className={`w-full relative overflow-hidden px-6 py-5 font-black transition-all duration-300 rounded uppercase tracking-widest text-sm flex items-center justify-center gap-3
                ${isCalculating 
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700' 
                  : 'bg-white text-slate-950 hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                }
              `}
            >
              {isCalculating ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  CALCULATING...
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