import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { getAlbumById } from '../spotify';

export default function Album() {
    const { id } = useParams();

    // Состояния для Spotify
    const [album, setAlbum] = useState(null);
    const [loadingAlbum, setLoadingAlbum] = useState(true);

    // Состояния для отзывов Supabase
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [user, setUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Оборачиваем функции в useCallback, чтобы React правильно следил за их зависимостями
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

    // Теперь useEffect работает по всем строгим правилам React
    useEffect(() => {
        const initData = async () => {
            // Проверяем авторизацию
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            // Запускаем загрузки
            fetchAlbumData();
            fetchReviews();
        };

        initData();
    }, [fetchAlbumData, fetchReviews]);

    // Отправка нового отзыва
    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);

        const { error } = await supabase.from('reviews').insert([
            {
                album_id: id,
                user_id: user.id,
                rating: rating,
                review_text: reviewText,
            },
        ]);

        if (!error) {
            setReviewText('');
            setRating(5);
            fetchReviews(); // Перезагружаем список после добавления
        } else {
            alert(error.message);
        }
        setSubmitting(false);
    };

    // ФУНКЦИЯ УДАЛЕНИЯ (Добавлена сюда)
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

    // Экраны загрузки и ошибки
    if (loadingAlbum) {
        return <div className="text-center py-12 text-2xl font-bold text-gray-400 animate-pulse">Loading album data...</div>;
    }

    if (!album) {
        return <div className="text-center py-12 text-2xl font-bold text-red-500">Album not found in Spotify</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
            {/* Левая колонка: Обложка и информация из Spotify */}
            <div className="flex flex-col gap-4">
                <img
                    src={album.images?.[0]?.url}
                    alt={album.name}
                    className="w-full aspect-square object-cover rounded-xl shadow-2xl border border-gray-800"
                />
                <div>
                    <h1 className="text-3xl font-black tracking-tight">{album.name}</h1>
                    <p className="text-xl text-green-400 font-semibold mt-1">
                        {album.artists?.map(a => a.name).join(', ')}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                        Released: {album.release_date} • {album.total_tracks} tracks
                    </p>
                    <p className="text-gray-500 text-xs mt-1 uppercase tracking-wider">
                        {album.label}
                    </p>
                </div>
            </div>

            {/* Правая колонка: Плеер и отзывы */}
            <div className="md:col-span-2 flex flex-col gap-6">

                {/* Интерактивный плеер Spotify (Исправленная ссылка) */}
                <div className="bg-gray-900 p-2 rounded-xl border border-gray-800 shadow-lg">
                    <iframe
                        src={"https://open.s-p-o-t-i-f-y.com/embed/album/".replace(/-/g, '') + id}
                        width="100%"
                        height="380"
                        allowFullScreen=""
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-lg border-0"
                    ></iframe>
                </div>

                {/* Форма добавления отзыва */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
                    <h3 className="text-xl font-bold mb-4">Leave a Review</h3>
                    {user ? (
                        <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Rating:</span>
                                <select
                                    value={rating}
                                    onChange={(e) => setRating(Number(e.target.value))}
                                    className="bg-gray-800 text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-green-400"
                                >
                                    {[5, 4, 3, 2, 1].map((num) => (
                                        <option key={num} value={num}>{num} ★</option>
                                    ))}
                                </select>
                            </div>

                            <textarea
                                placeholder="Write your review here..."
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                rows="3"
                                className="p-3 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-green-400 transition resize-none"
                                required
                            ></textarea>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-green-500 hover:bg-green-400 text-gray-950 font-bold py-2.5 px-6 rounded self-end transition duration-300"
                            >
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </form>
                    ) : (
                        <p className="text-gray-400 text-sm">Please sign in to leave a rating and review.</p>
                    )}
                </div>

                {/* Список отзывов из базы Supabase */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-xl font-bold">User Reviews ({reviews.length})</h3>
                    {reviews.length === 0 ? (
                        <p className="text-gray-500 italic">No reviews yet. Be the first!</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {reviews.map((rev) => (
                                <div key={rev.id} className="bg-gray-900/60 p-4 rounded-lg border border-gray-800/80">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-green-400 font-bold">{'★'.repeat(rev.rating)}</span>

                                        {/* КНОПКА УДАЛЕНИЯ (Добавлена сюда) */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">
                                                {new Date(rev.created_at).toLocaleDateString()}
                                            </span>
                                            {user?.id === rev.user_id && (
                                                <button
                                                    onClick={() => handleDeleteReview(rev.id)}
                                                    className="text-red-500 hover:text-red-400 text-xs font-bold bg-red-500/10 px-2 py-1 rounded transition"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed">{rev.review_text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}