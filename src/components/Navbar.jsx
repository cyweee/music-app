import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Navbar() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };
    return (
        // Фон шапки: Угольный (#3b3c3e), Рамка: Оливковый (#454b35)
        <nav className="w-full bg-[#3b3c3e]/30 backdrop-blur-md border-b border-[#454b35] sticky top-0 z-50">
            <div className="w-full px-8 md:px-16 py-4 flex justify-between items-center">
                {/* ЛОГОТИП: Переливается Светлым (#a3a89f) и Моховым (#7b7e64) */}
                <Link
                    to="/"
                    className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#a3a89f] via-[#7b7e64] to-[#a3a89f] bg-[size:200%] animate-[pulse_4s_ease-in-out_infinite] hover:opacity-80 transition-opacity"
                >
                    MusicBoxd
                </Link>
                <div className="flex gap-6 items-center">
                    <Link to="/" className="text-sm font-bold text-[#7b7e64] hover:text-[#a3a89f] transition-colors tracking-widest uppercase">
                        Home
                    </Link>
                    {user ? (
                        <>
                            <Link to="/profile" className="text-sm font-bold text-[#7b7e64] hover:text-[#a3a89f] transition-colors tracking-widest uppercase">
                                Profile
                            </Link>
                            {/* КНОПКА ВЫХОДА: Оливковая (#454b35), при наведении Моховая (#7b7e64) */}
                            <button
                                onClick={handleSignOut}
                                className="bg-[#454b35]/60 hover:bg-[#7b7e64]/80 text-[#a3a89f] hover:text-[#1d2216] text-xs font-bold px-6 py-2.5 rounded-lg transition-all border border-[#7b7e64]/30 shadow-md tracking-widest uppercase"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <Link
                            to="/auth"
                            className="bg-[#454b35] hover:bg-[#7b7e64] text-[#1d2216] hover:text-[#1d2216] text-xs font-bold px-6 py-2.5 rounded-lg transition-all shadow-md tracking-widest uppercase"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}