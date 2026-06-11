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
    const [registrationSuccess, setRegistrationSuccess] = useState(false); // Новое состояние

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
                    return;
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
                    return;
                }
                // ВМЕСТО РЕДИРЕКТА ПРИ РЕГИСТРАЦИИ:
                setRegistrationSuccess(true);
            }
        } catch (error) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-[75vh] px-4">
            <div className="bg-[#3b3c3e]/20 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-[#454b35]/40 backdrop-blur-md">

                {registrationSuccess ? (
                    <div className="text-center py-6">
                        <h2 className="text-2xl font-black text-[#a3a89f] mb-4 uppercase tracking-widest">Hello</h2>
                        <p className="text-[#7b7e64] font-bold tracking-widest uppercase text-sm">
                            Registration is almost complete!
                        </p>
                        <p className="text-red-400/80 text-xs mt-3 italic">
                            Check your email and confirm your email address to activate your account.
                        </p>
                    </div>
                ) : (
                    <>
                        <h1 className="text-3xl font-black text-[#a3a89f] text-center mb-6 tracking-tighter">
                            {isLogin ? 'Sign In' : 'Create Account'}
                        </h1>

                        <form onSubmit={handleAuth} className="flex flex-col gap-4">
                            {!isLogin && (
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="p-3 rounded-lg bg-[#1d2216] text-[#a3a89f] border border-[#454b35]/60 focus:outline-none focus:border-[#7b7e64] transition"
                                    required={!isLogin}
                                />
                            )}
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="p-3 rounded-lg bg-[#1d2216] text-[#a3a89f] border border-[#454b35]/60 focus:outline-none focus:border-[#7b7e64] transition"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password (min 6 characters)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="p-3 rounded-lg bg-[#1d2216] text-[#a3a89f] border border-[#454b35]/60 focus:outline-none focus:border-[#7b7e64] transition"
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 bg-[#454b35] hover:bg-[#7b7e64] text-[#1d2216] font-black py-3 rounded-lg transition duration-300 uppercase tracking-widest text-sm"
                            >
                                {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
                            </button>
                        </form>

                        {errorMsg && <p className="mt-4 text-center text-xs text-red-400 bg-red-900/10 p-2 rounded border border-red-900/20">{errorMsg}</p>}

                        <div className="mt-6 text-center text-[#7b7e64] text-xs font-bold tracking-widest uppercase">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setErrorMsg('');
                                }}
                                className="text-[#a3a89f] hover:text-white font-black transition"
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}