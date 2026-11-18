import JSZip from 'jszip';
import { BookGenre } from '../types/book';
import { CoverThemeId, generateCanvasBookCover } from './coverGenerator';

export interface AnalyzedEbook {
  rawFileName: string;
  cleanFileName: string;
  title: string;
  author: string;
  genre: BookGenre;
  year?: number;
  description: string;
  sampleContent: string;
  coverUrl: string;
  coverSource: 'embedded' | 'official' | 'canvas';
  fileType: 'pdf' | 'epub' | 'mobi' | 'txt';
  fileSize: string;
  pageCount?: number;
  isbn?: string;
  themeId: CoverThemeId;
}

const SITE_WATERMARK_PATTERNS: RegExp[] = [
  /[\[\(_\s-]*www\.oceanofpdf\.com[\]\)_\s-]*/gi,
  /[\[\(_\s-]*oceanofpdf\.com[\]\)_\s-]*/gi,
  /[\[\(_\s-]*oceanofpdf[\]\)_\s-]*/gi,
  /[\[\(_\s-]*ocean[\s._-]*of[\s._-]*pdf[\]\)_\s-]*/gi,
  /[\[\(_\s-]*z-lib\.org[\]\)_\s-]*/gi,
  /[\[\(_\s-]*zlibrary[\]\)_\s-]*/gi,
  /[\[\(_\s-]*z-library[\]\)_\s-]*/gi,
  /[\[\(_\s-]*pdfdrive\.com[\]\)_\s-]*/gi,
  /[\[\(_\s-]*pdfdrive[\]\)_\s-]*/gi,
  /[\[\(_\s-]*annas-archive\.org[\]\)_\s-]*/gi,
  /[\[\(_\s-]*anna['’]?s[\s_-]*archive[\]\)_\s-]*/gi,
  /[\[\(_\s-]*libgen\.[a-z]+[\]\)_\s-]*/gi,
  /[\[\(_\s-]*dokumen\.pub[\]\)_\s-]*/gi,
  /[\[\(_\s-]*epub\.pub[\]\)_\s-]*/gi,
  /[\[\(_\s-]*pdfroom\.com[\]\)_\s-]*/gi,
  /[\[\(_\s-]*vdoc\.pub[\]\)_\s-]*/gi,
  /[\[\(_\s-]*b-ok\.[a-z]+[\]\)_\s-]*/gi,
  /[\[\(_\s-]*1lib\.[a-z]+[\]\)_\s-]*/gi,
  /[\[\(_\s-]*kupdf\.net[\]\)_\s-]*/gi,
  /[\[\(_\s-]*vk\.com[\]\)_\s-]*/gi,
  /[\[\(_\s-]*ebook3000[\]\)_\s-]*/gi,
];

const JUNK_METADATA_VALUES = [
  'oceanofpdf',
  'ocean of pdf',
  'calibre',
  'unknown',
  'administrator',
  'admin',
  'user',
  'pdfdrive',
  'z-lib',
  'microsoft word',
  'adobe indesign',
  'untitled',
];

/**
 * Removes all "OceanofPDF" and mirror-site watermarks from any string (filename, title, author, description).
 */
export function stripSiteWatermarks(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();

  for (const pattern of SITE_WATERMARK_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Replace underscores with spaces, normalize dots used between words (not decimal numbers)
  cleaned = cleaned.replace(/_/g, ' ');
  cleaned = cleaned.replace(/(?<=[a-zA-Z])\.(?=[a-zA-Z])/g, ' ');

  // Remove empty brackets/parens left behind after stripping domain tags
  cleaned = cleaned.replace(/\[\s*\]|\(\s*\)|\{\s*\}/g, ' ');

  // Collapse whitespace and trim stray leading/trailing separators
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^[\s\-–—.,:;•|_]+|[\s\-–—.,:;•|_]+$/g, '').trim();

  return cleaned;
}

function isJunkMetadataValue(val: string): boolean {
  const lower = val.toLowerCase().trim();
  if (!lower || lower.length < 2) return true;
  if (/^https?:\/\//i.test(lower) || /\.com$|\.org$|\.net$/i.test(lower)) return true;
  return JUNK_METADATA_VALUES.some((junk) => lower.includes(junk));
}

function toSmartTitleCase(text: string): string {
  const minorWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'with', 'from']);
  // Only re-case if the string looks all-lowercase, all-uppercase, or mixed oddly
  const hasMixedCase = /[a-z]/.test(text) && /[A-Z]/.test(text);
  const words = text.split(/\s+/).filter(Boolean);
  if (hasMixedCase && words.some((w) => /^[A-Z][a-z]/.test(w))) {
    return words.join(' ');
  }
  return words
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && idx < words.length - 1 && minorWords.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function detectFileType(fileName: string): 'pdf' | 'epub' | 'mobi' | 'txt' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.epub')) return 'epub';
  if (lower.endsWith('.mobi') || lower.endsWith('.azw') || lower.endsWith('.azw3')) return 'mobi';
  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.rtf')) return 'txt';
  return 'pdf';
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '1.0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Generates a clean, professional download filename free of any "OceanofPDF" tags.
 */
export function buildCleanFileName(title: string, ext: string): string {
  const cleaned = stripSiteWatermarks(title) || 'Open_Shelf_Book';
  const safeBase = cleaned
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  const cleanExt = ext.replace(/^\./, '').toLowerCase() || 'pdf';
  return `${safeBase || 'Open_Shelf_Book'}.${cleanExt}`;
}

/**
 * Parses a raw downloaded filename (e.g. "_OceanofPDF.com_Atomic_Habits_-_James_Clear.pdf")
 * into clean title, author, year, and fileType.
 */
export function parseBookFilename(rawFileName: string): {
  title: string;
  author: string;
  year?: number;
  fileType: 'pdf' | 'epub' | 'mobi' | 'txt';
} {
  const fileType = detectFileType(rawFileName);
  const withoutExt = rawFileName.replace(/\.[^/.]+$/, '');

  // Extract optional year like (2023) or [2024]
  let extractedYear: number | undefined;
  const yearMatch = withoutExt.match(/[\(\[]\s*((?:19|20)\d{2})\s*[\)\]]/);
  if (yearMatch) {
    const y = Number(yearMatch[1]);
    if (y >= 1900 && y <= 2030) extractedYear = y;
  }

  let cleaned = stripSiteWatermarks(withoutExt);
  // Remove trailing year tags like "(2023)" after extracting
  cleaned = cleaned.replace(/\(\s*(?:19|20)\d{2}\s*\)/g, '').trim();
  // Remove common ebook format noise in filenames like "(EPUB)", "(PDF)"
  cleaned = cleaned.replace(/[\(\[]\s*(?:pdf|epub|mobi|azw3?|ebook|retail|original)\s*[\)\]]/gi, '').trim();
  cleaned = cleaned.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim();

  let title = cleaned || 'Untitled Book';
  let author = '';

  // Pattern 1: "Title - Author" or "Title – Author" or "Title — Author"
  const dashSplit = cleaned.split(/\s+[-–—]+\s+/);
  if (dashSplit.length >= 2) {
    const first = dashSplit[0].trim();
    const last = dashSplit[dashSplit.length - 1].trim();
    // If more than 2 segments, join middle segments into title
    if (dashSplit.length > 2) {
      title = dashSplit.slice(0, -1).join(' - ').trim();
      author = last;
    } else {
      title = first;
      author = last;
    }
  } else {
    // Pattern 2: "Title by Author"
    const byMatch = cleaned.match(/^(.+?)\s+by\s+([A-Za-z.\s'-]{3,50})$/i);
    if (byMatch) {
      title = byMatch[1].trim();
      author = byMatch[2].trim();
    }
  }

  return {
    title: toSmartTitleCase(stripSiteWatermarks(title) || 'Untitled Edition'),
    author: author ? toSmartTitleCase(stripSiteWatermarks(author)) : '',
    year: extractedYear,
    fileType,
  };
}

/**
 * Automatically classifies a book into the most accurate Open Shelf genre.
 */
export function inferBookGenre(
  title: string,
  author: string = '',
  subjectOrDesc: string = ''
): BookGenre {
  const haystack = `${title} ${author} ${subjectOrDesc}`.toLowerCase();

  // Specific iconic titles & direct overrides
  if (haystack.includes('wonderfully made')) return 'Self-Help & Personal Growth';
  if (haystack.includes('elon musk') || haystack.includes('walter isaacson') || haystack.includes('steve jobs')) {
    return 'History & Biography';
  }

  const rules: Array<{ genre: BookGenre; keywords: string[] }> = [
    {
      genre: 'History & Biography',
      keywords: [
        'biography', 'autobiography', 'life of', 'becoming', 'mandela', 'obama',
        'history of', 'sapiens', 'empire', 'chronicle', 'historical', 'founder',
        'churchill', 'lincoln', 'einstein', 'da vinci', 'kennedy', 'kissinger',
      ],
    },
    {
      genre: 'Self-Help & Personal Growth',
      keywords: [
        'self-help', 'self help', 'personal growth', 'personal development', 'atomic habits',
        'habit', '7 habits', 'mindset', 'confidence', 'self-love', 'self love', 'healing',
        'subtle art', 'how to win friends', 'purpose', 'emotional intelligence', 'overcome',
        'anxiety', 'happiness', 'self mastery', 'self-mastery', 'boundaries', 'trauma',
        'wonderfully', 'ikigai', 'miracle morning', 'four agreements', 'power of now',
      ],
    },
    {
      genre: 'Motivation & Success',
      keywords: [
        'motivation', 'success', '48 laws', 'laws of power', 'laws of human nature',
        'grit', 'unstoppable', 'goggins', 'can\'t hurt me', 'think and grow',
        'discipline', 'mastery', 'peak performance', 'winning', 'relentless', 'outwitting',
        'high performance', 'goal', 'ambition', 'champion', 'greatness',
      ],
    },
    {
      genre: 'Finance & Wealth',
      keywords: [
        'finance', 'wealth', 'money', 'rich dad', 'poor dad', 'millionaire', 'billionaire',
        'investing', 'investment', 'investor', 'stock', 'trading', 'crypto', 'bitcoin',
        'cashflow', 'financial freedom', 'economics', 'capital', 'asset', 'real estate',
        'richest man in babylon', 'psychology of money', 'budget', 'tax', 'profit',
      ],
    },
    {
      genre: 'Religion & Spirituality',
      keywords: [
        'bible', 'prayer', 'god', 'jesus', 'christ', 'holy spirit', 'faith', 'devotional',
        'scripture', 'christian', 'church', 'pastor', 'islam', 'quran', 'allah',
        'spiritual', 'spirituality', 'grace', 'gospel', 'anointing', 'blessing', 'worship',
        'theology', 'purpose driven', 'sermon', 'kingdom', 'miracle',
      ],
    },
    {
      genre: 'Business & Craft',
      keywords: [
        'business', 'startup', 'entrepreneur', 'entrepreneurship', 'marketing', 'sales',
        'leadership', 'management', 'zero to one', 'lean', 'strategy', 'brand', 'negotiation',
        'influence', 'persuasion', 'copywriting', 'e-commerce', 'company', 'publisher',
        'productivity', 'deep work', 'essentialism', 'good to great',
      ],
    },
    {
      genre: 'Health & Wellness',
      keywords: [
        'health', 'wellness', 'fitness', 'nutrition', 'diet', 'sleep', 'why we sleep',
        'fasting', 'workout', 'exercise', 'longevity', 'medical', 'medicine', 'anatomy',
        'yoga', 'mental health', 'body keeps the score', 'metabolism', 'glucose',
      ],
    },
    {
      genre: 'Technology & Society',
      keywords: [
        'technology', 'software', 'programming', 'coding', 'javascript', 'typescript',
        'python', 'react', 'computer', 'algorithm', 'artificial intelligence', 'machine learning',
        'cyber', 'internet', 'digital', 'design', 'ux', 'ui', 'data science', 'engineering',
      ],
    },
    {
      genre: 'Science & Nature',
      keywords: [
        'science', 'physics', 'quantum', 'cosmos', 'astrophysics', 'astronomy', 'biology',
        'chemistry', 'evolution', 'neuroscience', 'brain', 'universe', 'nature', 'ecology',
        'brief history of time', 'darwin', 'genetics', 'mathematics',
      ],
    },
    {
      genre: 'Philosophy & Thought',
      keywords: [
        'philosophy', 'stoic', 'stoicism', 'meditations', 'marcus aurelius', 'seneca',
        'epictetus', 'plato', 'aristotle', 'nietzsche', 'kant', 'ethics', 'logic',
        'thinking fast and slow', 'existential', 'wisdom', 'cognitive', 'critical thinking',
      ],
    },
    {
      genre: 'African Literature',
      keywords: [
        'african', 'africa', 'nigeria', 'nigerian', 'lagos', 'ghana', 'kenya', 'achebe',
        'chimamanda', 'adichie', 'soyinka', 'things fall apart', 'purple hibiscus',
        'half of a yellow sun', 'americanah', 'kaduna', 'yoruba', 'igbo', 'aké',
      ],
    },
    {
      genre: 'Romance & Relationships',
      keywords: [
        'romance', 'love language', 'five love languages', 'marriage', 'relationship',
        'dating', 'attached', 'men are from mars', 'bride', 'heartbreak', 'intimacy',
      ],
    },
    {
      genre: 'Poetry',
      keywords: [
        'poetry', 'poems', 'verse', 'sonnet', 'anthology', 'haiku', 'rupi kaur',
        'milk and honey', 'lyrical',
      ],
    },
    {
      genre: 'Sci-Fi & Fantasy',
      keywords: [
        'sci-fi', 'science fiction', 'fantasy', 'dune', 'harry potter', 'lord of the rings',
        'hobbit', 'dragon', 'magic', 'wizard', 'galaxy', 'space opera', 'dystopian', '1984',
      ],
    },
    {
      genre: 'Memoir & Essay',
      keywords: [
        'memoir', 'essay', 'essays', 'diaries', 'diary', 'letters', 'educated', 'glass castle',
      ],
    },
    {
      genre: 'Children & Young Adult',
      keywords: [
        'children', 'kids', 'young adult', 'teen', 'bedtime story', 'picture book', 'fairy tale',
      ],
    },
    {
      genre: 'Education & Academics',
      keywords: [
        'textbook', 'study guide', 'exam', 'syllabus', 'academic', 'lecture', 'handbook',
        'dictionary', 'grammar', 'ielts', 'sat', 'waec', 'jamb', 'course',
      ],
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return rule.genre;
    }
  }

  return 'Literary Fiction';
}

export function getGenreCoverTheme(genre: BookGenre): CoverThemeId {
  switch (genre) {
    case 'Self-Help & Personal Growth':
    case 'African Literature':
    case 'Motivation & Success':
      return 'terracotta-arch';
    case 'Finance & Wealth':
    case 'Education & Academics':
      return 'indigo-stamped';
    case 'Business & Craft':
      return 'modern-bauhaus';
    case 'Technology & Society':
    case 'Science & Nature':
    case 'Health & Wellness':
      return 'botanical-cyan';
    case 'Religion & Spirituality':
    case 'Poetry':
      return 'vintage-linen';
    case 'History & Biography':
    default:
      return 'minimalist-editorial';
  }
}

/**
 * Compresses an extracted image Blob into a crisp cover JPEG data URL (max 560px wide)
 * so it displays sharply while staying lightweight inside localStorage.
 */
async function compressImageBlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const imgUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const maxW = 560;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          URL.revokeObjectURL(imgUrl);
          resolve(dataUrl);
          return;
        }
      } catch {
        // Fallback to raw FileReader
      }
      URL.revokeObjectURL(imgUrl);
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    };
    img.onerror = () => {
      URL.revokeObjectURL(imgUrl);
      resolve('');
    };
    img.src = imgUrl;
  });
}

/**
 * Extracts real title, author, description, subject, year, and embedded cover image from an EPUB file.
 */
async function extractEpubMetadata(file: File): Promise<{
  title?: string;
  author?: string;
  description?: string;
  subject?: string;
  year?: number;
  coverDataUrl?: string;
}> {
  try {
    const zip = await JSZip.loadAsync(file);

    // 1. Locate root OPF path from META-INF/container.xml
    let opfPath = '';
    const containerFile = zip.file('META-INF/container.xml');
    if (containerFile) {
      const containerXml = await containerFile.async('string');
      const parser = new DOMParser();
      const doc = parser.parseFromString(containerXml, 'application/xml');
      const rootfile = doc.querySelector('rootfile');
      opfPath = rootfile?.getAttribute('full-path') || '';
    }

    if (!opfPath) {
      const opfMatch = Object.keys(zip.files).find((k) => k.toLowerCase().endsWith('.opf'));
      if (opfMatch) opfPath = opfMatch;
    }

    if (!opfPath || !zip.file(opfPath)) {
      return {};
    }

    const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    const opfXml = await zip.file(opfPath)!.async('string');
    const parser = new DOMParser();
    const opfDoc = parser.parseFromString(opfXml, 'application/xml');

    const getTagText = (selectors: string[]) => {
      for (const sel of selectors) {
        const el = opfDoc.getElementsByTagName(sel)[0] || opfDoc.querySelector(sel);
        if (el?.textContent?.trim()) return el.textContent.trim();
      }
      return '';
    };

    const rawTitle = stripSiteWatermarks(getTagText(['dc:title', 'title']));
    const rawAuthor = stripSiteWatermarks(getTagText(['dc:creator', 'creator']));
    const rawDesc = stripSiteWatermarks(
      getTagText(['dc:description', 'description']).replace(/<[^>]+>/g, ' ')
    );
    const rawSubject = stripSiteWatermarks(getTagText(['dc:subject', 'subject']));
    const rawDate = getTagText(['dc:date', 'date']);
    let year: number | undefined;
    const yMatch = rawDate.match(/(19|20)\d{2}/);
    if (yMatch) year = Number(yMatch[0]);

    // 2. Find embedded cover image in manifest
    const manifestItems = Array.from(opfDoc.getElementsByTagName('item'));
    let coverHref = '';

    // Method A: <item properties="cover-image" .../>
    const propCover = manifestItems.find((item) =>
      (item.getAttribute('properties') || '').toLowerCase().includes('cover-image')
    );
    if (propCover) coverHref = propCover.getAttribute('href') || '';

    // Method B: <meta name="cover" content="cover-id" />
    if (!coverHref) {
      const metas = Array.from(opfDoc.getElementsByTagName('meta'));
      const coverMeta = metas.find(
        (m) => (m.getAttribute('name') || '').toLowerCase() === 'cover'
      );
      const coverId = coverMeta?.getAttribute('content');
      if (coverId) {
        const target = manifestItems.find((i) => i.getAttribute('id') === coverId);
        if (target) coverHref = target.getAttribute('href') || '';
      }
    }

    // Method C: manifest item with id/href containing "cover" and image media-type
    if (!coverHref) {
      const fallbackItem = manifestItems.find((item) => {
        const mediaType = (item.getAttribute('media-type') || '').toLowerCase();
        const id = (item.getAttribute('id') || '').toLowerCase();
        const href = (item.getAttribute('href') || '').toLowerCase();
        return (
          mediaType.startsWith('image/') &&
          (id.includes('cover') || href.includes('cover'))
        );
      });
      if (fallbackItem) coverHref = fallbackItem.getAttribute('href') || '';
    }

    let coverDataUrl: string | undefined;
    if (coverHref) {
      const decodedHref = decodeURIComponent(coverHref);
      const fullPath = opfDir + decodedHref.replace(/^\.\//, '');
      const coverZipEntry =
        zip.file(fullPath) ||
        zip.file(decodedHref) ||
        Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith(decodedHref.toLowerCase()));

      if (coverZipEntry && !coverZipEntry.dir) {
        const imgBlob = await coverZipEntry.async('blob');
        const compressed = await compressImageBlobToDataUrl(imgBlob);
        if (compressed) coverDataUrl = compressed;
      }
    }

    return {
      title: !isJunkMetadataValue(rawTitle) ? rawTitle : undefined,
      author: !isJunkMetadataValue(rawAuthor) ? rawAuthor : undefined,
      description: rawDesc && !isJunkMetadataValue(rawDesc) ? rawDesc : undefined,
      subject: rawSubject || undefined,
      year,
      coverDataUrl,
    };
  } catch (err) {
    console.warn('EPUB extraction fallback:', err);
    return {};
  }
}

function decodePdfTextBytes(raw: string): string {
  // Handle UTF-16BE BOM (\xFE\xFF) if present
  if (raw.startsWith('\u00fe\u00ff') || raw.startsWith('\xFE\xFF')) {
    let out = '';
    for (let i = 2; i + 1 < raw.length; i += 2) {
      const code = (raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1);
      if (code >= 32) out += String.fromCharCode(code);
    }
    return out;
  }
  return raw
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Reads embedded /Title, /Author, /Subject from PDF Info dictionary without heavy external workers.
 */
async function extractPdfHeaderMetadata(file: File): Promise<{
  title?: string;
  author?: string;
  subject?: string;
}> {
  try {
    const headBlob = file.slice(0, 131072);
    const tailStart = Math.max(0, file.size - 65536);
    const tailBlob = file.slice(tailStart, file.size);

    const [headBuf, tailBuf] = await Promise.all([
      headBlob.arrayBuffer(),
      tailBlob.arrayBuffer(),
    ]);

    const decoder = new TextDecoder('latin1');
    const combinedText = decoder.decode(headBuf) + '\n' + decoder.decode(tailBuf);

    const matchField = (field: string) => {
      const regex = new RegExp(`/${field}\\s*\\(([^)]{1,260})\\)`, 'i');
      const m = combinedText.match(regex);
      if (!m) return '';
      return stripSiteWatermarks(decodePdfTextBytes(m[1]));
    };

    const title = matchField('Title');
    const author = matchField('Author');
    const subject = matchField('Subject');

    return {
      title: title && !isJunkMetadataValue(title) ? title : undefined,
      author: author && !isJunkMetadataValue(author) ? author : undefined,
      subject: subject && !isJunkMetadataValue(subject) ? subject : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Verifies an external cover image URL actually loads cleanly within timeout.
 */
function verifyImageLoads(url: string, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        // Reject tiny 1x1 placeholder images
        resolve(img.naturalWidth >= 40 && img.naturalHeight >= 50);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(false);
      }
    };
    img.src = url;
  });
}

/**
 * Searches Google Books & Open Library for official book cover, author, description, and categories.
 */
async function lookupOfficialBookDetails(
  title: string,
  author: string
): Promise<{
  coverUrl?: string;
  author?: string;
  description?: string;
  categories?: string[];
  year?: number;
  pageCount?: number;
  isbn?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const query = author ? `intitle:${title} inauthor:${author}` : title;
    const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3`;

    const res = await fetch(gbUrl, { signal: controller.signal });
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      for (const item of items) {
        const info = item?.volumeInfo;
        if (!info) continue;
        const thumb =
          info.imageLinks?.extraLarge ||
          info.imageLinks?.large ||
          info.imageLinks?.medium ||
          info.imageLinks?.thumbnail ||
          info.imageLinks?.smallThumbnail;

        let highResCover = thumb ? String(thumb).replace(/^http:\/\//i, 'https://') : '';
        if (highResCover.includes('zoom=1')) {
          highResCover = highResCover.replace('zoom=1', 'zoom=2');
        }

        const isCoverValid = highResCover ? await verifyImageLoads(highResCover, 3000) : false;
        const publishedYearMatch = String(info.publishedDate || '').match(/(19|20)\d{2}/);
        const isbnObj = Array.isArray(info.industryIdentifiers)
          ? info.industryIdentifiers.find((i: any) => i.type === 'ISBN_13') ||
            info.industryIdentifiers[0]
          : null;

        if (isCoverValid || info.description || info.authors?.length) {
          clearTimeout(timer);
          return {
            coverUrl: isCoverValid ? highResCover : undefined,
            author: Array.isArray(info.authors) && info.authors[0] ? String(info.authors[0]) : undefined,
            description: info.description ? stripSiteWatermarks(String(info.description)) : undefined,
            categories: Array.isArray(info.categories) ? info.categories : undefined,
            year: publishedYearMatch ? Number(publishedYearMatch[0]) : undefined,
            pageCount: typeof info.pageCount === 'number' ? info.pageCount : undefined,
            isbn: isbnObj?.identifier ? String(isbnObj.identifier) : undefined,
          };
        }
      }
    }

    // Fallback to Open Library search if Google Books had no match
    const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}${
      author ? `&author=${encodeURIComponent(author)}` : ''
    }&limit=3`;
    const olRes = await fetch(olUrl, { signal: controller.signal });
    if (olRes.ok) {
      const olData = await olRes.json();
      const docs = Array.isArray(olData?.docs) ? olData.docs : [];
      for (const doc of docs) {
        if (doc.cover_i) {
          const coverCandidate = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
          const valid = await verifyImageLoads(coverCandidate, 3000);
          if (valid) {
            clearTimeout(timer);
            return {
              coverUrl: coverCandidate,
              author: Array.isArray(doc.author_name) ? String(doc.author_name[0]) : undefined,
              categories: Array.isArray(doc.subject) ? doc.subject.slice(0, 5) : undefined,
              year: typeof doc.first_publish_year === 'number' ? doc.first_publish_year : undefined,
              pageCount: typeof doc.number_of_pages_median === 'number' ? doc.number_of_pages_median : undefined,
            };
          }
        }
      }
    }
  } catch {
    // Offline or timeout — gracefully continue to crisp Canvas Cover fallback
  } finally {
    clearTimeout(timer);
  }

  return {};
}

/**
 * Full pipeline: Reads a local ebook File, strips all "OceanofPDF" and mirror tags,
 * extracts EPUB/PDF metadata & embedded cover, fetches official cover if missing,
 * classifies the right genre shelf, and generates a crisp canvas cover fallback if needed.
 */
export async function analyzeDeviceEbookFile(
  file: File,
  defaultAuthorFallback = 'Independent Author'
): Promise<AnalyzedEbook> {
  const parsed = parseBookFilename(file.name);
  let title = parsed.title;
  let author = parsed.author;
  let year = parsed.year;
  let description = '';
  let subject = '';
  let sampleContent = '';
  let coverUrl = '';
  let coverSource: AnalyzedEbook['coverSource'] = 'canvas';
  let pageCount: number | undefined;
  let isbn: string | undefined;

  // 1. Extract internal metadata & embedded cover depending on format
  if (parsed.fileType === 'epub') {
    const epubMeta = await extractEpubMetadata(file);
    if (epubMeta.title && epubMeta.title.length >= 2) title = toSmartTitleCase(epubMeta.title);
    if (epubMeta.author) author = toSmartTitleCase(epubMeta.author);
    if (epubMeta.description) description = epubMeta.description;
    if (epubMeta.subject) subject = epubMeta.subject;
    if (epubMeta.year) year = epubMeta.year;
    if (epubMeta.coverDataUrl) {
      coverUrl = epubMeta.coverDataUrl;
      coverSource = 'embedded';
    }
  } else if (parsed.fileType === 'pdf') {
    const pdfMeta = await extractPdfHeaderMetadata(file);
    // Use PDF /Title only if filename had little info or PDF /Title is clean and non-generic
    if (pdfMeta.title && pdfMeta.title.length >= 3 && title === 'Untitled Edition') {
      title = toSmartTitleCase(pdfMeta.title);
    }
    if (pdfMeta.author && !author) {
      author = toSmartTitleCase(pdfMeta.author);
    }
    if (pdfMeta.subject) subject = pdfMeta.subject;
  } else if (parsed.fileType === 'txt') {
    try {
      const txt = await file.text();
      const cleanedTxt = stripSiteWatermarks(txt);
      if (cleanedTxt) {
        sampleContent = cleanedTxt.slice(0, 1800);
      }
    } catch {
      // ignore
    }
  }

  // 2. Lookup official cover & metadata if cover or author or description is missing
  if (!coverUrl || !author || !description) {
    const official = await lookupOfficialBookDetails(title, author);
    if (!coverUrl && official.coverUrl) {
      coverUrl = official.coverUrl;
      coverSource = 'official';
    }
    if (!author && official.author) {
      author = official.author;
    }
    if (!description && official.description) {
      description = official.description;
    }
    if (!subject && official.categories?.length) {
      subject = official.categories.join(', ');
    }
    if (!year && official.year) year = official.year;
    if (official.pageCount) pageCount = official.pageCount;
    if (official.isbn) isbn = official.isbn;
  }

  // Final safety cleanup ensuring zero "OceanofPDF" ever leaks into display strings
  title = stripSiteWatermarks(title) || 'Untitled Edition';
  author = stripSiteWatermarks(author) || defaultAuthorFallback;
  description = stripSiteWatermarks(description);

  const genre = inferBookGenre(title, author, `${subject} ${description}`);
  const themeId = getGenreCoverTheme(genre);

  if (!description) {
    description = `${title} by ${author} — curated in the ${genre} collection on Open Shelf for instant digital reading and download.`;
  }

  if (!sampleContent) {
    sampleContent = `${title.toUpperCase()}\nBy ${author}\nShelf: ${genre}\n\n${description}\n\nClick "Download File" above to save the complete ${parsed.fileType.toUpperCase()} edition (${buildCleanFileName(title, parsed.fileType)}) directly to your device.`;
  }

  if (!coverUrl) {
    coverUrl = generateCanvasBookCover({
      title,
      author,
      genre,
      year,
      themeId,
    });
    coverSource = 'canvas';
  }

  return {
    rawFileName: file.name,
    cleanFileName: buildCleanFileName(title, parsed.fileType),
    title,
    author,
    genre,
    year,
    description,
    sampleContent,
    coverUrl,
    coverSource,
    fileType: parsed.fileType,
    fileSize: formatBytes(file.size),
    pageCount,
    isbn,
    themeId,
  };
}
