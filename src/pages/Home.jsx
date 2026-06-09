import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { searchAlbums, getTrendingAlbums, getAlbumById } from '../spotify';

const AlbumCard = ({ album }) => (
    <Link
        to={`/album/${album.id}`}
        className="group flex flex-col gap-2 bg-gray-900/40 p-2 rounded-xl border border-transparent hover:border-gray-800 hover:bg-gray-900 transition duration-300 w-full"
    >
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-800 border border-gray-800 shadow-md relative">
            {album.images?.[0]?.url ? (
                <img
                    src={album.images[0].url}
                    alt={album.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No Cover</div>
            )}
        </div>
        <div className="px-1 py-0.5">
            <h3 className="font-bold text-sm truncate group-hover:text-green-400 transition">
                {album.name}
            </h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">
                {album.artists?.map(a => a.name).join(', ')}
            </p>
        </div>
    </Link>
);

export default function Home() {
    const [query, setQuery] = useState('');
    const [searchData, setSearchData] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searched, setSearched] = useState(false);

    const [trending, setTrending] = useState([]);
    const [latestReviews, setLatestReviews] = useState([]);
    const [isFeedLoading, setIsFeedLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Ссылка на контейнер с трендами для автопрокрутки
    const scrollRef = useRef(null);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                const trendingData = await getTrendingAlbums();
                setTrending(trendingData);

                const { data: reviewsData, error } = await supabase
                    .from('reviews')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(8);

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
                    setLatestReviews(reviewsWithAlbums);
                }
            } catch (error) {
                console.error("Error fetching feed:", error);
            } finally {
                setIsFeedLoading(false);
            }
        };

        fetchFeed();
    }, []);

    // МАГИЯ АВТОПРОКРУТКИ
    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
                // Если докрутили до конца - плавно возвращаемся в начало
                if (scrollLeft + clientWidth >= scrollWidth - 10) {
                    scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    // Иначе крутим вправо на одну карточку (ширина карточки + отступ)
                    scrollRef.current.scrollBy({ left: 176, behavior: 'smooth' });
                }
            }
        }, 3000); // Автопрокрутка срабатывает каждые 3 секунды

        return () => clearInterval(interval);
    }, [trending]);

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;

        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId);

        if (!error) {
            setLatestReviews(prev => prev.filter(r => r.id !== reviewId));
        } else {
            alert("Error deleting review: " + error.message);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) {
            setSearched(false);
            return;
        }

        setIsSearching(true);
        setSearched(true);
        try {
            const results = await searchAlbums(query);
            setSearchData(results);
        } catch (error) {
            console.error("Spotify search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setQuery('');
        setSearched(false);
        setSearchData([]);
    };

    return (
        // Убрали max-w-6xl, теперь w-full (на весь экран с небольшими отступами по краям)
        <div className="flex flex-col w-full mt-8 px-4 sm:px-12 md:px-20 overflow-hidden">

            {/* Центрируем только заголовок и поиск */}
            <div className="flex flex-col items-center w-full">
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
                        Track albums you've listened to.<br />
                        Save those you want to hear.
                    </h1>
                    <p className="text-gray-400 text-lg">The social network for music lovers.</p>
                </div>

                <form onSubmit={handleSearch} className="w-full max-w-2xl flex gap-3 mb-12">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search for an album or artist..."
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                if (e.target.value === '') clearSearch();
                            }}
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400 transition"
                        />
                        {query && (
                            <button type="button" onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white font-bold">✕</button>
                        )}
                    </div>
                    <button type="submit" disabled={isSearching} className="bg-green-500 hover:bg-green-400 disabled:bg-green-700 text-gray-950 font-bold px-8 rounded-xl transition duration-300 shrink-0">
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {/* Основной контент на всю ширину экрана */}
            <div className="w-full">
                {searched ? (
                    <div>
                        <h2 className="text-2xl font-black mb-6 border-b border-gray-800 pb-2">Search Results</h2>
                        {isSearching ? (
                            <div className="text-xl font-medium text-gray-400 animate-pulse text-center py-10">Searching Spotify...</div>
                        ) : searchData.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {searchData.map(album => <AlbumCard key={album.id} album={album} />)}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-10">No albums found. Try another search!</div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-12 w-full">

                        {/* Тренды (С АВТОПРОКРУТКОЙ) */}
                        <div className="w-full text-left">
                            <h2 className="text-2xl font-black mb-6 border-b border-gray-800 pb-2">🔥 Trending This Week</h2>
                            {isFeedLoading ? (
                                <div className="h-48 flex items-center justify-center text-gray-500 animate-pulse">Loading global trends...</div>
                            ) : (
                                // Добавили ref={scrollRef} и scroll-smooth для плавной прокрутки
                                <div ref={scrollRef} className="flex flex-row flex-nowrap overflow-x-auto gap-4 pb-4 snap-x scroll-smooth hide-scrollbar">
                                    {trending.map(album => (
                                        <div key={album.id} className="snap-start shrink-0 w-36 sm:w-40">
                                            <AlbumCard album={album} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Последние рецензии (на всю ширину) */}
                        <div className="w-full text-left">
                            <h2 className="text-2xl font-black mb-6 border-b border-gray-800 pb-2">💬 Latest Reviews</h2>
                            {isFeedLoading ? (
                                <div className="h-48 flex items-center justify-center text-gray-500 animate-pulse">Loading reviews...</div>
                            ) : latestReviews.length > 0 ? (
                                <div className="flex flex-row flex-nowrap overflow-x-auto gap-5 pb-4 snap-x">
                                    {latestReviews.map(rev => (
                                        <div key={rev.id} className="snap-start shrink-0 w-64 sm:w-72 bg-gray-900/60 rounded-xl border border-gray-800/80 overflow-hidden hover:border-gray-700 transition flex flex-col shadow-lg">

                                            <div className="relative aspect-square w-full bg-gray-800 border-b border-gray-800 shrink-0">
                                                {rev.album?.images?.[0]?.url ? (
                                                    <Link to={`/album/${rev.album_id}`}>
                                                        <img src={rev.album.images[0].url} alt="Cover" className="w-full h-full object-cover hover:opacity-80 transition" />
                                                    </Link>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No Cover</div>
                                                )}

                                                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-gray-700/50 shadow-md flex items-center gap-1.5">
                                                    <span className="text-green-400 text-sm font-black">★</span>
                                                    <span className="text-white font-bold">{rev.rating}</span>
                                                </div>

                                                {user?.id === rev.user_id && (
                                                    <button
                                                        onClick={() => handleDeleteReview(rev.id)}
                                                        className="absolute top-2 left-2 bg-red-500/90 hover:bg-red-400 text-white p-1.5 rounded-lg shadow-md transition"
                                                        title="Delete this review"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="p-4 flex-1 flex flex-col bg-gray-900/40">
                                                <Link to={`/album/${rev.album_id}`} className="font-bold text-white hover:text-green-400 truncate mb-2">
                                                    {rev.album?.name || 'Unknown Album'}
                                                </Link>
                                                <p className="text-gray-300 text-sm italic line-clamp-3 leading-relaxed">
                                                    "{rev.review_text}"
                                                </p>
                                                <div className="mt-auto pt-3 text-xs text-gray-500 text-right">
                                                    {new Date(rev.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-10 bg-gray-900/30 rounded-xl border border-gray-800 border-dashed">
                                    No reviews yet. Be the first to review an album!
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}