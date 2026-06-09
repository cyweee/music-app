import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Album from './pages/Album';
import Profile from './pages/Profile';
import Auth from './pages/Auth';

export default function App() {
    return (
        // Оборачиваем ВСЁ приложение в Router, чтобы работали ссылки и переходы
        <Router>
            <div className="w-full min-h-screen bg-gray-950 text-white flex flex-col">
                <Navbar />

                {/* Главный блок для страниц, тоже на всю ширину */}
                <main className="w-full flex-grow">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/album/:id" element={<Album />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/auth" element={<Auth />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}