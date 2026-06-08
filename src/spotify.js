const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

// Функция для получения временного токена доступа (живет 1 час)
export async function getSpotifyToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    const data = await response.json();
    return data.access_token;
}

// Функция для поиска альбомов по названию
export async function searchAlbums(query) {
    const token = await getSpotifyToken();

    // Ищем альбомы, забираем максимум 12 штук за раз
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=12`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();
    return data.albums.items;
}

// Функция для получения конкретного альбома по ID
export async function getAlbumById(id) {
    const token = await getSpotifyToken();

    const response = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Album not found');
    }

    // Возвращаем результат напрямую, без создания лишней переменной
    return await response.json();
}