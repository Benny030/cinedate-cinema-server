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
 // Emilia-Romagna
  {
    id: 1013,
    name: 'The Space Parma Campus',
    city: 'Parma',
    address: 'Largo Sergio Leone 7/A',
    lat: 44.7662,
    lng: 10.3213,
    slug: 'parma-campus',
  },
  {
    id: 1031,
    name: 'The Space Parma Centro',
    city: 'Parma',
    address: 'Via Toscana 22',
    lat: 44.7904,
    lng: 10.3347,
    slug: 'parma-centro',
  },
  {
    id: 1003,
    name: 'The Space Bologna',
    city: 'Bologna',
    address: 'Viale Europa 5',
    lat: 44.5286,
    lng: 11.3972,
    slug: 'bologna',
  },

  // Roma
  {
    id: 1025,
    name: "The Space Roma Parco de' Medici",
    city: 'Roma',
    address: 'Viale Parco de Medici 135',
    lat: 41.8078,
    lng: 12.3819,
    slug: 'roma-parco-de-medici', 
  },
  {
    id: 1021,
    name: 'The Space Roma Moderno',
    city: 'Roma',
    address: 'Piazza della Repubblica 44',
    lat: 41.9011,
    lng: 12.4966,
    slug: 'roma-moderno',
  },

  // Milano
  {
    id: 1004,
    name: 'The Space Cerro Maggiore',
    city: 'Milano',
    address: 'Via Roma 104, Cerro Maggiore',
    lat: 45.5927,
    lng: 8.9578,
    slug: 'cerro-maggiore',
  },
  {
    id: 1005,
    name: 'The Space Rozzano',
    city: 'Milano',
    address: 'Via Cascina Secco 1, Rozzano',
    lat: 45.3818,
    lng: 9.1457,
    slug: 'rozzano',
  },

  // Piemonte
  {
    id: 1028,
    name: 'The Space Torino',
    city: 'Torino',
    address: 'Corso Grosseto 54, Beinasco',
    lat: 45.1164,
    lng: 7.5945,
    slug: 'torino',
  },

  // Veneto
  {
    id: 1007,
    name: 'The Space Verona',
    city: 'Verona',
    address: 'Via Col. Galliano 2',
    lat: 45.4334,
    lng: 10.9748,
    slug: 'verona',
  },

  {
    id: 1015,
    name: 'The Space Limena',
    city: 'Padova',
    address: 'Via Lisbona 1, Limena',
    lat: 45.4467,
    lng: 11.8444,
    slug: 'limena',
  },

  {
    id: 1016,
    name: 'The Space Vicenza',
    city: 'Vicenza',
    address: 'Via della Scienza 16, Torri di Quartesolo',
    lat: 45.5145,
    lng: 11.6082,
    slug: 'vicenza-torri-di-quartesolo',
  },

  // Toscana
  {
    id: 1008,
    name: 'The Space Firenze',
    city: 'Firenze',
    address: 'Via Tirso 8, Novoli',
    lat: 43.7969,
    lng: 11.2193,
    slug: 'firenze',
  },

  // Campania
  {
    id: 1019,
    name: 'The Space Napoli',
    city: 'Napoli',
    address: 'Via Gianturco 50',
    lat: 40.8467,
    lng: 14.2855,
    slug: 'napoli',
  },

  {
    id: 1010,
    name: 'The Space Salerno',
    city: 'Salerno',
    address: 'Via Fiorentino 48',
    lat: 40.6896,
    lng: 14.7891,
    slug: 'salerno',
  },

  // Liguria
  {
    id: 1011,
    name: 'The Space Genova',
    city: 'Genova',
    address: 'Calata Gadda, Porto Antico',
    lat: 44.4106,
    lng: 8.9270,
    slug: 'genova',
  },

  // Friuli
  {
    id: 1012,
    name: 'The Space Trieste',
    city: 'Trieste',
    address: 'Via Luigi Negrelli 2',
    lat: 45.6370,
    lng: 13.7817,
    slug: 'trieste',
  },

  // Sardegna
  {
    id: 1017,
    name: 'The Space Cagliari Quartucciu',
    city: 'Cagliari',
    address: 'S.S. 554 Quartucciu',
    lat: 39.2567,
    lng: 9.1795,
    slug: 'quartucciu',
  },

  // Sicilia
  {
    id: 1032,
    name: 'The Space Catania Belpasso',
    city: 'Catania',
    address: 'C.da Pantano, Belpasso',
    lat: 37.5839,
    lng: 14.9846,
    slug: 'belpasso',
  },];


 
// ─── Playwright fetch con cache ───────────────────────────────────────────────
async function fetchTheSpace(url) {
  const cached = cache.get(url);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log('🟢 CACHE HIT:', url);
    return cached.data;
  }

  console.log('🌐 FETCH THE SPACE:', url);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const context = await browser.newContext({
      locale: 'it-IT',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });

    const page = await context.newPage();

    await page.goto('https://www.thespacecinema.it/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForTimeout(1500);

    const result = await page.evaluate(async (apiUrl) => {
      const res = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://www.thespacecinema.it/',
        },
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(
          `The Space HTTP ${res.status}: ${text.substring(0, 500)}`
        );
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(
          `The Space returned non-JSON response: ${text.substring(0, 500)}`
        );
      }
    }, url);

    console.log('📦 THE SPACE RESPONSE TYPE:', typeof result);
    console.log(
      '📦 THE SPACE IS ARRAY:',
      Array.isArray(result)
    );

    if (Array.isArray(result)) {
      console.log(
        '📦 THE SPACE ARRAY LENGTH:',
        result.length
      );
    } else if (result && typeof result === 'object') {
      console.log(
        '📦 THE SPACE KEYS:',
        Object.keys(result)
      );
    }

    cache.set(url, {
      data: result,
      ts: Date.now(),
    });

    return result;
  } finally {
    await browser.close();
  }
}
 
 
// ─── Estrae l'array film dalla risposta The Space ─────────────────────────────
function extractFilms(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== 'object') {
    return [];
  }

  // Formati possibili
  const candidates = [
    response.result,
    response.films,
    response.data,
    response.items,
    response.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  // Alcune API annidano il risultato
  if (response.result && typeof response.result === 'object') {
    const nested = [
      response.result.films,
      response.result.data,
      response.result.items,
      response.result.results,
    ];

    for (const candidate of nested) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
  }

  return [];
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
  if (!film || typeof film !== 'object') {
    return [];
  }

  const rawGroups =
    film.showingGroups ??
    film.sessions ??
    film.showings ??
    [];

  let sessions = [];

  if (Array.isArray(rawGroups)) {
    for (const group of rawGroups) {
      if (Array.isArray(group?.sessions)) {
        sessions.push(...group.sessions);
      } else if (Array.isArray(group?.showings)) {
        sessions.push(...group.showings);
      } else if (
        group &&
        typeof group === 'object' &&
        (
          group.startTime ||
          group.showingTime ||
          group.time
        )
      ) {
        sessions.push(group);
      }
    }
  }

  return sessions
    .map((s) => {
      const rawTime =
        s?.startTime ??
        s?.showingTime ??
        s?.time ??
        '';

      let time = rawTime;

      if (
        typeof rawTime === 'string' &&
        rawTime.length >= 16 &&
        rawTime.includes('T')
      ) {
        time = rawTime.substring(11, 16);
      }

      const bookingUrl =
        s?.bookingUrl?.startsWith('http')
          ? s.bookingUrl
          : `https://www.thespacecinema.it${
              s?.bookingUrl ?? ''
            }`;

      return {
        id: String(
          s?.sessionId ??
          s?.id ??
          ''
        ),

        time,

        hall:
          s?.screenName ??
          s?.screen?.name ??
          s?.hall?.name ??
          null,

        format:
          Array.isArray(s?.attributes)
            ? s.attributes
                .map((a) => a?.name)
                .filter(Boolean)
                .join(', ')
            : null,

        bookingUrl,
      };
    })
    .filter((s) => s.time);
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

  console.log('');
  console.log('🎬 SHOWTIMES REQUEST');
  console.log('🏢 Cinema ID:', cinemaId);

  if (!cinemaId) {
    return res.status(400).json({
      error: 'id non valido',
    });
  }

  try {
    const days = [];

    for (let i = 0; i < 7; i++) {
      // -----------------------------------------------------------
      // DATA LOCALE ITALIA
      // -----------------------------------------------------------

      const dateObj = new Date();

      dateObj.setDate(
        dateObj.getDate() + i
      );

      const year = dateObj.getFullYear();

      const month = String(
        dateObj.getMonth() + 1
      ).padStart(2, '0');

      const day = String(
        dateObj.getDate()
      ).padStart(2, '0');

      const dateKey =
        `${year}-${month}-${day}`;

      const showingDate =
        `${dateKey}T00:00:00`;

      // -----------------------------------------------------------
      // URL THE SPACE
      // -----------------------------------------------------------

      const url =
        `https://www.thespacecinema.it/api/microservice/showings/cinemas/${cinemaId}/films` +
        `?showingDate=${encodeURIComponent(showingDate)}` +
        `&minEmbargoLevel=3` +
        `&includesSession=true` +
        `&includeSessionAttributes=true`;

      console.log('');
      console.log('────────────────────────────────────');
      console.log('📅 DATA:', dateKey);
      console.log('🌐 URL:', url);

      try {
        // ---------------------------------------------------------
        // CHIAMATA THE SPACE
        // ---------------------------------------------------------

        const response =
          await fetchTheSpace(url);

        // ---------------------------------------------------------
        // DEBUG RISPOSTA REALE
        // ---------------------------------------------------------

        console.log(
          '📦 RESPONSE TYPE:',
          Array.isArray(response)
            ? 'ARRAY'
            : typeof response
        );

        if (response && typeof response === 'object') {
          console.log(
            '🔑 RESPONSE KEYS:',
            Object.keys(response)
          );
        }

        console.log(
          '📦 RAW RESPONSE PREVIEW:',
          JSON.stringify(response).substring(0, 3000)
        );

        // ---------------------------------------------------------
        // ESTRAZIONE FILM
        // ---------------------------------------------------------

        let data = [];

        if (Array.isArray(response)) {
          data = response;
        } else if (
          Array.isArray(response?.result)
        ) {
          data = response.result;
        } else if (
          Array.isArray(response?.films)
        ) {
          data = response.films;
        } else if (
          Array.isArray(response?.data)
        ) {
          data = response.data;
        } else if (
          Array.isArray(response?.items)
        ) {
          data = response.items;
        }

        console.log(
          '🎞 FILM RAW TROVATI:',
          data.length
        );

        // ---------------------------------------------------------
        // DEBUG TITOLI
        // ---------------------------------------------------------

        console.log(
          '🎬 TITOLI RAW:',
          data.map((film) => (
            film?.filmTitle ??
            film?.title ??
            film?.name ??
            'SENZA TITOLO'
          ))
        );

        // ---------------------------------------------------------
        // NORMALIZZAZIONE FILM
        // ---------------------------------------------------------

        const films = data.map((film) => {
          const rawGroups =
            film?.showingGroups ??
            film?.sessions ??
            film?.showings ??
            [];

          const groups =
            Array.isArray(rawGroups)
              ? rawGroups
              : [];

          const sessions = groups
            .flatMap((group) => {
              if (
                Array.isArray(group?.sessions)
              ) {
                return group.sessions;
              }

              if (
                Array.isArray(group?.showings)
              ) {
                return group.showings;
              }

              // Alcune risposte possono avere
              // direttamente le sessioni.
              if (
                group?.startTime ||
                group?.showingTime ||
                group?.time
              ) {
                return [group];
              }

              return [];
            })
            .map((session) => {
              const rawTime =
                session?.startTime ??
                session?.showingTime ??
                session?.time ??
                '';

              let time = '';

              if (
                typeof rawTime === 'string'
              ) {
                if (rawTime.length >= 16) {
                  time =
                    rawTime.substring(11, 16);
                } else {
                  time = rawTime;
                }
              }

              return {
                id: String(
                  session?.sessionId ??
                  session?.id ??
                  ''
                ),

                time,

                hall:
                  session?.screenName ??
                  session?.screen?.name ??
                  session?.hall?.name ??
                  null,

                format:
                  Array.isArray(
                    session?.attributes
                  )
                    ? session.attributes
                        .map((a) => a?.name)
                        .filter(Boolean)
                        .join(', ')
                    : null,

                bookingUrl:
                  typeof session?.bookingUrl === 'string'
                    ? (
                        session.bookingUrl.startsWith('http')
                          ? session.bookingUrl
                          : `https://www.thespacecinema.it${session.bookingUrl}`
                      )
                    : '',
              };
            })
            .filter((session) => session.time);

          return {
            id: String(
              film?.filmId ??
              film?.id ??
              ''
            ),

            title:
              film?.filmTitle ??
              film?.title ??
              film?.name ??
              'Titolo sconosciuto',

            posterUrl:
              film?.posterImageSrc ??
              film?.posterUrl ??
              film?.imageUrl ??
              null,

            duration:
              film?.runningTime
                ? `${film.runningTime} min`
                : null,

            sessions,
          };
        });

        console.log(
          '✅ FILM NORMALIZZATI:',
          films.length
        );

        console.log(
          '🎥 FILM:',
          films.map((film) => ({
            id: film.id,
            title: film.title,
            sessions: film.sessions.length,
          }))
        );

        // ---------------------------------------------------------
        // RISULTATO GIORNO
        // ---------------------------------------------------------

        days.push({
          date: dateKey,
          films,
        });

      } catch (error) {
        console.error(
          '❌ ERRORE THE SPACE:',
          {
            cinemaId,
            date: dateKey,
            message: error?.message,
            stack: error?.stack,
          }
        );

        days.push({
          date: dateKey,
          films: [],
        });
      }
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------

    console.log('');
    console.log('════════════════════════════════════');
    console.log('🏁 SHOWTIMES COMPLETATO');
    console.log('🏢 Cinema:', cinemaId);

    console.log(
      '📅 Giorni:',
      days.length
    );

    console.log(
      '🎬 Film totali:',
      days.reduce(
        (total, day) =>
          total + day.films.length,
        0
      )
    );

    console.log(
      '📊 SUMMARY:',
      days.map((day) => ({
        date: day.date,
        films: day.films.length,
      }))
    );

    console.log('════════════════════════════════════');
    console.log('');

    // -------------------------------------------------------------
    // CACHE
    // -------------------------------------------------------------

    res.setHeader(
      'Cache-Control',
      's-maxage=1800, stale-while-revalidate'
    );

    return res.status(200).json({
      cinemaId,
      days,
    });

  } catch (error) {
    console.error(
      '🔥 SHOWTIMES FATAL ERROR:',
      error
    );

    return res.status(500).json({
      error:
        error?.message ??
        'Errore interno',
    });
  }
});
 



 
// ─── GET /cinema/check-film — film in sala vicino ────────────────────────────
app.get('/cinema/check-film', async (req, res) => {
  const { title, lat, lng, radius = '25' } = req.query;

  if (!title || !lat || !lng) {
    return res.status(400).json({
      error: 'title, lat, lng obbligatori',
    });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusKm = parseInt(radius) || 25;

  const nearbyCinemas = CINEMAS
    .map(c => ({
      ...c,
      distanceKm: getDistanceKm(
        userLat,
        userLng,
        c.lat,
        c.lng
      ),
    }))
    .filter(c => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);

  if (!nearbyCinemas.length) {
    return res.json({
      inCinema: false,
      showings: [],
      filmTitle: title,
    });
  }

  const today =
    new Date().toISOString().split('T')[0] +
    'T00:00:00';

  const showings = [];

  await Promise.all(
    nearbyCinemas.map(async cinema => {
      try {
        const url =
          `https://www.thespacecinema.it/api/microservice/showings/cinemas/${cinema.id}/films` +
          `?showingDate=${encodeURIComponent(today)}` +
          `&minEmbargoLevel=3` +
          `&includesSession=true`;

        const response =
          await fetchTheSpace(url);

        const data =
          extractFilms(response);

        console.log(
          '🎞 CHECK FILM:',
          cinema.name,
          'films:',
          data.length
        );

        const match = data.find(f =>
          titlesMatch(
            f?.filmTitle ??
            f?.title ??
            f?.name ??
            '',
            title
          )
        );

        if (!match) return;

        const sessions =
          parseSessions(match)
            .map(s => s.time)
            .filter(Boolean)
            .slice(0, 5);

        showings.push({
          cinema: cinema.name,
          cinemaId: cinema.id,
          distanceKm:
            Math.round(
              cinema.distanceKm * 10
            ) / 10,
          sessions,
          bookingUrl:
            `https://www.thespacecinema.it/cinema/${cinema.slug}/acquisto-biglietti`,
        });

      } catch (err) {
        console.error(
          `❌ CHECK FILM ${cinema.name}:`,
          err?.message || err
        );
      }
    })
  );

  showings.sort(
    (a, b) => a.distanceKm - b.distanceKm
  );

  res.json({
    inCinema: showings.length > 0,
    showings,
    filmTitle: title,
  });
});
 

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🎬 Cinema server attivo su porta ${PORT}`));