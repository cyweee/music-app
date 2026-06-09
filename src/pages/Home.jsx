import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { searchAlbums, getTrendingAlbums, getAlbumById } from '../spotify';

// КАРТОЧКА АЛЬБОМА: УГОЛЬ И ТЕМНЫЙ ЛЕС
const AlbumCard = ({ album }) => (
    <Link
        to={`/album/${album.id}`}
        className="group flex flex-col gap-2 bg-[#3b3c3e]/20 p-2.5 rounded-xl border border-[#454b35]/40 hover:border-[#7b7e64]/60 hover:bg-[#3b3c3e]/40 transition-all duration-500 w-full relative overflow-hidden"
    >
        {/* Туманный блик при наведении */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#7b7e64]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <div className="aspect-square w-full overflow-hidden rounded-lg bg-[#1d2216] border border-[#3b3c3e]/50 shadow-lg relative z-10">
            {album.images?.[0]?.url ? (
                <img
                    src={album.images[0].url}
                    alt={album.name}
                    className="w-full h-full object-cover group-hover:scale-105 group-hover:rotate-1 transition-all duration-500 opacity-90 group-hover:opacity-100"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#7b7e64] italic">No Cover</div>
            )}
        </div>
        <div className="px-1 py-0.5 relative z-10 text-left">
            <h3 className="font-bold text-sm truncate text-[#a3a89f] group-hover:text-white transition-colors duration-300">
                {album.name}
            </h3>
            <p className="text-xs text-[#7b7e64] truncate mt-0.5 group-hover:text-[#a3a89f] transition-colors duration-300">
                {album.artists?.map(a => a.name).join(', ')}
            </p>
        </div>
    </Link>
);

// ТУМАННЫЕ СКЕЛЕТОНЫ ДЛЯ ТРЕНДОВ
const TrendingSkeleton = () => (
    <div className="flex flex-row gap-4 pb-4 overflow-hidden w-full">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="shrink-0 w-36 sm:w-40 flex flex-col gap-2 animate-pulse">
                <div className="aspect-square w-full bg-[#3b3c3e]/40 rounded-xl border border-[#454b35]/30"></div>
                <div className="h-4 bg-[#3b3c3e]/40 rounded w-5/6 mt-1"></div>
                <div className="h-3 bg-[#3b3c3e]/40 rounded w-1/2"></div>
            </div>
        ))}
    </div>
);

// ТУМАННЫЕ СКЕЛЕТОНЫ ДЛЯ РЕЦЕНЗИЙ
const ReviewsSkeleton = () => (
    <div className="flex flex-row gap-5 pb-4 overflow-hidden w-full">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0 w-64 sm:w-72 bg-[#3b3c3e]/20 rounded-xl border border-[#454b35]/30 aspect-[3/4] flex flex-col p-4 animate-pulse gap-3">
                <div className="w-full aspect-square bg-[#1d2216] rounded-lg border border-[#3b3c3e]/40"></div>
                <div className="h-4 bg-[#3b3c3e]/40 rounded w-3/4"></div>
                <div className="h-3 bg-[#3b3c3e]/40 rounded w-full"></div>
            </div>
        ))}
    </div>
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

    const [dropdownResults, setDropdownResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isDropdownLoading, setIsDropdownLoading] = useState(false);

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

    // ЖИВОЙ ПОИСК С ДЕБАУНСОМ
    useEffect(() => {
        if (!query.trim()) {
            setDropdownResults([]);
            setShowDropdown(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsDropdownLoading(true);
            try {
                const data = await searchAlbums(query);
                setDropdownResults(data || []);
                setShowDropdown(true);
            } catch (err) {
                console.error("Live search error:", err);
            } finally {
                setIsDropdownLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // АВТОПРОКРУТКА ТРЕНДОВ
    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
                if (scrollLeft + clientWidth >= scrollWidth - 10) {
                    scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollRef.current.scrollBy({ left: 176, behavior: 'smooth' });
                }
            }
        }, 3000);

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

        setShowDropdown(false);
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
        setDropdownResults([]);
        setShowDropdown(false);
    };

    return (
        <div className="flex flex-col w-full mt-12 px-4 sm:px-12 md:px-20 overflow-hidden select-none font-sans">

            {/* ХЕДЕР: ГЛУБОКИЙ ТУМАН */}
            <div className="flex flex-col items-center w-full">
                <div className="text-center mb-10 relative">
                    {/* Мягкий моховой расфокус на фоне */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-32 bg-[#454b35]/10 rounded-full blur-[60px] pointer-events-none"></div>

                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-[#a3a89f] via-[#7b7e64] to-[#454b35]">
                        Track albums you've listened to.<br />
                        Save those you want to hear.
                    </h1>
                    <p className="text-[#7b7e64] text-xs md:text-sm font-medium tracking-widest uppercase opacity-80">
                        Only for those who love music
                    </p>
                </div>

                {/* ФОРМА ПОИСКА */}
                <form onSubmit={handleSearch} className="w-full max-w-2xl flex gap-3 mb-16 z-50 relative">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search for an album or artist..."
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                if (e.target.value === '') clearSearch();
                            }}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            onFocus={() => query && setShowDropdown(true)}
                            className="w-full bg-[#3b3c3e]/30 backdrop-blur-xl border border-[#454b35]/60 rounded-xl px-5 py-4 text-[#a3a89f] placeholder-[#7b7e64]/70 focus:outline-none focus:border-[#7b7e64] focus:ring-1 focus:ring-[#7b7e64]/30 transition-all duration-300 shadow-2xl text-sm"
                        />
                        {query && (
                            <button type="button" onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7b7e64] hover:text-[#a3a89f] transition font-bold">✕</button>
                        )}

                        {/* ДРОПДАУН В СТИЛЕ УГОЛЬНОГО СТЕКЛА */}
                        {showDropdown && (
                            <div className="absolute left-0 right-0 mt-2 bg-[#1d2216]/90 backdrop-blur-2xl border border-[#454b35]/80 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto text-left hide-scrollbar z-50 animate-in fade-in slide-in-from-top-2">
                                {isDropdownLoading ? (
                                    <div className="p-4 text-xs text-[#7b7e64] animate-pulse text-center tracking-widest uppercase">Wandering the mist...</div>
                                ) : dropdownResults.length > 0 ? (
                                    dropdownResults.map((album) => (
                                        <Link
                                            key={album.id}
                                            to={`/album/${album.id}`}
                                            className="flex items-center gap-3 p-3 hover:bg-[#3b3c3e]/40 transition border-b border-[#3b3c3e]/30 last:border-0 group"
                                        >
                                            <img
                                                src={album.images?.[2]?.url || album.images?.[0]?.url}
                                                alt=""
                                                className="w-9 h-9 object-cover rounded bg-[#1d2216] border border-[#454b35]/40 shrink-0 group-hover:border-[#7b7e64]/50 transition duration-300"
                                            />
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-[#a3a89f] truncate group-hover:text-white transition duration-300">
                                                    {album.name}
                                                </p>
                                                <p className="text-xs text-[#7b7e64] truncate mt-0.5">
                                                    {album.artists?.map(a => a.name).join(', ')}
                                                </p>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="p-4 text-xs text-[#7b7e64] text-center tracking-wider">No paths found</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* КНОПКА ПОИСКА */}
                    <button type="submit" disabled={isSearching} className="bg-[#454b35] hover:bg-[#7b7e64] border border-[#7b7e64]/20 disabled:bg-[#3b3c3e] text-[#1d2216] hover:text-white font-black px-8 rounded-xl transition-all duration-500 shrink-0 shadow-lg tracking-wide text-sm">
                        {isSearching ? '...' : 'Search'}
                    </button>
                </form>
            </div>

            {/* КОНТЕНТНАЯ ЗОНА */}
            <div className="w-full">
                {searched ? (
                    <div>
                        <h2 className="text-sm font-bold mb-6 border-b border-[#454b35]/50 pb-2 tracking-widest text-[#7b7e64] uppercase">Search Results</h2>
                        {isSearching ? (
                            <div className="text-xs font-medium text-[#7b7e64] animate-pulse text-center py-10 tracking-widest uppercase">Listening to the woods...</div>
                        ) : searchData.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {searchData.map(album => <AlbumCard key={album.id} album={album} />)}
                            </div>
                        ) : (
                            <div className="text-center text-[#7b7e64] py-10 text-xs italic">Nothing found in the mist.</div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-14 w-full">

                        {/* ТРЕНДЫ */}
                        <div className="w-full text-left">
                            <h2 className="text-xs font-bold mb-6 border-b border-[#454b35]/50 pb-2 tracking-widest text-[#7b7e64] uppercase">📈 Trending</h2>
                            {isFeedLoading ? (
                                <TrendingSkeleton />
                            ) : (
                                <div ref={scrollRef} className="flex flex-row flex-nowrap overflow-x-auto gap-4 pb-4 snap-x scroll-smooth hide-scrollbar">
                                    {trending.map(album => (
                                        <div key={album.id} className="snap-start shrink-0 w-36 sm:w-40">
                                            <AlbumCard album={album} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ПОСЛЕДНИЕ РЕЦЕНЗИИ */}
                        <div className="w-full text-left mb-10">
                            <h2 className="text-xs font-bold mb-6 border-b border-[#454b35]/50 pb-2 tracking-widest text-[#7b7e64] uppercase">📝 Recent reviews</h2>
                            {isFeedLoading ? (
                                <ReviewsSkeleton />
                            ) : latestReviews.length > 0 ? (
                                <div className="flex flex-row flex-nowrap overflow-x-auto gap-5 pb-6 snap-x hide-scrollbar">
                                    {latestReviews.map(rev => (
                                        <div key={rev.id} className="group snap-start shrink-0 w-64 sm:w-72 bg-[#3b3c3e]/10 rounded-xl border border-[#454b35]/50 overflow-hidden hover:border-[#7b7e64]/60 transition-all duration-500 flex flex-col shadow-2xl relative">

                                            <div className="relative aspect-square w-full bg-[#1d2216] border-b border-[#3b3c3e]/30 shrink-0 overflow-hidden">
                                                {/* СВЕЧЕНИЕ: Цвет приглушенного мха */}
                                                <div className="absolute inset-0 bg-gradient-to-b from-[#7b7e64]/20 to-[#454b35]/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none scale-75 z-0" />

                                                {rev.album?.images?.[0]?.url ? (
                                                    <Link to={`/album/${rev.album_id}`} className="relative z-10 w-full h-full block">
                                                        <img src={rev.album.images[0].url} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 opacity-90 group-hover:opacity-100 transition-all duration-700" />
                                                    </Link>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-[#7b7e64] relative z-10">No Cover</div>
                                                )}

                                                {/* РЕЙТИНГ */}
                                                <div className="absolute top-2 right-2 bg-[#1d2216]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#454b35]/60 shadow-md flex items-center gap-1.5 z-20">
                                                    <span className="text-[#a3a89f] text-xs">★</span>
                                                    <span className="text-[#a3a89f] text-xs font-black">{rev.rating}</span>
                                                </div>

                                                {user?.id === rev.user_id && (
                                                    <button
                                                        onClick={() => handleDeleteReview(rev.id)}
                                                        className="absolute top-2 left-2 bg-[#1d2216]/90 hover:bg-red-900/40 border border-red-900/30 text-[#7b7e64] hover:text-red-400 p-1.5 rounded-lg shadow-lg transition-all duration-300 z-20 opacity-0 group-hover:opacity-100"
                                                        title="Delete entry"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="p-4 flex-1 flex flex-col bg-[#1d2216]/30 relative z-10">
                                                <Link to={`/album/${rev.album_id}`} className="font-bold text-sm text-[#a3a89f] hover:text-white truncate mb-1 transition-colors duration-300 text-left">
                                                    {rev.album?.name || 'Unknown Album'}
                                                </Link>

                                                {/* ИСПРАВЛЕНО: Ссылка на профиль автора */}
                                                <Link to={`/user/${rev.user_id}`} className="text-[9px] text-[#7b7e64] hover:text-[#a3a89f] font-bold tracking-widest uppercase text-left mb-2 transition-colors inline-block">
                                                    whispered by @{rev.username || 'user'}
                                                </Link>

                                                <p className="text-[#a3a89f]/80 text-xs italic line-clamp-3 leading-relaxed text-left border-l-2 border-[#454b35] pl-2 py-0.5 group-hover:border-[#7b7e64] transition-colors duration-500">
                                                    "{rev.review_text}"
                                                </p>
                                                <div className="mt-auto pt-3 text-[9px] text-[#454b35] font-bold tracking-widest text-right uppercase">
                                                    {new Date(rev.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-[#7b7e64] py-12 bg-[#3b3c3e]/10 rounded-xl border border-[#454b35]/30 border-dashed text-xs italic">
                                    The forest is quiet. No echoes yet.
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}