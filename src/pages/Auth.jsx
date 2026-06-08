import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const navigate = useNavigate();

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    setErrorMsg(error.message);
                    return; // Останавливаем выполнение, дальше не идем
                }
                navigate('/');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username: username }
                    }
                });
                if (error) {
                    setErrorMsg(error.message);
                    return; // Останавливаем выполнение
                }
                navigate('/');
            }
        } catch (error) {
            // Сюда теперь будут попадать только настоящие непредвиденные сбои (например, пропал интернет)
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-[75vh]">
            <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-700">
                <h1 className="text-3xl font-black text-white text-center mb-6">
                    {isLogin ? 'Sign In' : 'Create Account'}
                </h1>

                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="p-3 rounded bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-green-400 transition"
                            required={!isLogin}
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="p-3 rounded bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-green-400 transition"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="p-3 rounded bg-gray-900 text-white border border-gray-600 focus:outline-none focus:border-green-400 transition"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 bg-green-500 hover:bg-green-400 text-gray-900 font-bold py-3 rounded transition duration-300"
                    >
                        {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                {errorMsg && <p className="mt-4 text-center text-sm text-red-400 bg-red-900/30 p-2 rounded">{errorMsg}</p>}

                <div className="mt-6 text-center text-gray-400 text-sm">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setErrorMsg('');
                        }}
                        className="text-white hover:text-green-400 font-bold transition"
                    >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
}