export type BookFormat = 'ebook' | 'print' | 'both';

export type BookGenre =
  | 'Self-Help & Personal Growth'
  | 'Literary Fiction'
  | 'African Literature'
  | 'Philosophy & Thought'
  | 'Motivation & Success'
  | 'Religion & Spirituality'
  | 'Finance & Wealth'
  | 'Business & Craft'
  | 'Poetry'
  | 'Technology & Society'
  | 'Memoir & Essay'
  | 'Science & Nature'
  | 'Health & Wellness'
  | 'Romance & Relationships'
  | 'History & Biography'
  | 'Sci-Fi & Fantasy'
  | 'Children & Young Adult'
  | 'Education & Academics';

export interface Book {
  id: string;
  title: string;
  author: string;
  year?: number;
  genre: BookGenre;
  description: string;
  priceUSD: number; // 0 = Free
  priceNGN: number;
  formatAvailable: BookFormat;
  coverUrl: string;
  pageCount?: number;
  isbn?: string;
  language?: string;
  fileSize?: string;
  fileType?: 'pdf' | 'epub' | 'mobi' | 'txt';
  downloadUrl?: string; // Blob or sample URL
  sampleContent?: string;
  featured?: boolean;
  stockPhysical?: number;
  uploadedAt: string;
  isUserUploaded?: boolean;
}

export type Currency = 'USD' | 'NGN' | 'GBP' | 'EUR';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  rateToUSD: number; // 1 USD = X
  label: string;
}

export interface DeliveryCity {
  id: string;
  name: string;
  stateOrRegion: string;
  deliveryFeeUSD: number;
  deliveryFeeNGN: number;
  estimatedDays: string;
}

export type OrderType = 'digital_only' | 'physical_delivery';

export interface OrderItem {
  book: Book;
  format: 'ebook' | 'print';
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  destinationType: 'international' | 'domestic';
  deliveryCity?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  totalUSD: number;
  totalNGN: number;
  currency: Currency;
  paystackReference?: string;
  paymentStatus: 'paid' | 'pending' | 'free_granted';
  deliveryStatus?: 'unassigned' | 'preparing' | 'with_courier' | 'delivered';
  dispatcherNotes?: string;
  downloadAccessGranted: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'reader' | 'author' | 'admin';
  avatar?: string;
  joinedAt: string;
  purchasedBookIds?: string[];
  wishlistBookIds?: string[];
}

