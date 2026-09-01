import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [bootText, setBootText] = useState('');
  const cursorGlowRef = useRef(null);
  const tankRef = useRef(null);
  
  // Intro Sequence State: 'pending' -> 'eyes' -> 'fire' -> 'zoom' -> 'reveal' -> 'done'
  const [introPhase, setIntroPhase] = useState('pending'); 

  const bootSequence = [
    "SYS.INIT_KERNEL(0x8F)... OK",
    "LOADING GEO-SPATIAL_MODULES... OK",
    "CALIBRATING WIND_VECTORS... OK",
    "THERMAVECTOR_ESTIMATOR_ONLINE."
  ];

  // Mouse Follower Effect & Perfect 3D Tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      // 1. Move the glowing pointer
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
      
      // 2. Precisely rotate the 3D Tank to face the mouse
      if (tankRef.current) {
        // Get the exact position and dimensions of the tank on the screen
        const rect = tankRef.current.getBoundingClientRect();
        
        // Find the true center of the tank
        const tankCenterX = rect.left + rect.width / 2;
        const tankCenterY = rect.top + rect.height / 2;
        
        // Calculate the distance from the mouse to the center of the tank
        const deltaX = e.clientX - tankCenterX;
        const deltaY = e.clientY - tankCenterY;
        
        // Convert distance to degrees (divide by 15 to control sensitivity)
        // Invert deltaY so the tank tilts UP when the mouse is ABOVE it
        const rotateY = deltaX / 15;
        const rotateX = -(deltaY / 15); 
        
        // Clamp the rotation so the tank doesn't flip backwards or break the illusion
        const clampedRotateY = Math.max(-50, Math.min(50, rotateY));
        const clampedRotateX = Math.max(-30, Math.min(30, rotateX));
        
        // Apply 3D rotation safely in place
        tankRef.current.style.transform = `rotateX(${clampedRotateX}deg) rotateY(${clampedRotateY}deg)`;
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    // ==========================================
    // 🛑 HACKATHON DEV MODE: COMMENTED OUT SKIP
    // ==========================================
    /*
    const hasSeenIntro = sessionStorage.getItem('seenThermavectorIntro');
    if (hasSeenIntro) {
      setIntroPhase('done');
      setMounted(true);
      startBootText();
      return;
    }
    */

    setIntroPhase('eyes'); 
    // sessionStorage.setItem('seenThermavectorIntro', 'true');
    
    const fireTimer = setTimeout(() => setIntroPhase('fire'), 600);
    const zoomTimer = setTimeout(() => setIntroPhase('zoom'), 1500);
    
    const revealTimer = setTimeout(() => {
      setIntroPhase('reveal');
      setMounted(true); 
      startBootText();
    }, 2700);
    
    const doneTimer = setTimeout(() => setIntroPhase('done'), 4000);

    return () => {
      clearTimeout(fireTimer);
      clearTimeout(zoomTimer);
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  const startBootText = () => {
    let currentLine = 0;
    const bootInterval = setInterval(() => {
      if (currentLine < bootSequence.length) {
        setBootText((prev) => prev + (prev ? '\n' : '') + bootSequence[currentLine]);
        currentLine++;
      } else {
        clearInterval(bootInterval);
      }
    }, 300);
  };

  return (
    <>
      <style>
        {`
          @keyframes shimmer { 100% { transform: translateX(100%); } }
          @keyframes scan { 0%, 100% { transform: translateY(-100%); opacity: 0; } 50% { transform: translateY(100vh); opacity: 1; } }
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @keyframes scrollGrid { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
          @keyframes ping-radar { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
          @keyframes glitch {
            0%, 100% { transform: translate(0); opacity: 1; }
            20% { transform: translate(-2px, 1px); opacity: 0.9; }
            40% { transform: translate(-1px, -1px); opacity: 1; }
            60% { transform: translate(2px, 1px); opacity: 0.9; text-shadow: -2px 0 red, 2px 0 cyan; }
            80% { transform: translate(1px, -1px); opacity: 1; }
          }
          @keyframes eye-snap-left { 0% { transform: rotate(12deg) scaleY(0); opacity: 0; } 100% { transform: rotate(12deg) scaleY(1); opacity: 1; } }
          @keyframes eye-snap-right { 0% { transform: rotate(-12deg) scaleY(0); opacity: 0; } 100% { transform: rotate(-12deg) scaleY(1); opacity: 1; } }
          @keyframes fire-blast-left { 0% { transform: translateX(0) scaleX(0); opacity: 0; filter: hue-rotate(0deg); } 100% { transform: translateX(-150px) scaleX(3); opacity: 1; filter: hue-rotate(-20deg); } }
          @keyframes fire-blast-right { 0% { transform: translateX(0) scaleX(0); opacity: 0; filter: hue-rotate(0deg); } 100% { transform: translateX(150px) scaleX(3); opacity: 1; filter: hue-rotate(-20deg); } }
          @keyframes hyper-zoom { 0% { transform: scale(1); } 100% { transform: scale(150) translate(0px, 5px); opacity: 0; } }
          @keyframes thermavector-slam {
            0% { opacity: 0; transform: scale(0.5); letter-spacing: -0.1em; filter: blur(10px); }
            40% { opacity: 1; transform: scale(1); letter-spacing: 0.1em; filter: blur(0px); text-shadow: 0 0 50px rgba(239,68,68,1); }
            100% { opacity: 0; transform: scale(2.5); letter-spacing: 0.3em; filter: blur(20px); text-shadow: 0 0 100px rgba(255,255,255,1); }
          }
        `}
      </style>

      {/* --- GLOWING MOUSE POINTER --- */}
      <div 
        ref={cursorGlowRef}
        className="fixed top-0 left-0 w-[250px] h-[250px] -ml-[125px] -mt-[125px] bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.6)_0%,_rgba(239,68,68,0.15)_40%,_transparent_70%)] pointer-events-none z-[90] mix-blend-screen transition-transform duration-200 ease-out will-change-transform"
      ></div>

      {/* INTRO OVERLAY */}
      {introPhase !== 'done' && introPhase !== 'pending' && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden pointer-events-none transition-opacity duration-1000 ${introPhase === 'reveal' ? 'opacity-0' : 'opacity-100'}`}>
          <div className={`absolute inset-0 z-[60] bg-white transition-opacity duration-[800ms] ${introPhase === 'reveal' ? 'opacity-100' : 'opacity-0'}`}></div>
          {(introPhase === 'zoom' || introPhase === 'reveal') && (
             <div className="absolute inset-0 z-50 flex items-center justify-center mix-blend-screen">
               <h1 className="text-5xl md:text-8xl lg:text-[9rem] font-black text-white uppercase" style={{ animation: 'thermavector-slam 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}>THERMAVECTOR</h1>
             </div>
          )}
          <div className="relative flex gap-12 items-center justify-center w-full h-full" style={{ animation: (introPhase === 'zoom' || introPhase === 'reveal') ? 'hyper-zoom 1.5s cubic-bezier(0.7, 0, 0.2, 1) forwards' : 'none' }}>
            <div className="relative w-24 h-6 md:w-32 md:h-8 bg-red-500 rounded-full shadow-[0_0_40px_10px_rgba(239,68,68,1)] z-20 origin-right" style={{ animation: 'eye-snap-left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
              <div className="absolute inset-0 bg-white rounded-full blur-[2px]"></div>
              <div className={`absolute top-1/2 left-0 w-64 h-24 -mt-12 bg-[radial-gradient(ellipse_at_right,_rgba(255,100,0,1)_0%,_rgba(255,0,0,0.8)_40%,_transparent_70%)] blur-xl origin-right mix-blend-screen opacity-0 ${(introPhase === 'fire' || introPhase === 'zoom' || introPhase === 'reveal') ? 'animate-[fire-blast-left_0.8s_ease-out_forwards]' : ''}`}></div>
            </div>
            <div className="relative w-24 h-6 md:w-32 md:h-8 bg-red-500 rounded-full shadow-[0_0_40px_10px_rgba(239,68,68,1)] z-20 origin-left" style={{ animation: 'eye-snap-right 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
              <div className="absolute inset-0 bg-white rounded-full blur-[2px]"></div>
              <div className={`absolute top-1/2 right-0 w-64 h-24 -mt-12 bg-[radial-gradient(ellipse_at_left,_rgba(255,100,0,1)_0%,_rgba(255,0,0,0.8)_40%,_transparent_70%)] blur-xl origin-left mix-blend-screen opacity-0 ${(introPhase === 'fire' || introPhase === 'zoom' || introPhase === 'reveal') ? 'animate-[fire-blast-right_0.8s_ease-out_forwards]' : ''}`}></div>
            </div>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/40 blur-[100px] rounded-full transition-opacity duration-1000 ${introPhase === 'fire' || introPhase === 'zoom' ? 'opacity-100' : 'opacity-0'}`}></div>
          </div>
        </div>
      )}

      {/* MAIN SCREEN */}
      <div className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-950 border border-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444408_1px,transparent_1px),linear-gradient(to_bottom,#ef444408_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" style={{ animation: 'scrollGrid 15s linear infinite' }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.12)_0%,_rgba(15,23,42,1)_70%)] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_20px_4px_rgba(239,68,68,0.8)] pointer-events-none z-0" style={{ animation: 'scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}></div>
        <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15),rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)] z-50"></div>

        {/* ---------------------------------------------------- */}
        {/* ADD THIS NEW BLOCK: 3D TRACKING GAS TANK (LEFT)      */}
        {/* ---------------------------------------------------- */}
        <div className={`absolute left-10 xl:left-24 top-1/2 -translate-y-1/2 w-64 h-96 z-30 hidden lg:flex items-center justify-center [perspective:1000px] transition-all duration-[1500ms] ease-out ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}>
          <div 
            ref={tankRef} 
            className="relative w-36 h-[300px] transition-transform duration-75 ease-out will-change-transform transform-origin-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* The Tank Body (Gradients create the 3D cylinder illusion) */}
            <div className="absolute inset-0 rounded-[50px] bg-gradient-to-r from-slate-900 via-slate-500 to-slate-950 shadow-[inset_-10px_0_30px_rgba(0,0,0,0.9),_0_20px_50px_rgba(0,0,0,0.8)] border border-slate-600/30 overflow-hidden">
              
              {/* Highlight reflection to make it look like shiny metal */}
              <div className="absolute top-0 left-[20%] w-[10%] h-full bg-gradient-to-b from-white/20 to-transparent blur-sm"></div>

              {/* Hazard Warning Stripes */}
              <div className="absolute top-24 w-full h-12 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,#000_10px,#000_20px)] opacity-90 border-y-2 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]"></div>
              
              {/* Pressure Gauge Panel */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-14 h-20 bg-slate-950 rounded-md border border-slate-700 flex flex-col items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                {/* Dial */}
                <div className="w-8 h-8 rounded-full border-2 border-slate-600 bg-slate-900 relative shadow-[inset_0_0_5px_rgba(0,0,0,1)]">
                  <div className="absolute top-1/2 left-1/2 w-4 h-[2px] bg-red-500 origin-left -rotate-[30deg] -translate-y-1/2 drop-shadow-[0_0_2px_red]"></div>
                </div>
                {/* Blinking Status LED */}
                <div className="w-2 h-2 mt-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>
              </div>
            </div>

            {/* Ambient Background Glow behind the tank */}
            <div className="absolute -inset-10 bg-red-600/10 blur-3xl -z-10 rounded-full animate-pulse pointer-events-none"></div>
          </div>
        </div>

        <div className="absolute top-4 left-4 z-20 text-green-500/70 font-mono text-[10px] sm:text-xs whitespace-pre-wrap leading-tight max-w-[250px] opacity-80">
          {bootText}<span className="animate-pulse">_</span>
        </div>

        <div className={`relative z-10 flex flex-col items-center max-w-4xl mx-auto text-center transition-all duration-[1500ms] ease-out transform ${mounted ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-16 opacity-0 scale-95'}`}>
          
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-sm border border-red-500/50 bg-red-950/40 text-red-400 text-xs font-mono uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(239,68,68,0.3)] backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]"></span>
            SYS.STATUS: ARMED
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] hover:animate-[glitch_0.3s_ease-in-out]">
            THERMA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-600 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]">VECTOR</span>
            <br />
            <span className="text-3xl md:text-5xl text-slate-300 font-bold tracking-[0.3em] uppercase opacity-90 block mt-2">Estimator</span>
          </h1>
          
          {/* UPDATED SLEEK GLASSMORPHISM DESCRIPTION BOX */}
          <div className="relative mb-14 max-w-3xl p-[1px] rounded-xl bg-gradient-to-r from-slate-700/80 via-slate-600/50 to-slate-700/80 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl rounded-xl"></div>
            <p className="relative z-10 text-lg md:text-xl text-slate-300 p-5 md:p-6 text-center leading-relaxed font-light tracking-wide">
              Wind-aware industrial hazard modeling. Instantly calculate geographic impact for 
              <span className="text-orange-400 font-bold ml-1 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">thermal radiation</span> and 
              <span className="text-red-500 font-bold ml-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">blast overpressure</span> zones.
            </p>
          </div>

          {/* UPDATED VIBRANT FEATURE CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 w-full px-4">
             {[
               { name: 'Thermal Zones', icon: '🔥', style: 'border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:border-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] text-orange-400 hover:text-orange-300' },
               { name: 'Blast Radii', icon: '💥', style: 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] text-red-400 hover:text-red-300' },
               { name: 'Wind Vectors', icon: '💨', style: 'border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] text-blue-400 hover:text-blue-300' },
               { name: 'Geo-Mapping', icon: '🗺️', style: 'border-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:border-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] text-green-400 hover:text-green-300' }
             ].map((feature, i) => (
                <div 
                  key={i} 
                  className={`transition-all duration-[800ms] ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${800 + (i * 150)}ms` }}
                >
                  <div 
                    className={`group relative bg-slate-900/90 backdrop-blur-md border p-5 rounded-lg transition-all duration-300 cursor-crosshair overflow-hidden ${feature.style}`}
                    style={{ animation: `float ${3 + i * 0.4}s ease-in-out infinite` }}
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">{feature.icon}</div>
                    <span className="text-xs font-mono font-bold uppercase tracking-[0.1em] transition-colors">{feature.name}</span>
                  </div>
                </div>
             ))}
          </div>

          <div className={`relative group transition-all duration-1000 delay-[1400ms] ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
            <div className="absolute inset-0 rounded-lg border-2 border-red-500/30" style={{ animation: 'ping-radar 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
            <div className="absolute inset-0 rounded-lg border-2 border-red-500/30" style={{ animation: 'ping-radar 2s cubic-bezier(0, 0, 0.2, 1) infinite 1s' }}></div>
            
            <button 
              onClick={() => navigate('/configure')}
              className="relative z-10 inline-flex items-center justify-center px-12 py-5 font-black text-white transition-all duration-300 bg-red-600 rounded-lg hover:bg-red-500 uppercase tracking-[0.2em] overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:shadow-[0_0_60px_rgba(239,68,68,0.9)] hover:scale-110 active:scale-95 group-hover:border group-hover:border-white/50"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" style={{ animation: 'shimmer 2.5s infinite' }}></div>
              <span className="relative flex items-center gap-4 text-xl md:text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                [ INITIALIZE SCENARIO ]
                <svg className="w-7 h-7 group-hover:translate-x-3 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>

          <div className="mt-20 text-[10px] md:text-xs font-mono text-slate-500 flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity bg-slate-950/80 px-4 py-2 border border-slate-800 backdrop-blur-sm relative z-10">
            <span className="animate-pulse text-red-500">⚠</span> 
            RESTRICTED SYSTEM • ENGINEERING ESTIMATES ONLY • UNAUTHORIZED ACCESS LOGGED
          </div>

        </div>
      </div>
    </>
  );
}