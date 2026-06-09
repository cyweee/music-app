const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

// 1. Получение токена доступа
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

// 2. Поиск альбомов
export async function searchAlbums(query) {
    const token = await getSpotifyToken();
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=12`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return data.albums?.items || [];
}

// 3. Получение альбома по ID
export async function getAlbumById(id) {
    const token = await getSpotifyToken();
    const response = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error('Album not found');
    }
    return await response.json();
}

// 4. Тренды (Используем официальные новинки, так как плейлисты заблочены)
// Возвращаем рабочую ссылку-заглушку!
export async function getTrendingAlbums() {
    const token = await getSpotifyToken();
    const response = await fetch('https://api.spotify.com/v1/browse/new-releases?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return data.albums?.items || [];
}