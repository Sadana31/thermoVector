import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-slate-950 p-6 font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444408_1px,transparent_1px),linear-gradient(to_bottom,#ef444408_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.1)_0%,_rgba(15,23,42,1)_70%)] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center max-w-5xl mx-auto text-center">
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-sm border border-red-500/50 bg-red-950/40 text-red-400 text-xs font-mono uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          SYS.STATUS: ARMED & ONLINE
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-3 tracking-tighter text-white">
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
  );
}