import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [bootText, setBootText] = useState('');

  // Fake system boot sequence text
  const bootSequence = [
    "SYS.INIT_KERNEL(0x8F)... OK",
    "LOADING GEO-SPATIAL_MODULES... OK",
    "CALIBRATING WIND_VECTORS... OK",
    "THREAT_ESTIMATOR_ONLINE."
  ];

  useEffect(() => {
    setMounted(true);
    
    // Typewriter effect for the boot sequence
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < bootSequence.length) {
        setBootText((prev) => prev + (prev ? '\n' : '') + bootSequence[currentLine]);
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Embedded CSS for sick animations */}
      <style>
        {`
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
          @keyframes scan {
            0%, 100% { transform: translateY(-100%); opacity: 0; }
            50% { transform: translateY(100vh); opacity: 1; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes scrollGrid {
            0% { background-position: 0 0; }
            100% { background-position: 40px 40px; }
          }
          @keyframes glitch {
            0%, 100% { transform: translate(0); opacity: 1; }
            20% { transform: translate(-2px, 1px); opacity: 0.9; }
            40% { transform: translate(-1px, -1px); opacity: 1; }
            60% { transform: translate(2px, 1px); opacity: 0.9; text-shadow: -2px 0 red, 2px 0 cyan; }
            80% { transform: translate(1px, -1px); opacity: 1; }
          }
          @keyframes ping-radar {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        `}
      </style>

      {/* Main Container */}
      <div className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-950 border border-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* Scrolling Tactical Grid */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,#ef444410_1px,transparent_1px),linear-gradient(to_bottom,#ef444410_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"
          style={{ animation: 'scrollGrid 15s linear infinite' }}
        ></div>
        
        {/* Radial Danger Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.12)_0%,_rgba(15,23,42,1)_70%)] pointer-events-none"></div>

        {/* Radar Scanner Line */}
        <div 
          className="absolute top-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_20px_4px_rgba(239,68,68,0.8)] pointer-events-none z-0"
          style={{ animation: 'scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
        ></div>

        {/* CRT Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15),rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)] z-50"></div>

        {/* Top Left Boot Console */}
        <div className="absolute top-4 left-4 z-20 text-green-500/70 font-mono text-[10px] sm:text-xs whitespace-pre-wrap leading-tight max-w-[250px] opacity-80">
          {bootText}
          <span className="animate-pulse">_</span>
        </div>

        {/* Content Wrapper */}
        <div className={`relative z-10 flex flex-col items-center max-w-4xl mx-auto text-center transition-all duration-1000 ease-out transform ${
          mounted ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-16 opacity-0 scale-95'
        }`}>
          
          {/* Live Status Badge */}
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-sm border border-red-500/50 bg-red-950/40 text-red-400 text-xs font-mono uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(239,68,68,0.3)] backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]"></span>
            SYS.STATUS: ARMED
          </div>

          {/* Glowing Neon Title with intermittent glitch */}
          <h1 
            className="text-6xl md:text-8xl font-black mb-4 tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] hover:animate-[glitch_0.3s_ease-in-out]"
          >
            THREAT<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-600 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]">-ZONE</span>
            <br />
            <span className="text-3xl md:text-5xl text-slate-300 font-bold tracking-[0.3em] uppercase opacity-90 block mt-2">Estimator</span>
          </h1>
          
          {/* Description */}
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl border-l-4 border-red-600 pl-6 text-left leading-relaxed bg-gradient-to-r from-red-950/30 to-transparent p-4 rounded-r-lg shadow-[inset_0_0_20px_rgba(239,68,68,0.05)] relative overflow-hidden">
            <span className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-red-500/50 to-transparent"></span>
            Wind-aware industrial hazard modeling. Instantly calculate geographic impact for 
            <span className="text-orange-400 font-bold ml-1 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">thermal radiation</span> and 
            <span className="text-red-500 font-bold ml-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">blast overpressure</span> zones.
          </p>

          {/* Floating Feature Grid with Staggered Entrance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 w-full px-4">
             {[
               { name: 'Thermal Zones', icon: '🔥', border: 'hover:border-orange-500', shadow: 'hover:shadow-[0_0_25px_rgba(249,115,22,0.4)]' },
               { name: 'Blast Radii', icon: '💥', border: 'hover:border-red-500', shadow: 'hover:shadow-[0_0_25px_rgba(239,68,68,0.4)]' },
               { name: 'Wind Vectors', icon: '💨', border: 'hover:border-blue-500', shadow: 'hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]' },
               { name: 'Geo-Mapping', icon: '🗺️', border: 'hover:border-green-500', shadow: 'hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]' }
             ].map((feature, i) => (
                <div 
                  key={i} 
                  className={`transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${400 + (i * 150)}ms` }} // Staggers the entrance
                >
                  <div 
                    className={`group relative bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-5 rounded-lg transition-all duration-300 cursor-crosshair overflow-hidden ${feature.border} ${feature.shadow}`}
                    style={{ animation: `float ${3 + i * 0.4}s ease-in-out infinite` }}
                  >
                    <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-slate-700/30 to-transparent rounded-tr-lg"></div>
                    <div className="text-3xl mb-3 opacity-60 group-hover:opacity-100 group-hover:scale-110 group-hover:-rotate-3 transition-all">{feature.icon}</div>
                    <span className="text-xs font-mono text-slate-400 group-hover:text-white transition-colors uppercase tracking-[0.1em]">{feature.name}</span>
                  </div>
                </div>
             ))}
          </div>

          {/* INSANE NEON START BUTTON */}
          <div className="relative group">
            {/* Expanding radar rings behind the button */}
            <div className="absolute inset-0 rounded-lg border-2 border-red-500/30" style={{ animation: 'ping-radar 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
            <div className="absolute inset-0 rounded-lg border-2 border-red-500/30" style={{ animation: 'ping-radar 2s cubic-bezier(0, 0, 0.2, 1) infinite 1s' }}></div>
            
            <button 
              onClick={() => navigate('/configure')}
              className="relative z-10 inline-flex items-center justify-center px-12 py-5 font-black text-white transition-all duration-300 bg-red-600 rounded-lg hover:bg-red-500 uppercase tracking-[0.2em] overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:shadow-[0_0_60px_rgba(239,68,68,0.9)] hover:scale-110 active:scale-95 group-hover:border group-hover:border-white/50"
            >
              {/* Shimmer effect inside button */}
              <div 
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"
                style={{ animation: 'shimmer 2.5s infinite' }}
              ></div>
              
              <span className="relative flex items-center gap-4 text-xl md:text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                [ INITIALIZE SCENARIO ]
                <svg className="w-7 h-7 group-hover:translate-x-3 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>

          {/* Footer Disclaimer */}
          <div className="mt-20 text-[10px] md:text-xs font-mono text-slate-500 flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity bg-slate-950/80 px-4 py-2 border border-red-900/50 backdrop-blur-sm relative z-10">
            <span className="animate-pulse text-red-500">⚠</span> 
            RESTRICTED SYSTEM • ENGINEERING ESTIMATES ONLY • UNAUTHORIZED ACCESS LOGGED
          </div>

        </div>
      </div>
    </>
  );
}