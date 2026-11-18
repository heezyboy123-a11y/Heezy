import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Book, BookGenre, BookFormat, User } from '../types/book';
import {
  X,
  Upload,
  Sparkles,
  Check,
  FileText,
  Link as LinkIcon,
  Smartphone,
  FileUp,
  Crown,
  FolderOpen,
  Layers,
  Trash2,
  Loader2,
  ImagePlus,
  RefreshCw,
  Search,
  Shuffle,
} from 'lucide-react';
import { generateCanvasBookCover, COVER_THEMES, CoverThemeId } from '../services/coverGenerator';
import { isStoreOwnerUser } from '../services/storage';
import {
  analyzeDeviceEbookFile,
  buildCleanFileName,
  stripSiteWatermarks,
  normalizeBookTitleKey,
  parseBookFilename,
  detectFileType,
  formatBytes,
  suggestVariedBookPrice,
} from '../services/ebookCleaner';
import { saveBookFileBlob } from '../services/fileStore';

const ALL_GENRES: BookGenre[] = [
  'Self-Help & Personal Growth',
  'Motivation & Success',
  'Finance & Wealth',
  'Business & Craft',
  'Religion & Spirituality',
  'Literary Fiction',
  'African Literature',
  'Philosophy & Thought',
  'Health & Wellness',
  'Romance & Relationships',
  'Poetry',
  'Technology & Society',
  'Science & Nature',
  'Memoir & Essay',
  'History & Biography',
  'Sci-Fi & Fantasy',
  'Children & Young Adult',
  'Education & Academics',
];

const QUICK_PRICE_PRESETS_NGN = [3000, 4500, 6000, 7500, 10500, 15000];
const EBOOK_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.azw', '.azw3', '.txt', '.md', '.rtf'];

function isLikelyEbookFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return EBOOK_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

interface BatchDraftItem {
  draftId: string;
  rawFileName: string;
  cleanFileName: string;
  title: string;
  author: string;
  genre: BookGenre;
  year?: number;
  description: string;
  sampleContent: string;
  coverUrl: string;
  coverSource: 'page1' | 'embedded' | 'official' | 'canvas' | 'custom';
  fileType: 'pdf' | 'epub' | 'mobi' | 'txt';
  fileSize: string;
  pageCount?: number;
  themeId: CoverThemeId;
  priceUSD: number;
  priceNGN: number;
  formatAvailable: BookFormat;
  included: boolean;
}

interface UploadModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onBookUploaded: (newBook: Book) => void;
  onBooksBatchUploaded?: (newBooks: Book[]) => void;
  currentUser?: User | null;
  existingBooks?: Book[];
}

export const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  onBookUploaded,
  onBooksBatchUploaded,
  currentUser = null,
  existingBooks = [],
}) => {
  const isStoreOwner = isStoreOwnerUser(currentUser);

  // Strict security guard: only the store owner can render/use the Upload Studio
  if (!isStoreOwner) {
    return null;
  }

  // Studio mode: 'batch' (1 to 100+ ebooks / Folder Import) vs 'single' (Single Book Studio)
  const [studioMode, setStudioMode] = useState<'batch' | 'single'>('batch');

  // ---------------------------------------------------------------------------
  // BATCH DEVICE IMPORTER STATE (SUPPORTS 100+ BOOKS AT ONCE)
  // ---------------------------------------------------------------------------
  const [batchItems, setBatchItems] = useState<BatchDraftItem[]>([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [bulkCustomNGN, setBulkCustomNGN] = useState<number>(4500);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentName: string;
  }>({
    current: 0,
    total: 0,
    currentName: '',
  });
  const [isPublishingBatch, setIsPublishingBatch] = useState(false);
  const [isBatchDragOver, setIsBatchDragOver] = useState(false);
  const [activeCoverEditDraftId, setActiveCoverEditDraftId] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  const pendingFilesRef = useRef<Map<string, File>>(new Map());
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const batchFolderInputRef = useRef<HTMLInputElement>(null);
  const batchCoverUploadRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // SINGLE BOOK STUDIO STATE
  // ---------------------------------------------------------------------------
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState<BookGenre>('Self-Help & Personal Growth');
  const [year, setYear] = useState<number | ''>(new Date().getFullYear());
  const [description, setDescription] = useState('');
  const [priceUSD, setPriceUSD] = useState<number>(2.0);
  const [priceNGN, setPriceNGN] = useState<number>(3000);
  const [formatAvailable, setFormatAvailable] = useState<BookFormat>('both');
  const [stockPhysical, setStockPhysical] = useState<number>(15);
  const [sampleContent, setSampleContent] = useState('');

  const [uploadMethod, setUploadMethod] = useState<'device' | 'text' | 'link'>('device');
  const [pasteContent, setPasteContent] = useState('');
  const [externalLink, setExternalLink] = useState('');

  const [fileName, setFileName] = useState('');
  const [cleanFileNamePreview, setCleanFileNamePreview] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'epub' | 'mobi' | 'txt'>('pdf');
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);
  const [singlePageCount, setSinglePageCount] = useState<number | undefined>(undefined);

  const [coverSource, setCoverSource] = useState<'generate' | 'upload' | 'page1' | 'embedded' | 'official'>('generate');
  const [selectedThemeId, setSelectedThemeId] = useState<CoverThemeId>('minimalist-editorial');
  const [coverDataUrl, setCoverDataUrl] = useState<string>('');

  const singlePendingFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate fallback cover preview in Single mode only when designer is active
  useEffect(() => {
    if (coverSource === 'generate') {
      const displayTitle = stripSiteWatermarks(title) || 'Your Book Title';
      const displayAuthor = stripSiteWatermarks(author) || 'Author Name';
      const generated = generateCanvasBookCover({
        title: displayTitle,
        author: displayAuthor,
        genre,
        year: year ? Number(year) : undefined,
        themeId: selectedThemeId,
      });
      setCoverDataUrl(generated);
    }
  }, [title, author, genre, year, selectedThemeId, coverSource]);

  // ---------------------------------------------------------------------------
  // BATCH PROCESSING HANDLERS (1 to 100+ BOOKS)
  // ---------------------------------------------------------------------------
  const processBatchFiles = async (rawFiles: File[]) => {
    if (!rawFiles || rawFiles.length === 0) return;

    const ebookFiles = rawFiles.filter((f) => isLikelyEbookFile(f.name) && !f.name.startsWith('.'));
    const candidates =
      ebookFiles.length > 0 ? ebookFiles : rawFiles.filter((f) => !f.name.startsWith('.'));

    const existingSignatures = new Set(
      batchItems.map((item) => `${item.rawFileName}::${item.fileSize}`)
    );
    const knownTitleKeys = new Set([
      ...existingBooks.map((b) => normalizeBookTitleKey(b.title)),
      ...batchItems.map((b) => normalizeBookTitleKey(b.title)),
    ]);

    let skippedDuplicates = 0;
    const uniqueFiles: File[] = [];
    for (const f of candidates) {
      const sig = `${f.name}::${formatBytes(f.size)}`;
      const parsedNameKey = normalizeBookTitleKey(parseBookFilename(f.name).title);
      if (existingSignatures.has(sig) || (parsedNameKey && knownTitleKeys.has(parsedNameKey))) {
        skippedDuplicates += 1;
        continue;
      }
      if (parsedNameKey) knownTitleKeys.add(parsedNameKey);
      existingSignatures.add(sig);
      uniqueFiles.push(f);
    }

    if (uniqueFiles.length === 0) {
      if (skippedDuplicates > 0) {
        setDuplicateNotice(
          `Skipped ${skippedDuplicates} duplicate book${skippedDuplicates > 1 ? 's' : ''} already in your queue or live on Open Shelf — keeping one copy per title.`
        );
      }
      return;
    }

    setIsAnalyzingBatch(true);
    setBatchProgress({ current: 0, total: uniqueFiles.length, currentName: uniqueFiles[0].name });

    const analyzedDrafts: BatchDraftItem[] = [];
    const seenAnalyzedKeys = new Set([
      ...existingBooks.map((b) => normalizeBookTitleKey(b.title)),
      ...batchItems.map((b) => normalizeBookTitleKey(b.title)),
    ]);
    const CONCURRENCY = 2; // Keeps memory steady even when uploading 100+ PDFs at once
    let completedCount = 0;

    for (let i = 0; i < uniqueFiles.length; i += CONCURRENCY) {
      const slice = uniqueFiles.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        slice.map(async (file, offset) => {
          const idx = i + offset;
          const analyzed = await analyzeDeviceEbookFile(file, 'Independent Author');
          completedCount += 1;
          setBatchProgress({
            current: completedCount,
            total: uniqueFiles.length,
            currentName: analyzed.title,
          });
          const titleKey = normalizeBookTitleKey(analyzed.title);
          if (titleKey && seenAnalyzedKeys.has(titleKey)) {
            skippedDuplicates += 1;
            return null;
          }
          if (titleKey) seenAnalyzedKeys.add(titleKey);

          const draftId = `draft-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
          pendingFilesRef.current.set(draftId, file);

          // Automatically vary prices starting from ₦3,000 ($2.00) upward
          const variedPrice = suggestVariedBookPrice(
            analyzed.title,
            analyzed.genre,
            analyzed.pageCount,
            batchItems.length + idx
          );

          return {
            draftId,
            rawFileName: analyzed.rawFileName,
            cleanFileName: analyzed.cleanFileName,
            title: analyzed.title,
            author: analyzed.author,
            genre: analyzed.genre,
            year: analyzed.year,
            description: analyzed.description,
            sampleContent: analyzed.sampleContent,
            coverUrl: analyzed.coverUrl,
            coverSource: analyzed.coverSource,
            fileType: analyzed.fileType,
            fileSize: analyzed.fileSize,
            pageCount: analyzed.pageCount,
            themeId: analyzed.themeId,
            priceUSD: variedPrice.priceUSD,
            priceNGN: variedPrice.priceNGN,
            formatAvailable: 'both',
            included: true,
          } satisfies BatchDraftItem;
        })
      );
      for (const item of chunkResults) {
        if (item) analyzedDrafts.push(item);
      }
    }

    if (skippedDuplicates > 0) {
      setDuplicateNotice(
        `Skipped ${skippedDuplicates} duplicate book${skippedDuplicates > 1 ? 's' : ''} already in your queue or live on Open Shelf — keeping one copy per title.`
      );
    } else {
      setDuplicateNotice(null);
    }

    setBatchItems((prev) => [...analyzedDrafts, ...prev]);
    setIsAnalyzingBatch(false);
  };

  const handleBatchFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      processBatchFiles(files);
    }
    e.target.value = '';
  };

  const updateBatchDraft = (draftId: string, patch: Partial<BatchDraftItem>) => {
    setBatchItems((prev) =>
      prev.map((item) => {
        if (item.draftId !== draftId) return item;
        const next = { ...item, ...patch };
        if (patch.title !== undefined) {
          next.cleanFileName = buildCleanFileName(patch.title || 'Open_Shelf_Book', next.fileType);
        }
        return next;
      })
    );
  };

  const handleCycleBatchCoverTheme = (item: BatchDraftItem) => {
    const themeIds = COVER_THEMES.map((t) => t.id);
    const nextThemeId = themeIds[(themeIds.indexOf(item.themeId) + 1) % themeIds.length];
    const regeneratedCover = generateCanvasBookCover({
      title: stripSiteWatermarks(item.title) || 'Untitled Edition',
      author: stripSiteWatermarks(item.author) || 'Independent Author',
      genre: item.genre,
      year: item.year,
      themeId: nextThemeId,
    });
    updateBatchDraft(item.draftId, {
      themeId: nextThemeId,
      coverUrl: regeneratedCover,
      coverSource: 'canvas',
    });
  };

  const handleBatchCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = activeCoverEditDraftId;
    e.target.value = '';
    if (!file || !targetId) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        updateBatchDraft(targetId, {
          coverUrl: ev.target.result as string,
          coverSource: 'custom',
        });
      }
      setActiveCoverEditDraftId(null);
    };
    reader.readAsDataURL(file);
  };

  const removeBatchDraft = (draftId: string) => {
    pendingFilesRef.current.delete(draftId);
    setBatchItems((prev) => prev.filter((item) => item.draftId !== draftId));
  };

  const handleVaryAllPrices = () => {
    setBatchItems((prev) =>
      prev.map((item, idx) => {
        const varied = suggestVariedBookPrice(item.title, item.genre, item.pageCount, idx);
        return {
          ...item,
          priceUSD: varied.priceUSD,
          priceNGN: varied.priceNGN,
        };
      })
    );
  };

  const handleApplyBulkCustomPrice = () => {
    const safeNGN = Math.max(3000, Math.round(bulkCustomNGN || 3000));
    const safeUSD = Math.max(2, Number((safeNGN / 1500).toFixed(2)));
    setBatchItems((prev) =>
      prev.map((item) => ({
        ...item,
        priceNGN: safeNGN,
        priceUSD: safeUSD,
      }))
    );
  };

  const handlePublishBatch = async () => {
    const includedDrafts = batchItems.filter((item) => item.included && item.title.trim());
    if (includedDrafts.length === 0) return;

    setIsPublishingBatch(true);
    const today = new Date().toISOString().split('T')[0];
    const publishedBooks: Book[] = [];

    for (let idx = 0; idx < includedDrafts.length; idx++) {
      const draft = includedDrafts[idx];
      const bookId = `book-user-${Date.now()}-${idx}`;
      const cleanTitle = stripSiteWatermarks(draft.title) || 'Untitled Edition';
      const cleanAuthor = stripSiteWatermarks(draft.author) || 'Independent Author';
      const cleanDesc =
        stripSiteWatermarks(draft.description) ||
        `${cleanTitle} by ${cleanAuthor} — available in the ${draft.genre} collection on Open Shelf.`;
      const cleanFileName = buildCleanFileName(cleanTitle, draft.fileType);

      // Enforce minimum ebook pricing floor (₦3,000 / $2.00 upward)
      const finalNGN = Math.max(3000, Math.round(draft.priceNGN || 3000));
      const finalUSD = Math.max(2, Number((draft.priceUSD || finalNGN / 1500).toFixed(2)));

      const pendingFile = pendingFilesRef.current.get(draft.draftId);
      if (pendingFile) {
        await saveBookFileBlob(bookId, pendingFile, cleanFileName);
      }

      const newBook: Book = {
        id: bookId,
        title: cleanTitle,
        author: cleanAuthor,
        genre: draft.genre,
        year: draft.year,
        description: cleanDesc,
        priceUSD: finalUSD,
        priceNGN: finalNGN,
        formatAvailable: draft.formatAvailable,
        coverUrl: draft.coverUrl,
        coverOrigin: draft.coverSource,
        fileSize: draft.fileSize,
        fileType: draft.fileType,
        cleanFileName,
        pageCount: draft.pageCount,
        sampleContent: draft.sampleContent,
        stockPhysical: draft.formatAvailable !== 'ebook' ? 20 : 0,
        uploadedAt: today,
        isUserUploaded: true,
      };
      publishedBooks.push(newBook);
    }

    if (onBooksBatchUploaded) {
      onBooksBatchUploaded(publishedBooks);
    } else {
      publishedBooks.forEach((b) => onBookUploaded(b));
    }

    setIsPublishingBatch(false);
    onClose();
  };

  // Filtered batch items for easy navigation when reviewing 100 books
  const visibleBatchItems = useMemo(() => {
    if (!queueSearch.trim()) return batchItems;
    const q = queueSearch.toLowerCase();
    return batchItems.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.author.toLowerCase().includes(q) ||
        it.genre.toLowerCase().includes(q)
    );
  }, [batchItems, queueSearch]);

  // ---------------------------------------------------------------------------
  // SINGLE BOOK STUDIO HANDLERS
  // ---------------------------------------------------------------------------
  const processSelectedFile = async (file: File) => {
    singlePendingFileRef.current = file;
    setFileName(file.name);
    setFileSize(formatBytes(file.size));
    setFileType(detectFileType(file.name));
    setIsAnalyzingSingle(true);

    try {
      const analyzed = await analyzeDeviceEbookFile(file, 'Independent Author');

      setFileType(analyzed.fileType);
      setFileSize(analyzed.fileSize);
      setCleanFileNamePreview(analyzed.cleanFileName);
      if (analyzed.pageCount) setSinglePageCount(analyzed.pageCount);

      setTitle(analyzed.title);
      if (analyzed.author) setAuthor(analyzed.author);
      setGenre(analyzed.genre);
      if (analyzed.year) setYear(analyzed.year);
      if (!description.trim()) setDescription(analyzed.description);
      if (!sampleContent.trim()) setSampleContent(analyzed.sampleContent);

      // Apply varied starting price >= ₦3,000 ($2)
      const varied = suggestVariedBookPrice(analyzed.title, analyzed.genre, analyzed.pageCount, 1);
      setPriceNGN(varied.priceNGN);
      setPriceUSD(varied.priceUSD);

      // Apply Page 1 / embedded / official cover unless user already uploaded a custom photo
      if (coverSource !== 'upload') {
        if (
          analyzed.coverSource === 'page1' ||
          analyzed.coverSource === 'embedded' ||
          analyzed.coverSource === 'official'
        ) {
          setCoverDataUrl(analyzed.coverUrl);
          setCoverSource(analyzed.coverSource);
        } else {
          setSelectedThemeId(analyzed.themeId);
          setCoverSource('generate');
        }
      }
    } catch (err) {
      console.warn('Single file auto-analysis fallback:', err);
    } finally {
      setIsAnalyzingSingle(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverDataUrl(event.target.result as string);
        setCoverSource('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUSDChange = (val: number) => {
    const safeUSD = Math.max(2, val);
    setPriceUSD(safeUSD);
    setPriceNGN(Math.max(3000, Math.round(safeUSD * 1500)));
  };

  const handleNGNChange = (val: number) => {
    const safeNGN = Math.max(3000, val);
    setPriceNGN(safeNGN);
    setPriceUSD(Math.max(2, Number((safeNGN / 1500).toFixed(2))));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = stripSiteWatermarks(title);
    const cleanAuthor = stripSiteWatermarks(author);
    if (!cleanTitle || !cleanAuthor) return;

    const bookId = `book-user-${Date.now()}`;
    let finalDownloadUrl = fileDataUrl || undefined;
    let finalSample = sampleContent.trim();
    let finalFileSize = fileSize || '2.8 MB';
    let finalFileType = fileType;

    if (uploadMethod === 'text' && pasteContent.trim()) {
      const textBlob = new Blob([pasteContent.trim()], { type: 'text/plain;charset=utf-8' });
      const cleanName = buildCleanFileName(cleanTitle, 'txt');
      await saveBookFileBlob(bookId, textBlob, cleanName);
      if (!finalSample) {
        finalSample = pasteContent.trim().slice(0, 1500);
      }
      finalFileSize = `${Math.max(1, Math.round(pasteContent.length / 1024))} KB`;
      finalFileType = 'txt';
    } else if (uploadMethod === 'link' && externalLink.trim()) {
      finalDownloadUrl = externalLink.trim();
      finalFileSize = 'Cloud Ebook';
    } else if (uploadMethod === 'device' && singlePendingFileRef.current) {
      const cleanName = buildCleanFileName(cleanTitle, finalFileType);
      await saveBookFileBlob(bookId, singlePendingFileRef.current, cleanName);
    }

    const cleanDownloadName = buildCleanFileName(cleanTitle, finalFileType);
    const cleanDesc =
      stripSiteWatermarks(description) ||
      `${cleanTitle} by ${cleanAuthor} — available on Open Shelf for instant digital download and hardcopy courier delivery.`;

    const finalNGN = Math.max(3000, Math.round(priceNGN || 3000));
    const finalUSD = Math.max(2, Number((priceUSD || finalNGN / 1500).toFixed(2)));

    const coverOrigin: Book['coverOrigin'] =
      coverSource === 'upload'
        ? 'custom'
        : coverSource === 'generate'
        ? 'canvas'
        : coverSource;

    const newBook: Book = {
      id: bookId,
      title: cleanTitle,
      author: cleanAuthor,
      genre,
      year: year ? Number(year) : undefined,
      description: cleanDesc,
      priceUSD: finalUSD,
      priceNGN: finalNGN,
      formatAvailable,
      coverUrl: coverDataUrl,
      coverOrigin,
      fileSize: finalFileSize,
      fileType: finalFileType,
      cleanFileName: cleanDownloadName,
      pageCount: singlePageCount,
      downloadUrl: finalDownloadUrl,
      sampleContent:
        finalSample ||
        `PREVIEW EXCERPT — ${cleanTitle.toUpperCase()}\n\nBy ${cleanAuthor}\n\nThis volume is distributed through Open Shelf. Complete digital downloads and hardcopy shipping are unlocked upon checkout.`,
      stockPhysical: formatAvailable !== 'ebook' ? stockPhysical : 0,
      uploadedAt: new Date().toISOString().split('T')[0],
      isUserUploaded: true,
    };

    onBookUploaded(newBook);
    onClose();
  };

  const includedBatchCount = batchItems.filter((item) => item.included && item.title.trim()).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Store Owner Catalog &amp; Batch Ebook Importer
              </h2>
              <p className="text-xs text-stone-500">
                Extracts Page 1 original cover · Strips OceanofPDF tags · Custom NGN/USD pricing from ₦3,000 ($2) upward
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-200/60 transition-colors"
            aria-label="Close upload studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Store Owner Exclusive Status Banner */}
        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-200/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <Crown className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Store Owner Exclusive Upload:</strong> Only your owner account sees and accesses this studio. Batch-upload up to 100+ ebooks at once, set individual NGN/USD prices (₦3,000+), and auto-extract original Page 1 covers.
            </span>
          </div>
          <span className="font-mono text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
            Store Owner Only
          </span>
        </div>

        {/* Top Studio Mode Switcher */}
        <div className="px-6 py-3 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-stone-100 rounded-lg border border-stone-200/70 text-xs">
            <button
              type="button"
              onClick={() => setStudioMode('batch')}
              className={`px-3.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'batch'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch Upload (1–100+ Ebooks / Folder)</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioMode('single')}
              className={`px-3.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'single'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Single Book Studio</span>
            </button>
          </div>

          <span className="text-[11px] text-stone-500 font-mono">
            {studioMode === 'batch'
              ? 'Page 1 original covers + per-book pricing before upload'
              : 'Detailed single book setup'}
          </span>
        </div>

        {/* ===================================================================== */}
        {/* MODE 1: BATCH UPLOAD (SUPPORTS 1 TO 100+ BOOKS WITH PER-BOOK PRICING)  */}
        {/* ===================================================================== */}
        {studioMode === 'batch' ? (
          <div className="overflow-y-auto p-6 space-y-5 flex-1">
            <input
              ref={batchFileInputRef}
              type="file"
              multiple
              accept=".pdf,.epub,.mobi,.azw,.azw3,.txt,.md,.rtf,*/*"
              onChange={handleBatchFilesSelected}
              className="hidden"
            />
            <input
              ref={batchFolderInputRef}
              type="file"
              {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
              multiple
              onChange={handleBatchFilesSelected}
              className="hidden"
            />
            <input
              ref={batchCoverUploadRef}
              type="file"
              accept="image/*"
              onChange={handleBatchCoverFileChange}
              className="hidden"
            />

            {/* Explanation Notice */}
            <div className="p-3.5 rounded-lg bg-[#F7F4EC] border border-[#E8E3D9] text-xs text-stone-700 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">Original Page 1 Covers + Flexible Batch Pricing:</strong>{' '}
                Select up to 100+ ebooks or a full folder below. Open Shelf automatically captures the <strong>original Page 1 cover</strong> from each PDF/EPUB, strips <span className="font-mono text-stone-900">OceanofPDF</span> watermarks, assigns each book to its accurate shelf, and lets you adjust every book&apos;s NGN/USD price (starting from ₦3,000 / $2 upward) before publishing. Hardcopy orders automatically include the city courier delivery fee.
              </div>
            </div>

            {/* Dual Picker Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsBatchDragOver(true);
              }}
              onDragLeave={() => setIsBatchDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsBatchDragOver(false);
                const dropped = Array.from(e.dataTransfer.files || []);
                if (dropped.length > 0) processBatchFiles(dropped);
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                isBatchDragOver
                  ? 'border-stone-900 bg-stone-100'
                  : 'border-stone-300 bg-stone-50/80 hover:bg-stone-100/60'
              }`}
            >
              {isAnalyzingBatch ? (
                <div className="py-4 space-y-3">
                  <Loader2 className="w-8 h-8 mx-auto text-stone-900 animate-spin" />
                  <div>
                    <p className="font-serif text-lg font-bold text-stone-900">
                      Extracting Page 1 covers &amp; cleaning ({batchProgress.current} of {batchProgress.total})
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 truncate max-w-md mx-auto">
                      Reading: {batchProgress.currentName}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      Select 1 to 100+ Ebooks or an Entire Folder from Your Device
                    </h3>
                    <p className="text-xs text-stone-600 max-w-lg mx-auto">
                      Works with PDF, EPUB, MOBI, and TXT files stored on your phone, Downloads, iCloud, or computer.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => batchFileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-amber-200" />
                      <span>Select Multiple Ebooks</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => batchFolderInputRef.current?.click()}
                      className="px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 text-xs font-semibold rounded-md shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4 text-stone-700" />
                      <span>Select Entire Ebooks Folder</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {duplicateNotice && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                <span>{duplicateNotice}</span>
                <button
                  type="button"
                  onClick={() => setDuplicateNotice(null)}
                  className="text-amber-700 hover:text-amber-900 font-semibold shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Batch Queue Review Table / Cards */}
            {batchItems.length > 0 && (
              <div className="space-y-3">
                {/* Bulk Toolbar for 1 to 100+ Books */}
                <div className="p-3.5 bg-stone-100 rounded-lg border border-stone-200 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-stone-900">
                      {includedBatchCount} of {batchItems.length} books selected for publishing
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVaryAllPrices}
                        className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded font-medium flex items-center gap-1 cursor-pointer"
                        title="Automatically vary prices across all books from ₦3,000 ($2) upward"
                      >
                        <Shuffle className="w-3 h-3 text-amber-200" />
                        <span>Vary Prices (₦3k – ₦12.5k)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setBatchItems((prev) =>
                            prev.map((it) => ({ ...it, priceNGN: 3000, priceUSD: 2.0 }))
                          )
                        }
                        className="px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded font-medium cursor-pointer"
                      >
                        Set All ₦3,000 ($2)
                      </button>

                      <button
                        type="button"
                        onClick={() => batchFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded font-medium cursor-pointer"
                      >
                        + Add More
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          pendingFilesRef.current.clear();
                          setBatchItems([]);
                        }}
                        className="px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 rounded font-medium cursor-pointer"
                      >
                        Clear Queue
                      </button>
                    </div>
                  </div>

                  {/* Quick Filter + Custom Bulk Price Bar (ideal for 100+ books) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200/80">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={queueSearch}
                        onChange={(e) => setQueueSearch(e.target.value)}
                        placeholder={`Filter ${batchItems.length} queued books by title or genre...`}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-600 font-medium">Custom all (₦):</span>
                      <input
                        type="number"
                        min="3000"
                        step="500"
                        value={bulkCustomNGN}
                        onChange={(e) => setBulkCustomNGN(Number(e.target.value))}
                        className="w-24 px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded"
                      />
                      <button
                        type="button"
                        onClick={handleApplyBulkCustomPrice}
                        className="px-2.5 py-1 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 rounded font-semibold cursor-pointer"
                      >
                        Apply All
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editable Queue Items */}
                <div className="space-y-3">
                  {visibleBatchItems.map((item) => {
                    const siteTagStripped =
                      item.rawFileName.toLowerCase() !== item.cleanFileName.toLowerCase();
                    return (
                      <div
                        key={item.draftId}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row gap-4 ${
                          item.included
                            ? 'bg-white border-stone-200 shadow-2xs'
                            : 'bg-stone-50/70 border-stone-200/60 opacity-60'
                        }`}
                      >
                        {/* Checkbox & Original Cover Thumbnail */}
                        <div className="flex items-start gap-3 shrink-0">
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={(e) =>
                              updateBatchDraft(item.draftId, { included: e.target.checked })
                            }
                            className="w-4 h-4 mt-1 rounded text-stone-900 border-stone-300 cursor-pointer"
                            aria-label={`Include ${item.title}`}
                          />

                          <div className="space-y-1.5">
                            <div className="relative w-20 aspect-3/4 rounded-xs overflow-hidden book-spine-shadow bg-stone-100 border border-stone-200">
                              <img
                                src={item.coverUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 via-white/10 to-transparent pointer-events-none" />
                            </div>
                            <span className="block text-[10px] font-mono text-center text-stone-600 font-medium">
                              {item.coverSource === 'page1'
                                ? 'Page 1 Cover'
                                : item.coverSource === 'embedded'
                                ? 'Original Cover'
                                : item.coverSource === 'official'
                                ? 'Official Cover'
                                : item.coverSource === 'custom'
                                ? 'Custom Photo'
                                : 'Studio Cover'}
                            </span>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCoverEditDraftId(item.draftId);
                                  batchCoverUploadRef.current?.click();
                                }}
                                className="p-1 text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded"
                                title="Upload custom cover photo"
                              >
                                <ImagePlus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCycleBatchCoverTheme(item)}
                                className="p-1 text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded"
                                title="Switch generated cover style"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Metadata & Per-Book Price Controls */}
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-stone-600 block mb-0.5">
                                Book Title (Cleaned)
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) =>
                                  updateBatchDraft(item.draftId, { title: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs font-semibold text-stone-900 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-stone-600 block mb-0.5">
                                Author
                              </label>
                              <input
                                type="text"
                                value={item.author}
                                onChange={(e) =>
                                  updateBatchDraft(item.draftId, { author: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 text-xs text-stone-800 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            {/* Auto Genre Shelf */}
                            <div className="sm:col-span-4">
                              <label className="text-[11px] font-semibold text-stone-600 block mb-0.5">
                                Auto-Detected Shelf Genre
                              </label>
                              <select
                                value={item.genre}
                                onChange={(e) =>
                                  updateBatchDraft(item.draftId, { genre: e.target.value as BookGenre })
                                }
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                              >
                                {ALL_GENRES.map((g) => (
                                  <option key={g} value={g}>
                                    {g}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Edition Options (Ebook + Hardcopy with delivery fee) */}
                            <div className="sm:col-span-3">
                              <label className="text-[11px] font-semibold text-stone-600 block mb-0.5">
                                Formats Offered
                              </label>
                              <select
                                value={item.formatAvailable}
                                onChange={(e) =>
                                  updateBatchDraft(item.draftId, {
                                    formatAvailable: e.target.value as BookFormat,
                                  })
                                }
                                className="w-full px-2 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                              >
                                <option value="both">Ebook + Hardcopy</option>
                                <option value="ebook">Ebook Only</option>
                              </select>
                            </div>

                            {/* Individual Price Controls (NGN ₦3,000+ & USD $2+) */}
                            <div className="sm:col-span-4 grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">
                                  Ebook NGN (₦3k+)
                                </label>
                                <input
                                  type="number"
                                  min="3000"
                                  step="500"
                                  value={item.priceNGN}
                                  onChange={(e) => {
                                    const ngn = Number(e.target.value) || 0;
                                    updateBatchDraft(item.draftId, {
                                      priceNGN: ngn,
                                      priceUSD: Number((ngn / 1500).toFixed(2)),
                                    });
                                  }}
                                  onBlur={(e) => {
                                    const safeNGN = Math.max(3000, Number(e.target.value) || 3000);
                                    updateBatchDraft(item.draftId, {
                                      priceNGN: safeNGN,
                                      priceUSD: Math.max(2, Number((safeNGN / 1500).toFixed(2))),
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 text-xs font-mono font-semibold border border-stone-300 rounded bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-stone-600 block mb-0.5">
                                  Ebook USD ($2+)
                                </label>
                                <input
                                  type="number"
                                  min="2"
                                  step="0.5"
                                  value={item.priceUSD}
                                  onChange={(e) => {
                                    const usd = Number(e.target.value) || 0;
                                    updateBatchDraft(item.draftId, {
                                      priceUSD: usd,
                                      priceNGN: Math.round(usd * 1500),
                                    });
                                  }}
                                  onBlur={(e) => {
                                    const safeUSD = Math.max(2, Number(e.target.value) || 2);
                                    updateBatchDraft(item.draftId, {
                                      priceUSD: safeUSD,
                                      priceNGN: Math.max(3000, Math.round(safeUSD * 1500)),
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 text-xs font-mono font-semibold border border-stone-300 rounded bg-white"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeBatchDraft(item.draftId)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Remove from import queue"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* One-Click Per-Book Quick Price Chips */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-stone-500 font-medium mr-1">
                              Quick price:
                            </span>
                            {QUICK_PRICE_PRESETS_NGN.map((presetNgn) => (
                              <button
                                key={presetNgn}
                                type="button"
                                onClick={() =>
                                  updateBatchDraft(item.draftId, {
                                    priceNGN: presetNgn,
                                    priceUSD: Number((presetNgn / 1500).toFixed(2)),
                                  })
                                }
                                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                                  item.priceNGN === presetNgn
                                    ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                ₦{presetNgn.toLocaleString()} (${(presetNgn / 1500).toFixed(0)})
                              </button>
                            ))}
                          </div>

                          {/* Cleaned Filename Verification Line */}
                          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 font-mono">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate text-stone-700 font-medium">
                                Store file: {item.cleanFileName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {siteTagStripped && (
                                <span className="text-emerald-700 font-sans font-medium">
                                  Source watermark removed
                                </span>
                              )}
                              <span>
                                {item.fileType.toUpperCase()} · {item.fileSize}
                                {item.pageCount ? ` · ${item.pageCount}p` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Batch Footer Actions */}
            <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Full PDF/EPUB files &amp; Page 1 covers saved ready for instant delivery</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={includedBatchCount === 0 || isPublishingBatch || isAnalyzingBatch}
                  onClick={handlePublishBatch}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isPublishingBatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing Books...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        Publish {includedBatchCount > 0 ? `${includedBatchCount} ` : ''}
                        {includedBatchCount === 1 ? 'Book' : 'Books'} to Open Shelf
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* MODE 2: SINGLE BOOK STUDIO                                          */
          /* =================================================================== */
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <FileUp className="w-4 h-4 text-stone-800" />
                  <span>Select Ebook File from Device</span>
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  Captures Page 1 cover &amp; cleans OceanofPDF tags
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setUploadMethod('device')}
                  className={`py-2 px-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    uploadMethod === 'device'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="truncate">File on Device</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('text')}
                  className={`py-2 px-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    uploadMethod === 'text'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate">Paste Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('link')}
                  className={`py-2 px-2.5 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    uploadMethod === 'link'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span className="truncate">Drive / Link</span>
                </button>
              </div>

              {uploadMethod === 'device' && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processSelectedFile(file);
                  }}
                  className={`relative border-2 border-dashed rounded-lg p-5 text-center transition-all ${
                    isDragOver
                      ? 'border-stone-900 bg-stone-100'
                      : fileName
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : 'border-stone-300 bg-stone-50 hover:bg-stone-100/70'
                  }`}
                >
                  <input
                    id="ebook-file-input"
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    aria-label="Upload ebook file"
                  />

                  {fileName ? (
                    <div className="relative z-30 bg-white p-4 rounded-lg border border-emerald-200 shadow-xs max-w-xl mx-auto text-left pointer-events-auto">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-md bg-stone-900 text-white flex items-center justify-center font-mono text-xs font-bold uppercase shrink-0">
                            {isAnalyzingSingle ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              fileType
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-stone-900 truncate block">
                                {cleanFileNamePreview || fileName}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
                                <Check className="w-3 h-3" />{' '}
                                {isAnalyzingSingle ? 'Extracting Page 1...' : 'Cleaned & Ready'}
                              </span>
                            </div>
                            <span className="text-xs text-stone-500 font-mono mt-0.5 block">
                              {fileSize} · Saved cleanly without download-site watermarks
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            singlePendingFileRef.current = null;
                            setFileName('');
                            setCleanFileNamePreview('');
                            setFileSize('');
                            setFileDataUrl('');
                          }}
                          className="px-3.5 py-1.5 text-xs text-stone-700 hover:text-stone-950 font-semibold bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition-colors text-center shrink-0 cursor-pointer"
                        >
                          Remove / Choose Another
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 py-3 select-none pointer-events-none">
                      <div className="w-13 h-13 mx-auto rounded-full bg-stone-900 text-white flex items-center justify-center shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-serif font-bold text-stone-900">
                          Tap anywhere here to select an ebook file
                        </p>
                        <p className="text-xs text-stone-600 max-w-md mx-auto">
                          Automatically extracts the original Page 1 cover, removes OceanofPDF tags, and detects shelf category.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {uploadMethod === 'text' && (
                <div className="bg-stone-50 border border-stone-300 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900">
                      Paste Book Chapters / Text Directly
                    </span>
                    {pasteContent.trim() && (
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {pasteContent.trim().split(/\s+/).length} words
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={5}
                    value={pasteContent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPasteContent(val);
                      setFileType('txt');
                      if (!title && val.trim()) {
                        const firstLine = val.trim().split('\n')[0].replace(/^[#*\s]+/, '').slice(0, 60);
                        if (firstLine.length > 3) setTitle(firstLine);
                      }
                    }}
                    placeholder="Paste book text here..."
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-serif leading-relaxed"
                  />
                </div>
              )}

              {uploadMethod === 'link' && (
                <div className="bg-stone-50 border border-stone-300 rounded-lg p-4 space-y-3">
                  <span className="text-xs font-semibold text-stone-900 block">
                    Google Drive, Dropbox, or Direct Ebook Link
                  </span>
                  <input
                    type="url"
                    value={externalLink}
                    onChange={(e) => {
                      setExternalLink(e.target.value);
                      if (e.target.value.toLowerCase().includes('.pdf')) setFileType('pdf');
                      else if (e.target.value.toLowerCase().includes('.epub')) setFileType('epub');
                    }}
                    placeholder="https://drive.google.com/file/d/... or direct .pdf/.epub URL"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Book Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Atomic Habits"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Author Name *
                </label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. James Clear"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Genre / Shelf Category
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value as BookGenre)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                >
                  {ALL_GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700">
                    Publication Year (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setYear(new Date().getFullYear())}
                    className="text-[11px] text-stone-500 hover:text-stone-800 underline"
                  >
                    Use Current Year
                  </button>
                </div>
                <input
                  type="number"
                  min="1800"
                  max="2030"
                  value={year}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
                  placeholder="2026"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                />
              </div>
            </div>

            {/* Pricing Setup (Minimum $2 / ₦3,000 upward + Hardcopy Courier Option) */}
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-4">
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Pricing &amp; Distribution (Minimum ₦3,000 / $2.00)
                </span>
                <span className="text-xs text-stone-500">
                  Set ebook price starting from ₦3,000 ($2) upward. Hardcopy buyers automatically pay the city courier delivery fee at checkout.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Ebook Price in USD ($2.00+)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-stone-400 font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      value={priceUSD}
                      onChange={(e) => setPriceUSD(Number(e.target.value))}
                      onBlur={(e) => handleUSDChange(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Ebook Price in NGN (₦3,000+)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-stone-400 font-mono">
                      ₦
                    </span>
                    <input
                      type="number"
                      step="500"
                      min="3000"
                      value={priceNGN}
                      onChange={(e) => setPriceNGN(Number(e.target.value))}
                      onBlur={(e) => handleNGNChange(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_PRICE_PRESETS_NGN.map((presetNgn) => (
                  <button
                    key={presetNgn}
                    type="button"
                    onClick={() => handleNGNChange(presetNgn)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border cursor-pointer ${
                      priceNGN === presetNgn
                        ? 'bg-stone-900 text-white border-stone-900 font-semibold'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    ₦{presetNgn.toLocaleString()} (${(presetNgn / 1500).toFixed(0)})
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Available Formats
                  </label>
                  <select
                    value={formatAvailable}
                    onChange={(e) => setFormatAvailable(e.target.value as BookFormat)}
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                  >
                    <option value="both">Both Digital Ebook &amp; Hardcopy (+ Delivery Fee)</option>
                    <option value="ebook">Digital Ebook Only (Instant Download)</option>
                    <option value="print">Hardcopy Only (City Delivery Fee Applies)</option>
                  </select>
                </div>

                {formatAvailable !== 'ebook' && (
                  <div>
                    <label className="text-xs font-medium text-stone-600 block mb-1">
                      Physical Hardcopy Stock Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={stockPhysical}
                      onChange={(e) => setStockPhysical(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Cover Preview & Optional Override */}
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-stone-800" />
                    <span>Original Page 1 Cover Preview</span>
                  </span>
                  <span className="text-xs text-stone-500">
                    Automatically captured from the first page of your ebook, or upload/customize if needed
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-md text-xs">
                  <button
                    type="button"
                    onClick={() => setCoverSource('generate')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      coverSource === 'generate' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Studio Designer
                  </button>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      coverSource === 'upload' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Upload Photo
                  </button>
                </div>
              </div>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-4 flex flex-col items-center gap-1.5">
                  <div className="w-36 aspect-3/4 rounded-xs overflow-hidden book-spine-shadow bg-stone-200 border border-stone-300 relative">
                    {coverDataUrl ? (
                      <img
                        src={coverDataUrl}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                        Generating...
                      </div>
                    )}
                    <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/25 via-white/10 to-transparent pointer-events-none" />
                  </div>
                  {(coverSource === 'page1' || coverSource === 'embedded' || coverSource === 'official') && (
                    <span className="text-[11px] font-mono text-emerald-700 font-medium">
                      {coverSource === 'page1'
                        ? 'Extracted from PDF Page 1'
                        : coverSource === 'embedded'
                        ? 'Extracted Original EPUB Cover'
                        : 'Matched Official Cover'}
                    </span>
                  )}
                </div>

                <div className="sm:col-span-8 space-y-3">
                  <span className="text-xs font-semibold text-stone-700 block">
                    Fallback Studio Cover Style (if needed):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COVER_THEMES.map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          setSelectedThemeId(th.id);
                          setCoverSource('generate');
                        }}
                        className={`p-2.5 text-left rounded-md border text-xs transition-all flex items-center gap-2 ${
                          selectedThemeId === th.id && coverSource === 'generate'
                            ? 'border-stone-900 bg-white ring-1 ring-stone-900 font-semibold'
                            : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: th.bgFill }}
                        />
                        <span className="truncate">{th.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Synopsis */}
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Book Synopsis / Overview
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Book summary for shoppers..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 leading-relaxed"
              />
            </div>

            {/* Submission bar */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Full ebook binary &amp; Page 1 cover persisted cleanly</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Publish to Open Shelf</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
