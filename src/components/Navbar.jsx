import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Navbar() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Получаем текущую сессию при загрузке
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Автоматически слушаем изменения (вход/выход)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/auth'); // После выхода кидаем на страницу авторизации
    };

    return (
        <nav className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center px-4">
                <Link to="/" className="text-2xl font-black text-green-400 tracking-tighter">
                    MusicBoxd
                </Link>

                <div className="flex gap-6 items-center">
                    <Link to="/" className="text-gray-300 hover:text-white transition font-medium">Home</Link>

                    {user ? (
                        <>
                            <Link to="/profile" className="text-gray-300 hover:text-white transition font-medium">Profile</Link>
                            <button
                                onClick={handleSignOut}
                                className="bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 px-4 py-2 rounded transition border border-gray-700"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <Link
                            to="/auth"
                            className="bg-green-500 hover:bg-green-400 text-gray-900 font-bold px-5 py-2 rounded transition"
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}