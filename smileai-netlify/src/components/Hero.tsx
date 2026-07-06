import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Star, Shield, Sparkles, Clock, ChevronsLeftRight, Play } from 'lucide-react';
import { Button } from './ui/button';
import { ClinicBranding } from '../App';
import { motion } from 'motion/react';
import beforeImage from 'figma:asset/e48e1508ae690e5a9f1735226e02db94194bc3f0.png';
import afterImage from 'figma:asset/ba88f5071e0e5b56767bf8cea28598b75d5eaf55.png';

interface HeroProps {
  clinicBranding: ClinicBranding;
}

// Tooth logo URL
const TOOTH_LOGO = 'https://customer-assets.emergentagent.com/job_6ddaa510-f452-47bb-9414-8c025b23d77a/artifacts/67lipfsx_Untitled%20design%20%2845%29.png';

const STATS = [
  { value: '10,000+', label: 'Smiles previewed' },
  { value: '30 sec', label: 'Average preview time' },
  { value: '4.9/5', label: 'Patient rating' },
  { value: '1,000+', label: 'Dental teams' },
] as const;

function BeforeAfterSlider() {
  const [position, setPosition] = useState(55);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const move = (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = ((clientX - rect.left) / rect.width) * 100;
      setPosition(Math.min(95, Math.max(5, next)));
    };
    const onPointerMove = (e: PointerEvent) => {
      if (draggingRef.current) move(e.clientX);
    };
    const onPointerUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/5] w-full cursor-ew-resize touch-none overflow-hidden rounded-2xl select-none"
      onPointerDown={(e) => {
        draggingRef.current = true;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) setPosition(Math.min(95, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100)));
      }}
    >
      <img src={afterImage} alt="AI smile preview — after" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={beforeImage}
          alt="Original photo — before"
          className="absolute inset-0 h-full object-cover"
          style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%', maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      {/* Divider handle */}
      <div className="absolute inset-y-0" style={{ left: `${position}%` }}>
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.4)]" />
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-xl ring-4 ring-white/30">
            <ChevronsLeftRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      <span className="absolute top-3 left-3 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">Before</span>
      <span className="absolute top-3 right-3 rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">AI Preview</span>
    </div>
  );
}

export function Hero({ clinicBranding }: HeroProps) {
  const primaryColor = clinicBranding.primaryColor || '#0891b2';
  const logo = clinicBranding.logo || TOOTH_LOGO;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="relative overflow-hidden bg-slate-950">
      {/* Sticky glass navigation */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'border-b border-white/10 bg-slate-950/80 shadow-lg backdrop-blur-xl' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-3">
            <img src={logo} alt={clinicBranding.clinicName} className="h-10 w-10 rounded-xl bg-white object-contain p-1 shadow-md" />
            <div>
              <p className="text-sm font-bold text-white sm:text-base">{clinicBranding.clinicName}</p>
              <p className="hidden text-[11px] font-medium tracking-wide text-cyan-300/80 sm:block">AI SMILE PREVIEW PLATFORM</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-6 text-sm font-medium text-slate-300 lg:flex">
              <button onClick={() => scrollToId('examples')} className="transition hover:text-white">Results</button>
              <button onClick={() => scrollToId('how-it-works')} className="transition hover:text-white">How it works</button>
              <button onClick={() => scrollToId('faq')} className="transition hover:text-white">FAQ</button>
            </div>
            <Button
              onClick={() => scrollToId('smile-transform')}
              className="h-9 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-400/40 sm:h-10 sm:px-6"
            >
              Free Preview
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </nav>

      {/* Background texture */}
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-grid-slate absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]" />
        <div className="absolute -top-40 left-1/4 h-[480px] w-[480px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[420px] w-[420px] rounded-full bg-sky-600/20 blur-[120px]" />
        <div className="absolute -bottom-24 left-0 h-[320px] w-[320px] rounded-full bg-indigo-600/15 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-28 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pt-36 lg:pb-24">
        {/* Copy */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <span className="text-xs font-semibold tracking-wide text-cyan-200 sm:text-sm">Trusted by 1,000+ dental professionals worldwide</span>
          </div>

          <h1 className="mb-6 text-4xl leading-[1.08] font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your dream smile,
            <span className="text-gradient-cyan block">revealed in 30 seconds.</span>
          </h1>

          <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Upload one photo and watch AI design your smile transformation — veneers, whitening, Invisalign or a full
            makeover. Free, private, and ready before your first consultation.
          </p>

          <div className="mb-10 flex flex-col gap-3 sm:flex-row">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => scrollToId('smile-transform')}
                size="lg"
                className="animate-gradient-x h-13 w-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-500 px-8 text-base font-bold text-white shadow-xl shadow-cyan-500/30 sm:h-14 sm:w-auto"
              >
                Get My Free Smile Preview
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => scrollToId('examples')}
                variant="outline"
                size="lg"
                className="h-13 w-full rounded-full border-2 border-white/20 bg-white/5 px-8 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 hover:text-white sm:h-14 sm:w-auto"
              >
                <Play className="mr-2 h-4 w-4" />
                See Real Results
              </Button>
            </motion.div>
          </div>

          <div className="mb-10 flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Shield className="h-4 w-4 text-cyan-400" /> Private & secure
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Clock className="h-4 w-4 text-cyan-400" /> Results in seconds
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> 4.9/5 from 1,200+ patients
            </div>
          </div>

          {/* Stats */}
          <div className="grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-slate-950/60 px-4 py-4 backdrop-blur-sm">
                <p className="text-xl font-extrabold text-white sm:text-2xl">{stat.value}</p>
                <p className="mt-0.5 text-[11px] font-medium tracking-wide text-slate-400 uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Interactive before/after */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-cyan-500/30 via-sky-500/10 to-indigo-500/30 blur-2xl" />
          <div className="relative rounded-[1.75rem] border border-white/15 bg-white/5 p-3 shadow-2xl backdrop-blur-md">
            <BeforeAfterSlider />
            <div className="flex items-center justify-between px-2 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: primaryColor }}>
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Drag to compare</p>
                  <p className="text-[11px] text-slate-400">Real AI-generated preview</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">100% Free</span>
            </div>
          </div>

          {/* Floating chips */}
          <div className="animate-float absolute -top-5 -left-3 hidden rounded-2xl border border-white/15 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur-md sm:block">
            <p className="text-xs font-bold text-white">⚡ Preview ready</p>
            <p className="text-[11px] text-slate-400">in 28 seconds</p>
          </div>
          <div className="animate-float-delayed absolute -right-3 -bottom-5 hidden rounded-2xl border border-white/15 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur-md sm:block">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">"I finally said yes to veneers"</p>
          </div>
        </motion.div>
      </div>

      {/* Bottom fade into next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
    </section>
  );
}
