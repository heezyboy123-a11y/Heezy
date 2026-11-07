import { Book, Order, DeliveryCity, User } from '../types/book';
import { INITIAL_BOOKS, INITIAL_DELIVERY_CITIES } from '../data/initialBooks';
import { generateCanvasBookCover, CoverThemeId } from './coverGenerator';

const BOOKS_STORAGE_KEY = 'openshelf_books_v1';
const ORDERS_STORAGE_KEY = 'openshelf_orders_v1';
const CITIES_STORAGE_KEY = 'openshelf_cities_v1';
const PAYSTACK_CONFIG_KEY = 'openshelf_paystack_config_v1';
const USER_STORAGE_KEY = 'openshelf_user_v1';

export interface PaystackConfig {
  publicKey: string;
  isLive: boolean;
  businessName: string;
  allowInternationalCards: boolean;
  supportEmail: string;
  currency: 'USD' | 'NGN' | 'GBP';
}

const DEFAULT_PAYSTACK_CONFIG: PaystackConfig = {
  publicKey: 'pk_test_d34298a098c47b5204781498b5840212a4c14c59',
  isLive: false,
  businessName: 'Open Shelf Books',
  allowInternationalCards: true,
  supportEmail: 'itljies@gmail.com',
  currency: 'USD',
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

// Helper to determine if a user has Store Owner / Master Administrator privileges
export function isStoreOwnerUser(user: User | null): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();
  return (
    user.role === 'admin' ||
    email === 'heezyboy123@gmail.com' ||
    email === 'itljies@gmail.com' ||
    email.includes('heezy') ||
    name.includes('heezy')
  );
}

// ----------------------------------------------------
// LOCAL STORAGE SYNC & REST API INTEGRATION
// ----------------------------------------------------

export function getStoredBooks(): Book[] {
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    const initial = prepareInitialBooks();
    if (!raw) {
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed: Book[] = JSON.parse(raw);
    // Ensure all core books exist and maintain accurate genres (Wonderfully Made in Self-Help, Elon Musk in Biography)
    const merged = [...parsed];
    for (const initBook of initial) {
      const foundIdx = merged.findIndex(
        (b) => b.id === initBook.id || b.title.toLowerCase().trim() === initBook.title.toLowerCase().trim()
      );
      if (foundIdx === -1) {
        merged.push(initBook);
      } else {
        // Sync corrected genre & metadata
        merged[foundIdx].genre = initBook.genre;
        if (!merged[foundIdx].coverUrl) {
          merged[foundIdx].coverUrl = initBook.coverUrl;
        }
      }
    }
    return fillMissingCovers(merged);
  } catch {
    return prepareInitialBooks();
  }
}

export async function fetchServerBooks(): Promise<Book[]> {
  try {
    const res = await fetch('/api/books');
    if (res.ok) {
      const rawBooks: Book[] = await res.json();
      if (Array.isArray(rawBooks) && rawBooks.length > 0) {
        const serverBooks = fillMissingCovers(rawBooks);
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(serverBooks));
        return serverBooks;
      }
    }
  } catch (err) {
    console.warn('Using local books cache:', err);
  }
  return getStoredBooks();
}

export function saveBooks(books: Book[]): void {
  try {
    localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
  } catch (err) {
    console.warn('LocalStorage quota limit reached, saving optimized cache:', err);
    try {
      // Strip oversized data payloads (>40KB) from localStorage cache to prevent quota errors
      const lightweight = books.map((b) => ({
        ...b,
        downloadUrl: b.downloadUrl && b.downloadUrl.length > 40000 ? undefined : b.downloadUrl,
      }));
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(lightweight));
    } catch (e2) {
      console.warn('Could not save to localStorage:', e2);
    }
  }
}

export async function addBook(newBook: Book): Promise<Book[]> {
  const current = getStoredBooks();
  const updated = [newBook, ...current];
  saveBooks(updated);

  // Sync with persistent backend database
  try {
    fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBook),
    }).catch((e) => console.warn('Background sync error:', e));
  } catch (err) {
    console.warn('Network sync error:', err);
  }

  return updated;
}

export async function deleteBook(id: string): Promise<Book[]> {
  const current = getStoredBooks();
  const updated = current.filter((b) => b.id !== id);
  saveBooks(updated);

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
  role = 'reader',
}: {
  email: string;
  name?: string;
  role?: 'reader' | 'author' | 'admin';
}): User {
  const cleanEmail = email.toLowerCase().trim();
  const isOwner =
    cleanEmail === 'itljies@gmail.com' ||
    cleanEmail === 'heezyboy123@gmail.com' ||
    cleanEmail.startsWith('heezy');
  const effectiveRole = isOwner ? 'admin' : role;
  const effectiveName = name?.trim() || (isOwner ? 'Store Owner (Heezy)' : email.split('@')[0]);

  const user: User = {
    id: `usr_${Date.now()}`,
    email: email.toLowerCase().trim(),
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


