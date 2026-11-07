import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 1500;
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct < 100) {
        rafId = requestAnimationFrame(tick);
      } else {
        setExiting(true);
        setTimeout(onComplete, 380);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onComplete]);

  return (
    <div className={`gb-splash-screen ${exiting ? 'exiting' : ''}`}>
      <div className="gb-splash-grid" />

      {/* Top Edition Tag */}
      <div className="relative z-10 flex items-center gap-2.5 text-[11px] font-bold tracking-[0.28em] text-amber-300/90 uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
        <span>GB STUDY</span>
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
      </div>

      {/* Center Emblem + Brand Title */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative flex items-center justify-center w-40 h-40 mb-6">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-full border border-amber-400/30 border-dashed gb-splash-ring-spin" />
          {/* Inner spinning ring */}
          <div className="absolute inset-3 rounded-full border-2 border-indigo-500/35 border-t-amber-400 gb-splash-ring-reverse" />
          {/* Glow */}
          <div className="absolute inset-6 rounded-full bg-amber-500/15 blur-xl" />
          {/* GB STUDY Icon */}
          <img
            src="/gb-study-logo.png"
            alt="GB STUDY"
            className="relative z-10 w-24 h-24 rounded-full object-cover border-2 border-amber-400/70 shadow-[0_0_30px_rgba(245,158,11,0.45)]"
          />
        </div>

        <h1
          className="text-3xl sm:text-4xl font-black tracking-[0.18em] gb-gold-text text-center"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          GB STUDY
        </h1>

        <div className="flex items-center gap-3 mt-2.5">
          <span className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-400/60" />
          <span className="text-[11px] font-semibold tracking-[0.24em] text-slate-300 uppercase">
            ALL STUDY BATCHES FREE
          </span>
          <span className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-400/60" />
        </div>

        {/* Progress Bar */}
        <div className="w-64 sm:w-72 mt-8">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden p-[1px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-amber-400 to-amber-300 transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            <span>LOADING BATCHES</span>
            <span className="text-amber-300">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center gap-2 text-[11px] font-semibold tracking-widest text-slate-400">
        <span className="text-amber-400">✦</span>
        <span>Crafted by</span>
        <strong className="text-amber-300 tracking-wider">GB STUDY</strong>
        <span className="text-amber-400">✦</span>
      </div>
    </div>
  );
};
