import { motion } from 'motion/react';
import { ArrowRight, Clock, Shield, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { ClinicBranding } from '../App';

interface FinalCTAProps {
  clinicBranding: ClinicBranding;
}

export function FinalCTA({ clinicBranding: _clinicBranding }: FinalCTAProps) {
  const scrollToForm = () => {
    document.getElementById('smile-transform')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 px-4 py-16 sm:px-6 lg:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-grid-slate absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        <div className="absolute top-0 left-1/2 h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5">
          <Sparkles className="h-4 w-4 text-cyan-300" />
          <span className="text-xs font-semibold tracking-wide text-cyan-200 sm:text-sm">Free · No obligation · 30 seconds</span>
        </div>

        <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Stop wondering what your
          <span className="text-gradient-cyan block">new smile could look like.</span>
        </h2>

        <p className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Join 10,000+ people who previewed their transformation before ever sitting in the chair. Your photo, your
          style, your future smile — free.
        </p>

        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-block">
          <Button
            onClick={scrollToForm}
            size="lg"
            className="animate-gradient-x h-14 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-500 px-10 text-base font-bold text-white shadow-xl shadow-cyan-500/30"
          >
            Get My Free Smile Preview
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-400">
          <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-cyan-400" /> Private & secure</span>
          <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-cyan-400" /> Instant results</span>
          <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-400" /> No credit card</span>
        </div>
      </motion.div>
    </section>
  );
}
