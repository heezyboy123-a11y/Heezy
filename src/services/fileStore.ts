// IndexedDB storage for full-sized uploaded ebook files (PDF, EPUB, MOBI, TXT)
// Allows storing dozens of full ebooks directly from the user's phone/PC without hitting localStorage's 5MB limit.

const DB_NAME = 'openshelf_files_db';
const DB_VERSION = 1;
const STORE_NAME = 'ebook_files';

export interface StoredBookFile {
  bookId: string;
  blob: Blob;
  cleanFileName: string;
  savedAt: number;
}

function openFileDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'bookId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open file store'));
  });
}

export async function saveBookFileBlob(
  bookId: string,
  blob: Blob,
  cleanFileName: string
): Promise<void> {
  try {
    const db = await openFileDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredBookFile = {
        bookId,
        blob,
        cleanFileName,
        savedAt: Date.now(),
      };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not persist full ebook binary in IndexedDB:', err);
  }
}

export async function getBookFileBlob(bookId: string): Promise<StoredBookFile | null> {
  try {
    const db = await openFileDB();
    return await new Promise<StoredBookFile | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(bookId);
      req.onsuccess = () => resolve((req.result as StoredBookFile) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read ebook binary from IndexedDB:', err);
    return null;
  }
}

export async function deleteBookFileBlob(bookId: string): Promise<void> {
  try {
    const db = await openFileDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(bookId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not delete ebook binary from IndexedDB:', err);
  }
}
