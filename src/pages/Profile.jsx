import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { searchAlbums, getAlbumById } from '../spotify';
import { Link, Navigate } from 'react-router-dom';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState(null); // Новое состояние для файла
    const [updatingProfile, setUpdatingProfile] = useState(false);

    const [slots, setSlots] = useState({ 1: null, 2: null, 3: null, 4: null });
    const [userReviews, setUserReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);

    const [activeSlot, setActiveSlot] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

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
                    updatedSlots[fav.slot_number] = { dbId: fav.id, ...albumData };
                } catch (e) {
                    console.error("Error loading favorite album:", e);
                }
            }));
            setSlots(updatedSlots);
        }
    }, []);

    const fetchUserReviews = useCallback(async (userId) => {
        setLoadingReviews(true);
        const { data: reviewsData, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && reviewsData) {
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
                await Promise.all([
                    fetchFavorites(session.user.id),
                    fetchUserReviews(session.user.id)
                ]);
            }
            setLoading(false);
        };
        getProfile();
    }, [fetchFavorites, fetchUserReviews]);

    // Обработчик выбора файла с жесткой валидацией формата
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            alert("Error: Incorrect file format! Please upload an image only in one of the following formats: JPG, JPEG, or PNG.");
            e.target.value = ''; // Сбрасываем инпут
            setAvatarFile(null);
            return;
        }
        setAvatarFile(file);
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        const cleanUsername = username.trim();
        const cleanBio = bio.trim();
        let finalAvatarUrl = avatarUrl.trim();

        if (cleanUsername.length < 2 || cleanUsername.length > 25) {
            alert("Username must be between 2 and 25 characters!");
            return;
        }
        if (cleanBio.length > 200) {
            alert("Bio must be under 200 characters!");
            return;
        }

        setUpdatingProfile(true);

        // Если пользователь выбрал файл с компьютера, загружаем его в Supabase Storage
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, avatarFile, { upsert: true });

            if (uploadError) {
                alert("Ошибка при загрузке картинки: " + uploadError.message + " (Убедитесь, что создали бакет 'avatars')");
                setUpdatingProfile(false);
                return;
            }

            // Получаем публичную ссылку на загруженную картинку
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            finalAvatarUrl = publicUrl;
        } else if (finalAvatarUrl) {
            // Если файла нет, проверяем обычную ссылку на XSS
            const isValidUrl = finalAvatarUrl.startsWith('http://') || finalAvatarUrl.startsWith('https://');
            if (!isValidUrl) {
                alert("Avatar URL must be a valid link starting with http:// or https://");
                setUpdatingProfile(false);
                return;
            }
        }

        const { data, error } = await supabase.auth.updateUser({
            data: { username: cleanUsername, bio: cleanBio, avatar_url: finalAvatarUrl }
        });

        if (!error && data) {
            setUser(data.user);
            setAvatarUrl(finalAvatarUrl);
            setAvatarFile(null);
            setIsEditingProfile(false);
        } else {
            alert("Error updating profile: " + error.message);
        }
        setUpdatingProfile(false);
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;
        const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
        if (!error) setUserReviews(prev => prev.filter(r => r.id !== reviewId));
    };

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

    const selectAlbumForSlot = async (album) => {
        if (!user || !activeSlot) return;
        const { error } = await supabase.from('favorites').upsert(
            { user_id: user.id, slot_number: activeSlot, album_id: album.id },
            { onConflict: 'user_id,slot_number' }
        );
        if (!error) {
            setSlots(prev => ({ ...prev, [activeSlot]: album }));
            closeModal();
            fetchFavorites(user.id);
        }
    };

    const removeAlbumFromSlot = async (slotNum, e) => {
        e.preventDefault();
        if (!user) return;
        const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('slot_number', slotNum);
        if (!error) setSlots(prev => ({ ...prev, [slotNum]: null }));
    };

    const closeModal = () => {
        setActiveSlot(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    if (loading) return <div className="text-center py-12 text-xl font-bold text-[#7b7e64] animate-pulse">Loading profile...</div>;
    if (!user) return <Navigate to="/auth" replace />;

    return (
        <div className="max-w-6xl mx-auto mt-8 px-4 sm:px-8 font-sans">

            {/* ХЕДЕР ПРОФИЛЯ */}
            <div className="bg-[#3b3c3e]/20 p-6 rounded-2xl border border-[#454b35]/40 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#7b7e64]/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center gap-4 w-full relative z-10">
                    {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-[#454b35] shadow-lg shrink-0" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-[#3b3c3e]/60 border-2 border-[#454b35] flex items-center justify-center text-[#a3a89f] text-2xl font-black shrink-0 shadow-lg">
                            {(user.user_metadata?.username?.[0] || user.email[0]).toUpperCase()}
                        </div>
                    )}

                    {!isEditingProfile ? (
                        <div className="text-left">
                            <h2 className="text-xl font-black text-[#a3a89f] tracking-wide">{user.user_metadata?.username || user.email}</h2>
                            {user.user_metadata?.username && <p className="text-xs text-[#7b7e64]">{user.email}</p>}
                            <p className="text-sm text-[#a3a89f]/80 mt-2 italic max-w-md border-l-2 border-[#454b35] pl-2 py-0.5">{user.user_metadata?.bio || "No whispers recorded yet..."}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 w-full max-w-md text-left">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest font-bold text-[#7b7e64] block mb-1">Username</label>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your nickname..." className="w-full bg-[#1d2216] border border-[#454b35]/60 rounded-xl px-3 py-1.5 text-sm text-[#a3a89f] focus:outline-none focus:border-[#7b7e64] transition-colors shadow-inner" required />
                            </div>

                            {/* БЛОК ЗАГРУЗКИ ФОТОГРАФИИ */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-[#7b7e64] block">Avatar Image</label>
                                <input
                                    type="file"
                                    accept="image/jpeg, image/jpg, image/png"
                                    onChange={handleFileChange}
                                    className="w-full text-xs text-[#7b7e64] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#454b35] file:text-[#1d2216] hover:file:bg-[#7b7e64] transition-all cursor-pointer"
                                />
                                <input
                                    type="url"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="Or paste a direct image URL . . ."
                                    className="w-full bg-[#1d2216] border border-[#454b35]/60 rounded-xl px-3 py-1.5 text-sm text-[#a3a89f] focus:outline-none focus:border-[#7b7e64] transition-colors shadow-inner"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] uppercase tracking-widest font-bold text-[#7b7e64] block mb-1">About Me (Bio)</label>
                                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Nobody cares" rows="2" className="w-full p-3 rounded-xl bg-[#1d2216] text-[#a3a89f] text-sm border border-[#454b35]/60 focus:outline-none focus:border-[#7b7e64] transition-colors resize-none shadow-inner" />
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" disabled={updatingProfile} className="bg-[#454b35] hover:bg-[#7b7e64] text-[#1d2216] font-black text-xs py-1.5 px-4 rounded-lg transition-all shadow-md">{updatingProfile ? 'Saving...' : 'Save'}</button>
                                <button type="button" onClick={() => {setIsEditingProfile(false); setAvatarFile(null);}} className="bg-[#3b3c3e] hover:bg-[#454b35] border border-[#454b35]/30 text-[#a3a89f] text-xs font-bold py-1.5 px-4 rounded-lg transition-all">Cancel</button>
                            </div>
                        </form>
                    )}
                </div>
                {!isEditingProfile && (
                    <button onClick={() => setIsEditingProfile(true)} className="bg-[#3b3c3e] hover:bg-[#454b35] text-[#a3a89f] text-xs font-bold py-2 px-4 rounded-xl border border-[#454b35]/50 transition-all self-start md:self-center shrink-0 shadow-md">Edit Profile</button>
                )}
            </div>

            {/* СЕКЦИЯ СЛОТОВ ТОП-4 */}
            <div className="w-full text-left mb-12">
                <h3 className="text-xl font-black mb-1 tracking-widest uppercase text-[#7b7e64]">⭐ Your favs</h3>
                <p className="text-xs text-[#7b7e64]/70 mb-6 font-medium tracking-wide">Your core frequencies. Click any slot to modify.</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map((slotNum) => {
                        const album = slots[slotNum];
                        return (
                            <div key={slotNum} className="relative group aspect-square w-full">
                                {album ? (
                                    <div className="w-full h-full relative bg-[#1d2216] rounded-xl border border-[#454b35]/60 overflow-hidden shadow-lg">
                                        <img src={album.images?.[0]?.url} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-[#1d2216]/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-3 text-center gap-2 backdrop-blur-sm">
                                            <p className="font-bold text-xs text-[#a3a89f] line-clamp-2">{album.name}</p>
                                            <button onClick={() => setActiveSlot(slotNum)} className="bg-[#454b35]/40 hover:bg-[#7b7e64]/40 text-[#a3a89f] text-[10px] font-bold py-1 px-3 rounded transition border border-[#7b7e64]/30">Change</button>
                                            <button onClick={(e) => removeAlbumFromSlot(slotNum, e)} className="bg-red-900/30 hover:bg-red-900/60 text-red-400 text-[10px] font-bold py-1 px-3 rounded transition border border-red-900/50">Remove</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setActiveSlot(slotNum)} className="w-full h-full flex flex-col items-center justify-center bg-[#3b3c3e]/20 hover:bg-[#3b3c3e]/40 rounded-xl border-2 border-dashed border-[#454b35]/50 hover:border-[#7b7e64]/60 transition-all duration-300 group shadow-inner">
                                        <span className="text-3xl text-[#454b35] group-hover:text-[#7b7e64] transition font-light">+</span>
                                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#454b35] group-hover:text-[#7b7e64] mt-1">Slot {slotNum}</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ИСТОРИЯ РЕЦЕНЗИЙ */}
            <div className="w-full text-left mb-12">
                <h3 className="text-xl font-black mb-6 border-b border-[#454b35]/50 pb-2 tracking-widest uppercase text-[#7b7e64]">📝 My review(s) ({userReviews.length})</h3>

                {loadingReviews ? (
                    <div className="text-center py-10 text-[#7b7e64] animate-pulse text-sm font-medium tracking-widest uppercase">Retrieving logs...</div>
                ) : userReviews.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {userReviews.map((rev) => (
                            <div key={rev.id} className="bg-[#3b3c3e]/10 border border-[#454b35]/50 p-4 rounded-xl flex gap-4 hover:border-[#7b7e64]/50 transition-all group relative shadow-lg overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-[#7b7e64]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                <div className="w-20 h-20 bg-[#1d2216] rounded-lg overflow-hidden shrink-0 shadow-md border border-[#3b3c3e]/50 relative z-10">
                                    {rev.album?.images?.[0]?.url ? (
                                        <Link to={`/album/${rev.album_id}`}>
                                            <img src={rev.album.images[0].url} alt="" className="w-full h-full object-cover hover:scale-110 transition duration-500" />
                                        </Link>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-[#7b7e64]">No Cover</div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-between relative z-10">
                                    <div>
                                        <div className="flex justify-between items-start gap-2">
                                            <Link to={`/album/${rev.album_id}`} className="font-bold text-sm text-[#a3a89f] hover:text-white transition truncate block">
                                                {rev.album?.name || 'Unknown Album'}
                                            </Link>
                                            <span className="text-[#a3a89f] text-xs font-black shrink-0">{'★'.repeat(rev.rating)}</span>
                                        </div>
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#7b7e64] truncate mt-0.5">
                                            {rev.album?.artists?.map(a => a.name).join(', ')}
                                        </p>
                                        <p className="text-[#a3a89f]/80 text-xs mt-2 line-clamp-2 italic border-l-2 border-[#454b35] pl-2 py-0.5">
                                            "{rev.review_text}"
                                        </p>
                                    </div>
                                    <div className="text-[9px] text-[#454b35] font-black tracking-widest uppercase text-right mt-2">
                                        {new Date(rev.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDeleteReview(rev.id)}
                                    className="absolute top-2 right-2 md:opacity-0 group-hover:opacity-100 bg-red-900/30 hover:bg-red-900/60 border border-red-900/50 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded transition-all duration-300 z-20 shadow-md"
                                    title="Delete review"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-[#7b7e64] py-12 bg-[#3b3c3e]/10 rounded-xl border border-[#454b35]/40 border-dashed text-sm italic shadow-inner">
                        You haven't added any sounds to the forest yet.
                    </div>
                )}
            </div>

            {/* МОДАЛЬНОЕ ОКНО ПОИСКА (СТЕКЛО И ТУМАН) */}
            {activeSlot && (
                <div className="fixed inset-0 bg-[#1d2216]/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-[#1d2216] border border-[#454b35] w-full max-w-xl rounded-2xl max-h-[80vh] flex flex-col p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#454b35]/20 rounded-full blur-[50px] pointer-events-none"></div>

                        <div className="flex justify-between items-center mb-4 shrink-0 relative z-10">
                            <h4 className="text-sm font-black tracking-widest uppercase text-[#a3a89f]">Select for Slot {activeSlot}</h4>
                            <button onClick={closeModal} className="text-[#7b7e64] hover:text-white font-black text-lg transition-colors">✕</button>
                        </div>

                        <form onSubmit={handleSearch} className="flex gap-2 mb-4 shrink-0 relative z-10">
                            <input type="text" placeholder="Search for an album..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-[#3b3c3e]/30 border border-[#454b35]/60 rounded-xl px-4 py-3 text-sm text-[#a3a89f] placeholder-[#7b7e64]/70 focus:outline-none focus:border-[#7b7e64] transition-colors shadow-inner" autoFocus />
                            <button type="submit" disabled={searching} className="bg-[#454b35] hover:bg-[#7b7e64] disabled:bg-[#3b3c3e] text-[#1d2216] font-black px-6 py-3 rounded-xl text-sm transition-all shadow-md">{searching ? '...' : 'Search'}</button>
                        </form>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar relative z-10">
                            {searching ? (
                                <div className="text-center text-xs font-medium text-[#7b7e64] py-8 animate-pulse tracking-widest uppercase">Searching the mist...</div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((album) => (
                                    <div key={album.id} onClick={() => selectAlbumForSlot(album)} className="flex items-center gap-3 bg-[#3b3c3e]/20 hover:bg-[#3b3c3e]/40 p-2.5 rounded-xl border border-[#454b35]/30 hover:border-[#7b7e64]/50 transition-all cursor-pointer group shadow-sm">
                                        <img src={album.images?.[2]?.url || album.images?.[0]?.url} alt="" className="w-10 h-10 object-cover rounded-md bg-[#1d2216] border border-[#3b3c3e]/50" />
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="font-bold text-sm text-[#a3a89f] truncate group-hover:text-white transition-colors">{album.name}</p>
                                            <p className="text-[10px] tracking-widest uppercase font-bold text-[#7b7e64] truncate mt-0.5">{album.artists?.map(a => a.name).join(', ')}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                searchQuery && <div className="text-center text-xs italic text-[#7b7e64] py-8">No matching records found.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}