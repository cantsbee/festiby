import './style.css'

window.addEventListener('DOMContentLoaded', () => {
  // --- CONFIGURACIÓN SPOTIFY ---
  const CLIENT_ID = '6e4ca8910c3c479ea21b9de20ca7646c'; 
  const REDIRECT_URI = 'https://festiby.vercel.app/'; // Redirección a la app en Vercel
  const SCOPES = 'user-top-read';

  function getAuthUrl() {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'token',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  function getTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
  }

  // --- MANEJO DE UI ---
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  const inputSection = document.getElementById('input-section');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultsSection = document.getElementById('results-section');
  const resultsList = document.getElementById('results-list');

  let accessToken = getTokenFromUrl();

  if (accessToken) {
    loginBtn.style.display = 'none';
    userInfo.style.display = 'block';
    inputSection.style.display = 'block';
    showUserInfo();
  } else {
    loginBtn.onclick = () => {
      window.location = getAuthUrl();
    };
  }

  // --- OBTENER INFO DE USUARIO Y TOP ARTISTAS ---
  async function showUserInfo() {
    const user = await fetchSpotify('https://api.spotify.com/v1/me');
    userInfo.innerHTML = `<p>¡Hola, ${user.display_name}!</p>`;
  }

  async function getUserTopArtists() {
    const res = await fetchSpotify('https://api.spotify.com/v1/me/top/artists?limit=50');
    return res.items;
  }

  // --- UTILIDAD PARA LLAMADAS A SPOTIFY ---
  async function fetchSpotify(url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Error en la API de Spotify');
    return res.json();
  }

  // --- ANÁLISIS DE ARTISTAS ---
  analyzeBtn.onclick = async () => {
    resultsSection.style.display = 'none';
    resultsList.innerHTML = '';
    const input = document.getElementById('artist-list').value;
    const artistNames = input.split('\n').map(a => a.trim()).filter(Boolean);
    if (!artistNames.length) return alert('Introduce al menos un artista.');

    // 1. Obtener tus artistas y géneros favoritos
    let userTopArtists = [];
    try {
      userTopArtists = await getUserTopArtists();
    } catch (e) {
      alert('Error obteniendo tus artistas de Spotify. ¿Has iniciado sesión?');
      return;
    }
    const userGenres = new Set(userTopArtists.flatMap(a => a.genres));
    const userArtistNames = new Set(userTopArtists.map(a => a.name.toLowerCase()));

    // 2. Buscar los artistas introducidos y obtener sus géneros
    const analyzed = [];
    for (const name of artistNames) {
      const search = await searchArtist(name);
      if (!search) continue;
      // 3. Comparar: +2 si es artista favorito, +1 por cada género en común
      let score = 0;
      if (userArtistNames.has(search.name.toLowerCase())) score += 2;
      const commonGenres = search.genres.filter(g => userGenres.has(g));
      score += commonGenres.length;
      analyzed.push({
        name: search.name,
        genres: search.genres,
        score,
        commonGenres,
        url: search.external_urls.spotify,
      });
    }
    // 4. Ordenar y mostrar
    analyzed.sort((a, b) => b.score - a.score);
    for (const a of analyzed) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${a.url}" target="_blank">${a.name}</a> (${a.genres.join(', ')})<br>Puntuación: <b>${a.score}</b> ${a.commonGenres.length ? ' | Géneros en común: ' + a.commonGenres.join(', ') : ''}`;
      resultsList.appendChild(li);
    }
    resultsSection.style.display = 'block';
  };

  // --- BUSCAR ARTISTA EN SPOTIFY ---
  async function searchArtist(name) {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`;
    const res = await fetchSpotify(url);
    return res.artists.items[0];
  }
});


