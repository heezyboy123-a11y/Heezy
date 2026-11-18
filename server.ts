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

// Initial starter dataset (empty — only real uploaded books belong on Open Shelf)
const INITIAL_BOOKS: any[] = [];

const LEGACY_PLACEHOLDER_IDS = new Set([
  'book-1',
  'book-2',
  'book-3',
  'book-4',
  'book-5',
  'book-6',
  'book-7',
  'book-8',
  'book-9',
  'book-wonderfully-made',
  'book-elon-musk',
]);

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

function normalizeServerTitleKey(title: string): string {
  return String(title || '')
    .replace(/[\[\(_\s-]*(www\.)?ocean\s*of\s*pdf(\.com)?[\]\)_\s-]*/gi, ' ')
    .replace(/[\[\(_\s-]*(pdfdrive|z-lib|zlibrary|annas-archive|libgen)(\.[a-z]+)?[\]\)_\s-]*/gi, ' ')
    .toLowerCase()
    .replace(/\(\s*\d+\s*\)$/g, '')
    .replace(/[_-]+copy\s*\d*$/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreServerBookQuality(book: any): number {
  let score = 0;
  if (book.coverOrigin === 'page1' || book.coverOrigin === 'embedded' || book.coverOrigin === 'custom') score += 50;
  else if (book.coverOrigin === 'official') score += 25;
  else if (book.coverUrl && !String(book.coverUrl).startsWith('data:image/svg')) score += 15;
  const authorLower = String(book.author || '').toLowerCase();
  if (authorLower && authorLower !== 'independent author' && authorLower !== 'unknown author') score += 15;
  if (book.pageCount) score += 10;
  if (book.sampleContent && String(book.sampleContent).length > 100) score += 5;
  return score;
}

function deduplicateServerBooks(list: any[]): any[] {
  const byKey = new Map<string, any>();
  const orderedKeys: string[] = [];

  for (const book of list) {
    if (!book || LEGACY_PLACEHOLDER_IDS.has(book.id) || book.isUserUploaded !== true) continue;
    const titleKey = normalizeServerTitleKey(book.title) || String(book.id);
    const existing = byKey.get(titleKey);
    if (!existing) {
      byKey.set(titleKey, book);
      orderedKeys.push(titleKey);
    } else {
      // Keep the higher-quality single copy (e.g. Page 1 cover, known author)
      if (scoreServerBookQuality(book) > scoreServerBookQuality(existing)) {
        byKey.set(titleKey, book);
      }
    }
  }

  return orderedKeys.map((k) => byKey.get(k));
}

// Initialize data if not yet present, and purge non-real placeholder & duplicate entries
if (!fs.existsSync(BOOKS_FILE)) {
  writeJsonFile(BOOKS_FILE, INITIAL_BOOKS);
} else {
  const existingBooks = readJsonFile<any[]>(BOOKS_FILE, []);
  const cleanedBooks = deduplicateServerBooks(existingBooks);
  if (cleanedBooks.length !== existingBooks.length) {
    writeJsonFile(BOOKS_FILE, cleanedBooks);
  }
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
  const rawBooks = readJsonFile<any[]>(BOOKS_FILE, INITIAL_BOOKS);
  const cleanedBooks = deduplicateServerBooks(rawBooks);
  if (cleanedBooks.length !== rawBooks.length) {
    writeJsonFile(BOOKS_FILE, cleanedBooks);
  }
  res.json(cleanedBooks);
});

app.post('/api/books', (req, res) => {
  try {
    const newBook = req.body;
    if (!newBook || !newBook.title || !newBook.author) {
      return res.status(400).json({ error: 'Title and author are required.' });
    }
    const current = readJsonFile<any[]>(BOOKS_FILE, INITIAL_BOOKS);
    const incomingKey = normalizeServerTitleKey(newBook.title);
    const filtered = current.filter(
      (b) => b.id !== newBook.id && normalizeServerTitleKey(b.title) !== incomingKey
    );
    const updated = deduplicateServerBooks([newBook, ...filtered]);
    writeJsonFile(BOOKS_FILE, updated);
    res.status(201).json(newBook);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save book to server database.' });
  }
});

app.put('/api/books/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedBook = req.body;
    const current = readJsonFile<any[]>(BOOKS_FILE, INITIAL_BOOKS);
    const updated = deduplicateServerBooks(
      current.map((b) => (b.id === id ? { ...b, ...updatedBook } : b))
    );
    writeJsonFile(BOOKS_FILE, updated);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update book.' });
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
    const { deliveryStatus, dispatcherNotes, paymentStatus, downloadAccessGranted } = req.body;
    const current = readJsonFile<any[]>(ORDERS_FILE, []);
    const updated = current.map((ord) => {
      if (ord.id === id) {
        return {
          ...ord,
          ...(deliveryStatus !== undefined ? { deliveryStatus } : {}),
          ...(dispatcherNotes !== undefined ? { dispatcherNotes } : {}),
          ...(paymentStatus !== undefined ? { paymentStatus } : {}),
          ...(downloadAccessGranted !== undefined ? { downloadAccessGranted } : {}),
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

// 4. Payment Gateways & Payout Bank Config API
app.get('/api/paystack-config', (req, res) => {
  const config = readJsonFile(CONFIG_FILE, {
    activeGateway: 'bank_transfer',
    publicKey: 'pk_test_d34298a098c47b5204781498b5840212a4c14c59',
    flutterwavePublicKey: '',
    enableFlutterwave: false,
    paymentLinkUrl: '',
    paymentLinkLabel: 'Selar / Instant Checkout',
    enablePaymentLink: false,
    isLive: false,
    businessName: 'Open Shelf Books',
    allowInternationalCards: true,
    supportEmail: 'heezyboy123@gmail.com',
    currency: 'USD',
    bankName: '',
    accountNumber: '',
    accountName: '',
    ownerWhatsapp: '',
    enableBankTransfer: true,
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
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: disableHmr ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Explicit fallback to ensure index.html is returned for SPA page navigations in dev/preview
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET' || path.extname(req.path)) {
        return next();
      }
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
