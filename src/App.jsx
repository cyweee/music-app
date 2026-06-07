import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Album from './pages/Album';
import Profile from './pages/Profile';
import Auth from './pages/Auth';

function App() {
  return (
      <Router>
        <nav className="bg-gray-800 p-4 shadow-md">
          <div className="max-w-6xl mx-auto flex gap-6">
            <Link to="/" className="text-xl font-bold text-white hover:text-green-400 transition">MusicBoxd</Link>
            <Link to="/auth" className="text-gray-300 hover:text-white transition">Log in</Link>
            <Link to="/profile/me" className="text-gray-300 hover:text-white transition">Profile</Link>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/album/:id" element={<Album />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </main>
      </Router>
  );
}

export default App;