import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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

  // Mouse Follower Effect & 3D Tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }

      if (tankRef.current) {
        const rect = tankRef.current.getBoundingClientRect();
        const tankCenterX = rect.left + rect.width / 2;
        const tankCenterY = rect.top + rect.height / 2;

        const deltaX = e.clientX - tankCenterX;
        const deltaY = e.clientY - tankCenterY;

        const rotateY = deltaX / 15;
        const rotateX = -(deltaY / 15);

        const clampedRotateY = Math.max(-50, Math.min(50, rotateY));
        const clampedRotateX = Math.max(-30, Math.min(30, rotateX));

        tankRef.current.style.transform = `rotateX(${clampedRotateX}deg) rotateY(${clampedRotateY}deg)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    setIntroPhase('eyes');

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
          @keyframes scan { 0%, 100% { transform: translateY(-100%); opacity: 0; } 50% { transform: translateY(100vh); opacity: 1; } }
          @keyframes scrollGrid { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
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
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-slate-950 p-6 font-sans">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444408_1px,transparent_1px),linear-gradient(to_bottom,#ef444408_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" style={{ animation: 'scrollGrid 15s linear infinite' }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.1)_0%,_rgba(15,23,42,1)_70%)] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_20px_4px_rgba(239,68,68,0.8)] pointer-events-none z-0" style={{ animation: 'scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}></div>
        <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15),rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)] z-50"></div>

        <div className="absolute top-4 left-4 z-20 text-green-500/70 font-mono text-[10px] sm:text-xs whitespace-pre-wrap leading-tight max-w-[250px] opacity-80">
          {bootText}<span className="animate-pulse">_</span>
        </div>

        <div className={`relative z-10 flex flex-col items-center max-w-5xl mx-auto text-center transition-all duration-[1500ms] ease-out transform ${mounted ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-16 opacity-0 scale-95'}`}>
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-sm border border-red-500/50 bg-red-950/40 text-red-400 text-xs font-mono uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            SYS.STATUS: ARMED & ONLINE
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-3 tracking-tighter text-white hover:animate-[glitch_0.3s_ease-in-out]">
            THERMA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-600">VECTOR</span>
            <span className="text-xl md:text-3xl text-slate-300 font-bold tracking-[0.3em] uppercase opacity-90 block mt-1">Estimator & Command Hub</span>
          </h1>
          
          <p className="text-slate-300 text-sm md:text-base max-w-2xl font-light tracking-wide mb-10">
            Select an operational module below to initialize meteorological hazard simulations, pre-blast structural baselines, or post-blast forensic tracking.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 w-full px-4">
            {[
              { id: 'pre-blast', path: '/pre-blast', title: 'Pre-Blast Planning', subtitle: 'Baseline & Risk Profiling', desc: 'Configure structural parameters & baseline vulnerability thresholds.', icon: '🛡️', badge: 'PLANNING', style: 'border-blue-500/50 hover:border-blue-400 text-blue-400' },
              { id: 'current-blast', path: '/current-blast', title: 'Real-Time Threat', subtitle: 'Live Weather & Wind Vectors', desc: 'Active simulation tracking real-time meteorological forecasts & hoop stress.', icon: '⚡', badge: 'LIVE MONITOR', style: 'border-red-500/50 hover:border-red-400 text-red-400' },
              { id: 'post-blast', path: '/post-blast', title: 'Post-Blast Impact', subtitle: 'Forensic Wave Propagation', desc: 'Overpressure mapping, temporal spread, and safe evacuation corridors.', icon: '💥', badge: 'FORENSIC', style: 'border-orange-500/50 hover:border-orange-400 text-orange-400' }
            ].map((module) => (
              <div 
                key={module.id} 
                onClick={() => navigate(module.path)}
                className={`group relative bg-slate-900/90 backdrop-blur-xl border rounded-xl p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between text-left ${module.style} hover:-translate-y-1`}
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-3xl p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60">{module.icon}</span>
                    <span className="text-[9px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">{module.badge}</span>
                  </div>
                  <h3 className="text-lg font-black tracking-wide uppercase text-white mb-1 group-hover:text-red-400">{module.title}</h3>
                  <p className="text-[11px] font-mono text-slate-400 mb-3">{module.subtitle}</p>
                  <p className="text-xs text-slate-300 leading-relaxed font-light mb-6">{module.desc}</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white group-hover:translate-x-1.5 transition-transform pt-4 border-t border-slate-800/80">
                  <span>Initialize Module</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}