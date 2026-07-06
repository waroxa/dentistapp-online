import { motion } from 'motion/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { ClinicBranding } from '../App';

const FAQS = [
  {
    q: 'Is the AI smile preview really free?',
    a: 'Yes — your preview is 100% free with no payment details required. Upload a photo, pick a style, and see your new smile in about 30 seconds. If you love the result, our team can walk you through the treatment options that get you there.',
  },
  {
    q: 'What happens to my photo after I upload it?',
    a: 'Your photo is processed securely and used only to generate your smile preview. It is never sold or shared with third parties, and you can request deletion at any time. See our Privacy Notice for full details.',
  },
  {
    q: 'How accurate is the preview compared to real treatment?',
    a: 'The AI is trained on real cosmetic dentistry outcomes and gives a realistic visualization of veneers, whitening, and alignment results. Your dentist will refine the final treatment plan to match your anatomy, but most patients find the preview remarkably close to their final result.',
  },
  {
    q: 'Which treatments can the preview simulate?',
    a: 'You can preview three styles: Subtle (gentle refinement), Natural (balanced enhancement), and Hollywood (bright, high-impact makeover) — covering veneers, whitening, Invisalign-style alignment, and full smile makeovers.',
  },
  {
    q: 'What kind of photo works best?',
    a: 'A clear, front-facing photo with a natural smile and good lighting works best. Phone selfies are perfectly fine — just make sure your teeth are visible. JPG, PNG, and WEBP up to 10MB are supported.',
  },
  {
    q: 'What happens after I get my preview?',
    a: 'You can also generate a short AI video of your new smile. A member of the dental team will then reach out to answer questions and, if you want, book a no-obligation consultation to make your preview a reality.',
  },
] as const;

interface FAQProps {
  clinicBranding: ClinicBranding;
}

export function FAQ({ clinicBranding }: FAQProps) {
  const primaryColor = clinicBranding.primaryColor || '#0891b2';

  return (
    <section id="faq" className="bg-slate-50 px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <p className="mb-3 text-sm font-bold tracking-widest uppercase" style={{ color: primaryColor }}>
            Questions, answered
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Everything you want to know
          </h2>
          <p className="mt-3 text-base text-slate-500">
            Still curious? Get your free preview and ask us anything during your consultation.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-5 shadow-sm data-[state=open]:shadow-md"
              >
                <AccordionTrigger className="py-4 text-left text-sm font-semibold text-slate-900 hover:no-underline sm:text-base">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-slate-600">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
