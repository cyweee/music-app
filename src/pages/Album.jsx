import { useParams, Link } from 'react-router-dom'; // Добавлен импорт Link
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { getAlbumById } from '../spotify';

export default function Album() {
    const { id } = useParams();

    const [album, setAlbum] = useState(null);
    const [loadingAlbum, setLoadingAlbum] = useState(true);

    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [user, setUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchAlbumData = useCallback(async () => {
        setLoadingAlbum(true);
        try {
            const data = await getAlbumById(id);
            setAlbum(data);
        } catch (error) {
            console.error("Error fetching album:", error);
        } finally {
            setLoadingAlbum(false);
        }
    }, [id]);

    const fetchReviews = useCallback(async () => {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('album_id', id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setReviews(data);
        }
    }, [id]);

    useEffect(() => {
        const initData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            fetchAlbumData();
            fetchReviews();
        };

        initData();
    }, [fetchAlbumData, fetchReviews]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!user) return;

        const cleanText = reviewText.trim();

        if (cleanText.length === 0) {
            alert("Review text cannot be empty!");
            return;
        }

        if (cleanText.length > 1000) {
            alert("Review is too long! Maximum 1000 characters.");
            return;
        }

        setSubmitting(true);

        const { error } = await supabase.from('reviews').insert([
            {
                album_id: id,
                user_id: user.id,
                rating: rating,
                review_text: cleanText,
                username: user.user_metadata?.username || user.email.split('@')[0],
            },
        ]);

        if (!error) {
            setReviewText('');
            setRating(5);
            fetchReviews();
        } else {
            alert(error.message);
        }
        setSubmitting(false);
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;

        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId);

        if (!error) {
            setReviews(prevReviews => prevReviews.filter(r => r.id !== reviewId));
        } else {
            alert("Error deleting review: " + error.message);
        }
    };

    if (loadingAlbum) {
        return <div className="text-center py-12 text-sm font-bold tracking-widest uppercase text-[#7b7e64] animate-pulse">Entering the forest...</div>;
    }

    if (!album) {
        return <div className="text-center py-12 text-sm font-bold tracking-widest text-[#7b7e64] uppercase">Signal lost. Album not found.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 px-4 sm:px-12 md:px-20 font-sans">
            {/* Левая колонка: Обложка и инфа */}
            <div className="flex flex-col gap-4">
                <div className="relative rounded-xl overflow-hidden shadow-2xl border border-[#454b35]/50 group">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#7b7e64]/10 to-[#1d2216]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10" />
                    <img
                        src={album.images?.[0]?.url}
                        alt={album.name}
                        className="w-full aspect-square object-cover"
                    />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-[#a3a89f]">{album.name}</h1>
                    <p className="text-lg text-[#7b7e64] font-bold mt-1 uppercase tracking-widest">
                        {album.artists?.map(a => a.name).join(', ')}
                    </p>
                    <p className="text-[#7b7e64]/60 text-xs mt-2 font-medium tracking-wide">
                        Released: {album.release_date} • {album.total_tracks} tracks
                    </p>
                    <p className="text-[#454b35] text-[10px] mt-1 uppercase tracking-widest font-bold">
                        {album.label}
                    </p>
                </div>
            </div>

            {/* Правая колонка: Плеер и отзывы */}
            <div className="md:col-span-2 flex flex-col gap-8">

                {/* Интерактивный плеер Spotify */}
                <div className="bg-[#3b3c3e]/20 backdrop-blur-md p-2 rounded-2xl border border-[#454b35]/40 shadow-xl">
                    <iframe
                        src={"https://open.s-p-o-t-i-f-y.com/embed/album/".replace(/-/g, '') + id}
                        width="100%"
                        height="380"
                        allowFullScreen=""
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-xl border-0 opacity-90 hover:opacity-100 transition-opacity duration-500"
                    ></iframe>
                </div>

                {/* Форма добавления отзыва */}
                <div className="bg-[#3b3c3e]/20 backdrop-blur-md p-6 rounded-2xl border border-[#454b35]/40 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#7b7e64]/5 rounded-full blur-3xl pointer-events-none"></div>

                    <h3 className="text-lg font-black mb-4 tracking-widest uppercase text-[#7b7e64] relative z-10">Leave a Review</h3>
                    {user ? (
                        <form onSubmit={handleSubmitReview} className="flex flex-col gap-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold tracking-widest uppercase text-[#7b7e64]">Rating:</span>
                                <select
                                    value={rating}
                                    onChange={(e) => setRating(Number(e.target.value))}
                                    className="bg-[#1d2216] text-[#a3a89f] px-3 py-1.5 text-sm rounded-lg border border-[#454b35]/60 focus:outline-none focus:border-[#7b7e64] shadow-inner font-bold"
                                >
                                    {[5, 4, 3, 2, 1].map((num) => (
                                        <option key={num} value={num}>{num} ★</option>
                                    ))}
                                </select>
                            </div>

                            <textarea
                                placeholder="Whisper your thoughts into the woods..."
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                rows="3"
                                className="p-4 rounded-xl bg-[#1d2216] text-[#a3a89f] text-sm border border-[#454b35]/60 focus:outline-none focus:border-[#7b7e64] transition-colors resize-none shadow-inner placeholder-[#7b7e64]/50"
                                required
                            ></textarea>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-[#454b35] hover:bg-[#7b7e64] disabled:bg-[#3b3c3e] text-[#1d2216] font-black py-3 px-6 rounded-xl self-end transition-all shadow-md text-xs tracking-widest uppercase"
                            >
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </form>
                    ) : (
                        <p className="text-[#7b7e64] text-xs font-medium tracking-wider italic">Please sign in to leave a rating and review.</p>
                    )}
                </div>

                {/* Список отзывов */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-black tracking-widest uppercase text-[#7b7e64] border-b border-[#454b35]/40 pb-2">User Reviews ({reviews.length})</h3>
                    {reviews.length === 0 ? (
                        <p className="text-[#7b7e64]/70 text-xs italic py-4">No reviews yet</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {reviews.map((rev) => (
                                <div key={rev.id} className="bg-[#3b3c3e]/10 p-5 rounded-xl border border-[#454b35]/30 hover:border-[#7b7e64]/40 transition-colors group">
                                    <div className="flex justify-between items-start mb-3">

                                        <div className="flex flex-col text-left">
                                            {/* ИСПРАВЛЕНО: Ссылка на профиль автора */}
                                            <Link to={`/user/${rev.user_id}`} className="text-[10px] text-[#7b7e64] hover:text-[#a3a89f] font-bold tracking-widest uppercase mb-1 transition-colors">
                                                by @{rev.username || 'user'}
                                            </Link>
                                            <span className="text-[#a3a89f] font-black text-sm">{'★'.repeat(rev.rating)}</span>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[9px] text-[#454b35] font-bold tracking-widest uppercase">
                                                {new Date(rev.created_at).toLocaleDateString()}
                                            </span>
                                            {user?.id === rev.user_id && (
                                                <button
                                                    onClick={() => handleDeleteReview(rev.id)}
                                                    className="text-red-400/70 hover:text-red-400 text-[10px] font-bold bg-red-900/10 hover:bg-red-900/30 border border-red-900/20 px-2 py-1 rounded transition-colors uppercase tracking-wider"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                    <p className="text-[#a3a89f]/90 text-sm leading-relaxed border-l-2 border-[#454b35]/50 pl-3 py-0.5 font-medium italic">
                                        {rev.review_text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}