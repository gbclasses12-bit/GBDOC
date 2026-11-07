import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Unlock,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { QualityOption, decryptXor28PdfBytes } from '../lib/dishaApi';
import { saveOfflineDownload } from '../lib/storage';

interface VideoPlayerViewProps {
  title: string;
  batchName?: string;
  subjectName?: string;
  streamUrl: string;
  embedUrl: string;
  qualities: QualityOption[];
  hasPdf: boolean;
  pdfHref?: string;
  onBack: () => void;
  onOpenPdf?: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  title,
  batchName,
  subjectName,
  streamUrl,
  embedUrl,
  qualities,
  hasPdf,
  pdfHref,
  onBack,
  onOpenPdf,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const directVideoRef = useRef<HTMLVideoElement>(null);
  const appxIframeRef = useRef<HTMLIFrameElement>(null);
  const activeVideoElRef = useRef<HTMLVideoElement | null>(null);

  const isAppxPlayer = Boolean(
    embedUrl &&
      (embedUrl.includes('/api/disha-player') ||
        embedUrl.includes('/api/player-page-proxy') ||
        embedUrl.includes('appx-play.classx.co.in') ||
        embedUrl.includes('player.appx.co.in'))
  );

  const youtubeEmbedSrc = (() => {
    const candidate = (!isAppxPlayer && embedUrl) || streamUrl || '';
    if (!candidate) return '';
    const match = candidate.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    if (match?.[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
    }
    return '';
  })();

  const isYoutube = Boolean(youtubeEmbedSrc && !isAppxPlayer);

  const [selectedUrl, setSelectedUrl] = useState<string>(streamUrl || '');
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [locked, setLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [useDirectWorkerServer, setUseDirectWorkerServer] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const resetHideTimer = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
      setShowSettings(false);
    }, 3500);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Bind direct video element when not using Appx iframe or YouTube
  useEffect(() => {
    if (!isAppxPlayer && !isYoutube && directVideoRef.current) {
      activeVideoElRef.current = directVideoRef.current;
    }
  }, [isAppxPlayer, isYoutube, selectedUrl]);

  // Hook into the <video> inside same-origin /api/disha-player iframe (exact mechanism from bat.doc1.workers.dev)
  useEffect(() => {
    if (!isAppxPlayer || useDirectWorkerServer) return;

    let attachedVideo: HTMLVideoElement | null = null;

    const onPlay = () => {
      setPlaying(true);
      setBuffering(false);
    };
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      if (!attachedVideo) return;
      setCurrentTime(attachedVideo.currentTime || 0);
      if (Number.isFinite(attachedVideo.duration) && attachedVideo.duration > 0) {
        setDuration(attachedVideo.duration);
      }
    };
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);

    const interval = window.setInterval(() => {
      try {
        const doc = appxIframeRef.current?.contentDocument;
        if (!doc) return;
        if (!doc.getElementById('bat-hide-ui')) {
          const style = doc.createElement('style');
          style.id = 'bat-hide-ui';
          style.textContent =
            'body *{visibility:hidden!important}video{visibility:visible!important;position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;object-fit:contain!important;background:#000!important;z-index:2147483647!important}html,body{background:#000!important;overflow:hidden!important}';
          (doc.head || doc.documentElement).appendChild(style);
        }
        const vid = doc.querySelector('video');
        if (vid && activeVideoElRef.current !== vid) {
          activeVideoElRef.current = vid;
          attachedVideo = vid;
          vid.controls = false;
          vid.playsInline = true;
          vid.addEventListener('play', onPlay);
          vid.addEventListener('playing', onPlay);
          vid.addEventListener('pause', onPause);
          vid.addEventListener('timeupdate', onTimeUpdate);
          vid.addEventListener('loadedmetadata', onTimeUpdate);
          vid.addEventListener('durationchange', onTimeUpdate);
          vid.addEventListener('waiting', onWaiting);
          vid.addEventListener('canplay', onCanPlay);
          vid.play().catch(() => {});
        }
      } catch {
        // ignore cross-origin if switched to external server
      }
    }, 350);

    return () => {
      window.clearInterval(interval);
      if (attachedVideo) {
        attachedVideo.removeEventListener('play', onPlay);
        attachedVideo.removeEventListener('playing', onPlay);
        attachedVideo.removeEventListener('pause', onPause);
        attachedVideo.removeEventListener('timeupdate', onTimeUpdate);
        attachedVideo.removeEventListener('loadedmetadata', onTimeUpdate);
        attachedVideo.removeEventListener('durationchange', onTimeUpdate);
        attachedVideo.removeEventListener('waiting', onWaiting);
        attachedVideo.removeEventListener('canplay', onCanPlay);
      }
    };
  }, [isAppxPlayer, embedUrl, useDirectWorkerServer]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // ignore
    }
  };

  const togglePlay = () => {
    resetHideTimer();
    const v = activeVideoElRef.current || directVideoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      v.muted = false;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const skip = (sec: number) => {
    resetHideTimer();
    const v = activeVideoElRef.current || directVideoRef.current;
    if (!v) return;
    const maxDur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : duration || 999999;
    v.currentTime = Math.max(0, Math.min(maxDur, (v.currentTime || 0) + sec));
    setCurrentTime(v.currentTime);
  };

  const changeSpeed = (s: number) => {
    resetHideTimer();
    setSpeed(s);
    const v = activeVideoElRef.current || directVideoRef.current;
    if (v) {
      v.playbackRate = s;
    }
    setShowSettings(false);
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const appxIframeSrc = (() => {
    if (!isAppxPlayer) return '';
    if (useDirectWorkerServer && embedUrl.startsWith('/api/')) {
      return `https://bat.doc1.workers.dev${embedUrl}`;
    }
    return embedUrl;
  })();

  const showCustomControlsOverlay = (isAppxPlayer && !useDirectWorkerServer) || (!isAppxPlayer && !isYoutube && Boolean(selectedUrl));

  return (
    <div className="min-h-screen bg-[#070913] text-white flex flex-col">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-3 py-2.5 bg-[#0c1022]/90 backdrop-blur-md border-b border-indigo-500/20">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-xs font-extrabold tracking-wider text-indigo-200 hover:bg-indigo-500/25 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK</span>
        </button>

        <div className="flex items-center gap-2 truncate max-w-[55%]">
          <img
            src="/gb-study-logo.png"
            alt="GB STUDY"
            className="w-6 h-6 rounded-full object-cover border border-amber-400/60"
          />
          <span className="text-xs sm:text-sm font-black tracking-wider text-amber-300 truncate">
            GB STUDY PLAYER
          </span>
        </div>

        {hasPdf && pdfHref ? (
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </a>
        ) : hasPdf && onOpenPdf ? (
          <button
            onClick={onOpenPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        ) : (
          <div className="w-14" />
        )}
      </header>

      {/* Main Player Container */}
      <div className="max-w-5xl w-full mx-auto px-2 sm:px-4 pt-3 pb-10 flex-1 flex flex-col">
        <div
          ref={containerRef}
          onMouseMove={resetHideTimer}
          onClick={resetHideTimer}
          className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-indigo-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.75)] select-none"
        >
          {/* Brand Watermark */}
          <div className="absolute top-3 left-3 z-30 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-400/30">
            <img src="/gb-study-logo.png" alt="GB STUDY" className="w-4 h-4 rounded-full object-cover" />
            <span className="text-[10px] font-extrabold tracking-widest text-amber-300">
              PRO PLAYER • GB STUDY ✦
            </span>
          </div>

          {/* 1. Appx Encrypted Stream Player (/api/disha-player) */}
          {isAppxPlayer ? (
            <iframe
              ref={appxIframeRef}
              src={appxIframeSrc}
              title={title}
              data-appx-watch="1"
              className={`absolute inset-0 w-full h-full border-0 bg-black ${
                useDirectWorkerServer ? '' : 'pointer-events-none'
              }`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              onLoad={() => setBuffering(false)}
            />
          ) : isYoutube ? (
            /* 2. YouTube Lecture Player */
            <iframe
              src={youtubeEmbedSrc}
              title={title}
              data-yt-watch="1"
              className="absolute inset-0 w-full h-full border-0 bg-black"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              onLoad={() => setBuffering(false)}
            />
          ) : selectedUrl ? (
            /* 3. Direct MP4 / HLS Video Element */
            <video
              ref={directVideoRef}
              src={selectedUrl}
              className="absolute inset-0 w-full h-full object-contain bg-black"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              playsInline
              autoPlay
              controls={false}
              onPlay={() => {
                setPlaying(true);
                setBuffering(false);
              }}
              onPause={() => setPlaying(false)}
              onWaiting={() => setBuffering(true)}
              onCanPlay={() => setBuffering(false)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration);
                setBuffering(false);
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <img src="/gb-study-logo.png" alt="GB STUDY" className="w-16 h-16 rounded-full mb-3 opacity-80" />
              <p className="text-sm font-bold text-slate-200">Loading Lecture Stream...</p>
            </div>
          )}

          {/* Custom PRO PLAYER Controls Overlay (for Appx & Direct Video) */}
          {showCustomControlsOverlay && (
            <div
              className={`absolute inset-0 z-20 flex flex-col justify-between p-3 bg-gradient-to-t from-black/85 via-transparent to-black/45 transition-opacity duration-200 ${
                controlsVisible || !playing || locked ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Top Right Controls */}
              <div className="flex justify-end items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocked(!locked);
                  }}
                  className="p-2 rounded-full bg-black/65 border border-white/15 text-white hover:bg-white/20"
                  title={locked ? 'Unlock Controls' : 'Lock Controls'}
                >
                  {locked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
                </button>
                {!locked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(!showSettings);
                    }}
                    className="px-3 py-1.5 rounded-full bg-black/65 border border-white/15 text-xs font-bold text-amber-300 flex items-center gap-1"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{speed}x</span>
                  </button>
                )}
              </div>

              {/* Center Play / Pause / Skip */}
              {!locked && (
                <div className="flex items-center justify-center gap-7 sm:gap-12">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      skip(-10);
                    }}
                    className="p-3 rounded-full bg-black/60 border border-white/15 text-white hover:scale-105 active:scale-95 transition"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="p-4 rounded-full bg-amber-500 text-black shadow-[0_0_25px_rgba(245,158,11,0.65)] hover:scale-105 active:scale-95 transition"
                  >
                    {buffering && !playing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : playing ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current translate-x-0.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      skip(10);
                    }}
                    className="p-3 rounded-full bg-black/60 border border-white/15 text-white hover:scale-105 active:scale-95 transition"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Bottom Seek Bar & Time */}
              {!locked ? (
                <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="range"
                    min={0}
                    max={duration > 0 ? duration : 100}
                    step={0.5}
                    value={currentTime}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCurrentTime(val);
                      const v = activeVideoElRef.current || directVideoRef.current;
                      if (v) v.currentTime = val;
                    }}
                    className="w-full accent-amber-400 h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                      <button
                        onClick={() => {
                          const next = !muted;
                          setMuted(next);
                          const v = activeVideoElRef.current || directVideoRef.current;
                          if (v) v.muted = next;
                        }}
                        className="p-1 hover:text-amber-300"
                      >
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                    <button onClick={toggleFullscreen} className="p-1 hover:text-amber-300">
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-[11px] text-amber-300/90 font-semibold">
                  Controls Locked • Tap lock icon to unlock
                </div>
              )}
            </div>
          )}

          {/* Speed & Quality Popup */}
          {showSettings && !locked && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-12 z-40 w-56 rounded-xl bg-[#0e1326]/95 backdrop-blur-md border border-indigo-500/30 p-3 shadow-2xl space-y-3"
            >
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Playback Speed
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`py-1 rounded text-xs font-bold border ${
                        speed === s
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-white/5 text-slate-200 border-white/10'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {qualities.length > 0 && !isAppxPlayer && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Video Quality
                  </div>
                  <div className="flex flex-col gap-1">
                    {qualities.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedUrl(q.url);
                          setShowSettings(false);
                        }}
                        className={`px-2.5 py-1.5 rounded text-left text-xs font-bold border ${
                          selectedUrl === q.url
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-white/5 text-slate-200 border-white/10'
                        }`}
                      >
                        {q.quality}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lecture Info Card */}
        <div className="mt-4 rounded-2xl bg-[#0e1428]/90 border border-indigo-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
              <span>GB STUDY</span>
              {batchName && <span>• {batchName}</span>}
              {subjectName && <span>• {subjectName}</span>}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">{title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isAppxPlayer && (
              <button
                onClick={() => setUseDirectWorkerServer(!useDirectWorkerServer)}
                className="px-3 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-xs font-bold text-indigo-200 hover:bg-indigo-500/30 transition"
              >
                {useDirectWorkerServer ? 'Use Pro Overlay Player' : 'Switch Player Server'}
              </button>
            )}
            {hasPdf && pdfHref ? (
              <a
                href={pdfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-extrabold text-white shadow-lg hover:opacity-95 transition"
              >
                <FileText className="w-4 h-4" />
                <span>OPEN LECTURE PDF</span>
              </a>
            ) : (
              hasPdf &&
              onOpenPdf && (
                <button
                  onClick={onOpenPdf}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-extrabold text-white shadow-lg hover:opacity-95 transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>OPEN LECTURE PDF</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PdfViewerModalProps {
  title: string;
  pdfUrl: string;
  rawPdfUrl?: string;
  pdfKey?: string;
  batchName?: string;
  subjectName?: string;
  onBack: () => void;
}

export const PdfViewerView: React.FC<PdfViewerModalProps> = ({
  title,
  pdfUrl,
  pdfKey,
  batchName,
  subjectName,
  onBack,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [zoom, setZoom] = useState(100);
  const [savedOffline, setSavedOffline] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl = '';

    async function loadPdf() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(pdfUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch PDF (${res.status})`);
        }
        const buf = await res.arrayBuffer();
        let bytes: Uint8Array = new Uint8Array(buf);
        if (pdfKey) {
          bytes = decryptXor28PdfBytes(bytes, pdfKey);
        }
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        createdUrl = URL.createObjectURL(blob);
        if (active) {
          setPdfBlob(blob);
          setBlobUrl(createdUrl);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Unable to load PDF file');
          setLoading(false);
        }
      }
    }

    loadPdf();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [pdfUrl, pdfKey]);

  const handleDownloadDevice = () => {
    const target = blobUrl || pdfUrl;
    const a = document.createElement('a');
    a.href = target;
    a.download = `${(title || 'GB-STUDY-Notes').replace(/[^a-zA-Z0-9_-]+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveOffline = async () => {
    if (!pdfBlob) return;
    try {
      await saveOfflineDownload({
        id: `pdf_${Date.now()}_${title}`,
        type: 'pdf',
        title,
        batchName,
        subjectName,
        createdAt: Date.now(),
        size: pdfBlob.size,
        mimeType: 'application/pdf',
        blob: pdfBlob,
      });
      setSavedOffline(true);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#070913] text-white flex flex-col">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 py-2.5 bg-[#0c1022]/95 backdrop-blur-md border-b border-indigo-500/25">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-xs font-extrabold text-indigo-200 hover:bg-indigo-500/25 transition shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK</span>
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <img
            src="/gb-study-logo.png"
            alt="GB STUDY"
            className="w-6 h-6 rounded-full object-cover border border-amber-400/60 shrink-0"
          />
          <div className="truncate text-xs sm:text-sm font-extrabold text-amber-300">
            {title || 'GB STUDY PDF NOTES'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(60, z - 20))}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-slate-300 w-10 text-center hidden sm:inline">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(200, z + 20))}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {pdfBlob && (
            <button
              onClick={handleSaveOffline}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-400/40 text-xs font-bold text-indigo-200 hover:bg-indigo-600/50 transition"
              title="Save to App Downloads"
            >
              {savedOffline ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">{savedOffline ? 'Saved' : 'Save Offline'}</span>
            </button>
          )}

          <button
            onClick={handleDownloadDevice}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-extrabold text-white hover:bg-emerald-500 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-auto bg-[#0a0d1a]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
            <p className="text-sm font-bold text-white">Decrypting & Loading PDF Notes...</p>
            <p className="text-xs text-slate-400 mt-1">GB STUDY Smart PDF Engine</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#11172e] border border-red-500/30 text-center space-y-4">
            <img
              src="/gb-study-logo.png"
              alt="GB STUDY"
              className="w-14 h-14 rounded-full mx-auto border border-amber-400/50"
            />
            <p className="text-sm font-bold text-red-300">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onBack}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-white"
              >
                Go Back
              </button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-amber-500 text-xs font-extrabold text-black"
              >
                Direct Open PDF
              </a>
            </div>
          </div>
        ) : (
          <div
            className="w-full h-[calc(100vh-56px)] flex justify-center overflow-auto"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              src={`${blobUrl || pdfUrl}#toolbar=1&navpanes=0`}
              title={title}
              className="w-full h-full border-0 bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
