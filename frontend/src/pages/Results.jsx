export default function Results() {
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-wide">Threat Map</h2>
        <span className="text-sm text-slate-500 font-mono">SCENARIO: SINGLE TANK • THERMAL</span>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* MAP COMPONENT - Teammate's territory */}
        <div className="flex-[3] bg-slate-900 border border-slate-800 rounded-lg relative overflow-hidden flex items-center justify-center">
          
          {/* This is a placeholder for your teammate's actual <MapView /> */}
          <div className="text-slate-600 text-center">
            <span className="text-4xl block mb-2">🗺️</span>
            <p className="font-mono text-sm">&lt;MapView data=&#123;hazardData&#125; /&gt;</p>
            <p className="text-xs mt-2">Mapbox / Leaflet instance renders here</p>
          </div>

          {/* Floating Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur border border-slate-800 p-3 rounded text-xs space-y-2">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500/80 border border-red-500"></div><span>Critical</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500/80 border border-orange-500"></div><span>High</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500/80 border border-yellow-500"></div><span>Moderate</span></div>
          </div>
        </div>

        {/* SIDE PANELS - Your territory */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
          
          {/* Response Guidance */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-3 uppercase text-xs tracking-wider">Response Guidance</h3>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-3">
              <div className="text-xs text-slate-500 mb-1">Recommended Approach</div>
              <div className="text-green-400 font-bold flex items-center gap-2">
                <span className="text-xl">↖</span> NORTHWEST
              </div>
              <div className="text-xs text-slate-400 mt-2">Lowest modeled hazard exposure based on current wind vectors.</div>
            </div>
            
            <div className="space-y-2 text-sm border-t border-slate-800 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Critical Zone</span>
                <span className="text-red-400 font-mono">142 m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">High Zone</span>
                <span className="text-orange-400 font-mono">217 m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Moderate Zone</span>
                <span className="text-yellow-400 font-mono">318 m</span>
              </div>
            </div>
          </div>

          {/* Facility Comparison */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex-1">
            <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Configuration Comparison</h3>
            
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="pb-2 font-normal">Metric</th>
                  <th className="pb-2 font-normal">Single Tank</th>
                  <th className="pb-2 font-normal">Two Tanks</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800/50">
                  <td className="py-2 text-slate-500">Hazard Area</td>
                  <td className="py-2 font-mono">12,420 m²</td>
                  <td className="py-2 font-mono">17,830 m²</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">Zone Pattern</td>
                  <td className="py-2">Compact</td>
                  <td className="py-2">Overlapping</td>
                </tr>
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </div>
  );
}