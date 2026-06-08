import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Album from "./pages/Album";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";

function App() {
    return (
        <BrowserRouter>
            {/* Обертка на весь экран с темным фоном */}
            <div className="min-h-screen bg-gray-950 font-sans text-white">

                {/* Наше новое меню */}
                <Navbar />

                {/* Контейнер для страниц */}
                <main className="container mx-auto py-8 px-4">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/album/:id" element={<Album />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/auth" element={<Auth />} />
                    </Routes>
                </main>

            </div>
        </BrowserRouter>
    );
}

export default App;