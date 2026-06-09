import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getAlbumById } from '../spotify';
import { Link, useNavigate } from 'react-router-dom';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                navigate('/auth');
                return;
            }

            const currentUser = session.user;
            setUser(currentUser);
            setUsername(currentUser.user_metadata?.username || '');
            setAvatarUrl(currentUser.user_metadata?.avatar_url || '');

            const { data: reviewsData, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (!error && reviewsData) {
                const reviewsWithAlbums = await Promise.all(
                    reviewsData.map(async (rev) => {
                        try {
                            const albumData = await getAlbumById(rev.album_id);
                            return { ...rev, album: albumData };
                        } catch (err) {
                            // ИСПРАВЛЕНО: Теперь мы используем переменную err, выводя её в лог
                            console.error(`Error loading album ${rev.album_id}:`, err);
                            return { ...rev, album: null };
                        }
                    })
                );
                setReviews(reviewsWithAlbums);
            }
            setLoading(false);
        };

        loadProfile();
    }, [navigate]);

    // Функция загрузки и СЖАТИЯ картинки
    const handleImageUpload = async (e) => {
        try {
            setUploadingImage(true);
            const file = e.target.files[0];
            if (!file) return;

            // 1. Сжимаем картинку на стороне клиента (браузера)
            const resizedFile = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 400; // Максимальный размер 400x400 пикселей
                        let width = img.width;
                        let height = img.height;

                        // Вычисляем новые пропорции
                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Конвертируем обратно в файл формата JPEG с качеством 80%
                        canvas.toBlob((blob) => {
                            resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
                        }, 'image/jpeg', 0.8);
                    };
                };
            });

            // 2. Отправляем уже легкую картинку в Supabase
            const fileName = `${user.id}-${Math.random()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, resizedFile);

            if (uploadError) throw uploadError;

            // 3. Получаем ссылку и обновляем UI
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setAvatarUrl(data.publicUrl);
        } catch (error) {
            alert("Error uploading image: " + error.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);

        const { data, error } = await supabase.auth.updateUser({
            data: { username: username, avatar_url: avatarUrl }
        });

        if (!error) {
            setUser(data.user);
            setIsEditing(false);
        } else {
            alert(error.message);
        }
        setSavingProfile(false);
    };

    if (loading) {
        return <div className="text-center py-12 text-2xl font-bold text-gray-400 animate-pulse">Loading profile...</div>;
    }

    const currentName = user?.user_metadata?.username || 'User';
    const defaultAvatar = `https://ui-avatars.com/api/?name=${currentName}&background=22c55e&color=fff&size=256&font-weight=bold`;
    const displayAvatar = user?.user_metadata?.avatar_url || defaultAvatar;
    const previewAvatar = avatarUrl || defaultAvatar;

    return (
        <div className="max-w-4xl mx-auto mt-8 flex flex-col gap-10">
            <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-lg flex flex-col md:flex-row gap-8 items-center md:items-start">

                <div className="w-32 h-32 rounded-full bg-gray-800 border-4 border-green-500 overflow-hidden flex-shrink-0 shadow-xl relative group">
                    <img
                        src={isEditing ? previewAvatar : displayAvatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                    />
                    {uploadingImage && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-bold text-green-400">
                            Uploading...
                        </div>
                    )}
                </div>

                <div className="flex-1 w-full text-center md:text-left">
                    {isEditing ? (
                        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 max-w-sm mx-auto md:mx-0 mt-2">
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-gray-800 text-white p-3 rounded border border-gray-700 focus:outline-none focus:border-green-400 transition"
                            />

                            <label className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-3 rounded border border-gray-700 transition cursor-pointer text-center text-sm font-medium">
                                {uploadingImage ? 'Processing...' : 'Upload New Avatar from PC'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                    className="hidden"
                                />
                            </label>

                            <div className="flex gap-3 justify-center md:justify-start mt-2">
                                <button type="submit" disabled={savingProfile || uploadingImage} className="bg-green-500 hover:bg-green-400 text-gray-950 font-bold py-2 px-6 rounded transition">
                                    {savingProfile ? 'Saving...' : 'Save'}
                                </button>
                                <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="mt-2">
                            <h1 className="text-3xl font-black mb-1">{currentName}</h1>
                            <p className="text-gray-400 mb-5">{user?.email}</p>
                            <button onClick={() => setIsEditing(true)} className="bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 px-5 py-2.5 rounded transition border border-gray-700 shadow-sm">
                                Edit Profile
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-black mb-6 border-b border-gray-800 pb-3">My Reviews ({reviews.length})</h2>
                {reviews.length === 0 ? (
                    <p className="text-gray-500 italic text-lg">You haven't written any reviews yet. Go find some music!</p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {reviews.map((rev) => (
                            <div key={rev.id} className="bg-gray-900/60 p-4 rounded-xl border border-gray-800/80 flex gap-4 hover:bg-gray-800/60 transition duration-300">
                                {rev.album && rev.album.images?.[0]?.url ? (
                                    <Link to={`/album/${rev.album_id}`} className="w-24 h-24 flex-shrink-0">
                                        <img src={rev.album.images[0].url} alt="Cover" className="w-full h-full object-cover rounded-lg shadow-md hover:scale-105 transition duration-300" />
                                    </Link>
                                ) : (
                                    <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-500 text-center p-2">
                                        No Cover
                                    </div>
                                )}
                                <div className="flex-1 overflow-hidden flex flex-col justify-center">
                                    <Link to={`/album/${rev.album_id}`} className="font-bold text-lg text-white hover:text-green-400 truncate block transition">
                                        {rev.album ? rev.album.name : 'Unknown Album'}
                                    </Link>
                                    <div className="flex items-center gap-3 mt-1 mb-2">
                                        <span className="text-green-400 text-sm font-bold tracking-widest">{'★'.repeat(rev.rating)}</span>
                                        <span className="text-xs text-gray-500 font-medium">{new Date(rev.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed" title={rev.review_text}>
                                        "{rev.review_text}"
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}