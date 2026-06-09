import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getAlbumById } from '../spotify';

export default function PublicProfile() {
    const { id } = useParams();
    const [slots, setSlots] = useState({ 1: null, 2: null, 3: null, 4: null });
    const [userReviews, setUserReviews] = useState([]);

    // Новое состояние для данных профиля
    const [profile, setProfile] = useState({
        username: 'Unknown Wanderer',
        avatar_url: '',
        bio: 'Lost in the woods of sound...'
    });
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async () => {
        // Вызываем нашу SQL-функцию
        const { data, error } = await supabase.rpc('get_user_profile', { profile_id: id });

        if (!error && data && data.length > 0) {
            setProfile({
                username: data[0].username || 'Wanderer',
                avatar_url: data[0].avatar_url || '',
                bio: data[0].bio || 'No echoes left yet...'
            });
        }
    }, [id]);

    const fetchFavorites = useCallback(async () => {
        const { data, error } = await supabase.from('favorites').select('*').eq('user_id', id);
        if (!error && data) {
            const updatedSlots = { 1: null, 2: null, 3: null, 4: null };
            await Promise.all(data.map(async (fav) => {
                try {
                    const albumData = await getAlbumById(fav.album_id);
                    updatedSlots[fav.slot_number] = albumData;
                } catch (e) {
                    console.error(e);
                }
            }));
            setSlots(updatedSlots);
        }
    }, [id]);

    const fetchUserReviews = useCallback(async () => {
        const { data: reviewsData, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('user_id', id)
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
    }, [id]);

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            // Загружаем профиль, любимые альбомы и отзывы одновременно
            await Promise.all([fetchUserProfile(), fetchFavorites(), fetchUserReviews()]);
            setLoading(false);
        };
        loadProfile();
    }, [fetchUserProfile, fetchFavorites, fetchUserReviews]);

    if (loading) return <div className="text-center py-12 text-sm font-bold text-[#7b7e64] tracking-widest uppercase animate-pulse">Tracking footprints...</div>;

    return (
        <div className="max-w-6xl mx-auto mt-8 px-4 sm:px-8 font-sans">

            {/* ХЕДЕР ЧУЖОГО ПРОФИЛЯ */}
            <div className="bg-[#3b3c3e]/20 p-8 rounded-2xl border border-[#454b35]/40 mb-10 flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#7b7e64]/5 rounded-full blur-3xl pointer-events-none"></div>

                {profile.avatar_url ? (
                    <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover border-2 border-[#454b35] shadow-lg shrink-0 relative z-10"
                    />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-[#1d2216] border-2 border-[#454b35] flex items-center justify-center text-[#7b7e64] text-3xl font-black shrink-0 shadow-lg relative z-10">
                        {profile.username[0]?.toUpperCase() || '?'}
                    </div>
                )}

                <div className="relative z-10 text-left">
                    <h2 className="text-2xl font-black text-[#a3a89f] tracking-wide">{profile.username}</h2>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#7b7e64] mt-1 mb-2">Music Explorer</p>
                    <p className="text-sm text-[#a3a89f]/80 italic max-w-md border-l-2 border-[#454b35] pl-3 py-0.5 leading-relaxed">
                        {profile.bio}
                    </p>
                </div>
            </div>

            {/* СЛОТЫ ЧУЖОГО ПРОФИЛЯ */}
            <div className="w-full text-left mb-12">
                <h3 className="text-xl font-black mb-1 tracking-widest uppercase text-[#7b7e64]">⭐ Your favs</h3>
                <p className="text-xs text-[#7b7e64]/70 mb-6 font-medium tracking-wide">Their core frequencies.</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map((slotNum) => {
                        const album = slots[slotNum];
                        return (
                            <div key={slotNum} className="relative group aspect-square w-full">
                                {album ? (
                                    <Link to={`/album/${album.id}`} className="w-full h-full block relative bg-[#1d2216] rounded-xl border border-[#454b35]/60 overflow-hidden shadow-lg">
                                        <img src={album.images?.[0]?.url} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-[#1d2216]/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-3 text-center backdrop-blur-sm">
                                            <p className="font-bold text-xs text-[#a3a89f] line-clamp-2">{album.name}</p>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#3b3c3e]/10 rounded-xl border border-dashed border-[#454b35]/30">
                                        <span className="text-[#454b35] text-xs uppercase tracking-widest font-bold">Empty</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ОТЗЫВЫ ЧУЖОГО ПРОФИЛЯ */}
            <div className="w-full text-left mb-12">
                <h3 className="text-xl font-black mb-6 border-b border-[#454b35]/50 pb-2 tracking-widest uppercase text-[#7b7e64]">📝 Review(s) ({userReviews.length})</h3>
                {userReviews.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {userReviews.map((rev) => (
                            <div key={rev.id} className="bg-[#3b3c3e]/10 border border-[#454b35]/50 p-4 rounded-xl flex gap-4 hover:border-[#7b7e64]/50 transition-all group relative shadow-lg overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-[#7b7e64]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                                <div className="w-20 h-20 bg-[#1d2216] rounded-lg overflow-hidden shrink-0 shadow-md border border-[#3b3c3e]/50 relative z-10">
                                    {rev.album?.images?.[0]?.url && (
                                        <Link to={`/album/${rev.album_id}`}>
                                            <img src={rev.album.images[0].url} alt="" className="w-full h-full object-cover hover:scale-110 transition duration-500" />
                                        </Link>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between relative z-10">
                                    <div>
                                        <div className="flex justify-between items-start gap-2">
                                            <Link to={`/album/${rev.album_id}`} className="font-bold text-sm text-[#a3a89f] hover:text-white transition truncate block">{rev.album?.name}</Link>
                                            <span className="text-[#a3a89f] text-xs font-black shrink-0">{'★'.repeat(rev.rating)}</span>
                                        </div>
                                        <p className="text-[#a3a89f]/80 text-xs mt-2 line-clamp-2 italic border-l-2 border-[#454b35] pl-2 py-0.5">"{rev.review_text}"</p>
                                    </div>
                                    <div className="text-[9px] text-[#454b35] font-black tracking-widest text-right mt-2 uppercase">{new Date(rev.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-[#7b7e64] py-12 bg-[#3b3c3e]/10 rounded-xl border border-[#454b35]/40 border-dashed text-sm italic shadow-inner">
                        No echoes found in the forest.
                    </div>
                )}
            </div>
        </div>
    );
}