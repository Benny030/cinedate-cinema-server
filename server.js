 
import express from 'express';
import cors from 'cors';

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);

/*
 * IMPORTANTE
 *
 * Non hardcodiamo un endpoint che Cloudflare blocca.
 *
 * Imposta questa variabile con l'endpoint/API che hai diritto di utilizzare.
 *
 * Esempio:
 *
 * THE_SPACE_API_BASE_URL=https://example.com/api/microservice/showings
 *
 */

const THE_SPACE_API_BASE_URL =
  process.env.THE_SPACE_API_BASE_URL || '';

const THE_SPACE_SITE_URL =
  'https://www.thespacecinema.it';

const CACHE_TTL =
  1000 * 60 * 20; // 20 minuti

const REQUEST_TIMEOUT =
  15000;

/*
|--------------------------------------------------------------------------
| CACHE
|--------------------------------------------------------------------------
*/

const cache = new Map();

function getCache(key) {
  const item = cache.get(key);

  if (!item) {
    return null;
  }

  if (
    Date.now() - item.timestamp >
    CACHE_TTL
  ) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

function setCache(key, data) {
  cache.set(key, {
    timestamp: Date.now(),
    data,
  });
}

/*
|--------------------------------------------------------------------------
| CINEMA
|--------------------------------------------------------------------------
*/

const CINEMAS = [
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

  {
    id: 1028,
    name: 'The Space Torino',
    city: 'Torino',
    address: 'Corso Grosseto 54, Beinasco',
    lat: 45.1164,
    lng: 7.5945,
    slug: 'torino',
  },

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

  {
    id: 1008,
    name: 'The Space Firenze',
    city: 'Firenze',
    address: 'Via Tirso 8, Novoli',
    lat: 43.7969,
    lng: 11.2193,
    slug: 'firenze',
  },

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

  {
    id: 1011,
    name: 'The Space Genova',
    city: 'Genova',
    address: 'Calata Gadda, Porto Antico',
    lat: 44.4106,
    lng: 8.927,
    slug: 'genova',
  },

  {
    id: 1012,
    name: 'The Space Trieste',
    city: 'Trieste',
    address: 'Via Luigi Negrelli 2',
    lat: 45.637,
    lng: 13.7817,
    slug: 'trieste',
  },

  {
    id: 1017,
    name: 'The Space Cagliari Quartucciu',
    city: 'Cagliari',
    address: 'S.S. 554 Quartucciu',
    lat: 39.2567,
    lng: 9.1795,
    slug: 'quartucciu',
  },

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

/*
|--------------------------------------------------------------------------
| DATE EUROPE/ROME
|--------------------------------------------------------------------------
*/

function getRomeDate(offset = 0) {
  const now = new Date();

  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    );

  const parts =
    formatter.formatToParts(now);

  let year;
  let month;
  let day;

  for (const part of parts) {
    if (part.type === 'year') {
      year = Number(part.value);
    }

    if (part.type === 'month') {
      month = Number(part.value);
    }

    if (part.type === 'day') {
      day = Number(part.value);
    }
  }

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day + offset
    )
  );

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1
    ).padStart(2, '0'),
    String(
      date.getUTCDate()
    ).padStart(2, '0'),
  ].join('-');
}

/*
|--------------------------------------------------------------------------
| DISTANCE
|--------------------------------------------------------------------------
*/

function getDistanceKm(
  lat1,
  lng1,
  lat2,
  lng2
) {
  const R = 6371;

  const dLat =
    ((lat2 - lat1) *
      Math.PI) /
    180;

  const dLng =
    ((lng2 - lng1) *
      Math.PI) /
    180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      (lat1 * Math.PI) / 180
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180
      ) *
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

/*
|--------------------------------------------------------------------------
| TITLE MATCHING
|--------------------------------------------------------------------------
*/

function normalize(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[^a-z0-9\s]/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
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

  if (
    na.length > 4 &&
    nb.includes(na)
  ) {
    return true;
  }

  if (
    nb.length > 4 &&
    na.includes(nb)
  ) {
    return true;
  }

  const wordsA =
    na
      .split(' ')
      .filter(
        (word) =>
          word.length > 2
      );

  const wordsB =
    nb
      .split(' ')
      .filter(
        (word) =>
          word.length > 2
      );

  const matches =
    wordsA.filter(
      (word) =>
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

/*
|--------------------------------------------------------------------------
| API URL
|--------------------------------------------------------------------------
*/

function buildApiUrl(
  cinemaId,
  date
) {
  if (!THE_SPACE_API_BASE_URL) {
    throw new Error(
      'THE_SPACE_API_BASE_URL non configurata'
    );
  }

  const base =
    THE_SPACE_API_BASE_URL.replace(
      /\/$/,
      ''
    );

  const showingDate =
    `${date}T00:00:00`;

  const url =
    new URL(
      `${base}/cinemas/${cinemaId}/films`
    );

  url.searchParams.set(
    'showingDate',
    showingDate
  );

  url.searchParams.set(
    'minEmbargoLevel',
    '3'
  );

  url.searchParams.set(
    'includesSession',
    'true'
  );

  url.searchParams.set(
    'includeSessionAttributes',
    'true'
  );

  return url.toString();
}

/*
|--------------------------------------------------------------------------
| FETCH API
|--------------------------------------------------------------------------
*/

async function fetchCinemaData(
  cinemaId,
  date
) {
  const url =
    buildApiUrl(
      cinemaId,
      date
    );

  const cacheKey =
    `showtimes:${cinemaId}:${date}`;

  const cached =
    getCache(cacheKey);

  if (cached) {
    console.log(
      '🟢 CACHE HIT:',
      cacheKey
    );

    return cached;
  }

  console.log(
    '🌐 API:',
    url
  );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT
    );

  try {
    const response =
      await fetch(
        url,
        {
          method: 'GET',
          signal:
            controller.signal,

          headers: {
            Accept:
              'application/json',
          },
        }
      );

    const text =
      await response.text();

    if (!response.ok) {
      if (
        response.status === 403
      ) {
        throw new Error(
          'API The Space ha risposto HTTP 403. ' +
          'La sorgente richiede un accesso autorizzato ' +
          'oppure sta bloccando il server.'
        );
      }

      if (
        response.status === 429
      ) {
        throw new Error(
          'API The Space ha risposto HTTP 429: troppe richieste.'
        );
      }

      throw new Error(
        `The Space HTTP ${response.status}: ${text.substring(
          0,
          500
        )}`
      );
    }

    let data;

    try {
      data =
        JSON.parse(text);
    } catch {
      throw new Error(
        'La sorgente The Space ha restituito una risposta non JSON.'
      );
    }

    setCache(
      cacheKey,
      data
    );

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/*
|--------------------------------------------------------------------------
| EXTRACT FILMS
|--------------------------------------------------------------------------
*/

function extractFilms(
  response
) {
  if (
    Array.isArray(response)
  ) {
    return response;
  }

  if (
    !response ||
    typeof response !==
      'object'
  ) {
    return [];
  }

  const candidates = [
    response.result,
    response.films,
    response.data,
    response.items,
    response.results,
  ];

  for (
    const candidate of candidates
  ) {
    if (
      Array.isArray(candidate)
    ) {
      return candidate;
    }
  }

  if (
    response.result &&
    typeof response.result ===
      'object'
  ) {
    const nested = [
      response.result.films,
      response.result.data,
      response.result.items,
      response.result.results,
    ];

    for (
      const candidate of nested
    ) {
      if (
        Array.isArray(candidate)
      ) {
        return candidate;
      }
    }
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| SESSIONS
|--------------------------------------------------------------------------
*/

function getRawSessions(
  film
) {
  if (
    !film ||
    typeof film !==
      'object'
  ) {
    return [];
  }

  const groups =
    film.showingGroups ??
    film.sessions ??
    film.showings ??
    [];

  if (
    !Array.isArray(groups)
  ) {
    return [];
  }

  const sessions = [];

  for (
    const group of groups
  ) {
    if (
      Array.isArray(
        group?.sessions
      )
    ) {
      sessions.push(
        ...group.sessions
      );

      continue;
    }

    if (
      Array.isArray(
        group?.showings
      )
    ) {
      sessions.push(
        ...group.showings
      );

      continue;
    }

    if (
      group &&
      typeof group ===
        'object' &&
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

function parseTime(
  rawTime
) {
  if (!rawTime) {
    return '';
  }

  const value =
    String(rawTime);

  if (
    value.includes('T') &&
    value.length >= 16
  ) {
    return value.substring(
      11,
      16
    );
  }

  const match =
    value.match(
      /\b(\d{1,2}):(\d{2})\b/
    );

  if (!match) {
    return '';
  }

  return `${match[1].padStart(
    2,
    '0'
  )}:${match[2]}`;
}

function parseSessions(
  film
) {
  return getRawSessions(
    film
  )
    .map(
      (session) => {
        const rawTime =
          session?.startTime ??
          session?.showingTime ??
          session?.time ??
          '';

        return {
          id: String(
            session?.sessionId ??
              session?.id ??
              ''
          ),

          time:
            parseTime(
              rawTime
            ),

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
                  .map(
                    (attribute) =>
                      attribute?.name
                  )
                  .filter(Boolean)
                  .join(', ')
              : null,

          bookingUrl:
            typeof session?.bookingUrl ===
            'string'
              ? session.bookingUrl
              : '',
        };
      }
    )
    .filter(
      (session) =>
        session.time
    );
}

/*
|--------------------------------------------------------------------------
| NORMALIZE FILM
|--------------------------------------------------------------------------
*/

function normalizeFilm(
  film
) {
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

    sessions:
      parseSessions(
        film
      ),
  };
}

/*
|--------------------------------------------------------------------------
| FIND CINEMA
|--------------------------------------------------------------------------
*/

function findCinema(
  cinemaId
) {
  return CINEMAS.find(
    (cinema) =>
      cinema.id === cinemaId
  );
}

/*
|--------------------------------------------------------------------------
| ROOT
|--------------------------------------------------------------------------
*/

app.get(
  '/',
  (req, res) => {
    res.json({
      status: 'ok',
      service:
        'cinedate-cinema-server',
      timezone:
        'Europe/Rome',

      apiConfigured:
        Boolean(
          THE_SPACE_API_BASE_URL
        ),
    });
  }
);

/*
|--------------------------------------------------------------------------
| CINEMAS
|--------------------------------------------------------------------------
*/

app.get(
  '/cinemas',
  (req, res) => {
    res.json(
      CINEMAS
    );
  }
);

/*
|--------------------------------------------------------------------------
| NEARBY
|--------------------------------------------------------------------------
*/

app.get(
  '/cinema/nearby',
  (req, res) => {
    const {
      lat,
      lng,
      radius = '25',
    } = req.query;

    const userLat =
      Number(lat);

    const userLng =
      Number(lng);

    const radiusKm =
      Number(radius);

    if (
      !Number.isFinite(
        userLat
      ) ||
      !Number.isFinite(
        userLng
      ) ||
      !Number.isFinite(
        radiusKm
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'lat, lng e radius devono essere numerici',
        });
    }

    const cinemas =
      CINEMAS
        .map(
          (cinema) => ({
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
          })
        )
        .filter(
          (cinema) =>
            cinema.distanceKm <=
            radiusKm
        )
        .sort(
          (a, b) =>
            a.distanceKm -
            b.distanceKm
        );

    res.json({
      cinemas,
    });
  }
);

/*
|--------------------------------------------------------------------------
| SHOWTIMES
|--------------------------------------------------------------------------
*/

app.get(
  '/cinema/showtimes/:id',
  async (req, res) => {
    const cinemaId =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        cinemaId
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'id non valido',
        });
    }

    const cinema =
      findCinema(
        cinemaId
      );

    if (!cinema) {
      return res
        .status(404)
        .json({
          error:
            'Cinema non trovato',
        });
    }

    if (
      !THE_SPACE_API_BASE_URL
    ) {
      return res
        .status(503)
        .json({
          error:
            'THE_SPACE_API_BASE_URL non configurata',
        });
    }

    const days = [];

    for (
      let i = 0;
      i < 7;
      i++
    ) {
      const date =
        getRomeDate(i);

      try {
        const response =
          await fetchCinemaData(
            cinemaId,
            date
          );

        const rawFilms =
          extractFilms(
            response
          );

        const films =
          rawFilms
            .map(
              normalizeFilm
            )
            .filter(
              (film) =>
                film.title !==
                'Titolo sconosciuto'
            );

        days.push({
          date,
          films,
        });

        console.log(
          `✅ ${cinema.name} ${date}: ${films.length} film`
        );
      } catch (error) {
        console.error(
          `❌ ${cinema.name} ${date}:`,
          error.message
        );

        days.push({
          date,
          films: [],
          error:
            error.message,
        });
      }
    }

    res.setHeader(
      'Cache-Control',
      's-maxage=1800, stale-while-revalidate'
    );

    return res.json({
      cinemaId,
      cinema:
        cinema.name,
      days,
    });
  }
);

/*
|--------------------------------------------------------------------------
| CHECK FILM
|--------------------------------------------------------------------------
*/

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
      return res
        .status(400)
        .json({
          error:
            'title, lat, lng obbligatori',
        });
    }

    const userLat =
      Number(lat);

    const userLng =
      Number(lng);

    const radiusKm =
      Number(radius);

    if (
      !Number.isFinite(
        userLat
      ) ||
      !Number.isFinite(
        userLng
      ) ||
      !Number.isFinite(
        radiusKm
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'lat, lng e radius devono essere numerici',
        });
    }

    const nearby =
      CINEMAS
        .map(
          (cinema) => ({
            ...cinema,

            distanceKm:
              getDistanceKm(
                userLat,
                userLng,
                cinema.lat,
                cinema.lng
              ),
          })
        )
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

    if (!nearby.length) {
      return res.json({
        inCinema: false,
        showings: [],
        filmTitle: title,
        date:
          getRomeDate(0),
      });
    }

    const today =
      getRomeDate(0);

    const showings = [];

    for (
      const cinema of nearby
    ) {
      try {
        const response =
          await fetchCinemaData(
            cinema.id,
            today
          );

        const films =
          extractFilms(
            response
          );

        const film =
          films.find(
            (item) =>
              titlesMatch(
                item?.filmTitle ??
                  item?.title ??
                  item?.name ??
                  '',
                title
              )
          );

        if (!film) {
          continue;
        }

        const sessions =
          parseSessions(
            film
          )
            .map(
              (session) =>
                session.time
            )
            .slice(0, 5);

        if (
          !sessions.length
        ) {
          continue;
        }

        showings.push({
          cinema:
            cinema.name,

          cinemaId:
            cinema.id,

          distanceKm:
            Math.round(
              cinema.distanceKm *
                10
            ) / 10,

          sessions,

          bookingUrl:
            `${THE_SPACE_SITE_URL}/cinema/${cinema.slug}/acquisto-biglietti`,
        });
      } catch (error) {
        console.error(
          `❌ CHECK FILM ${cinema.name}:`,
          error.message
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

      filmTitle:
        title,

      date:
        today,
    });
  }
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    res.status(404).json({
      error:
        'Endpoint non trovato',
    });
  }
);

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      '🔥 SERVER ERROR:',
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    res.status(500).json({
      error:
        error?.message ??
        'Errore interno',
    });
  }
);

/*
|--------------------------------------------------------------------------
| START
|--------------------------------------------------------------------------
*/

const server =
  app.listen(
    PORT,
    () => {
      console.log('');
      console.log(
        '===================================='
      );
      console.log(
        `🎬 CineDate server: porta ${PORT}`
      );
      console.log(
        '🇮🇹 Timezone: Europe/Rome'
      );
      console.log(
        `🎥 Cinema: ${CINEMAS.length}`
      );
      console.log(
        `🔌 API configurata: ${
          THE_SPACE_API_BASE_URL
            ? 'SI'
            : 'NO'
        }`
      );
      console.log(
        '===================================='
      );
      console.log('');
    }
  );

/*
|--------------------------------------------------------------------------
| SHUTDOWN
|--------------------------------------------------------------------------
*/

function shutdown(
  signal
) {
  console.log(
    `⚠️ ${signal} ricevuto`
  );

  server.close(
    () => {
      console.log(
        '✅ Server chiuso'
      );

      process.exit(0);
    }
  );

  setTimeout(
    () => {
      process.exit(1);
    },
    10000
  ).unref();
}

process.once(
  'SIGTERM',
  () =>
    shutdown(
      'SIGTERM'
    )
);

process.once(
  'SIGINT',
  () =>
    shutdown(
      'SIGINT'
    )
);
 
