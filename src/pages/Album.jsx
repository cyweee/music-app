import { useParams } from 'react-router-dom';
import { albumsData } from '../data/albums';

export default function Album() {
    const { id } = useParams(); // Достаем ID из URL

    // Ищем альбом в нашей базе данных по ID
    const album = albumsData.find((a) => a.id === id);

    if (!album) {
        return (
            <div className="p-8 text-center text-red-400">
                <h2 className="text-2xl font-bold">Album not found</h2>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-gray-100">
            {/* Шапка альбома */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-10">
                <img
                    src={album.coverUrl}
                    alt={album.title}
                    className="w-64 h-64 object-cover rounded-xl shadow-2xl border border-gray-700"
                />
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-4xl md:text-5xl font-black text-white">{album.title}</h1>
                    <p className="text-xl text-green-400 font-medium mt-2">{album.artist}</p>
                    <p className="text-gray-400 mt-1">Год релиза: <span className="text-white">{album.year}</span></p>

                    <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                        {album.genres.map((genre, idx) => (
                            <span key={idx} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold">
                {genre}
              </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Интерактивная зона: Плеер и будущая форма отзывов */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Встроенный плеер (Вкладка на 1 колонку из 3) */}
                <div className="lg:col-span-1 bg-gray-800 p-4 rounded-xl shadow-lg">
                    <h2 className="text-lg font-bold text-white mb-4">Listen to album</h2>
                    <iframe
                        src={`https://open.spotify.com/embed/album/${album.spotifyEmbedId}`}
                        width="100%"
                        height="380"
                        allowFullScreen=""
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-lg shadow-inner border-0"
                    ></iframe>
                </div>

                {/* Будущая зона отзывов и рейтингов (Занимает 2 колонки) */}
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Reviews and ratings</h2>
                        <p className="text-gray-400 text-sm">In the next stage, we will add interactive stars here and form submission to Supabase.</p>
                    </div>
                    <div className="border-t border-gray-700 pt-4 mt-6 text-center text-gray-500">
                        Here will be displayed a list of all reviews for this album.
                    </div>
                </div>
            </div>
        </div>
    );
}