import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTimeline, set, animate } from 'animejs';
import { Button } from '../components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  const mainRef = useRef(null);
  const codeRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const actionsRef = useRef(null);
  const orbRefs = useRef([...Array(5)].map(() => ({ current: null })));

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const main = mainRef.current;
    const code = codeRef.current;
    const title = titleRef.current;
    const desc = descRef.current;
    const actions = actionsRef.current;
    const orbs = orbRefs.current.map((r) => r.current).filter(Boolean);

    if (!main || !code || !title || !desc || !actions) return;

    set([main, code, title, desc, actions], { opacity: 0 });
    set(code, { scale: 0.9 });
    set(title, { y: 16 });
    set(desc, { y: 12 });
    set(actions, { y: 20 });
    set(orbs, { opacity: 0, scale: 0.6 });

    const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 520 } });

    tl.add(main, { opacity: { to: 1 }, duration: 400 })
      .add(code, { opacity: { to: 1 }, scale: { to: 1 }, duration: 500 }, '-=300')
      .add(title, { opacity: { to: 1 }, y: { to: 0 }, duration: 450 }, '-=350')
      .add(desc, { opacity: { to: 1 }, y: { to: 0 }, duration: 420 }, '-=300')
      .add(actions, { opacity: { to: 1 }, y: { to: 0 }, duration: 480 }, '-=280')
      .add(orbs, { opacity: { to: 0.7 }, scale: { to: 1 }, duration: 600, delay: 200 }, '-=200');

    // Subtle breathing pulse on 404 number (infinite, low impact)
    animate(
      code,
      { scale: { to: 1.04 } },
      { duration: 2200, ease: 'inOutSine', loop: true, alternate: true, delay: 900 }
    );
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative background orbs - reduced motion safe via opacity only when no preference */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          ref={(el) => (orbRefs.current[0].current = el)}
          className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-teal-100/70 blur-3xl"
        />
        <div
          ref={(el) => (orbRefs.current[1].current = el)}
          className="absolute top-1/3 -left-24 h-56 w-56 rounded-full bg-cyan-100/60 blur-3xl"
        />
        <div
          ref={(el) => (orbRefs.current[2].current = el)}
          className="absolute bottom-1/4 right-1/5 h-40 w-40 rounded-full bg-sky-100/50 blur-2xl"
        />
        <div
          ref={(el) => (orbRefs.current[3].current = el)}
          className="absolute top-2/3 left-1/4 h-32 w-32 rounded-full bg-teal-50/80 blur-2xl"
        />
        <div
          ref={(el) => (orbRefs.current[4].current = el)}
          className="absolute bottom-1/3 right-1/3 h-24 w-24 rounded-full bg-cyan-50/70 blur-xl"
        />
      </div>

      {/* Skip to main - accessibility */}
      <a
        href="#notfound-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-teal-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:no-underline"
      >
        Loncat ke konten utama
      </a>

      <main
        id="notfound-main"
        ref={mainRef}
        className="relative z-10 w-full max-w-lg mx-auto px-4 sm:px-6 text-center"
        role="main"
        aria-labelledby="notfound-title"
        aria-describedby="notfound-desc"
      >
        <div
          ref={codeRef}
          className="inline-flex items-center justify-center mb-4"
          aria-hidden="true"
        >
          <span
            className="text-7xl sm:text-8xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-teal-500 via-cyan-600 to-sky-600 select-none"
            style={{ lineHeight: 1 }}
          >
            404
          </span>
        </div>

        <h1
          id="notfound-title"
          ref={titleRef}
          className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-3"
        >
          Halaman tidak ditemukan
        </h1>

        <p
          id="notfound-desc"
          ref={descRef}
          className="text-slate-600 text-base sm:text-lg mb-8 max-w-md mx-auto leading-relaxed"
        >
          URL yang Anda buka tidak tersedia atau telah dipindahkan. Gunakan tombol di bawah untuk kembali ke beranda.
        </p>

        <nav
          ref={actionsRef}
          className="flex items-center justify-center"
          aria-label="Navigasi pemulihan"
        >
          <Button
            onClick={() => navigate('/')}
            className="min-w-[200px] bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-400 text-white shadow-md hover:shadow-lg transition-shadow"
            aria-label="Kembali ke beranda"
          >
            <Home className="w-4 h-4 mr-2 shrink-0" aria-hidden />
            Kembali ke Beranda
          </Button>
        </nav>

        <p className="mt-8 text-sm text-slate-500">
          <span className="sr-only">Tip: </span>
          Jika Anda mengetik URL, periksa ejaan atau{' '}
          <a
            href="/"
            className="text-teal-600 hover:text-teal-700 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded"
          >
            buka beranda
          </a>
          .
        </p>
      </main>

      {/* Optional: back via browser */}
      <div className="relative z-10 mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
          aria-label="Kembali ke halaman sebelumnya"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Halaman sebelumnya
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
