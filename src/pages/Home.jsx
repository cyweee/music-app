import { Link } from 'react-router-dom';
import { albumsData } from '../data/albums';

export default function Home() {
    return (
        <div className="p-6 bg-gray-900 min-h-screen">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">Popular albums</h1>
                <p className="text-gray-400 mt-2">Choose an album, rate it, and read reviews from other users.</p>
            </header>

            {/* Сетка альбомов */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {albumsData.map((album) => (
                    <Link
                        to={`/album/${album.id}`}
                        key={album.id}
                        className="bg-gray-800 p-4 rounded-xl shadow-lg hover:bg-gray-750 transition duration-300 transform hover:-translate-y-1 group"
                    >
                        <div className="relative overflow-hidden rounded-lg aspect-square mb-4 shadow-md">
                            <img
                                src={album.coverUrl}
                                alt={album.title}
                                className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                            />
                        </div>
                        <h3 className="font-bold text-white text-lg truncate group-hover:text-green-400 transition">
                            {album.title}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">{album.artist}</p>
                        <span className="inline-block mt-2 text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
              {album.year}
            </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}