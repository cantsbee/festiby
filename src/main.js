import './style.css'

window.addEventListener('DOMContentLoaded', () => {
  // --- CONFIGURACIÓN SPOTIFY ---
  const CLIENT_ID = '6e4ca8910c3c479ea21b9de20ca7646c'; 
  const REDIRECT_URI = 'https://festiby.vercel.app/'; // Redirección a la app en Vercel
  const SCOPES = 'user-top-read';

  // --- PKCE UTILS ---
  function base64urlencode(a) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return await window.crypto.subtle.digest('SHA-256', data);
  }

  async function generateCodeChallenge(codeVerifier) {
    const hashed = await sha256(codeVerifier);
    return base64urlencode(hashed);
  }

  function generateRandomString(length) {
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('').substr(0, length);
  }

  // --- MANEJO DE UI ---
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  const inputSection = document.getElementById('input-section');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultsSection = document.getElementById('results-section');
  const resultsList = document.getElementById('results-list');

  // --- FLUJO PKCE ---
  let accessToken = localStorage.getItem('spotify_access_token');

  async function handleAuth() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      // Intercambiar code por token
      const codeVerifier = localStorage.getItem('spotify_code_verifier');
      const body = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      });
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = await res.json();
      if (data.access_token) {
        accessToken = data.access_token;
        localStorage.setItem('spotify_access_token', accessToken);
        window.history.replaceState({}, document.title, '/'); // Limpia el code de la URL
        showLoggedUI();
      } else {
        alert('Error autenticando con Spotify');
      }
    } else if (accessToken) {
      showLoggedUI();
    } else {
      showLoginUI();
    }
  }

  function showLoginUI() {
    loginBtn.style.display = 'block';
    userInfo.style.display = 'none';
    inputSection.style.display = 'none';
    resultsSection.style.display = 'none';
  }

  function showLoggedUI() {
    loginBtn.style.display = 'none';
    userInfo.style.display = 'block';
    inputSection.style.display = 'block';
    showUserInfo();
  }

  loginBtn.onclick = async () => {
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });
    window.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

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

  // --- INICIO ---
  handleAuth();
});


