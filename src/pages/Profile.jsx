import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { searchAlbums, getAlbumById } from '../spotify';
import { Link, Navigate } from 'react-router-dom';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Состояния для редактирования профиля
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [updatingProfile, setUpdatingProfile] = useState(false);

    // Слоты от 1 до 4 для любимых альбомов
    const [slots, setSlots] = useState({ 1: null, 2: null, 3: null, 4: null });

    // Состояние для рецензий пользователя
    const [userReviews, setUserReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);

    // Состояния для поиска альбомов в модалке
    const [activeSlot, setActiveSlot] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Загрузка любимых альбомов из Supabase
    const fetchFavorites = useCallback(async (userId) => {
        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId);

        if (!error && data) {
            const updatedSlots = { 1: null, 2: null, 3: null, 4: null };

            await Promise.all(data.map(async (fav) => {
                try {
                    const albumData = await getAlbumById(fav.album_id);
                    updatedSlots[fav.slot_number] = {
                        dbId: fav.id,
                        ...albumData
                    };
                } catch (e) {
                    console.error("Error loading favorite album:", e);
                }
            }));

            setSlots(updatedSlots);
        }
    }, []);

    // ЗАГРУЗКА РЕЦЕНЗИЙ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
    const fetchUserReviews = useCallback(async (userId) => {
        setLoadingReviews(true);
        const { data: reviewsData, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && reviewsData) {
            // Для каждой рецензии подтягиваем инфу об альбоме из Spotify
            const reviewsWithAlbums = await Promise.all(
                reviewsData.map(async (rev) => {
                    try {
                        const albumData = await getAlbumById(rev.album_id);
                        return { ...rev, album: albumData };
                    } catch (e) {
                        return { ...rev, album: null };
                    }
                })
            );
            setUserReviews(reviewsWithAlbums);
        }
        setLoadingReviews(false);
    }, []);

    useEffect(() => {
        const getProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                setUsername(session.user.user_metadata?.username || '');
                setBio(session.user.user_metadata?.bio || '');
                setAvatarUrl(session.user.user_metadata?.avatar_url || '');

                // Запускаем параллельно загрузку топа и рецензий
                await Promise.all([
                    fetchFavorites(session.user.id),
                    fetchUserReviews(session.user.id)
                ]);
            }
            setLoading(false);
        };
        getProfile();
    }, [fetchFavorites, fetchUserReviews]);

    // СОХРАНЕНИЕ ИЗМЕНЕНИЙ ПРОФИЛЯ С ЗАЩИТОЙ
    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        const cleanUsername = username.trim();
        const cleanBio = bio.trim();
        const cleanAvatar = avatarUrl.trim();

        // ЗАЩИТА 1: Ограничение длины никнейма
        if (cleanUsername.length < 2 || cleanUsername.length > 25) {
            alert("Username must be between 2 and 25 characters!");
            return;
        }

        // ЗАЩИТА 2: Ограничение длины БИО (чтобы не ломать дизайн)
        if (cleanBio.length > 200) {
            alert("Bio must be under 200 characters!");
            return;
        }

        // ЗАЩИТА 3: Проверка ссылки на аватарку (XSS-фильтр)
        if (cleanAvatar) {
            // Разрешаем только настоящие протоколы http/https, отсекаем опасные javascript:
            const isValidUrl = cleanAvatar.startsWith('http://') || cleanAvatar.startsWith('https://');
            if (!isValidUrl) {
                alert("Avatar URL must be a valid link starting with http:// or https://");
                return;
            }
        }

        setUpdatingProfile(true);

        const { data, error } = await supabase.auth.updateUser({
            data: {
                username: cleanUsername,
                bio: cleanBio,
                avatar_url: cleanAvatar
            }
        });

        if (!error && data) {
            setUser(data.user);
            setIsEditingProfile(false);
        } else {
            alert("Error updating profile: " + error.message);
        }
        setUpdatingProfile(false);
    };

    // Удаление рецензии прямо из профиля
    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;

        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId);

        if (!error) {
            setUserReviews(prev => prev.filter(r => r.id !== reviewId));
        } else {
            alert("Error deleting review: " + error.message);
        }
    };

    // Поиск альбома для витрины
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const results = await searchAlbums(searchQuery);
            setSearchResults(results);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    // Сохранение выбранного альбома в слот
    const selectAlbumForSlot = async (album) => {
        if (!user || !activeSlot) return;

        const { error } = await supabase
            .from('favorites')
            .upsert(
                {
                    user_id: user.id,
                    slot_number: activeSlot,
                    album_id: album.id
                },
                { onConflict: 'user_id,slot_number' }
            );

        if (!error) {
            setSlots(prev => ({ ...prev, [activeSlot]: album }));
            closeModal();
            fetchFavorites(user.id);
        } else {
            alert("Error saving favorite: " + error.message);
        }
    };

    // Удаление альбома из слота
    const removeAlbumFromSlot = async (slotNum, e) => {
        e.preventDefault();
        if (!user) return;

        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('slot_number', slotNum);

        if (!error) {
            setSlots(prev => ({ ...prev, [slotNum]: null }));
        } else {
            alert("Error removing favorite: " + error.message);
        }
    };

    const closeModal = () => {
        setActiveSlot(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    if (loading) {
        return <div className="text-center py-12 text-xl font-bold text-gray-400 animate-pulse">Loading profile...</div>;
    }

    // ВСТАВЛЕНА ЗАЩИТА РОУТОВ: Автоматический и безопасный редирект неавторизованных на /auth
    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <div className="max-w-6xl mx-auto mt-8 px-4 sm:px-8">

            {/* ХЕДЕР ПРОФИЛЯ */}
            <div className="bg-gray-900/40 p-6 rounded-2xl border border-gray-800/60 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full">
                    {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-gray-800 shadow-md shrink-0" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 text-2xl font-black shrink-0">
                            {(user.user_metadata?.username?.[0] || user.email[0]).toUpperCase()}
                        </div>
                    )}

                    {!isEditingProfile ? (
                        <div className="text-left">
                            <h2 className="text-xl font-bold text-white">{user.user_metadata?.username || user.email}</h2>
                            {user.user_metadata?.username && <p className="text-xs text-gray-500">{user.email}</p>}
                            <p className="text-sm text-gray-300 mt-2 italic max-w-md">{user.user_metadata?.bio || "No bio written yet..."}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3 w-full max-w-md text-left">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Username / Nickname</label>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your nickname..." className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-400" required />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Avatar Image URL</label>
                                <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/my-avatar.jpg" className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-400" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">About Me (Bio)</label>
                                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about your music taste..." rows="2" className="w-full p-3 rounded bg-gray-950 text-white text-sm border border-gray-800 focus:outline-none focus:border-green-400 resize-none" />
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" disabled={updatingProfile} className="bg-green-500 hover:bg-green-400 text-gray-950 font-bold text-xs py-1.5 px-4 rounded-lg transition">{updatingProfile ? 'Saving...' : 'Save'}</button>
                                <button type="button" onClick={() => setIsEditingProfile(false)} className="bg-gray-800 hover:bg-gray-700 text-white text-xs py-1.5 px-4 rounded-lg transition">Cancel</button>
                            </div>
                        </form>
                    )}
                </div>
                {!isEditingProfile && (
                    <button onClick={() => setIsEditingProfile(true)} className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2 px-4 rounded-xl border border-gray-700 transition self-start md:self-center shrink-0">Edit Profile</button>
                )}
            </div>

            {/* СЕКЦИЯ СЛОТОВ ТОП-4 */}
            <div className="w-full text-left mb-12">
                <h3 className="text-2xl font-black mb-2 tracking-tight">🎶 My Top 4 Albums</h3>
                <p className="text-sm text-gray-400 mb-6">Your ultimate musical statement. Click any slot to edit.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map((slotNum) => {
                        const album = slots[slotNum];
                        return (
                            <div key={slotNum} className="relative group aspect-square w-full">
                                {album ? (
                                    <div className="w-full h-full relative bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
                                        <img src={album.images?.[0]?.url} alt={album.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col items-center justify-center p-3 text-center gap-2">
                                            <p className="font-bold text-xs text-white line-clamp-2">{album.name}</p>
                                            <button onClick={() => setActiveSlot(slotNum)} className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold py-1 px-2.5 rounded transition border border-white/20">Change</button>
                                            <button onClick={(e) => removeAlbumFromSlot(slotNum, e)} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 text-[10px] font-bold py-1 px-2.5 rounded transition border border-red-500/30">Remove</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setActiveSlot(slotNum)} className="w-full h-full flex flex-col items-center justify-center bg-gray-900/30 hover:bg-gray-900/60 rounded-xl border-2 border-dashed border-gray-800 hover:border-green-500/40 transition duration-300 group shadow-inner">
                                        <span className="text-3xl text-gray-600 group-hover:text-green-400 transition font-light">+</span>
                                        <span className="text-[10px] uppercase tracking-wider text-gray-500 group-hover:text-gray-400 mt-1">Slot {slotNum}</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* НОВАЯ СЕКЦИЯ: ИСТОРИЯ РЕЦЕНЗИЙ ПОЛЬЗОВАТЕЛЯ */}
            <div className="w-full text-left mb-12">
                <h3 className="text-2xl font-black mb-6 border-b border-gray-800 pb-2 tracking-tight">💬 My Reviews ({userReviews.length})</h3>

                {loadingReviews ? (
                    <div className="text-center py-10 text-gray-500 animate-pulse">Loading your music diary...</div>
                ) : userReviews.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {userReviews.map((rev) => (
                            <div key={rev.id} className="bg-gray-900/40 border border-gray-800/80 p-4 rounded-xl flex gap-4 hover:border-gray-700 transition group relative">
                                {/* Обложка альбома */}
                                <div className="w-20 h-20 bg-gray-800 rounded-lg overflow-hidden shrink-0 shadow-md">
                                    {rev.album?.images?.[0]?.url ? (
                                        <Link to={`/album/${rev.album_id}`}>
                                            <img src={rev.album.images[0].url} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                                        </Link>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">No Cover</div>
                                    )}
                                </div>

                                {/* Текст отзыва */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start gap-2">
                                            <Link to={`/album/${rev.album_id}`} className="font-bold text-sm text-white hover:text-green-400 transition truncate block">
                                                {rev.album?.name || 'Unknown Album'}
                                            </Link>
                                            <span className="text-green-400 text-xs font-bold shrink-0">{'★'.repeat(rev.rating)}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">
                                            {rev.album?.artists?.map(a => a.name).join(', ')}
                                        </p>
                                        <p className="text-sm text-gray-300 mt-2 line-clamp-2 italic">
                                            "{rev.review_text}"
                                        </p>
                                    </div>
                                    <div className="text-[10px] text-gray-500 text-right mt-2">
                                        {new Date(rev.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Кнопка удаления отзыва */}
                                <button
                                    onClick={() => handleDeleteReview(rev.id)}
                                    className="absolute top-2 right-2 md:opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded transition duration-200"
                                    title="Delete review"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-12 bg-gray-900/20 rounded-xl border border-gray-800 border-dashed">
                        You haven't reviewed any albums yet. Go find some tracks!
                    </div>
                )}
            </div>

            {/* МОДАЛЬНОЕ ОКНО ПОИСКА ДЛЯ ТОП-4 */}
            {activeSlot && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-gray-950 border border-gray-800 w-full max-w-xl rounded-2xl max-h-[80vh] flex flex-col p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h4 className="text-lg font-black">Select Album for Slot {activeSlot}</h4>
                            <button onClick={closeModal} className="text-gray-500 hover:text-white font-bold text-lg">✕</button>
                        </div>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4 shrink-0">
                            <input type="text" placeholder="Type album name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-green-400 transition" autoFocus />
                            <button type="submit" disabled={searching} className="bg-green-500 hover:bg-green-400 disabled:bg-green-700 text-gray-950 font-bold px-4 py-2 rounded-xl text-sm transition">{searching ? '...' : 'Search'}</button>
                        </form>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {searching ? (
                                <div className="text-center text-sm text-gray-500 py-8 animate-pulse">Searching Spotify...</div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((album) => (
                                    <div key={album.id} onClick={() => selectAlbumForSlot(album)} className="flex items-center gap-3 bg-gray-900/40 hover:bg-gray-900 p-2 rounded-xl border border-gray-900 hover:border-gray-800 transition cursor-pointer group">
                                        <img src={album.images?.[2]?.url || album.images?.[0]?.url} alt="" className="w-10 h-10 object-cover rounded-md bg-gray-800" />
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="font-bold text-sm text-white truncate group-hover:text-green-400 transition">{album.name}</p>
                                            <p className="text-xs text-gray-400 truncate mt-0.5">{album.artists?.map(a => a.name).join(', ')}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                searchQuery && <div className="text-center text-sm text-gray-500 py-8">No albums found.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}