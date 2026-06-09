import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Album from './pages/Album';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import PublicProfile from './pages/PublicProfile'; // Импортируем страницу чужого профиля

export default function App() {
    return (
        // Оборачиваем ВСЁ приложение в Router, чтобы работали ссылки и переходы
        <Router>
            {/* ИСПРАВЛЕНО: Добавлен плавный градиент от угольного к глубокому лесному, чтобы работали все цвета палитры */}
            <div className="min-h-screen bg-gradient-to-br from-[#3b3c3e]/40 via-[#1d2216] to-[#1d2216] text-[#a3a89f] flex flex-col w-full">
                <Navbar />

                {/* Главный блок для страниц, тоже на всю ширину */}
                <main className="w-full flex-grow">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/album/:id" element={<Album />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/auth" element={<Auth />} />
                        {/* ДОБАВЛЕНО: Безопасный маршрут для просмотра публичных профилей других юзеров */}
                        <Route path="/user/:id" element={<PublicProfile />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}