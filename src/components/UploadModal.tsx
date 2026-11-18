import React, { useState, useRef, useEffect } from 'react';
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
  ShieldCheck,
  AlertTriangle,
  Crown,
  FolderOpen,
  Layers,
  Trash2,
  Loader2,
  ImagePlus,
  RefreshCw,
} from 'lucide-react';
import { generateCanvasBookCover, COVER_THEMES, CoverThemeId } from '../services/coverGenerator';
import { isStoreOwnerUser } from '../services/storage';
import {
  analyzeDeviceEbookFile,
  buildCleanFileName,
  stripSiteWatermarks,
  detectFileType,
  formatBytes,
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
  coverSource: 'embedded' | 'official' | 'canvas' | 'custom';
  fileType: 'pdf' | 'epub' | 'mobi' | 'txt';
  fileSize: string;
  pageCount?: number;
  themeId: CoverThemeId;
  isFree: boolean;
  priceUSD: number;
  priceNGN: number;
  included: boolean;
}

interface UploadModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onBookUploaded: (newBook: Book) => void;
  onBooksBatchUploaded?: (newBooks: Book[]) => void;
  currentUser?: User | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  onBookUploaded,
  onBooksBatchUploaded,
  currentUser = null,
}) => {
  const isStoreOwner = isStoreOwnerUser(currentUser);

  // Studio mode: 'batch' (Smart Device / Folder Import) vs 'single' (Single Book Studio)
  const [studioMode, setStudioMode] = useState<'batch' | 'single'>('batch');

  // Shared authorship declaration state
  const [declaredOriginalWork, setDeclaredOriginalWork] = useState(false);
  const [declarationError, setDeclarationError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // BATCH DEVICE IMPORTER STATE
  // ---------------------------------------------------------------------------
  const [batchItems, setBatchItems] = useState<BatchDraftItem[]>([]);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: '',
  });
  const [isPublishingBatch, setIsPublishingBatch] = useState(false);
  const [isBatchDragOver, setIsBatchDragOver] = useState(false);
  const [activeCoverEditDraftId, setActiveCoverEditDraftId] = useState<string | null>(null);

  const pendingFilesRef = useRef<Map<string, File>>(new Map());
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const batchFolderInputRef = useRef<HTMLInputElement>(null);
  const batchCoverUploadRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // SINGLE BOOK STUDIO STATE
  // ---------------------------------------------------------------------------
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState(() => (isStoreOwner ? '' : currentUser?.name || ''));
  const [genre, setGenre] = useState<BookGenre>('Self-Help & Personal Growth');
  const [year, setYear] = useState<number | ''>(new Date().getFullYear());
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [priceUSD, setPriceUSD] = useState<number>(5.0);
  const [priceNGN, setPriceNGN] = useState<number>(7500);
  const [formatAvailable, setFormatAvailable] = useState<BookFormat>('both');
  const [stockPhysical, setStockPhysical] = useState<number>(10);
  const [sampleContent, setSampleContent] = useState('');

  const [uploadMethod, setUploadMethod] = useState<'device' | 'text' | 'link'>('device');
  const [pasteContent, setPasteContent] = useState('');
  const [externalLink, setExternalLink] = useState('');

  const [fileName, setFileName] = useState('');
  const [cleanFileNamePreview, setCleanFileNamePreview] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'epub' | 'mobi' | 'txt'>('epub');
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);
  const [singlePageCount, setSinglePageCount] = useState<number | undefined>(undefined);

  const [coverSource, setCoverSource] = useState<'generate' | 'upload' | 'extracted'>('generate');
  const [selectedThemeId, setSelectedThemeId] = useState<CoverThemeId>('minimalist-editorial');
  const [coverDataUrl, setCoverDataUrl] = useState<string>('');

  const singlePendingFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate cover preview in Single mode when title, author, or theme changes
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
  // BATCH PROCESSING HANDLERS
  // ---------------------------------------------------------------------------
  const processBatchFiles = async (rawFiles: File[]) => {
    if (!rawFiles || rawFiles.length === 0) return;

    // Prefer genuine ebook files when scanning folders, but keep explicit single/multi picks if no extension matched
    const ebookFiles = rawFiles.filter((f) => isLikelyEbookFile(f.name) && !f.name.startsWith('.'));
    const candidates = ebookFiles.length > 0 ? ebookFiles : rawFiles.filter((f) => !f.name.startsWith('.'));

    // Deduplicate against existing queue items
    const existingSignatures = new Set(
      batchItems.map((item) => `${item.rawFileName}::${item.fileSize}`)
    );
    const uniqueFiles = candidates.filter(
      (f) => !existingSignatures.has(`${f.name}::${formatBytes(f.size)}`)
    );

    if (uniqueFiles.length === 0) return;

    setIsAnalyzingBatch(true);
    setBatchProgress({ current: 0, total: uniqueFiles.length, currentName: uniqueFiles[0].name });

    const defaultFallbackAuthor = isStoreOwner
      ? 'Independent Author'
      : currentUser?.name || 'Independent Author';

    const analyzedDrafts: BatchDraftItem[] = [];
    const CONCURRENCY = 2;
    let completedCount = 0;

    for (let i = 0; i < uniqueFiles.length; i += CONCURRENCY) {
      const slice = uniqueFiles.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        slice.map(async (file, offset) => {
          const analyzed = await analyzeDeviceEbookFile(file, defaultFallbackAuthor);
          completedCount += 1;
          setBatchProgress({
            current: completedCount,
            total: uniqueFiles.length,
            currentName: analyzed.title,
          });
          const draftId = `draft-${Date.now()}-${i + offset}-${Math.random().toString(36).slice(2, 7)}`;
          pendingFilesRef.current.set(draftId, file);

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
            isFree: false,
            priceUSD: 5.0,
            priceNGN: 7500,
            included: true,
          } satisfies BatchDraftItem;
        })
      );
      analyzedDrafts.push(...chunkResults);
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

  const handlePublishBatch = async () => {
    const includedDrafts = batchItems.filter((item) => item.included && item.title.trim());
    if (includedDrafts.length === 0) return;

    if (!isStoreOwner && !declaredOriginalWork) {
      setDeclarationError(
        'Author Protection Policy: You must certify that these books are your own original work before publishing.'
      );
      return;
    }

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
        `${cleanTitle} by ${cleanAuthor} — curated in the ${draft.genre} collection on Open Shelf.`;
      const cleanFileName = buildCleanFileName(cleanTitle, draft.fileType);

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
        priceUSD: draft.isFree ? 0 : draft.priceUSD,
        priceNGN: draft.isFree ? 0 : draft.priceNGN,
        formatAvailable: 'ebook',
        coverUrl: draft.coverUrl,
        fileSize: draft.fileSize,
        fileType: draft.fileType,
        cleanFileName,
        pageCount: draft.pageCount,
        sampleContent: draft.sampleContent,
        stockPhysical: 0,
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
      const analyzed = await analyzeDeviceEbookFile(
        file,
        isStoreOwner ? 'Independent Author' : currentUser?.name || 'Independent Author'
      );

      setFileType(analyzed.fileType);
      setFileSize(analyzed.fileSize);
      setCleanFileNamePreview(analyzed.cleanFileName);
      if (analyzed.pageCount) setSinglePageCount(analyzed.pageCount);

      // Cleanly populate fields without OceanofPDF watermarks
      setTitle(analyzed.title);
      if (analyzed.author && (isStoreOwner || !author.trim())) {
        setAuthor(analyzed.author);
      }
      setGenre(analyzed.genre);
      if (analyzed.year) setYear(analyzed.year);
      if (!description.trim()) setDescription(analyzed.description);
      if (!sampleContent.trim()) setSampleContent(analyzed.sampleContent);

      // Apply extracted embedded or official cover unless user already uploaded a custom photo
      if (coverSource !== 'upload') {
        if (analyzed.coverSource === 'embedded' || analyzed.coverSource === 'official') {
          setCoverDataUrl(analyzed.coverUrl);
          setCoverSource('extracted');
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
    setPriceUSD(val);
    setPriceNGN(Math.round(val * 1500));
  };

  const handleNGNChange = (val: number) => {
    setPriceNGN(val);
    setPriceUSD(Number((val / 1500).toFixed(2)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = stripSiteWatermarks(title);
    const cleanAuthor = stripSiteWatermarks(author);
    if (!cleanTitle || !cleanAuthor) return;

    if (!isStoreOwner && !declaredOriginalWork) {
      setDeclarationError(
        'Author Protection Policy: You must certify that this is your own original work before publishing.'
      );
      return;
    }

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
      `${cleanTitle} is an independent publication by ${cleanAuthor}, available for immediate digital reading and distribution.`;

    const newBook: Book = {
      id: bookId,
      title: cleanTitle,
      author: cleanAuthor,
      genre,
      year: year ? Number(year) : undefined,
      description: cleanDesc,
      priceUSD: isFree ? 0 : priceUSD,
      priceNGN: isFree ? 0 : priceNGN,
      formatAvailable,
      coverUrl: coverDataUrl,
      fileSize: finalFileSize,
      fileType: finalFileType,
      cleanFileName: cleanDownloadName,
      pageCount: singlePageCount,
      downloadUrl: finalDownloadUrl,
      sampleContent:
        finalSample ||
        `PREVIEW EXCERPT — ${cleanTitle.toUpperCase()}\n\nBy ${cleanAuthor}\n\nThis volume is distributed directly to readers through Open Shelf. All digital reading rights and instant downloads are unlocked upon checkout.`,
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
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Smart Device Library &amp; Author Studio
              </h2>
              <p className="text-xs text-stone-500">
                Auto-strips OceanofPDF/site tags · Extracts real covers · Places books on accurate shelves
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

        {/* Ownership Status Banner */}
        {isStoreOwner ? (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <Crown className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Store Owner Master Rights:</strong> You have full distributor authority to batch-import any ebooks from your device and place them across all shelves.
              </span>
            </div>
            <span className="font-mono text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
              Admin Distributor
            </span>
          </div>
        ) : (
          <div className="px-6 py-2.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-800 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Author Protection Policy:</strong> You may only publish books that are your own original work. Curating third-party books is reserved for the store administrator.
              </span>
            </div>
            <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
              Original Works Only
            </span>
          </div>
        )}

        {/* Top Studio Mode Switcher */}
        <div className="px-6 py-3 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-stone-100 rounded-lg border border-stone-200/70 text-xs">
            <button
              type="button"
              onClick={() => {
                setStudioMode('batch');
                setDeclarationError(null);
              }}
              className={`px-3.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'batch'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Smart Batch Import (Phone / Folder)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudioMode('single');
                setDeclarationError(null);
              }}
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
              ? 'Select multiple PDF/EPUB files or a full folder'
              : 'Craft metadata, pricing & custom cover'}
          </span>
        </div>

        {/* ===================================================================== */}
        {/* MODE 1: SMART BATCH DEVICE & FOLDER IMPORTER                          */}
        {/* ===================================================================== */}
        {studioMode === 'batch' ? (
          <div className="overflow-y-auto p-6 space-y-5 flex-1">
            {/* Hidden file / folder inputs + per-row cover uploader */}
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

            {/* Privacy + Automation Explanation */}
            <div className="p-3.5 rounded-lg bg-[#F7F4EC] border border-[#E8E3D9] text-xs text-stone-700 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">1-Tap Auto-Import &amp; Filename Cleaner:</strong>{' '}
                Browsers protect your privacy until you tap a folder or file picker below. Once selected, Open Shelf automatically strips <span className="font-mono text-stone-900">OceanofPDF.com</span> and download tags from every title and file, retrieves or extracts each book&apos;s real cover, and shelves every book under its right category.
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
                      Cleaning filenames &amp; matching covers ({batchProgress.current} of {batchProgress.total})
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 truncate max-w-md mx-auto">
                      Inspecting: {batchProgress.currentName}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      Select Ebooks or an Entire Folder from Your Device
                    </h3>
                    <p className="text-xs text-stone-600 max-w-lg mx-auto">
                      Pick all your EPUB or PDF files at once from Phone Storage, Downloads, iCloud, or Google Drive. Full book files stay stored ready for instant reading &amp; clean downloads.
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

            {/* Batch Queue Review Table / Cards */}
            {batchItems.length > 0 && (
              <div className="space-y-3">
                {/* Bulk Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-100 rounded-lg border border-stone-200 text-xs">
                  <div className="font-semibold text-stone-900">
                    {includedBatchCount} of {batchItems.length} books ready to publish
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBatchItems((prev) => prev.map((it) => ({ ...it, isFree: true })))
                      }
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium cursor-pointer"
                    >
                      Set All Free ($0)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBatchItems((prev) =>
                          prev.map((it) => ({ ...it, isFree: false, priceUSD: 5, priceNGN: 7500 }))
                        )
                      }
                      className="px-2.5 py-1 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded font-medium cursor-pointer"
                    >
                      Set All $5 / ₦7,500
                    </button>
                    <button
                      type="button"
                      onClick={() => batchFileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 rounded font-medium cursor-pointer"
                    >
                      + Add More
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pendingFilesRef.current.clear();
                        setBatchItems([]);
                      }}
                      className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 rounded font-medium cursor-pointer"
                    >
                      Clear Queue
                    </button>
                  </div>
                </div>

                {/* Editable Queue Items */}
                <div className="space-y-3">
                  {batchItems.map((item) => {
                    const siteTagStripped = item.rawFileName.toLowerCase() !== item.cleanFileName.toLowerCase();
                    return (
                      <div
                        key={item.draftId}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row gap-4 ${
                          item.included
                            ? 'bg-white border-stone-200 shadow-2xs'
                            : 'bg-stone-50/70 border-stone-200/60 opacity-60'
                        }`}
                      >
                        {/* Checkbox & Cover Thumbnail */}
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
                            <span className="block text-[10px] font-mono text-center text-stone-500">
                              {item.coverSource === 'embedded'
                                ? 'Embedded'
                                : item.coverSource === 'official'
                                ? 'Official'
                                : item.coverSource === 'custom'
                                ? 'Custom'
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

                        {/* Metadata Editor Fields */}
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
                            <div className="sm:col-span-5">
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

                            {/* Pricing */}
                            <div className="sm:col-span-6 flex items-center gap-2">
                              <label className="flex items-center gap-1.5 text-xs font-medium text-stone-700 cursor-pointer shrink-0 pt-3">
                                <input
                                  type="checkbox"
                                  checked={item.isFree}
                                  onChange={(e) =>
                                    updateBatchDraft(item.draftId, { isFree: e.target.checked })
                                  }
                                  className="w-3.5 h-3.5 rounded text-stone-900"
                                />
                                <span>Free</span>
                              </label>

                              {!item.isFree && (
                                <div className="grid grid-cols-2 gap-2 flex-1">
                                  <div>
                                    <label className="text-[10px] text-stone-500 block">USD ($)</label>
                                    <input
                                      type="number"
                                      min="1"
                                      step="0.5"
                                      value={item.priceUSD}
                                      onChange={(e) => {
                                        const usd = Number(e.target.value) || 0;
                                        updateBatchDraft(item.draftId, {
                                          priceUSD: usd,
                                          priceNGN: Math.round(usd * 1500),
                                        });
                                      }}
                                      className="w-full px-2 py-1 text-xs font-mono border border-stone-300 rounded"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-stone-500 block">NGN (₦)</label>
                                    <input
                                      type="number"
                                      min="500"
                                      step="500"
                                      value={item.priceNGN}
                                      onChange={(e) => {
                                        const ngn = Number(e.target.value) || 0;
                                        updateBatchDraft(item.draftId, {
                                          priceNGN: ngn,
                                          priceUSD: Number((ngn / 1500).toFixed(2)),
                                        });
                                      }}
                                      className="w-full px-2 py-1 text-xs font-mono border border-stone-300 rounded"
                                    />
                                  </div>
                                </div>
                              )}
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

            {/* Authorship Certification for Non-Owners */}
            {!isStoreOwner && batchItems.length > 0 && (
              <div className="p-4 bg-amber-50/80 rounded-lg border border-amber-200/90 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={declaredOriginalWork}
                    onChange={(e) => {
                      setDeclaredOriginalWork(e.target.checked);
                      if (e.target.checked) setDeclarationError(null);
                    }}
                    className="w-4 h-4 mt-0.5 rounded text-stone-900 border-stone-300 focus:ring-stone-800 cursor-pointer"
                  />
                  <span className="text-xs text-stone-800 leading-relaxed">
                    <strong className="font-bold text-stone-900 block mb-0.5">
                      Original Authorship &amp; Copyright Certification (Mandatory):
                    </strong>
                    I declare and certify that I am the sole author and legitimate copyright owner of all selected books in this queue.
                  </span>
                </label>
                {declarationError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{declarationError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Batch Footer Actions */}
            <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Full PDF/EPUB binaries stored offline in your browser library</span>
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
            {/* Section 1: Multiple Upload Methods for Phone & Computer */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <FileUp className="w-4 h-4 text-stone-800" />
                  <span>Upload or Add Your Ebook Content</span>
                </span>
                <span className="text-[11px] text-stone-500 font-mono">Auto-cleans OceanofPDF tags</span>
              </div>

              {/* Method Tabs */}
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
                  <span className="truncate">File on Phone</span>
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

              {/* TAB 1: DEVICE FILE PICKER */}
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
                                {isAnalyzingSingle ? 'Analyzing...' : 'Cleaned & Ready'}
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
                          Automatically removes OceanofPDF tags, detects genre, and fills in cover &amp; details.
                        </p>
                        <div className="pt-1.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-stone-500 font-mono">
                          <span className="bg-stone-200/80 px-2 py-0.5 rounded">EPUB</span>
                          <span className="bg-stone-200/80 px-2 py-0.5 rounded">PDF</span>
                          <span className="bg-stone-200/80 px-2 py-0.5 rounded">MOBI</span>
                          <span className="bg-stone-200/80 px-2 py-0.5 rounded">TXT</span>
                          <span className="bg-stone-200/80 px-2 py-0.5 rounded">Any file (*.*)</span>
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-md shadow-xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tap to Browse Phone Files</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {!fileName && (
                    <div className="mt-4 pt-3 border-t border-stone-200/70 flex flex-col sm:flex-row items-center justify-center gap-2 relative z-30">
                      <span className="text-[11px] text-stone-500 font-medium">
                        Direct phone browser button:
                      </span>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="text-xs text-stone-700 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-stone-200 file:text-stone-800 hover:file:bg-stone-300 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PASTE BOOK MANUSCRIPT / CHAPTER TEXT */}
              {uploadMethod === 'text' && (
                <div className="bg-stone-50 border border-stone-300 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-stone-700" />
                      <span className="text-xs font-semibold text-stone-900">
                        Paste Book Chapters / Text Directly
                      </span>
                    </div>
                    {pasteContent.trim() && (
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {pasteContent.trim().split(/\s+/).length} words · ~{Math.max(1, Math.round(pasteContent.length / 1024))} KB
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600">
                    Ideal if your manuscript is in your phone&apos;s Notes app, Google Docs, or email. Open Shelf will turn it into a downloadable digital book.
                  </p>
                  <textarea
                    rows={6}
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
                    placeholder="Paste your prologue, chapters, poetry, or full manuscript here..."
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-serif leading-relaxed"
                  />
                </div>
              )}

              {/* TAB 3: CLOUD STORAGE OR PUBLIC LINK */}
              {uploadMethod === 'link' && (
                <div className="bg-stone-50 border border-stone-300 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-stone-700" />
                    <span className="text-xs font-semibold text-stone-900">
                      Google Drive, Dropbox, or Direct Ebook Link
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Have your file hosted on Google Drive, Dropbox, iCloud, or your website? Paste the shareable link below so buyers and readers can download it.
                  </p>
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

            {/* Section 2: Book Details & Pricing */}
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
                  placeholder="e.g. Echoes Across the River"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {isStoreOwner ? 'Author Name *' : 'Author Name (Your Original Creator Name) *'}
                  </label>
                  {!isStoreOwner && (
                    <span className="text-[11px] text-amber-800 font-medium">
                      Original work only
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={
                    isStoreOwner
                      ? 'e.g. Walter Isaacson, Chinua Achebe, or your name'
                      : 'Your true author or pen name'
                  }
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  {isStoreOwner
                    ? 'Master distributor privileges: you may enter any author name.'
                    : 'Must match your true original creator identity. Distributing third-party books is prohibited.'}
                </p>
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
                  placeholder="Leave blank or enter year (e.g. 2026)"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono"
                />
              </div>
            </div>

            {/* Pricing Setup */}
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-900 block">Pricing &amp; Distribution</span>
                  <span className="text-xs text-stone-500">
                    Offer as a free digital gift or sell worldwide via Paystack
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="w-4 h-4 rounded text-stone-900 focus:ring-stone-800"
                  />
                  <span>Distribute for Free ($0)</span>
                </label>
              </div>

              {!isFree && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200">
                  <div>
                    <label className="text-xs font-medium text-stone-600 block mb-1">
                      Price in USD ($) — for International Cards
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-stone-400 font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={priceUSD}
                        onChange={(e) => handleUSDChange(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono font-semibold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 block mb-1">
                      Price in NGN (₦) — Paystack Domestic
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-stone-400 font-mono">
                        ₦
                      </span>
                      <input
                        type="number"
                        step="500"
                        min="500"
                        value={priceNGN}
                        onChange={(e) => handleNGNChange(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                    <option value="both">Both Digital Ebook &amp; Physical Print</option>
                    <option value="ebook">Digital Ebook Only (Instant Download)</option>
                    <option value="print">Physical Print Only (City Delivery)</option>
                  </select>
                </div>

                {formatAvailable !== 'ebook' && (
                  <div>
                    <label className="text-xs font-medium text-stone-600 block mb-1">
                      Physical Print Stock Count (Units)
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

            {/* Section 3: Neat & Clear Cover Image Generator */}
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-stone-800" />
                    <span>Neat &amp; Clear Cover Studio</span>
                  </span>
                  <span className="text-xs text-stone-500">
                    Uses extracted/official cover automatically, or customize with Smart Designer / Photo
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
                    Smart Designer
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
                  {coverSource === 'extracted' && (
                    <span className="text-[11px] font-mono text-emerald-700 font-medium">
                      Matched Official / Embedded Cover
                    </span>
                  )}
                </div>

                <div className="sm:col-span-8 space-y-3">
                  <span className="text-xs font-semibold text-stone-700 block">
                    Select Cover Style &amp; Texture:
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

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const themes = COVER_THEMES.map((t) => t.id);
                        const next = themes[(themes.indexOf(selectedThemeId) + 1) % themes.length];
                        setSelectedThemeId(next);
                        setCoverSource('generate');
                      }}
                      className="text-xs font-medium text-stone-700 hover:text-stone-900 underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Shuffle Style Preset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Synopsis & Sample Chapter */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Book Synopsis / Overview
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Give readers a short, captivating summary of what this book explores..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Sample Excerpt / First Chapter (Optional)
                </label>
                <textarea
                  rows={3}
                  value={sampleContent}
                  onChange={(e) => setSampleContent(e.target.value)}
                  placeholder="Paste the opening paragraph or chapter so visitors can sample your book in the reader..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-800 font-serif leading-relaxed"
                />
              </div>
            </div>

            {/* Mandatory Authorship Declaration for Non-Owners */}
            {!isStoreOwner && (
              <div className="p-4 bg-amber-50/80 rounded-lg border border-amber-200/90 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={declaredOriginalWork}
                    onChange={(e) => {
                      setDeclaredOriginalWork(e.target.checked);
                      if (e.target.checked) setDeclarationError(null);
                    }}
                    className="w-4 h-4 mt-0.5 rounded text-stone-900 border-stone-300 focus:ring-stone-800 cursor-pointer"
                  />
                  <span className="text-xs text-stone-800 leading-relaxed">
                    <strong className="font-bold text-stone-900 block mb-0.5">
                      Original Authorship &amp; Copyright Certification (Mandatory):
                    </strong>
                    I declare, warrant, and legally certify that I am the sole author and legitimate copyright owner of this book manuscript. This volume is my own original creation and has not been copied, plagiarized, or authored by any other third party.
                  </span>
                </label>
                {declarationError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold pt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{declarationError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Submission bar */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Full book binary persists offline without subscription fees</span>
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
