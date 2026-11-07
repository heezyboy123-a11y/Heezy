import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High limits for base64 covers and ebooks
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Ensure persistent data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const CITIES_FILE = path.join(DATA_DIR, 'cities.json');
const CONFIG_FILE = path.join(DATA_DIR, 'paystack_config.json');

// Helper to safely read JSON
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

// Helper to safely write JSON
function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
  }
}

// Initial starter dataset
const INITIAL_BOOKS = [
  {
    id: 'book-wonderfully-made',
    title: 'Wonderfully Made',
    author: 'Heezy Boy',
    year: 2025,
    genre: 'Self-Help & Personal Growth',
    description:
      'An inspiring, deeply uplifting guide to discovering your authentic purpose, overcoming self-doubt, embracing your inner brilliance, and living with unshakeable confidence and joy.',
    priceUSD: 0,
    priceNGN: 0,
    formatAvailable: 'both',
    coverUrl: '',
    pageCount: 210,
    isbn: '978-1-987-00451-2',
    language: 'English',
    fileSize: '2.9 MB',
    fileType: 'epub',
    sampleContent: 'CHAPTER ONE: THE SACRED BLUEPRINT\n\nYou did not arrive in this world by accident or mere biological happenstance. You were crafted with intentionality, endowed with unique gifts, and given an internal compass capable of navigating the deepest waters of life.\n\nToo often, we measure our worth against the noisy standards of others. We look at external milestones and feel inadequate. But true peace begins when you realize you were wonderfully made from the beginning—not as an imitation of someone else, but as an original masterpiece.',
    featured: true,
    stockPhysical: 40,
    uploadedAt: '2026-11-06',
  },
  {
    id: 'book-elon-musk',
    title: 'Elon Musk',
    author: 'Walter Isaacson',
    year: 2023,
    genre: 'History & Biography',
    description:
      'The astonishingly intimate and definitive biography of the world’s most fascinating and controversial innovator—from his turbulent childhood in South Africa to revolutionizing electric vehicles, space travel, and artificial intelligence.',
    priceUSD: 12.0,
    priceNGN: 18000,
    formatAvailable: 'both',
    coverUrl: '',
    pageCount: 688,
    isbn: '978-1-982-18128-4',
    language: 'English',
    fileSize: '8.4 MB',
    fileType: 'pdf',
    sampleContent: 'PROLOGUE: MUSE OF FIRE\n\nWhen Elon Musk was a kid in South Africa, he was frequently beaten up by bullies. One day, a gang pushed him down some concrete steps and kicked him until his face was a swollen ball of flesh. He was in the hospital for a week.\n\nThe physical scars were secondary to the emotional ones left by his father, Errol Musk, an engineer, rogue, and charismatic fantasist. The psychological imprint forged a manic intensity that would drive him to conquer rockets, autonomous electric cars, and neural computer interfaces.',
    featured: true,
    stockPhysical: 25,
    uploadedAt: '2026-11-06',
  },
  {
    id: 'book-1',
    title: 'The Cartography of Solitude',
    author: 'Sarah Loughlin',
    year: 2024,
    genre: 'Literary Fiction',
    description:
      'A poetic exploration of memory, coastline migrations, and human silence across three generations living in remote coastal archipelagos.',
    priceUSD: 0,
    priceNGN: 0,
    formatAvailable: 'both',
    coverUrl: '/src/assets/images/cover_solitude_cartography_1793896190823.jpg',
    pageCount: 284,
    isbn: '978-0-192-84012-4',
    language: 'English',
    fileSize: '3.4 MB',
    fileType: 'epub',
    sampleContent: `CHAPTER ONE: THE HIGH TIDE MARK\n\nBefore the harbor wall collapsed into the gray Atlantic swell, the postmistress used to trace the arriving storms with a bone-handled stylus across the ledger pages. We measured our years not in numbered winters, but in the silt deposited beneath the cedar jetty.\n\nA woman with dry boots had walked the length of the spit at daybreak. From her coat pocket protruded an unsealed envelope stamped in Lisbon seven weeks earlier. She stopped at the salt marsh fence, where the samphire had turned amber beneath the frost, and looked toward the lighthouse keeper's cottage.\n\n"There is no ferry today," the boy on the tractor called out, his engine coughing against the brine.\nShe did not turn her head. "I didn't come by water," she answered, and let the letter slip between the cedar slats.`,
    featured: true,
    stockPhysical: 18,
    uploadedAt: '2026-10-15',
  },
  {
    id: 'book-2',
    title: 'Systems of Thought',
    author: 'Eliza Vance',
    year: 2025,
    genre: 'Philosophy & Thought',
    description:
      'Exploring the cognitive architectures, mental models, and intuitive structures that shape human reasoning in an era of automated synthesis.',
    priceUSD: 8.5,
    priceNGN: 12500,
    formatAvailable: 'both',
    coverUrl: '/src/assets/images/cover_systems_of_thought_1793896191617.jpg',
    pageCount: 340,
    isbn: '978-1-840-92811-0',
    language: 'English',
    fileSize: '5.1 MB',
    fileType: 'pdf',
    sampleContent: `PROLOGUE: THE INVISIBLE ARCHITECTURE\n\nWe rarely examine the scaffolding upon which our intuitions rest until the structure begins to tremble under unforeseen weight.\n\nCognition is not merely a pipeline of sensory acquisition followed by logical computation; it is an active, anticipatory modeling system. When an artisan grips a chisel, the sensory boundary of the self dissolves into the tempered steel. So too with language, mathematics, and institutional mythologies: they are not passive containers for thought, but the physical instruments through which thought takes form.`,
    featured: true,
    stockPhysical: 24,
    uploadedAt: '2026-10-22',
  },
  {
    id: 'book-3',
    title: 'Whispers in Daylight',
    author: 'Larkin Reed',
    year: 2023,
    genre: 'Poetry',
    description:
      'A quiet collection of meditative poems and lyrical reflections on sunlight, garden botanicals, grief, and morning tea.',
    priceUSD: 4.0,
    priceNGN: 6000,
    formatAvailable: 'ebook',
    coverUrl: '/src/assets/images/cover_whispers_daylight_1793896192065.jpg',
    pageCount: 112,
    isbn: '978-0-983-11204-7',
    language: 'English',
    fileSize: '1.8 MB',
    fileType: 'epub',
    sampleContent: `I. MORNING TEA UPON CEDAR\n\nThe kettle sighs before it sings,\na momentary truce with heat.\nOutside, the dew on clover rings\nunravels in the quiet street.\n\nWe talk of bread, of cedar wood,\nof letters we forgot to send.\nIf stillness can be understood,\nit is this silence at the bend.`,
    featured: true,
    uploadedAt: '2026-11-01',
  },
  {
    id: 'book-4',
    title: 'The Rainmakers of Kaduna',
    author: 'Amara Nwosu',
    year: 2024,
    genre: 'African Literature',
    description:
      'An evocative historical novel set across mid-century Northern Nigeria, exploring kinship, textile markets, and railway expansion.',
    priceUSD: 6.0,
    priceNGN: 9000,
    formatAvailable: 'both',
    coverUrl: '',
    pageCount: 312,
    isbn: '978-978-990-213-9',
    language: 'English',
    fileSize: '4.2 MB',
    fileType: 'pdf',
    sampleContent: 'CHAPTER ONE\n\nThe steam engine from Kano arrived with indigo soot clinging to its bronze boiler. By noon, the platforms in Kaduna Junction smelled of roasted groundnuts, diesel exhaust, and the sweet sharpness of rainy season eucalyptus.',
    stockPhysical: 35,
    uploadedAt: '2026-09-18',
  },
  {
    id: 'book-5',
    title: 'The Independent Publisher’s Handbook',
    author: 'T. C. Adeyemi',
    year: 2025,
    genre: 'Business & Craft',
    description:
      'A practical, battle-tested guide to self-publishing, printing on demand, managing city delivery couriers, and international digital sales.',
    priceUSD: 0,
    priceNGN: 0,
    formatAvailable: 'ebook',
    coverUrl: '',
    pageCount: 178,
    isbn: '978-1-950-84401-2',
    language: 'English',
    fileSize: '2.5 MB',
    fileType: 'pdf',
    sampleContent: 'INTRODUCTION: THE FREEDOM OF THE SHELF\n\nDistribution was once guarded by gatekeepers with warehouses and consignment contracts. Today, an author with a phone, a reliable courier partner, and an instant checkout link can establish a thriving direct-to-reader press.',
    stockPhysical: 0,
    uploadedAt: '2026-10-30',
  },
  {
    id: 'book-6',
    title: 'Design for the Quiet Web',
    author: 'Kaelen Morse',
    year: 2024,
    genre: 'Technology & Society',
    description:
      'Rejecting algorithmic engagement traps in favor of calm, legible, durable software interfaces and digital reading sanctuaries.',
    priceUSD: 9.0,
    priceNGN: 13500,
    formatAvailable: 'ebook',
    coverUrl: '',
    pageCount: 220,
    isbn: '978-0-472-19283-4',
    language: 'English',
    fileSize: '3.1 MB',
    fileType: 'epub',
    sampleContent: 'CHAPTER 1: THE RETRIEVAL OF ATTENTION\n\nEvery interface makes an ontological claim about what a human being is.',
    stockPhysical: 12,
    uploadedAt: '2026-11-03',
  },
  {
    id: 'book-7',
    title: 'The Architecture of Daily Discipline',
    author: 'Dr. Marcus Sterling',
    year: 2025,
    genre: 'Self-Help & Personal Growth',
    description:
      'A practical framework to eliminate mental friction, engineer purposeful morning routines, cultivate emotional sovereignty, and build unshakeable self-mastery.',
    priceUSD: 5.5,
    priceNGN: 8000,
    formatAvailable: 'both',
    coverUrl: '',
    pageCount: 248,
    isbn: '978-1-984-51009-3',
    language: 'English',
    fileSize: '3.6 MB',
    fileType: 'epub',
    sampleContent: 'CHAPTER ONE: THE GEOMETRY OF FOCUS\n\nYou do not rise to the level of your ambitions; you fall to the level of your default daily systems.\n\nMost people believe discipline is a personality trait bestowed upon the fortunate few. In truth, discipline is spatial and structural. When your mornings are dictated by the reactive demands of notifications, you have surrendered executive function before your feet have touched the ground.',
    featured: true,
    stockPhysical: 20,
    uploadedAt: '2026-11-04',
  },
  {
    id: 'book-8',
    title: 'The African Wealth Engine',
    author: 'Tariq Mensah',
    year: 2024,
    genre: 'Finance & Wealth',
    description:
      'Actionable strategies for generational capital accumulation, cross-border commerce, real estate syndication, and sovereign investment in emerging markets.',
    priceUSD: 7.0,
    priceNGN: 10500,
    formatAvailable: 'both',
    coverUrl: '',
    pageCount: 290,
    isbn: '978-0-998-33412-1',
    language: 'English',
    fileSize: '4.8 MB',
    fileType: 'pdf',
    sampleContent: 'PRINCIPLE 1: CAPITAL VELOCITY & TANGIBLE ASSETS\n\nWealth in growing economies is not built by passive hoarding in depreciating currencies; it is built through velocity, production, and ownership of real productive infrastructure.',
    featured: true,
    stockPhysical: 15,
    uploadedAt: '2026-11-02',
  },
  {
    id: 'book-9',
    title: 'Wisdom for Still Waters',
    author: 'Pastor David Adebayo',
    year: 2025,
    genre: 'Religion & Spirituality',
    description:
      'A spiritual companion for quiet mornings and turbulent seasons: finding divine alignment, peace through fervent prayer, and steadfast faith.',
    priceUSD: 0,
    priceNGN: 0,
    formatAvailable: 'ebook',
    coverUrl: '',
    pageCount: 160,
    isbn: '978-978-842-109-8',
    language: 'English',
    fileSize: '2.1 MB',
    fileType: 'epub',
    sampleContent: 'DEVOTIONAL 1: HE LEADS ME BESIDE THE STILL WATERS\n\nWhen noise presses in from every side, remember that God does not speak in the whirlwind of anxious striving, but in the gentle stillness of surrender.',
    featured: false,
    stockPhysical: 0,
    uploadedAt: '2026-11-05',
  },
];

const INITIAL_CITIES = [
  {
    id: 'lagos-mainland',
    name: 'Lagos (Mainland)',
    stateOrRegion: 'Lagos State',
    deliveryFeeUSD: 3,
    deliveryFeeNGN: 4500,
    estimatedDays: '1–2 days',
  },
  {
    id: 'lagos-island',
    name: 'Lagos (Island & Lekki)',
    stateOrRegion: 'Lagos State',
    deliveryFeeUSD: 3.5,
    deliveryFeeNGN: 5000,
    estimatedDays: '1–2 days',
  },
  {
    id: 'abuja',
    name: 'Abuja (FCT Metro)',
    stateOrRegion: 'Federal Capital Territory',
    deliveryFeeUSD: 4,
    deliveryFeeNGN: 6000,
    estimatedDays: '2–3 days',
  },
  {
    id: 'port-harcourt',
    name: 'Port Harcourt',
    stateOrRegion: 'Rivers State',
    deliveryFeeUSD: 4.5,
    deliveryFeeNGN: 6500,
    estimatedDays: '2–3 days',
  },
  {
    id: 'ibadan',
    name: 'Ibadan',
    stateOrRegion: 'Oyo State',
    deliveryFeeUSD: 3.5,
    deliveryFeeNGN: 5000,
    estimatedDays: '2 days',
  },
  {
    id: 'enugu',
    name: 'Enugu City',
    stateOrRegion: 'Enugu State',
    deliveryFeeUSD: 4.5,
    deliveryFeeNGN: 6500,
    estimatedDays: '2–4 days',
  },
  {
    id: 'accra',
    name: 'Accra Metro',
    stateOrRegion: 'Greater Accra, Ghana',
    deliveryFeeUSD: 6,
    deliveryFeeNGN: 9000,
    estimatedDays: '3–5 days',
  },
];

// Initialize data if not yet present
if (!fs.existsSync(BOOKS_FILE)) {
  writeJsonFile(BOOKS_FILE, INITIAL_BOOKS);
}
if (!fs.existsSync(CITIES_FILE)) {
  writeJsonFile(CITIES_FILE, INITIAL_CITIES);
}
if (!fs.existsSync(ORDERS_FILE)) {
  writeJsonFile(ORDERS_FILE, []);
}

// ----------------------------------------------------
// REST API ENDPOINTS FOR LIVE PERSISTENCE ACROSS DEVICES
// ----------------------------------------------------

// 1. Books API
app.get('/api/books', (req, res) => {
  const books = readJsonFile(BOOKS_FILE, INITIAL_BOOKS);
  res.json(books);
});

app.post('/api/books', (req, res) => {
  try {
    const newBook = req.body;
    if (!newBook || !newBook.title || !newBook.author) {
      return res.status(400).json({ error: 'Title and author are required.' });
    }
    const current = readJsonFile(BOOKS_FILE, INITIAL_BOOKS);
    const updated = [newBook, ...current];
    writeJsonFile(BOOKS_FILE, updated);
    res.status(201).json(newBook);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save book to server database.' });
  }
});

app.delete('/api/books/:id', (req, res) => {
  try {
    const { id } = req.params;
    const current = readJsonFile(BOOKS_FILE, INITIAL_BOOKS);
    const updated = current.filter((b: any) => b.id !== id);
    writeJsonFile(BOOKS_FILE, updated);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book.' });
  }
});

// 2. Orders API
app.get('/api/orders', (req, res) => {
  const orders = readJsonFile(ORDERS_FILE, []);
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  try {
    const newOrder = req.body;
    const current = readJsonFile(ORDERS_FILE, []);
    const updated = [newOrder, ...current];
    writeJsonFile(ORDERS_FILE, updated);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record order.' });
  }
});

app.patch('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStatus, dispatcherNotes } = req.body;
    const current = readJsonFile<any[]>(ORDERS_FILE, []);
    const updated = current.map((ord) => {
      if (ord.id === id) {
        return {
          ...ord,
          ...(deliveryStatus ? { deliveryStatus } : {}),
          ...(dispatcherNotes !== undefined ? { dispatcherNotes } : {}),
        };
      }
      return ord;
    });
    writeJsonFile(ORDERS_FILE, updated);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order.' });
  }
});

// 3. Delivery Cities API
app.get('/api/cities', (req, res) => {
  const cities = readJsonFile(CITIES_FILE, INITIAL_CITIES);
  res.json(cities);
});

app.post('/api/cities', (req, res) => {
  try {
    const newCity = req.body;
    const current = readJsonFile(CITIES_FILE, INITIAL_CITIES);
    const updated = [...current, newCity];
    writeJsonFile(CITIES_FILE, updated);
    res.status(201).json(newCity);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add city.' });
  }
});

// 4. Paystack Config API
app.get('/api/paystack-config', (req, res) => {
  const config = readJsonFile(CONFIG_FILE, {
    publicKey: 'pk_test_d34298a098c47b5204781498b5840212a4c14c59',
    isLive: false,
    businessName: 'Open Shelf Books',
    allowInternationalCards: true,
    currency: 'USD',
  });
  res.json(config);
});

app.post('/api/paystack-config', (req, res) => {
  try {
    writeJsonFile(CONFIG_FILE, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config.' });
  }
});

// ----------------------------------------------------
// MOUNT VITE MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);

  if (hasDist && isProduction) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Explicit fallback to ensure index.html is always returned for all routes in dev/preview
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (vite) vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Open Shelf server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
