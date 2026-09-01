import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ThreatEstimator from './pages/ThreatEstimator';
import PostBlastMap from './pages/PostBlastMap';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      
      {/* Floating Back Button on all sub-routes */}
      {location.pathname !== '/' && (
        <button 
          onClick={() => navigate('/')}
          className="absolute top-5 right-5 z-[2000] bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 px-5 py-2.5 rounded-xl text-xs font-mono shadow-2xl backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>←</span>
          <span>Command Hub</span>
        </button>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pre-blast" element={<ThreatEstimator />} />
        <Route path="/current-blast" element={<ThreatEstimator />} />
        <Route path="/post-blast" element={<PostBlastMap />} />
      </Routes>

    </div>
  );
}