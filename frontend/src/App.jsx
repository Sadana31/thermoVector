import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Configure from './pages/Configure';
import Results from './pages/Results';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-slate-700">
        <Navbar />
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/configure" element={<Configure />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}