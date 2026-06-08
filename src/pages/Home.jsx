import { useState } from 'react';
import { Link } from 'react-router-dom';
import { searchAlbums } from '../spotify';

export default function Home() {
    const [query, setQuery] = useState('');
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSearched(true);
        try {
            const results = await searchAlbums(query);
            setAlbums(results);
        } catch (error) {
            console.error("Spotify search error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center max-w-5xl mx-auto mt-8">
            {/* Заголовок в стиле нашего приложения */}
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
                    Track albums you've listened to.<br />
                    Save those you want to hear.
                </h1>
                <p className="text-gray-400 text-lg">The social network for music lovers.</p>
            </div>

            {/* Поисковая строка */}
            <form onSubmit={handleSearch} className="w-full max-w-2xl flex gap-3 mb-12">
                <input
                    type="text"
                    placeholder="Search for an album or artist..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400 transition"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-400 disabled:bg-green-700 text-gray-950 font-bold px-8 rounded-xl transition duration-300"
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {/* Результаты поиска */}
            {loading ? (
                <div className="text-xl font-medium text-gray-400 animate-pulse">Loading albums...</div>
            ) : (
                <div className="w-full">
                    {albums.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {albums.map((album) => (
                                <Link
                                    to={`/album/${album.id}`}
                                    key={album.id}
                                    className="group flex flex-col gap-2 bg-gray-900/40 p-2 rounded-xl border border-transparent hover:border-gray-800 hover:bg-gray-900 transition duration-300"
                                >
                                    {/* Обложка */}
                                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-800 border border-gray-800 shadow-md">
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

                                    {/* Инфо */}
                                    <div className="px-1 py-0.5">
                                        <h3 className="font-bold text-sm truncate group-hover:text-green-400 transition">
                                            {album.name}
                                        </h3>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">
                                            {album.artists?.map(a => a.name).join(', ')}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            {album.release_date ? album.release_date.split('-')[0] : ''}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        searched && <div className="text-center text-gray-500">No albums found. Try another search!</div>
                    )}
                </div>
            )}
        </div>
    );
}