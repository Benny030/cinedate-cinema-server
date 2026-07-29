import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json());

// ─── Cache in memoria ─────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 20; // 20 minuti

const CINEMAS = [
  { id: 1013, name: 'The Space Parma Campus',           city: 'Parma',    lat: 44.8015, lng: 10.3279, slug: 'parma-campus' },
  { id: 1014, name: 'The Space Parma Centro',            city: 'Parma',    lat: 44.7914, lng: 10.3277, slug: 'parma-centro' },
  { id: 1001, name: 'The Space Bologna',                 city: 'Bologna',  lat: 44.4938, lng: 11.3024, slug: 'bologna' },
  { id: 1002, name: 'The Space Roma Parco de Medici',    city: 'Roma',     lat: 41.8291, lng: 12.4194, slug: 'roma-parco-de-medici' },
  { id: 1003, name: 'The Space Roma Moderno',            city: 'Roma',     lat: 41.9012, lng: 12.4993, slug: 'roma-moderno' },
  { id: 1004, name: 'The Space Cerro Maggiore',          city: 'Milano',   lat: 45.5935, lng: 8.9705,  slug: 'cerro-maggiore' },
  { id: 1005, name: 'The Space Rozzano',                 city: 'Milano',   lat: 45.3792, lng: 9.1514,  slug: 'rozzano' },
  { id: 1006, name: 'The Space Torino',                  city: 'Torino',   lat: 45.0167, lng: 7.5833,  slug: 'torino' },
  { id: 1007, name: 'The Space Verona',                  city: 'Verona',   lat: 45.4388, lng: 10.9917, slug: 'verona' },
  { id: 1008, name: 'The Space Firenze',                 city: 'Firenze',  lat: 43.8065, lng: 11.2227, slug: 'firenze' },
  { id: 1009, name: 'The Space Napoli',                  city: 'Napoli',   lat: 40.8518, lng: 14.2681, slug: 'napoli' },
  { id: 1010, name: 'The Space Salerno',                 city: 'Salerno',  lat: 40.6765, lng: 14.7814, slug: 'salerno' },
  { id: 1011, name: 'The Space Genova',                  city: 'Genova',   lat: 44.4087, lng: 8.9229,  slug: 'genova' },
  { id: 1012, name: 'The Space Trieste',                 city: 'Trieste',  lat: 45.6543, lng: 13.7631, slug: 'trieste' },
  { id: 1015, name: 'The Space Limena',                  city: 'Padova',   lat: 45.4584, lng: 11.8795, slug: 'limena' },
  { id: 1016, name: 'The Space Vicenza',                 city: 'Vicenza',  lat: 45.5116, lng: 11.5699, slug: 'vicenza-torri-di-quartesolo' },
  { id: 1017, name: 'The Space Cagliari Quartucciu',     city: 'Cagliari', lat: 39.2517, lng: 9.1993,  slug: 'quartucciu' },
  { id: 1018, name: 'The Space Catania Belpasso',        city: 'Catania',  lat: 37.5869, lng: 14.9820, slug: 'belpasso' },
];

// ─── Playwright fetch con cache ───────────────────────────────────────────────
async function fetchTheSpace(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  try {
    const context = await browser.newContext({
      locale: 'it-IT',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });

    const page = await context.newPage();
    await page.goto('https://www.thespacecinema.it/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const result = await page.evaluate(async (apiUrl) => {
      const res = await fetch(apiUrl, {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Referer': 'https://www.thespacecinema.it/' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }, url);

    cache.set(url, { data: result, ts: Date.now() });
    return result;
  } finally {
    await browser.close();
  }
}

// ─── Distanza in km ───────────────────────────────────────────────────────────
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Normalizza titolo per matching ──────────────────────────────────────────
function normalize(t) {
  return t.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function titlesMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.length > 4 && nb.includes(na)) return true;
  if (nb.length > 4 && na.includes(nb)) return true;
  const wordsA = na.split(' ').filter(w => w.length > 2);
  const wordsB = nb.split(' ').filter(w => w.length > 2);
  return wordsA.filter(w => wordsB.includes(w)).length >= Math.min(2, wordsA.length, wordsB.length);
}

// ─── Normalizza sessioni da risposta The Space ────────────────────────────────
function parseSessions(film) {
  const rawGroups = film.showingGroups ?? film.sessions ?? film.showings ?? [];
  const groups = Array.isArray(rawGroups) ? rawGroups : [];

  return groups
    .flatMap(g => Array.isArray(g.sessions) ? g.sessions : Array.isArray(g.showings) ? g.showings : [])
    .map(s => {
      const rawTime = s.startTime ?? s.showingTime ?? s.time ?? '';
      return {
        id: String(s.sessionId ?? s.id ?? ''),
        time: rawTime.length >= 16 ? rawTime.substring(11, 16) : rawTime,
        hall: s.screenName ?? s.screen?.name ?? s.hall?.name ?? null,
        format: Array.isArray(s.attributes) ? s.attributes.map(a => a.name).filter(Boolean).join(', ') : null,
        bookingUrl: s.bookingUrl?.startsWith('http')
          ? s.bookingUrl
          : `https://www.thespacecinema.it${s.bookingUrl ?? ''}`,
      };
    });
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "cinedate-cinema-server"
  });
});

// ─── GET /cinemas — lista cinema ─────────────────────────────────────────────
app.get('/cinemas', (req, res) => {
  res.json(CINEMAS);
});

// ─── GET /cinema/nearby — cinema vicini ──────────────────────────────────────
app.get('/cinema/nearby', (req, res) => {
  const { lat, lng, radius = '25' } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat e lng obbligatori' });

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusKm = parseInt(radius) || 25;

  const nearby = CINEMAS
    .map(c => ({ ...c, distanceKm: Math.round(getDistanceKm(userLat, userLng, c.lat, c.lng) * 10) / 10 }))
    .filter(c => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({ cinemas: nearby });
});

// ─── GET /cinema/showtimes/:id — programmazione ───────────────────────────────
app.get('/cinema/showtimes/:id', async (req, res) => {
  const cinemaId = Number(req.params.id);
  if (!cinemaId) return res.status(400).json({ error: 'id non valido' });

  try {
    const days = [];

    for (let i = 0; i < 7; i++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + i);
      const dateKey = dateObj.toISOString().split('T')[0];
      const showingDate = `${dateKey}T00:00:00`;

      const url = `https://www.thespacecinema.it/api/microservice/showings/cinemas/${cinemaId}/films?showingDate=${showingDate}&minEmbargoLevel=3&includesSession=true&includeSessionAttributes=true`;

      try {
        const response = await fetchTheSpace(url);
        const data = Array.isArray(response) ? response : (response?.result ?? response?.films ?? []);

        const films = data.map(film => ({
          id:        String(film.filmId ?? film.id ?? ''),
          title:     film.filmTitle ?? film.title ?? film.name ?? 'Titolo sconosciuto',
          posterUrl: film.posterImageSrc ?? film.posterUrl ?? film.imageUrl ?? null,
          duration:  film.runningTime ? `${film.runningTime} min` : null,
          sessions:  parseSessions(film),
        }));

        days.push({ date: dateKey, films });
      } catch (err) {
        console.error(`Errore giorno ${dateKey}:`, err.message);
        days.push({ date: dateKey, films: [] });
      }
    }

    res.json({ cinemaId, days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /cinema/check-film — film in sala vicino ────────────────────────────
app.get('/cinema/check-film', async (req, res) => {
  const { title, lat, lng, radius = '25' } = req.query;
  if (!title || !lat || !lng) return res.status(400).json({ error: 'title, lat, lng obbligatori' });

  const userLat  = parseFloat(lat);
  const userLng  = parseFloat(lng);
  const radiusKm = parseInt(radius) || 25;

  const nearbyCinemas = CINEMAS
    .map(c => ({ ...c, distanceKm: getDistanceKm(userLat, userLng, c.lat, c.lng) }))
    .filter(c => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);

  if (!nearbyCinemas.length) {
    return res.json({ inCinema: false, showings: [], filmTitle: title });
  }

  const today = new Date().toISOString().split('T')[0] + 'T00:00:00';
  const showings = [];

  await Promise.all(nearbyCinemas.map(async cinema => {
    try {
      const url = `https://www.thespacecinema.it/api/microservice/showings/cinemas/${cinema.id}/films?showingDate=${today}&minEmbargoLevel=3&includesSession=true`;
      const data = await fetchTheSpace(url);
      if (!Array.isArray(data)) return;

      const match = data.find(f => titlesMatch(f.filmTitle ?? f.title ?? f.name ?? '', title));
      if (!match) return;

      const sessions = parseSessions(match).map(s => s.time).filter(Boolean).slice(0, 5);

      showings.push({
        cinema:     cinema.name,
        cinemaId:   cinema.id,
        distanceKm: Math.round(cinema.distanceKm * 10) / 10,
        sessions,
        bookingUrl: `https://www.thespacecinema.it/cinema/${cinema.slug}/acquisto-biglietti`,
      });
    } catch { /* continua */ }
  }));

  showings.sort((a, b) => a.distanceKm - b.distanceKm);
  res.json({ inCinema: showings.length > 0, showings, filmTitle: title });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🎬 Cinema server attivo su porta ${PORT}`));