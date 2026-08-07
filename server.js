 
import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();

app.use(cors());
app.use(express.json());

/* ============================================================================
   CONFIG
============================================================================ */

const PORT = process.env.PORT || 4000;

const THE_SPACE_BASE_URL = 'https://www.thespacecinema.it';

const CACHE_TTL = 1000 * 60 * 20; // 20 minuti

const PAGE_TIMEOUT = 15000;
const API_TIMEOUT = 15000;

const cache = new Map();

/* ============================================================================
   CINEMA
============================================================================ */

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
    lng: 8.927,
    slug: 'genova',
  },

  // Friuli
  {
    id: 1012,
    name: 'The Space Trieste',
    city: 'Trieste',
    address: 'Via Luigi Negrelli 2',
    lat: 45.637,
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
  },
];

/* ============================================================================
   PLAYWRIGHT - BROWSER CONDIVISO
============================================================================ */

let browser = null;
let context = null;
let page = null;

let browserStarting = null;

async function getBrowserPage() {
  if (page && !page.isClosed()) {
    return page;
  }

  if (browserStarting) {
    return browserStarting;
  }

  browserStarting = (async () => {
    console.log('🚀 Avvio Chromium...');

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    context = await browser.newContext({
      locale: 'it-IT',
      timezoneId: 'Europe/Rome',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    });

    page = await context.newPage();

    page.setDefaultTimeout(API_TIMEOUT);
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT);

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('🌐 PAGE ERROR:', msg.text());
      }
    });

    page.on('pageerror', (error) => {
      console.log('🌐 PAGE EXCEPTION:', error.message);
    });

    console.log('✅ Chromium pronto');

    return page;
  })();

  try {
    return await browserStarting;
  } finally {
    browserStarting = null;
  }
}

/* ============================================================================
   CHIUSURA BROWSER
============================================================================ */

async function closeBrowser() {
  try {
    if (browser) {
      console.log('🛑 Chiusura Chromium...');
      await browser.close();
    }
  } catch (error) {
    console.error('Errore chiusura browser:', error.message);
  } finally {
    browser = null;
    context = null;
    page = null;
  }
}

process.on('SIGTERM', async () => {
  console.log('⚠️ SIGTERM ricevuto');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️ SIGINT ricevuto');
  await closeBrowser();
  process.exit(0);
});

/* ============================================================================
   CACHE
============================================================================ */

function getCached(url) {
  const cached = cache.get(url);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.ts >= CACHE_TTL) {
    cache.delete(url);
    return null;
  }

  return cached.data;
}

function setCached(url, data) {
  cache.set(url, {
    data,
    ts: Date.now(),
  });
}

/* ============================================================================
   FETCH THE SPACE
============================================================================ */

async function fetchTheSpace(url, retry = 0) {
  const cached = getCached(url);

  if (cached) {
    console.log('🟢 CACHE HIT:', url);
    return cached;
  }

  console.log('🌐 FETCH THE SPACE:', url);

  const currentPage = await getBrowserPage();

  try {
    /*
     * IMPORTANTISSIMO:
     *
     * Non usiamo networkidle.
     *
     * The Space può avere richieste persistenti,
     * analytics, tracking, ecc.
     *
     * Ci interessa solo che il documento sia disponibile.
     */

    if (
      currentPage.url() === 'about:blank' ||
      !currentPage.url().startsWith(THE_SPACE_BASE_URL)
    ) {
      console.log('🌍 Apertura homepage The Space...');

      await currentPage.goto(THE_SPACE_BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: PAGE_TIMEOUT,
      });

      console.log('✅ Homepage The Space caricata');
    }

    const result = await currentPage.evaluate(
      async ({ apiUrl, timeout }) => {
        const controller = new AbortController();

        const timer = setTimeout(() => {
          controller.abort();
        }, timeout);

        try {
          const res = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal,
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
              `The Space returned non-JSON response: ${text.substring(
                0,
                500
              )}`
            );
          }
        } finally {
          clearTimeout(timer);
        }
      },
      {
        apiUrl: url,
        timeout: API_TIMEOUT,
      }
    );

    console.log(
      '📦 THE SPACE RESPONSE:',
      Array.isArray(result)
        ? `ARRAY (${result.length})`
        : typeof result
    );

    setCached(url, result);

    return result;
  } catch (error) {
    console.error(
      `❌ FETCH THE SPACE ERROR (retry ${retry}):`,
      error?.message || error
    );

    /*
     * Un solo retry.
     *
     * Se la pagina/context è morto, lo ricreiamo.
     */

    if (retry < 1) {
      console.log('🔄 Ricreo browser e riprovo...');

      await closeBrowser();

      await new Promise((resolve) => setTimeout(resolve, 500));

      return fetchTheSpace(url, retry + 1);
    }

    throw error;
  }
}

/* ============================================================================
   DATE EUROPE/ROME
============================================================================ */

function getRomeDate(offsetDays = 0) {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);

  let year;
  let month;
  let day;

  for (const part of parts) {
    if (part.type === 'year') year = Number(part.value);
    if (part.type === 'month') month = Number(part.value);
    if (part.type === 'day') day = Number(part.value);
  }

  const date = new Date(
    Date.UTC(year, month - 1, day + offsetDays)
  );

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

/* ============================================================================
   DISTANZA
============================================================================ */

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

/* ============================================================================
   NORMALIZZAZIONE TITOLI
============================================================================ */

function normalize(value) {
  if (!value) return '';

  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titlesMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);

  if (!na || !nb) {
    return false;
  }

  if (na === nb) {
    return true;
  }

  if (na.length > 4 && nb.includes(na)) {
    return true;
  }

  if (nb.length > 4 && na.includes(nb)) {
    return true;
  }

  const wordsA = na
    .split(' ')
    .filter((word) => word.length > 2);

  const wordsB = nb
    .split(' ')
    .filter((word) => word.length > 2);

  const matches = wordsA.filter((word) =>
    wordsB.includes(word)
  );

  return (
    matches.length >=
    Math.min(
      2,
      wordsA.length,
      wordsB.length
    )
  );
}

/* ============================================================================
   ESTRAZIONE FILM
============================================================================ */

function extractFilms(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== 'object') {
    return [];
  }

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

  if (
    response.result &&
    typeof response.result === 'object'
  ) {
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

/* ============================================================================
   SESSIONI
============================================================================ */

function extractRawSessions(film) {
  if (!film || typeof film !== 'object') {
    return [];
  }

  const rawGroups =
    film.showingGroups ??
    film.sessions ??
    film.showings ??
    [];

  if (!Array.isArray(rawGroups)) {
    return [];
  }

  const sessions = [];

  for (const group of rawGroups) {
    if (Array.isArray(group?.sessions)) {
      sessions.push(...group.sessions);
      continue;
    }

    if (Array.isArray(group?.showings)) {
      sessions.push(...group.showings);
      continue;
    }

    if (
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

  return sessions;
}

function formatSession(session) {
  const rawTime =
    session?.startTime ??
    session?.showingTime ??
    session?.time ??
    '';

  let time = '';

  if (typeof rawTime === 'string') {
    /*
     * ISO:
     * 2026-08-07T20:30:00
     *
     * diventa:
     * 20:30
     */

    if (
      rawTime.includes('T') &&
      rawTime.length >= 16
    ) {
      time = rawTime.substring(11, 16);
    } else {
      time = rawTime.substring(0, 5);
    }
  }

  let bookingUrl = '';

  if (
    typeof session?.bookingUrl === 'string' &&
    session.bookingUrl
  ) {
    bookingUrl =
      session.bookingUrl.startsWith('http')
        ? session.bookingUrl
        : `${THE_SPACE_BASE_URL}${session.bookingUrl}`;
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
      Array.isArray(session?.attributes)
        ? session.attributes
            .map((attribute) => attribute?.name)
            .filter(Boolean)
            .join(', ')
        : null,

    bookingUrl,
  };
}

function parseSessions(film) {
  return extractRawSessions(film)
    .map(formatSession)
    .filter((session) => session.time);
}

/* ============================================================================
   NORMALIZZA FILM
============================================================================ */

function normalizeFilm(film) {
  const sessions = parseSessions(film);

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
}

/* ============================================================================
   URL THE SPACE
============================================================================ */

function getShowingsUrl(cinemaId, dateKey) {
  const showingDate = `${dateKey}T00:00:00`;

  return (
    `${THE_SPACE_BASE_URL}/api/microservice/showings/cinemas/${cinemaId}/films` +
    `?showingDate=${encodeURIComponent(showingDate)}` +
    `&minEmbargoLevel=3` +
    `&includesSession=true` +
    `&includeSessionAttributes=true`
  );
}

/* ============================================================================
   CINEMA UTILS
============================================================================ */

function findCinema(cinemaId) {
  return CINEMAS.find(
    (cinema) => cinema.id === cinemaId
  );
}

/* ============================================================================
   HEALTH
============================================================================ */

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cinedate-cinema-server',
    timezone: 'Europe/Rome',
  });
});

/* ============================================================================
   GET /cinemas
============================================================================ */

app.get('/cinemas', (req, res) => {
  res.json(CINEMAS);
});

/* ============================================================================
   GET /cinema/nearby
============================================================================ */

app.get('/cinema/nearby', (req, res) => {
  const {
    lat,
    lng,
    radius = '25',
  } = req.query;

  if (
    lat === undefined ||
    lng === undefined
  ) {
    return res.status(400).json({
      error: 'lat e lng obbligatori',
    });
  }

  const userLat = Number(lat);
  const userLng = Number(lng);
  const radiusKm = Number(radius);

  if (
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng) ||
    !Number.isFinite(radiusKm)
  ) {
    return res.status(400).json({
      error: 'lat, lng e radius devono essere numerici',
    });
  }

  const nearby = CINEMAS
    .map((cinema) => ({
      ...cinema,
      distanceKm:
        Math.round(
          getDistanceKm(
            userLat,
            userLng,
            cinema.lat,
            cinema.lng
          ) * 10
        ) / 10,
    }))
    .filter(
      (cinema) =>
        cinema.distanceKm <= radiusKm
    )
    .sort(
      (a, b) =>
        a.distanceKm - b.distanceKm
    );

  res.json({
    cinemas: nearby,
  });
});

/* ============================================================================
   GET /cinema/showtimes/:id
============================================================================ */

app.get(
  '/cinema/showtimes/:id',
  async (req, res) => {
    const cinemaId = Number(
      req.params.id
    );

    console.log('');
    console.log(
      '🎬 SHOWTIMES REQUEST'
    );
    console.log(
      '🏢 Cinema ID:',
      cinemaId
    );

    if (!Number.isInteger(cinemaId)) {
      return res.status(400).json({
        error: 'id non valido',
      });
    }

    const cinema = findCinema(cinemaId);

    if (!cinema) {
      return res.status(404).json({
        error: 'Cinema non trovato',
      });
    }

    try {
      const days = [];

      /*
       * I giorni vengono richiesti in sequenza.
       *
       * Playwright viene però riutilizzato.
       */

      for (let i = 0; i < 7; i++) {
        const dateKey = getRomeDate(i);

        console.log('');
        console.log(
          '────────────────────────────────────'
        );
        console.log(
          '📅 DATA:',
          dateKey
        );

        const url =
          getShowingsUrl(
            cinemaId,
            dateKey
          );

        console.log(
          '🌐 URL:',
          url
        );

        try {
          const response =
            await fetchTheSpace(url);

          const data =
            extractFilms(response);

          console.log(
            '🎞 FILM RAW:',
            data.length
          );

          const films = data
            .map(normalizeFilm)
            .filter(
              (film) =>
                film.title &&
                film.title !==
                  'Titolo sconosciuto'
            );

          console.log(
            '✅ FILM NORMALIZZATI:',
            films.length
          );

          console.log(
            '🎥 FILM:',
            films.map((film) => ({
              id: film.id,
              title: film.title,
              sessions:
                film.sessions.length,
            }))
          );

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
              message:
                error?.message ||
                String(error),
            }
          );

          /*
           * Non facciamo fallire tutto l'endpoint.
           */

          days.push({
            date: dateKey,
            films: [],
            error:
              error?.message ||
              'Errore caricamento programmazione',
          });
        }
      }

      console.log('');
      console.log(
        '════════════════════════════════════'
      );
      console.log(
        '🏁 SHOWTIMES COMPLETATO'
      );
      console.log(
        '🏢 Cinema:',
        cinema.name
      );
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
        '════════════════════════════════════'
      );

      res.setHeader(
        'Cache-Control',
        's-maxage=1800, stale-while-revalidate'
      );

      return res.status(200).json({
        cinemaId,
        cinema: cinema.name,
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
  }
);

/* ============================================================================
   GET /cinema/check-film
============================================================================ */

app.get(
  '/cinema/check-film',
  async (req, res) => {
    const {
      title,
      lat,
      lng,
      radius = '25',
    } = req.query;

    if (
      !title ||
      lat === undefined ||
      lng === undefined
    ) {
      return res.status(400).json({
        error:
          'title, lat, lng obbligatori',
      });
    }

    const userLat = Number(lat);
    const userLng = Number(lng);
    const radiusKm = Number(radius);

    if (
      !Number.isFinite(userLat) ||
      !Number.isFinite(userLng) ||
      !Number.isFinite(radiusKm)
    ) {
      return res.status(400).json({
        error:
          'lat, lng e radius devono essere numerici',
      });
    }

    const nearbyCinemas =
      CINEMAS
        .map((cinema) => ({
          ...cinema,
          distanceKm:
            getDistanceKm(
              userLat,
              userLng,
              cinema.lat,
              cinema.lng
            ),
        }))
        .filter(
          (cinema) =>
            cinema.distanceKm <=
            radiusKm
        )
        .sort(
          (a, b) =>
            a.distanceKm -
            b.distanceKm
        )
        .slice(0, 5);

    if (!nearbyCinemas.length) {
      return res.json({
        inCinema: false,
        showings: [],
        filmTitle: title,
      });
    }

    /*
     * Data italiana.
     */

    const today =
      getRomeDate(0);

    const showings = [];

    /*
     * ATTENZIONE:
     *
     * Facciamo le richieste in parallelo,
     * ma viene riutilizzata la stessa pagina.
     *
     * Per evitare conflitti su page.evaluate,
     * usiamo una piccola coda.
     */

    for (const cinema of nearbyCinemas) {
      try {
        const url =
          getShowingsUrl(
            cinema.id,
            today
          );

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

        const match = data.find(
          (film) =>
            titlesMatch(
              film?.filmTitle ??
                film?.title ??
                film?.name ??
                '',
              title
            )
        );

        if (!match) {
          continue;
        }

        const sessions =
          parseSessions(match)
            .map(
              (session) =>
                session.time
            )
            .filter(Boolean)
            .slice(0, 5);

        if (!sessions.length) {
          continue;
        }

        showings.push({
          cinema: cinema.name,
          cinemaId: cinema.id,

          distanceKm:
            Math.round(
              cinema.distanceKm * 10
            ) / 10,

          sessions,

          bookingUrl:
            `${THE_SPACE_BASE_URL}/cinema/${cinema.slug}/acquisto-biglietti`,
        });
      } catch (error) {
        console.error(
          `❌ CHECK FILM ${cinema.name}:`,
          error?.message ||
            error
        );
      }
    }

    showings.sort(
      (a, b) =>
        a.distanceKm -
        b.distanceKm
    );

    return res.json({
      inCinema:
        showings.length > 0,

      showings,

      filmTitle: title,

      date: today,
    });
  }
);

/* ============================================================================
   ERROR HANDLER
============================================================================ */

app.use(
  (error, req, res, next) => {
    console.error(
      '🔥 EXPRESS ERROR:',
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error:
        error?.message ??
        'Errore interno',
    });
  }
);

/* ============================================================================
   START
============================================================================ */

const server = app.listen(
  PORT,
  () => {
    console.log('');
    console.log(
      '════════════════════════════════════'
    );
    console.log(
      `🎬 Cinema server attivo su porta ${PORT}`
    );
    console.log(
      '🇮🇹 Timezone: Europe/Rome'
    );
    console.log(
      `🎥 Cinema configurati: ${CINEMAS.length}`
    );
    console.log(
      '════════════════════════════════════'
    );
    console.log('');
  }
);

/* ============================================================================
   SHUTDOWN
============================================================================ */

async function shutdown(signal) {
  console.log(
    `⚠️ ${signal} ricevuto. Shutdown...`
  );

  server.close(async () => {
    await closeBrowser();

    console.log(
      '✅ Server chiuso correttamente'
    );

    process.exit(0);
  });

  /*
   * Fallback se Express rimane bloccato.
   */

  setTimeout(async () => {
    await closeBrowser();
    process.exit(1);
  }, 10000).unref();
}

process.once(
  'SIGTERM',
  () => shutdown('SIGTERM')
);

process.once(
  'SIGINT',
  () => shutdown('SIGINT')
);
 
