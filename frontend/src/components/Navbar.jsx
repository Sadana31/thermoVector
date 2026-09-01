import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
        <span>THREAT-ZONE</span>
      </Link>
      
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">SYSTEM READY</span>
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      </div>
    </header>
  );
}