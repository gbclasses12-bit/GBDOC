import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  Heart,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  Play,
  Search,
  Sparkles,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { SplashScreen } from './components/SplashScreen';
import { PdfViewerView, VideoPlayerView } from './components/VideoModalAndPdfViewer';
import {
  BatchItem,
  ChapterItem,
  DishaUserCreds,
  LectureItem,
  PdfItem,
  QualityOption,
  SubFolderItem,
  SubjectItem,
  buildOpenPdfNewTabUrl,
  clearDishaCreds,
  fetchBatches,
  fetchChapters,
  fetchLecturesAndPdfs,
  fetchSubjects,
  fetchVideoDetails,
  getSavedDishaCreds,
  loginDishaDirect,
  resolvePdfUrl,
  syncOwnerDishaCreds,
} from './lib/dishaApi';
import {
  OfflineItem,
  deleteOfflineDownload,
  getOfflineDownloads,
  getWishlistBatches,
  toggleWishlistBatch,
} from './lib/storage';

type NavTab = 'home' | 'wishlist' | 'downloads';

type ActiveView =
  | { type: 'batches' }
  | { type: 'subjects'; batch: BatchItem }
  | { type: 'chapters'; batch: BatchItem; subject: SubjectItem }
  | {
      type: 'lectures';
      batch: BatchItem;
      subject: SubjectItem;
      chapter: ChapterItem;
    }
  | {
      type: 'video';
      batch: BatchItem;
      subject: SubjectItem;
      chapter: ChapterItem;
      lecture: LectureItem;
      streamUrl: string;
      embedUrl: string;
      qualities: QualityOption[];
    }
  | {
      type: 'pdf';
      title: string;
      pdfUrl: string;
      rawPdfUrl?: string;
      pdfKey?: string;
      batchName?: string;
      subjectName?: string;
      previousView: ActiveView;
    };

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [navTab, setNavTab] = useState<NavTab>('home');
  const [view, setView] = useState<ActiveView>({ type: 'batches' });

  // Data states
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchSearch, setBatchSearch] = useState('');

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectTab, setSubjectTab] = useState<'SUBJECTS' | 'TEST' | 'LIVE'>('SUBJECTS');

  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [subFolders, setSubFolders] = useState<SubFolderItem[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(false);
  const [contentToggle, setContentToggle] = useState<'VIDEO' | 'PDF'>('VIDEO');

  // Wishlist & Downloads
  const [wishlist, setWishlist] = useState<BatchItem[]>(() => getWishlistBatches());
  const [downloads, setDownloads] = useState<OfflineItem[]>([]);

  // Disha Account Modal
  const [dishaCreds, setDishaCreds] = useState<DishaUserCreds | null>(() => getSavedDishaCreds());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Action Toast / Loading overlay
  const [resolvingMedia, setResolvingMedia] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    syncOwnerDishaCreds().then((creds) => {
      if (creds) setDishaCreds(creds);
    });
    loadAllBatches();
  }, []);

  useEffect(() => {
    if (navTab === 'downloads') {
      getOfflineDownloads().then(setDownloads);
    }
  }, [navTab]);

  async function loadAllBatches() {
    setLoadingBatches(true);
    try {
      const res = await fetchBatches();
      setBatches(res.data);
    } catch (err: any) {
      showToast(err?.message || 'Could not load batches');
    } finally {
      setLoadingBatches(false);
    }
  }

  async function openBatch(batch: BatchItem) {
    setNavTab('home');
    setSubjectTab('SUBJECTS');
    setView({ type: 'subjects', batch });
    setLoadingSubjects(true);
    try {
      const res = await fetchSubjects(batch.id);
      setSubjects(res.data);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  }

  async function openSubject(batch: BatchItem, subject: SubjectItem) {
    setView({ type: 'chapters', batch, subject });
    setLoadingChapters(true);
    try {
      const res = await fetchChapters(batch.id, subject.id);
      setChapters(res.data);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load chapters');
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  }

  async function openChapter(batch: BatchItem, subject: SubjectItem, chapter: ChapterItem) {
    setContentToggle('VIDEO');
    setView({ type: 'lectures', batch, subject, chapter });
    setLoadingLectures(true);
    try {
      const res = await fetchLecturesAndPdfs(batch.id, subject.id, chapter.id);
      setLectures(res.lectures);
      setPdfs(res.pdfs);
      setSubFolders(res.subFolders);
      if (res.lectures.length === 0 && res.pdfs.length > 0) {
        setContentToggle('PDF');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load lectures');
      setLectures([]);
      setPdfs([]);
      setSubFolders([]);
    } finally {
      setLoadingLectures(false);
    }
  }

  async function handlePlayLecture(
    batch: BatchItem,
    subject: SubjectItem,
    chapter: ChapterItem,
    lecture: LectureItem
  ) {
    setResolvingMedia('Loading Lecture Video...');
    try {
      const detail = await fetchVideoDetails(batch.id, lecture.id, chapter.id);
      const finalStreamUrl = detail.streamUrl || lecture.streamUrl || '';
      const finalEmbedUrl = detail.embedUrl || lecture.embedUrl || '';
      const finalQualities =
        detail.qualities && detail.qualities.length > 0 ? detail.qualities : lecture.qualities || [];

      setView({
        type: 'video',
        batch,
        subject,
        chapter,
        lecture: {
          ...lecture,
          pdfUrl: detail.pdfUrl || lecture.pdfUrl,
          pdfKey: detail.pdfKey || lecture.pdfKey,
          hasPdf: detail.hasPdf || lecture.hasPdf,
        },
        streamUrl: finalStreamUrl,
        embedUrl: finalEmbedUrl,
        qualities: finalQualities,
      });
    } catch (err: any) {
      if (lecture.streamUrl || lecture.embedUrl) {
        setView({
          type: 'video',
          batch,
          subject,
          chapter,
          lecture,
          streamUrl: lecture.streamUrl || '',
          embedUrl: lecture.embedUrl || '',
          qualities: lecture.qualities || [],
        });
      } else {
        showToast(err?.message || 'Unable to load video');
      }
    } finally {
      setResolvingMedia(null);
    }
  }

  async function handleOpenPdfItem(
    batch: BatchItem,
    subject: SubjectItem,
    chapter: ChapterItem,
    itemId: string,
    title: string,
    knownPdfUrl?: string,
    knownPdfKey?: string
  ) {
    setResolvingMedia('Opening PDF Notes...');
    try {
      const resolved = await resolvePdfUrl(batch.id, itemId, chapter.id, knownPdfUrl, knownPdfKey);
      setView((prev) => ({
        type: 'pdf',
        title: title || resolved.title,
        pdfUrl: resolved.pdfUrl,
        rawPdfUrl: resolved.rawPdfUrl,
        pdfKey: resolved.pdfKey,
        batchName: batch.name,
        subjectName: subject.name,
        previousView: prev,
      }));
    } catch (err: any) {
      showToast(err?.message || 'PDF requires Disha account login');
      setShowLoginModal(true);
    } finally {
      setResolvingMedia(null);
    }
  }

  function handleBackButton() {
    if (view.type === 'pdf') {
      setView(view.previousView);
    } else if (view.type === 'video') {
      setView({
        type: 'lectures',
        batch: view.batch,
        subject: view.subject,
        chapter: view.chapter,
      });
    } else if (view.type === 'lectures') {
      setView({
        type: 'chapters',
        batch: view.batch,
        subject: view.subject,
      });
    } else if (view.type === 'chapters') {
      setView({
        type: 'subjects',
        batch: view.batch,
      });
    } else if (view.type === 'subjects') {
      setView({ type: 'batches' });
    } else if (navTab !== 'home') {
      setNavTab('home');
    }
  }

  async function handleDishaLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loginMobile.trim() || !loginPassword.trim()) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      const creds = await loginDishaDirect(loginMobile, loginPassword);
      setDishaCreds(creds);
      setShowLoginModal(false);
      setLoginPassword('');
      showToast('Disha Account Connected to GB STUDY!');
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  const filteredBatches = useMemo(() => {
    const q = batchSearch.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        String(b.id).toLowerCase().includes(q) ||
        String(b.price).toLowerCase().includes(q)
    );
  }, [batches, batchSearch]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (view.type === 'video') {
    const pdfHref = view.lecture.hasPdf
      ? buildOpenPdfNewTabUrl(
          view.batch.id,
          view.lecture.id,
          view.chapter.id,
          view.lecture.pdfUrl,
          view.lecture.pdfKey
        )
      : undefined;
    return (
      <VideoPlayerView
        title={view.lecture.title}
        batchName={view.batch.name}
        subjectName={view.subject.name}
        streamUrl={view.streamUrl}
        embedUrl={view.embedUrl}
        qualities={view.qualities}
        hasPdf={view.lecture.hasPdf}
        pdfHref={pdfHref}
        onBack={handleBackButton}
        onOpenPdf={
          view.lecture.hasPdf
            ? () =>
                handleOpenPdfItem(
                  view.batch,
                  view.subject,
                  view.chapter,
                  view.lecture.id,
                  `${view.lecture.title} - Notes`,
                  view.lecture.pdfUrl,
                  view.lecture.pdfKey
                )
            : undefined
        }
      />
    );
  }

  if (view.type === 'pdf') {
    return (
      <PdfViewerView
        title={view.title}
        pdfUrl={view.pdfUrl}
        rawPdfUrl={view.rawPdfUrl}
        pdfKey={view.pdfKey}
        batchName={view.batchName}
        subjectName={view.subjectName}
        onBack={handleBackButton}
      />
    );
  }

  const isWishlisted = (id: string) => wishlist.some((w) => String(w.id) === String(id));

  return (
    <div
      className="min-h-screen flex flex-col text-white pb-24"
      style={{
        background:
          'linear-gradient(145deg, hsl(232, 32%, 9%) 0%, hsl(228, 35%, 7%) 50%, hsl(245, 28%, 10%) 100%)',
      }}
    >
      {/* Top Sticky Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-2.5 py-2.5 backdrop-blur-xl"
        style={{
          background:
            'linear-gradient(135deg, hsla(230, 35%, 10%, 0.92) 0%, hsla(245, 30%, 13%, 0.88) 100%)',
          borderBottom: '1px solid hsla(239, 84%, 67%, 0.18)',
          boxShadow: '0 4px 24px -4px rgba(0,0,0,0.45)',
        }}
      >
        <button
          onClick={handleBackButton}
          className="inline-flex items-center gap-0.5 text-[13px] font-black tracking-wider leading-none px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95 select-none shrink-0"
          style={{
            fontFamily: "'Barlow', sans-serif",
            color: 'hsl(220, 30%, 92%)',
            background: 'hsla(239, 84%, 67%, 0.14)',
            border: '1px solid hsla(239, 84%, 67%, 0.28)',
          }}
        >
          <span className="text-sm leading-none">く</span>
          <span>BACK</span>
        </button>

        {/* Center Brand Title: GB STUDY */}
        <button
          onClick={() => {
            setNavTab('home');
            setView({ type: 'batches' });
          }}
          className="flex items-center gap-2 focus:outline-none group"
        >
          <img
            src="/gb-study-logo.png"
            alt="GB STUDY"
            className="w-7 h-7 rounded-full object-cover border border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
          />
          <span
            className="text-lg sm:text-xl font-black tracking-[0.14em] gb-gold-text"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            GB STUDY
          </span>
        </button>

        {/* Right GB STUDY Icon Button */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="relative flex items-center justify-center w-9 h-9 rounded-full border-2 border-amber-400/70 shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:scale-105 transition overflow-hidden shrink-0"
          title="GB STUDY Account / Settings"
        >
          <img src="/gb-study-logo.png" alt="GB STUDY" className="w-full h-full object-cover" />
          {dishaCreds?.token && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
          )}
        </button>
      </header>

      {/* Resolving Media Overlay */}
      {resolvingMedia && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl bg-[#10162f] border border-indigo-500/40 px-6 py-5 flex items-center gap-3.5 shadow-2xl">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            <span className="text-sm font-bold text-white">{resolvingMedia}</span>
          </div>
        </div>
      )}

      {/* Toast message */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-500 text-black text-xs font-extrabold shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-5 pt-4">
        {/* TAB 2: WISHLIST */}
        {navTab === 'wishlist' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-wide">SAVED WISHLIST BATCHES</h2>
                <p className="text-xs text-slate-400">Your bookmarked batches on GB STUDY</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-xs font-extrabold text-pink-300">
                {wishlist.length} Saved
              </span>
            </div>

            {wishlist.length === 0 ? (
              <div className="rounded-2xl bg-[#0f1429]/80 border border-indigo-500/20 p-10 text-center">
                <Heart className="w-10 h-10 text-pink-400/60 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-200">No batches in your Wishlist yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Tap the heart icon on any batch to save it for quick access.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {wishlist.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    wishlisted={true}
                    onToggleWishlist={() => setWishlist(toggleWishlistBatch(batch))}
                    onOpen={() => openBatch(batch)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : navTab === 'downloads' ? (
          /* TAB 3: OFFLINE DOWNLOADS */
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-wide">OFFLINE DOWNLOADS</h2>
                <p className="text-xs text-slate-400">Saved PDFs & Study Material inside GB STUDY</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-xs font-extrabold text-indigo-300">
                {downloads.length} Files
              </span>
            </div>

            {downloads.length === 0 ? (
              <div className="rounded-2xl bg-[#0f1429]/80 border border-indigo-500/20 p-10 text-center">
                <Download className="w-10 h-10 text-indigo-400/60 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-200">No Offline Downloads Yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Open any lecture PDF and tap "Save Offline" to access it anytime here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {downloads.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-[#10162b] border border-indigo-500/25 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-white truncate">{item.title}</h3>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.batchName || 'GB STUDY'} • {(item.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          const url = URL.createObjectURL(item.blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.target = '_blank';
                          a.rel = 'noopener noreferrer';
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-xs font-extrabold text-white"
                      >
                        OPEN
                      </button>
                      <button
                        onClick={async () => {
                          await deleteOfflineDownload(item.id);
                          setDownloads(await getOfflineDownloads());
                        }}
                        className="p-2 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/25"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 1: HOME (Batches -> Subjects -> Chapters -> Lectures) */
          <>
            {view.type === 'batches' && (
              <div>
                {/* Glowing Search Bar */}
                <div className="mb-5">
                  <div
                    className="relative flex items-center rounded-2xl overflow-hidden transition-all"
                    style={{
                      background: 'hsla(230, 30%, 12%, 0.9)',
                      border: '1.5px solid hsla(152, 76%, 48%, 0.45)',
                      boxShadow: '0 0 20px -4px hsla(152, 76%, 48%, 0.25)',
                    }}
                  >
                    <Search className="w-4 h-4 text-emerald-400 ml-3.5 shrink-0" />
                    <input
                      type="text"
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      placeholder="SEARCH BATCH..."
                      className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm font-bold tracking-wider text-white placeholder-slate-400 focus:outline-none"
                    />
                    {batchSearch && (
                      <button
                        onClick={() => setBatchSearch('')}
                        className="mr-3 p-1 rounded-full bg-white/10 text-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Batches Grid */}
                {loadingBatches ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-60 rounded-2xl bg-[#11172e]/80 border border-indigo-500/15 animate-pulse p-3 flex flex-col justify-between"
                      >
                        <div className="w-full aspect-[16/10] rounded-xl bg-white/5" />
                        <div className="h-4 w-3/4 bg-white/10 rounded" />
                        <div className="h-8 w-full bg-indigo-500/20 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {filteredBatches.map((batch) => (
                      <BatchCard
                        key={batch.id}
                        batch={batch}
                        wishlisted={isWishlisted(batch.id)}
                        onToggleWishlist={() => setWishlist(toggleWishlistBatch(batch))}
                        onOpen={() => openBatch(batch)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {view.type === 'subjects' && (
              <div>
                {/* Batch Banner Header */}
                <div className="rounded-2xl bg-gradient-to-r from-[#121936] via-[#171f42] to-[#121936] border border-indigo-500/30 p-3.5 sm:p-4 mb-4 flex items-center gap-3.5 shadow-lg">
                  <img
                    src={view.batch.thumbnail || '/gb-study-logo.png'}
                    alt={view.batch.name}
                    onError={(e) => {
                      e.currentTarget.src = '/gb-study-logo.png';
                    }}
                    className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl object-cover border border-amber-400/40 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                      GB STUDY BATCH
                    </div>
                    <h1 className="text-sm sm:text-base font-extrabold text-white truncate">
                      {view.batch.name}
                    </h1>
                  </div>
                </div>

                {/* SUBJECTS / TEST / LIVE Animated Pill Tabs */}
                <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#0d1224] border border-indigo-500/25 mb-4">
                  {(['SUBJECTS', 'TEST', 'LIVE'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSubjectTab(tab)}
                      className={`py-2 rounded-xl text-xs font-extrabold tracking-wider transition-all ${
                        subjectTab === tab
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.45)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {subjectTab !== 'SUBJECTS' ? (
                  <div className="rounded-2xl bg-[#10162d]/90 border border-indigo-500/20 p-10 text-center">
                    <Sparkles className="w-9 h-9 text-amber-400 mx-auto mb-2.5" />
                    <p className="text-sm font-bold text-white">
                      {subjectTab === 'LIVE'
                        ? 'All Recorded & Live Streams are inside SUBJECTS'
                        : 'All DPPs & Test PDFs are inside SUBJECTS'}
                    </p>
                    <button
                      onClick={() => setSubjectTab('SUBJECTS')}
                      className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-xs font-extrabold text-white"
                    >
                      View All Subjects
                    </button>
                  </div>
                ) : loadingSubjects ? (
                  <div className="space-y-2.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-16 rounded-2xl bg-[#11172e]/80 border border-indigo-500/15 animate-pulse"
                      />
                    ))}
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="rounded-2xl bg-[#10162d] border border-indigo-500/20 p-8 text-center">
                    <p className="text-sm font-bold text-slate-300">No subjects found in this batch.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subjects.map((sub, idx) => (
                      <button
                        key={sub.id}
                        onClick={() => openSubject(view.batch, sub)}
                        className="group text-left rounded-2xl bg-[#10162c]/95 hover:bg-[#151d3a] border border-indigo-500/25 hover:border-amber-400/50 p-3.5 flex items-center justify-between gap-3 transition-all shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/25 to-purple-500/25 border border-indigo-400/30 flex items-center justify-center shrink-0 overflow-hidden">
                            {sub.image ? (
                              <img
                                src={sub.image}
                                alt={sub.name}
                                onError={(e) => {
                                  e.currentTarget.src = '/gb-study-logo.png';
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-black text-amber-300">{idx + 1}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-amber-300 transition truncate">
                              {sub.name}
                            </h3>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-0.5">
                              <span>▶ CHAPTERS</span>
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view.type === 'chapters' && (
              <div>
                <div className="rounded-2xl bg-[#121936] border border-indigo-500/30 p-3.5 mb-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 truncate">
                      {view.batch.name}
                    </div>
                    <h1 className="text-sm sm:text-base font-extrabold text-white truncate">
                      CHAPTERS • {view.subject.name}
                    </h1>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/35 text-[11px] font-extrabold text-indigo-300 shrink-0">
                    {chapters.length} Topics
                  </span>
                </div>

                {loadingChapters ? (
                  <div className="space-y-2.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-16 rounded-2xl bg-[#11172e]/80 border border-indigo-500/15 animate-pulse"
                      />
                    ))}
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="rounded-2xl bg-[#10162d] border border-indigo-500/20 p-8 text-center">
                    <p className="text-sm font-bold text-slate-300">No chapters found in this subject.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {chapters.map((ch, idx) => (
                      <button
                        key={ch.id}
                        onClick={() => openChapter(view.batch, view.subject, ch)}
                        className="group text-left rounded-2xl bg-[#10162c]/95 hover:bg-[#151d3a] border border-indigo-500/25 hover:border-amber-400/50 p-3.5 flex items-center justify-between gap-3 transition-all shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                            <span className="text-xs font-black text-amber-300">{idx + 1}</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-amber-300 transition truncate">
                              {ch.name}
                            </h3>
                            <p className="text-[11px] font-bold text-indigo-300 mt-0.5">
                              ▶ Lectures aur PDF dekho
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view.type === 'lectures' && (
              <div>
                {/* Header */}
                <div className="rounded-2xl bg-[#121936] border border-indigo-500/30 p-3.5 mb-4">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 truncate">
                    {view.batch.name} • {view.subject.name}
                  </div>
                  <h1 className="text-sm sm:text-base font-extrabold text-white truncate mt-0.5">
                    {view.chapter.name}
                  </h1>
                </div>

                {/* Sub-folders if any exist inside this chapter */}
                {subFolders.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4" />
                      <span>Sub-Topics / Folders ({subFolders.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {subFolders.map((sf) => (
                        <button
                          key={sf.id}
                          onClick={() =>
                            openChapter(view.batch, view.subject, {
                              id: sf.id,
                              name: sf.title,
                              image: sf.thumbnail,
                              parentId: view.chapter.id,
                              videosCount: 0,
                              pdfsCount: 0,
                            })
                          }
                          className="rounded-xl bg-[#131b38] hover:bg-[#192347] border border-amber-400/30 p-3 flex items-center justify-between text-left transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs font-extrabold text-white truncate">{sf.title}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* VIDEO / PDF Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#0d1224] border border-indigo-500/25 mb-4">
                  <button
                    onClick={() => setContentToggle('VIDEO')}
                    className={`py-2.5 rounded-xl text-xs font-extrabold tracking-wider flex items-center justify-center gap-2 transition-all ${
                      contentToggle === 'VIDEO'
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.45)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>VIDEO ({lectures.length})</span>
                  </button>
                  <button
                    onClick={() => setContentToggle('PDF')}
                    className={`py-2.5 rounded-xl text-xs font-extrabold tracking-wider flex items-center justify-center gap-2 transition-all ${
                      contentToggle === 'PDF'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.45)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF / DPP ({pdfs.length})</span>
                  </button>
                </div>

                {loadingLectures ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-24 rounded-2xl bg-[#11172e]/80 border border-indigo-500/15 animate-pulse"
                      />
                    ))}
                  </div>
                ) : contentToggle === 'VIDEO' ? (
                  lectures.length === 0 ? (
                    <div className="rounded-2xl bg-[#10162d] border border-indigo-500/20 p-8 text-center">
                      <p className="text-sm font-bold text-slate-300">No video lectures in this section.</p>
                      {pdfs.length > 0 && (
                        <button
                          onClick={() => setContentToggle('PDF')}
                          className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-xs font-extrabold text-white"
                        >
                          View {pdfs.length} PDFs / Notes
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {lectures.map((lec) => (
                        <div
                          key={lec.id}
                          className="rounded-2xl bg-[#10162c]/95 border border-indigo-500/25 hover:border-indigo-400/50 p-3 flex gap-3 items-center shadow-md transition"
                        >
                          {/* Thumbnail */}
                          <div
                            onClick={() => handlePlayLecture(view.batch, view.subject, view.chapter, lec)}
                            className="relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shrink-0 cursor-pointer group"
                          >
                            <img
                              src={lec.thumbnail || view.batch.thumbnail || '/gb-study-logo.png'}
                              alt={lec.title}
                              onError={(e) => {
                                e.currentTarget.src = '/gb-study-logo.png';
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-amber-500/90 text-black flex items-center justify-center shadow-lg">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Details & Actions */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 leading-snug">
                              {lec.title}
                            </h3>
                            {lec.published && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                                <Calendar className="w-3 h-3" />
                                <span className="truncate">{lec.published}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-2.5">
                              <button
                                onClick={() => handlePlayLecture(view.batch, view.subject, view.chapter, lec)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-[11px] font-extrabold text-white shadow hover:opacity-95 transition"
                              >
                                <span>▶ PLAY</span>
                              </button>

                              {lec.hasPdf && (
                                <a
                                  href={buildOpenPdfNewTabUrl(
                                    view.batch.id,
                                    lec.id,
                                    view.chapter.id,
                                    lec.pdfUrl,
                                    lec.pdfKey
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-extrabold text-emerald-300 hover:bg-emerald-500/30 transition"
                                >
                                  <span>📄 PDF</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : pdfs.length === 0 ? (
                  <div className="rounded-2xl bg-[#10162d] border border-indigo-500/20 p-8 text-center">
                    <p className="text-sm font-bold text-slate-300">No PDFs or DPPs found in this chapter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pdfs.map((pdf) => (
                      <div
                        key={`${pdf.id}_${pdf.title}`}
                        className="rounded-2xl bg-[#10162c]/95 border border-emerald-500/25 hover:border-emerald-400/50 p-3.5 flex items-center justify-between gap-3 shadow-md transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2">
                              {pdf.title}
                            </h3>
                            {pdf.published && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{pdf.published}</p>
                            )}
                          </div>
                        </div>

                        <a
                          href={buildOpenPdfNewTabUrl(
                            view.batch.id,
                            pdf.id,
                            view.chapter.id,
                            pdf.pdfUrl,
                            pdf.pdfKey
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-extrabold text-white shrink-0 shadow hover:opacity-95 transition"
                        >
                          📄 OPEN PDF
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="mt-12 mb-4 text-center space-y-1 border-t border-white/5 pt-6">
          <div className="flex items-center justify-center gap-2">
            <img src="/gb-study-logo.png" alt="GB STUDY" className="w-5 h-5 rounded-full object-cover" />
            <span className="text-xs font-extrabold tracking-widest gb-gold-text">
              © 2026 | GB STUDY
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold">Powered by GB STUDY</p>
        </footer>
      </main>

      {/* Disha Account Connection Modal (Accessible via Top-Right GB STUDY Icon) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full rounded-3xl bg-[#0e1429] border border-amber-400/40 p-5 shadow-2xl relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mb-4">
              <img
                src="/gb-study-logo.png"
                alt="GB STUDY"
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-2.5"
              />
              <h3 className="text-base font-black tracking-wider gb-gold-text">GB STUDY ACCOUNT</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                All batches & lectures play directly. Connect your Disha account if you want to unlock restricted batch PDFs.
              </p>
            </div>

            {dishaCreds ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-center">
                  <div className="text-xs font-extrabold text-emerald-300">CONNECTED SESSION ACTIVE</div>
                  <div className="text-xs text-slate-300 mt-1">
                    User ID: <span className="font-mono font-bold">{dishaCreds.userId}</span>
                  </div>
                  {dishaCreds.mobile && (
                    <div className="text-xs text-slate-400">{dishaCreds.mobile}</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    clearDishaCreds();
                    setDishaCreds(null);
                    showToast('Session disconnected');
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-xs font-extrabold text-red-300 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect Account</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleDishaLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Mobile Number or Email
                  </label>
                  <input
                    type="text"
                    value={loginMobile}
                    onChange={(e) => setLoginMobile(e.target.value)}
                    placeholder="Enter mobile or email"
                    className="w-full rounded-xl bg-black/40 border border-indigo-500/30 px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl bg-black/40 border border-indigo-500/30 px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                {loginError && (
                  <p className="text-xs font-bold text-red-400 text-center">{loginError}</p>
                )}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg"
                >
                  {loginLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>{loginLoading ? 'Connecting...' : 'Connect Account'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating Glassmorphic Bottom Navigation Bar */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md rounded-2xl bg-[#0d1226]/90 backdrop-blur-xl border border-indigo-500/30 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.65)]">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              setNavTab('home');
              setView({ type: 'batches' });
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              navTab === 'home'
                ? 'bg-indigo-600/30 text-amber-300 border border-indigo-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[10px] font-extrabold tracking-wider mt-0.5">HOME</span>
          </button>

          <button
            onClick={() => setNavTab('wishlist')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              navTab === 'wishlist'
                ? 'bg-pink-600/25 text-pink-300 border border-pink-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span className="text-[10px] font-extrabold tracking-wider mt-0.5">
              WISHLIST {wishlist.length > 0 ? `(${wishlist.length})` : ''}
            </span>
          </button>

          <button
            onClick={() => setNavTab('downloads')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              navTab === 'downloads'
                ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span className="text-[10px] font-extrabold tracking-wider mt-0.5">DOWNLOAD</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

interface BatchCardProps {
  batch: BatchItem;
  wishlisted: boolean;
  onToggleWishlist: () => void;
  onOpen: () => void;
}

const BatchCard: React.FC<BatchCardProps> = ({
  batch,
  wishlisted,
  onToggleWishlist,
  onOpen,
}) => {
  const numericPrice = Number(batch.price);
  const isFree = !batch.price || numericPrice <= 0;

  return (
    <div
      className="group rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(165deg, hsla(232, 35%, 14%, 0.95) 0%, hsla(235, 32%, 10%, 0.98) 100%)',
        border: '1px solid hsla(239, 84%, 67%, 0.24)',
        boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.55)',
      }}
    >
      <div>
        {/* Thumbnail */}
        <div
          onClick={onOpen}
          className="relative aspect-[16/10] w-full bg-[#090c18] overflow-hidden cursor-pointer"
        >
          <img
            src={batch.thumbnail || '/gb-study-logo.png'}
            alt={batch.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/gb-study-logo.png';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />

          {/* Price / Free Badge */}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-amber-400/40 text-[10px] font-extrabold text-amber-300">
            {isFree ? 'FREE' : `₹${batch.price}`}
          </div>

          {/* Wishlist Heart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist();
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/65 backdrop-blur-md border border-white/15 flex items-center justify-center hover:scale-110 transition"
            title="Save to Wishlist"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                wishlisted ? 'fill-pink-500 text-pink-500' : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* Title & Meta */}
        <div className="p-2.5 sm:p-3">
          <h3
            onClick={onOpen}
            className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 leading-snug cursor-pointer group-hover:text-amber-300 transition"
          >
            {batch.name}
          </h3>

          <div className="flex items-center justify-between mt-2 text-[10px] font-extrabold">
            <span className="text-emerald-400 uppercase tracking-wider">FREE ACCESS</span>
            <span className="text-indigo-300 uppercase">LIFE TIME</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        <button
          onClick={onOpen}
          className="w-full py-2 rounded-xl text-xs font-extrabold tracking-wider text-white uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"
          style={{
            background: 'linear-gradient(135deg, hsl(239, 84%, 62%) 0%, hsl(262, 80%, 58%) 100%)',
            boxShadow: '0 4px 14px -2px hsla(239, 84%, 62%, 0.45)',
          }}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Open Batch</span>
        </button>
      </div>
    </div>
  );
};
