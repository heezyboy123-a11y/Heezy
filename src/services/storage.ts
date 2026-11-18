import { Book, Order, DeliveryCity, User } from '../types/book';
import { INITIAL_BOOKS, INITIAL_DELIVERY_CITIES } from '../data/initialBooks';
import { generateCanvasBookCover, CoverThemeId } from './coverGenerator';
import { deleteBookFileBlob, getBookFileBlob } from './fileStore';
import { extractOriginalCoverFromBlob, lookupOfficialBookDetails, normalizeBookTitleKey, stripSiteWatermarks } from './ebookCleaner';

const BOOKS_STORAGE_KEY = 'openshelf_books_v1';
const ORDERS_STORAGE_KEY = 'openshelf_orders_v1';
const CITIES_STORAGE_KEY = 'openshelf_cities_v1';
const PAYSTACK_CONFIG_KEY = 'openshelf_paystack_config_v1';
const USER_STORAGE_KEY = 'openshelf_user_v1';

export interface PaystackConfig {
  activeGateway?: 'bank_transfer' | 'flutterwave' | 'payment_link' | 'paystack';
  publicKey: string;
  flutterwavePublicKey?: string;
  enableFlutterwave?: boolean;
  paymentLinkUrl?: string;
  paymentLinkLabel?: string;
  enablePaymentLink?: boolean;
  isLive: boolean;
  businessName: string;
  allowInternationalCards: boolean;
  supportEmail: string;
  currency: 'USD' | 'NGN' | 'GBP';
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  ownerWhatsapp?: string;
  enableBankTransfer?: boolean;
}

const DEFAULT_PAYSTACK_CONFIG: PaystackConfig = {
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
};

function fillMissingCovers(bookList: Book[]): Book[] {
  return bookList.map((b) => {
    if (!b.coverUrl) {
      let theme: CoverThemeId = 'minimalist-editorial';
      if (b.genre === 'African Literature' || b.genre === 'Self-Help & Personal Growth') {
        theme = 'terracotta-arch';
      } else if (b.genre === 'Finance & Wealth') {
        theme = 'indigo-stamped';
      } else if (b.genre === 'History & Biography') {
        theme = 'minimalist-editorial';
      } else if (b.genre === 'Business & Craft') {
        theme = 'modern-bauhaus';
      } else if (b.genre === 'Technology & Society' || b.genre === 'Science & Nature') {
        theme = 'botanical-cyan';
      } else if (b.genre === 'Religion & Spirituality') {
        theme = 'vintage-linen';
      }
      return {
        ...b,
        coverUrl: generateCanvasBookCover({
          title: b.title,
          author: b.author,
          genre: b.genre,
          year: b.year,
          themeId: theme,
        }),
      };
    }
    return b;
  });
}

function prepareInitialBooks(): Book[] {
  return fillMissingCovers(INITIAL_BOOKS);
}

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

const STORE_OWNER_EMAILS = new Set(['heezyboy123@gmail.com', 'itljies@gmail.com']);

// Helper to determine if a user has Store Owner / Master Administrator privileges
export function isStoreOwnerUser(user: User | null): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  return STORE_OWNER_EMAILS.has(email) || user.role === 'admin';
}

function scoreBookQuality(book: Book): number {
  let score = 0;
  if (book.coverOrigin === 'page1' || book.coverOrigin === 'embedded' || book.coverOrigin === 'custom') {
    score += 50;
  } else if (book.coverOrigin === 'official') {
    score += 25;
  } else if (book.coverUrl && !book.coverUrl.startsWith('data:image/svg')) {
    score += 15;
  }
  const authorLower = (book.author || '').toLowerCase();
  if (authorLower && authorLower !== 'independent author' && authorLower !== 'unknown author') {
    score += 15;
  }
  if (book.pageCount) score += 10;
  if (book.sampleContent && book.sampleContent.length > 100) score += 5;
  return score;
}

export function deduplicateBooks(list: Book[]): { unique: Book[]; removedIds: string[] } {
  const byKey = new Map<string, Book>();
  const orderedKeys: string[] = [];
  const removedIds: string[] = [];

  for (const book of list) {
    if (!book || LEGACY_PLACEHOLDER_IDS.has(book.id) || book.isUserUploaded !== true) continue;
    const key = normalizeBookTitleKey(book.title) || book.id;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, book);
      orderedKeys.push(key);
    } else {
      if (scoreBookQuality(book) > scoreBookQuality(existing)) {
        removedIds.push(existing.id);
        byKey.set(key, book);
      } else {
        removedIds.push(book.id);
      }
    }
  }

  return {
    unique: orderedKeys.map((k) => byKey.get(k)!),
    removedIds,
  };
}

function purgeDuplicateArtifacts(removedIds: string[]): void {
  for (const dupId of removedIds) {
    deleteBookFileBlob(dupId).catch(() => {});
    fetch(`/api/books/${dupId}`, { method: 'DELETE' }).catch(() => {});
  }
}

function filterRealBooks(list: Book[]): Book[] {
  return list.filter(
    (b) => b && !LEGACY_PLACEHOLDER_IDS.has(b.id) && b.isUserUploaded === true
  );
}

// ----------------------------------------------------
// LOCAL STORAGE SYNC & REST API INTEGRATION
// ----------------------------------------------------

export function getStoredBooks(): Book[] {
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(INITIAL_BOOKS));
      return INITIAL_BOOKS;
    }
    const parsed: Book[] = JSON.parse(raw);
    const cleaned = filterRealBooks(parsed).map((b) => ({
      ...b,
      title: stripSiteWatermarks(b.title) || b.title,
      author: stripSiteWatermarks(b.author) || b.author,
    }));
    const { unique, removedIds } = deduplicateBooks(cleaned);
    if (unique.length !== parsed.length || removedIds.length > 0) {
      saveBooks(unique);
      if (removedIds.length > 0) {
        purgeDuplicateArtifacts(removedIds);
      }
    }
    return fillMissingCovers(unique);
  } catch {
    return [];
  }
}

function sanitizeBookForCache(b: Book): Book {
  const isSessionBlob = b.downloadUrl?.startsWith('blob:');
  const isHugeDataUrl = b.downloadUrl && b.downloadUrl.startsWith('data:') && b.downloadUrl.length > 150000;
  return {
    ...b,
    // Full binaries live in IndexedDB; only keep persistent URLs or small data URLs in localStorage
    downloadUrl: isSessionBlob || isHugeDataUrl ? undefined : b.downloadUrl,
  };
}

export async function fetchServerBooks(): Promise<Book[]> {
  try {
    const res = await fetch('/api/books');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const rawBooks: Book[] = await res.json();
      if (Array.isArray(rawBooks)) {
        const localBooks = getStoredBooks();
        const serverRealBooks = filterRealBooks(rawBooks);
        const serverIds = new Set(serverRealBooks.map((b) => b.id));
        const serverTitleKeys = new Set(serverRealBooks.map((b) => normalizeBookTitleKey(b.title)));

        const localOnlyBooks = localBooks.filter(
          (lb) =>
            lb.isUserUploaded &&
            !serverIds.has(lb.id) &&
            !serverTitleKeys.has(normalizeBookTitleKey(lb.title))
        );

        const mergedServerBooks = serverRealBooks.map((serverBook) => {
          const match = localBooks.find(
            (lb) =>
              lb.id === serverBook.id ||
              normalizeBookTitleKey(lb.title) === normalizeBookTitleKey(serverBook.title)
          );
          if (match && match.coverUrl && !serverBook.coverUrl) {
            return { ...serverBook, coverUrl: match.coverUrl, coverOrigin: match.coverOrigin };
          }
          return serverBook;
        });

        const { unique, removedIds } = deduplicateBooks([...localOnlyBooks, ...mergedServerBooks]);
        if (removedIds.length > 0) {
          purgeDuplicateArtifacts(removedIds);
        }
        const combined = fillMissingCovers(unique);
        saveBooks(combined);
        return combined;
      }
    }
  } catch (err) {
    console.warn('Using local books cache:', err);
  }
  return getStoredBooks();
}

/**
 * Upgrades previously uploaded books that still lack their original Page 1 / embedded / official cover.
 */
export async function upgradeStoredBooksCovers(bookList: Book[]): Promise<Book[]> {
  let changed = false;
  const upgraded: Book[] = [];

  for (const book of bookList) {
    const alreadyOriginal =
      book.coverOrigin === 'page1' ||
      book.coverOrigin === 'embedded' ||
      book.coverOrigin === 'custom';

    const looksLikeGeneratedCanvas =
      !book.coverUrl ||
      book.coverUrl.startsWith('data:image/svg') ||
      book.coverOrigin === 'canvas';

    if (!alreadyOriginal && looksLikeGeneratedCanvas) {
      // 1. Check IndexedDB for the original PDF/EPUB binary to extract Page 1 cover
      const storedFile = await getBookFileBlob(book.id);
      if (storedFile?.blob) {
        const extracted = await extractOriginalCoverFromBlob(
          storedFile.blob,
          book.fileType || 'pdf'
        );
        if (extracted.coverUrl) {
          const updatedBook: Book = {
            ...book,
            coverUrl: extracted.coverUrl,
            coverOrigin: extracted.coverOrigin,
            pageCount: book.pageCount || extracted.pageCount,
            sampleContent:
              extracted.sampleContent &&
              (!book.sampleContent || book.sampleContent.startsWith('PREVIEW EXCERPT'))
                ? extracted.sampleContent
                : book.sampleContent,
          };
          changed = true;
          upgraded.push(updatedBook);
          fetch(`/api/books/${book.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sanitizeBookForCache(updatedBook)),
          }).catch(() => {});
          continue;
        }
      }

      // 2. Fallback: fetch official published book cover if no local binary is present
      if (book.coverOrigin !== 'official') {
        const official = await lookupOfficialBookDetails(book.title, book.author);
        if (official.coverUrl) {
          const updatedBook: Book = {
            ...book,
            coverUrl: official.coverUrl,
            coverOrigin: 'official',
          };
          changed = true;
          upgraded.push(updatedBook);
          fetch(`/api/books/${book.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sanitizeBookForCache(updatedBook)),
          }).catch(() => {});
          continue;
        }
      }
    }

    upgraded.push(book);
  }

  if (changed) {
    saveBooks(upgraded);
  }
  return upgraded;
}

export function saveBooks(books: Book[]): void {
  const sanitized = books.map(sanitizeBookForCache);
  try {
    localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('LocalStorage quota limit reached, saving ultra-light cache:', err);
    try {
      const lightweight = sanitized.map((b) => ({
        ...b,
        downloadUrl: undefined,
        coverUrl: b.coverUrl && b.coverUrl.length > 60000 ? '' : b.coverUrl,
      }));
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(lightweight));
    } catch (e2) {
      console.warn('Could not save to localStorage:', e2);
    }
  }
}

export async function addBook(newBook: Book): Promise<Book[]> {
  return addBooksBatch([newBook]);
}

export async function addBooksBatch(newBooks: Book[]): Promise<Book[]> {
  const current = getStoredBooks();
  // Deduplicate within incoming batch and against existing catalog using canonical title keys
  const { unique: dedupedIncoming, removedIds: incomingDupIds } = deduplicateBooks(newBooks);
  const incomingTitleKeys = new Set(dedupedIncoming.map((b) => normalizeBookTitleKey(b.title)));
  const incomingIds = new Set(dedupedIncoming.map((b) => b.id));

  const replacedOldIds: string[] = [];
  const filteredCurrent = current.filter((b) => {
    const isSameId = incomingIds.has(b.id);
    const isSameTitle = incomingTitleKeys.has(normalizeBookTitleKey(b.title));
    if (isSameId || isSameTitle) {
      if (!isSameId) replacedOldIds.push(b.id);
      return false;
    }
    return true;
  });

  if (incomingDupIds.length > 0 || replacedOldIds.length > 0) {
    purgeDuplicateArtifacts([...incomingDupIds, ...replacedOldIds]);
  }

  const updated = [...dedupedIncoming, ...filteredCurrent];
  saveBooks(updated);

  // Sync each lightweight record to backend database (reverse order so newest ends up at top)
  for (const book of [...dedupedIncoming].reverse()) {
    try {
      const payload = sanitizeBookForCache(book);
      fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('Background sync error:', e));
    } catch (err) {
      console.warn('Network sync error:', err);
    }
  }

  return updated;
}

export async function updateBook(updatedBook: Book): Promise<Book[]> {
  const current = getStoredBooks();
  const updated = current.map((b) => (b.id === updatedBook.id ? updatedBook : b));
  saveBooks(updated);

  try {
    fetch(`/api/books/${updatedBook.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizeBookForCache(updatedBook)),
    }).catch((e) => console.warn('Background update error:', e));
  } catch (err) {
    console.warn('Network sync error:', err);
  }

  return updated;
}

export async function deleteBook(id: string): Promise<Book[]> {
  const current = getStoredBooks();
  const updated = current.filter((b) => b.id !== id);
  saveBooks(updated);
  deleteBookFileBlob(id).catch(() => {});

  try {
    fetch(`/api/books/${id}`, { method: 'DELETE' }).catch((e) =>
      console.warn('Background delete error:', e)
    );
  } catch (err) {
    console.warn('Network sync error:', err);
  }

  return updated;
}

export function getStoredCities(): DeliveryCity[] {
  try {
    const raw = localStorage.getItem(CITIES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(INITIAL_DELIVERY_CITIES));
      return INITIAL_DELIVERY_CITIES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DELIVERY_CITIES;
  }
}

export async function fetchServerCities(): Promise<DeliveryCity[]> {
  try {
    const res = await fetch('/api/cities');
    if (res.ok) {
      const serverCities: DeliveryCity[] = await res.json();
      if (Array.isArray(serverCities) && serverCities.length > 0) {
        localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(serverCities));
        return serverCities;
      }
    }
  } catch (err) {
    console.warn('Using local cities cache:', err);
  }
  return getStoredCities();
}

export function saveCities(cities: DeliveryCity[]): void {
  try {
    localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(cities));
  } catch (err) {
    console.error('Failed to save cities:', err);
  }
}

export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function fetchServerOrders(): Promise<Order[]> {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const serverOrders: Order[] = await res.json();
      if (Array.isArray(serverOrders)) {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(serverOrders));
        return serverOrders;
      }
    }
  } catch (err) {
    console.warn('Using local orders cache:', err);
  }
  return getStoredOrders();
}

export async function saveOrder(order: Order): Promise<Order[]> {
  const current = getStoredOrders();
  const updated = [order, ...current];
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save order locally:', err);
  }

  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    }).catch((e) => console.warn('Background sync order error:', e));
  } catch (err) {
    console.warn('Network sync error:', err);
  }

  return updated;
}

export async function updateOrderStatus(
  orderId: string,
  deliveryStatus: Order['deliveryStatus'],
  dispatcherNotes?: string
): Promise<Order[]> {
  const current = getStoredOrders();
  const updated = current.map((ord) => {
    if (ord.id === orderId) {
      return {
        ...ord,
        deliveryStatus,
        dispatcherNotes: dispatcherNotes !== undefined ? dispatcherNotes : ord.dispatcherNotes,
      };
    }
    return ord;
  });

  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update order status:', err);
  }

  try {
    fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryStatus, dispatcherNotes }),
    }).catch((e) => console.warn('Background sync update error:', e));
  } catch (err) {
    console.warn('Network sync error:', err);
  }

  return updated;
}

export async function confirmBankTransferOrder(orderId: string): Promise<Order[]> {
  const current = getStoredOrders();
  const updated = current.map((ord) => {
    if (ord.id === orderId) {
      return {
        ...ord,
        paymentStatus: 'paid' as const,
        downloadAccessGranted: true,
      };
    }
    return ord;
  });

  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to confirm bank transfer order locally:', err);
  }

  try {
    fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: 'paid', downloadAccessGranted: true }),
    }).catch((e) => console.warn('Background confirm order error:', e));
  } catch (err) {
    console.warn('Network sync error:', err);
  }

  return updated;
}

export function getPaystackConfig(): PaystackConfig {
  try {
    const raw = localStorage.getItem(PAYSTACK_CONFIG_KEY);
    if (!raw) {
      return DEFAULT_PAYSTACK_CONFIG;
    }
    return { ...DEFAULT_PAYSTACK_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PAYSTACK_CONFIG;
  }
}

export async function fetchServerPaystackConfig(): Promise<PaystackConfig> {
  try {
    const res = await fetch('/api/paystack-config');
    if (res.ok) {
      const serverConfig = await res.json();
      const merged = { ...DEFAULT_PAYSTACK_CONFIG, ...serverConfig };
      localStorage.setItem(PAYSTACK_CONFIG_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Using local paystack/payout config cache:', err);
  }
  return getPaystackConfig();
}

export function savePaystackConfig(config: PaystackConfig): void {
  try {
    localStorage.setItem(PAYSTACK_CONFIG_KEY, JSON.stringify(config));
    fetch('/api/paystack-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).catch((e) => console.warn('Config sync error:', e));
  } catch (err) {
    console.error('Failed to save paystack config:', err);
  }
}

// ----------------------------------------------------
// USER AUTHENTICATION & SESSION PERSISTENCE
// ----------------------------------------------------

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to update user session:', err);
  }
}

export function loginOrRegisterUser({
  email,
  name,
}: {
  email: string;
  name?: string;
  role?: 'reader' | 'author' | 'admin';
}): User {
  const cleanEmail = email.toLowerCase().trim();
  const isOwner = STORE_OWNER_EMAILS.has(cleanEmail);
  const effectiveRole: User['role'] = isOwner ? 'admin' : 'reader';
  const effectiveName = name?.trim() || (isOwner ? 'Store Owner (Heezy)' : email.split('@')[0]);

  const user: User = {
    id: `usr_${Date.now()}`,
    email: cleanEmail,
    name: effectiveName,
    role: effectiveRole,
    joinedAt: new Date().toISOString(),
    purchasedBookIds: [],
  };

  setCurrentUser(user);
  return user;
}

// ----------------------------------------------------
// WISHLIST STORAGE & PERSISTENCE
// ----------------------------------------------------

const WISHLIST_STORAGE_KEY = 'openshelf_wishlist_v1';

export function getStoredWishlist(): string[] {
  try {
    const user = getCurrentUser();
    if (user && user.wishlistBookIds && user.wishlistBookIds.length > 0) {
      return user.wishlistBookIds;
    }
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveWishlist(wishlist: string[]): void {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    const user = getCurrentUser();
    if (user) {
      user.wishlistBookIds = wishlist;
      setCurrentUser(user);
    }
  } catch (err) {
    console.error('Failed to save wishlist:', err);
  }
}

export function toggleStoredWishlist(bookId: string): string[] {
  const current = getStoredWishlist();
  const exists = current.includes(bookId);
  const updated = exists ? current.filter((id) => id !== bookId) : [...current, bookId];
  saveWishlist(updated);
  return updated;
}


