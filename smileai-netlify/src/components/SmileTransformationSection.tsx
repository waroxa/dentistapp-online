import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Loader2,
  Mail,
  Phone,
  FileText,
  Save,
  Sparkles,
  Upload,
  User,
  Video,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ClinicBranding } from '../App';

type SmileStyle = 'subtle' | 'natural' | 'hollywood';
type VideoProvider = 'veo';
type FavoriteResult = 'original' | 'preview' | 'video' | null;

interface VideoResult {
  provider: VideoProvider;
  assetUrl: string;
  jobId: string | null;
  model?: string | null;
  note?: string;
}

interface ProviderUiMessage {
  type: 'error' | 'success' | 'info';
  message: string;
}

interface PendingVideoJob {
  provider: VideoProvider;
  jobId: string;
  model?: string | null;
  note?: string;
}

interface LeadFormData {
  fullName: string;
  email: string;
  phone: string;
  interestedIn: string;
  notes: string;
}

interface LeadFormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  interestedIn?: string;
}

const motivationalMessages = [
  '✨ Imagine waking up every day loving your smile...',
  '💫 A confident smile can transform your entire life',
  '🌟 Your dream smile is closer than you think',
  '💎 Invest in yourself - you deserve to feel amazing',
  '🎯 Confidence starts with a smile you are proud of',
  '🚀 Picture yourself smiling without hesitation',
] as const;

const INTEREST_OPTIONS = ['Veneers', 'Invisalign', 'Whitening', 'Smile Makeover', 'Other'] as const;

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Video API returned non-JSON response. Check backend route/rewrite. Non-JSON API response: ${text.slice(0, 300)}`);
  }
  return response.json();
}

function getVideoEndpoint(provider: VideoProvider) {
  return '/api/video/veo';
}

// Professional Cyan color scheme for dental SaaS
const BRAND_PRIMARY = '#0891b2';

const STYLE_OPTIONS: Array<{ value: SmileStyle; label: string; helper: string; accent: string }> = [
  {
    value: 'subtle',
    label: 'Subtle',
    helper: 'Gentle cosmetic refinement',
    accent: 'from-sky-50 via-white to-blue-50',
  },
  {
    value: 'natural',
    label: 'Natural',
    helper: 'Natural: Balanced, realistic enhancement',
    accent: 'from-blue-50 via-white to-sky-50',
  },
  {
    value: 'hollywood',
    label: 'Hollywood',
    helper: 'Hollywood: Bright, high-impact smile makeover',
    accent: 'from-cyan-50 via-white to-blue-50',
  },
];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getStepIndex(isLeadCaptured: boolean, uploadedImage: string | null, previewImage: string | null, videoResults: Partial<Record<VideoProvider, VideoResult>>) {
  if (!isLeadCaptured) return 1;
  if (Object.keys(videoResults).length > 0) return 6;
  if (previewImage) return 5;
  if (uploadedImage) return 3;
  return 2;
}

interface SmileTransformationSectionProps {
  clinicBranding: ClinicBranding;
}

export function SmileTransformationSection({ clinicBranding }: SmileTransformationSectionProps) {
  const [leadForm, setLeadForm] = useState<LeadFormData>({
    fullName: '',
    email: '',
    phone: '',
    interestedIn: '',
    notes: '',
  });
  const [leadErrors, setLeadErrors] = useState<LeadFormErrors>({});
  const [leadId, setLeadId] = useState<string | null>(null);
  const [crmContactId, setCrmContactId] = useState<string | null>(null);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState<string | null>(null);
  const [isLeadCaptured, setIsLeadCaptured] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewAssetUrl, setPreviewAssetUrl] = useState<string | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [style, setStyle] = useState<SmileStyle>('natural');
  const [_videoProvider, setVideoProvider] = useState<VideoProvider>('veo');
  const [videoResults, setVideoResults] = useState<Partial<Record<VideoProvider, VideoResult>>>({});
  const [pendingVideoJobs, setPendingVideoJobs] = useState<Partial<Record<VideoProvider, PendingVideoJob>>>({});
  const [processingPreview, setProcessingPreview] = useState(false);
  const [videoProcessing, setVideoProcessing] = useState<VideoProvider | null>(null);
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [providerMessages, setProviderMessages] = useState<Partial<Record<VideoProvider, ProviderUiMessage>>>({});
  const [favoriteResult, setFavoriteResult] = useState<FavoriteResult>(null);
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedStyle = useMemo(() => STYLE_OPTIONS.find((option) => option.value === style) ?? STYLE_OPTIONS[1], [style]);
  const canGeneratePreview = isLeadCaptured && Boolean(uploadedImage) && !processingPreview;
  const canGenerateVideos = isLeadCaptured && Boolean(previewImage) && !videoProcessing;
  const primaryColor = clinicBranding.primaryColor || BRAND_PRIMARY;
  const accentColor = clinicBranding.accentColor || primaryColor;
  const primarySoft = `${primaryColor}14`;
  const primaryBorder = `${primaryColor}33`;
  const primaryGradient = `linear-gradient(to right, ${primaryColor}, ${accentColor})`;

  function formatPhoneNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone: string) {
    return phone.replace(/\D/g, '').length === 10;
  }

  function validateLeadForm() {
    const nextErrors: LeadFormErrors = {};

    if (!leadForm.fullName.trim()) nextErrors.fullName = 'Full name is required';
    if (!leadForm.email.trim()) nextErrors.email = 'Email is required';
    else if (!validateEmail(leadForm.email)) nextErrors.email = 'Please enter a valid email';
    if (!leadForm.phone.trim()) nextErrors.phone = 'Phone number is required';
    else if (!validatePhone(leadForm.phone)) nextErrors.phone = 'Please enter a valid 10-digit phone number';
    if (!leadForm.interestedIn) nextErrors.interestedIn = 'Please select a service';

    setLeadErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function _legacyHandleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateLeadForm()) return;
    setIsLeadCaptured(true);
    setSuccessMessage('Thanks! Your preview form is saved — now upload a photo to continue.');
    requestAnimationFrame(() => {
      document.getElementById('smile-upload-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function submitLeadForm(e: React.FormEvent) {
    e.preventDefault();
    if (!validateLeadForm()) return;

    setLeadSubmitting(true);
    setLeadSubmitError(null);
    setSuccessMessage(null);

    try {
      if (!leadId) {
        const response = await fetch('/api/lead-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadForm),
        });
        const data = await parseJsonResponse(response);
        if (!response.ok) throw new Error(data.error || 'We could not save your request right now. Please try again.');
        setLeadId(data.leadId || null);
        setCrmContactId(data.crmContactId || null);
      }

      setIsLeadCaptured(true);
      setSuccessMessage('Thanks! Your preview form is saved. Upload a photo to continue.');
      requestAnimationFrame(() => {
        document.getElementById('smile-upload-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (error: any) {
      setLeadSubmitError(error.message || 'We could not save your request right now. Please try again.');
    } finally {
      setLeadSubmitting(false);
    }
  }

  function resetGeneratedAssets() {
    setPreviewImage(null);
    setPreviewAssetUrl(null);
    setPreviewJobId(null);
    setVideoResults({});
    setVideoError(null);
    setPreviewError(null);
    setSuccessMessage(null);
    setFavoriteResult(null);
    setFavoriteMessage(null);
    setProviderMessages({});
    setPendingVideoJobs({});
  }

  async function handleFile(file: File) {
    setPreviewError(null);
    setVideoError(null);
    setFavoriteMessage(null);
    setProviderMessages({});

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPreviewError('Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPreviewError('File size must be less than 10MB.');
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    resetGeneratedAssets();
    setUploadedImage(dataUrl);
    setSuccessMessage('Photo uploaded successfully. Choose a preview style to continue.');
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  }

  async function generatePreview() {
    if (!uploadedImage) return;

    setProcessingPreview(true);
    setPreviewError(null);
    setVideoError(null);
    setSuccessMessage(null);
    setVideoResults({});

    try {
      const res = await fetch('/api/smile-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: uploadedImage, intensity: style, leadId, crmContactId }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'We couldn\'t generate the smile preview right now. Please try again.');
      setPreviewImage(data.previewImageUrl);
      setPreviewAssetUrl(data.previewAssetUrl || data.previewImageUrl);
      setPreviewJobId(data.jobId || null);
      setSuccessMessage('Preview ready. You can now create your smile video.');
    } catch (error: any) {
      setPreviewError(error.message || 'We couldn\'t generate the smile preview right now. Please try again.');
    } finally {
      setProcessingPreview(false);
    }
  }

  async function startVideoJob(provider: VideoProvider) {
    if (!previewImage) return;

    const res = await fetch(getVideoEndpoint(provider), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: previewImage, provider, leadId }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) throw new Error(data.error || `Unable to start AI Video.`);
    if (!data.jobId) throw new Error(`Video API did not return a job ID.`);

    setPendingVideoJobs((current) => ({
      ...current,
      [provider]: {
        provider,
        jobId: data.jobId,
        model: data.model || null,
        note: data.note || 'AI video generation started.',
      },
    }));
    setProviderMessages((current) => ({
      ...current,
      [provider]: {
        type: 'info',
        message: data.note || 'AI video started. We will keep checking until it finishes.',
      },
    }));
  }

  async function generateSingleVideo(provider: VideoProvider) {
    if (!previewImage) return;

    setVideoProcessing(provider);
    setVideoProvider(provider);
    setVideoError(null);
    setSuccessMessage(null);
    setProviderMessages((current) => ({ ...current, [provider]: undefined }));

    try {
      await startVideoJob(provider);
      setSuccessMessage('AI video started. You can stay on this page while we wait for the final result.');
    } catch (error: any) {
      const message = error.message || 'This video could not be generated yet. Please try again.';
      setProviderMessages((current) => ({
        ...current,
        [provider]: { type: 'error', message },
      }));
      setVideoError(message);
    } finally {
      setVideoProcessing(null);
    }
  }

  useEffect(() => {
    if (Object.keys(pendingVideoJobs).length === 0) return;

    const pollInterval = setInterval(async () => {
      const jobs = Object.entries(pendingVideoJobs);
      for (const [provider, job] of jobs) {
        try {
          const res = await fetch(`/api/video/veo/status?jobId=${job.jobId}`);
          const data = await parseJsonResponse(res);

          if (data.status === 'completed' && data.assetUrl) {
            setVideoResults((current) => ({
              ...current,
              [provider]: {
                provider: provider as VideoProvider,
                assetUrl: data.assetUrl,
                jobId: job.jobId,
                model: job.model,
                note: job.note,
              },
            }));
            setPendingVideoJobs((current) => {
              const updated = { ...current };
              delete updated[provider as VideoProvider];
              return updated;
            });
            setProviderMessages((current) => ({
              ...current,
              [provider]: { type: 'success', message: 'Video ready!' },
            }));
          } else if (data.status === 'failed') {
            setPendingVideoJobs((current) => {
              const updated = { ...current };
              delete updated[provider as VideoProvider];
              return updated;
            });
            setProviderMessages((current) => ({
              ...current,
              [provider]: { type: 'error', message: data.error || 'Video generation failed.' },
            }));
          }
        } catch (error: any) {
          console.error(`Error polling ${provider}:`, error);
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pendingVideoJobs]);

  useEffect(() => {
    if (videoProcessing) {
      const messageInterval = setInterval(() => {
        setWaitingMessageIndex((prev) => (prev + 1) % motivationalMessages.length);
      }, 4000);
      return () => clearInterval(messageInterval);
    }
  }, [videoProcessing]);

  function renderInfoBanner() {
    if (videoProcessing) {
      return (
        <div className="rounded-lg px-3 py-2 text-sm text-slate-700" style={{ border: `1px solid ${primaryBorder}`, backgroundColor: primarySoft }}>
          <span className="font-medium" style={{ color: primaryColor }}>Working on your video:</span> {motivationalMessages[waitingMessageIndex]}
        </div>
      );
    }

    if (!isLeadCaptured) {
      return (
        <div className="rounded-lg px-3 py-2 text-sm text-slate-700" style={{ border: `1px solid ${primaryBorder}`, backgroundColor: primarySoft }}>
          <span className="font-medium" style={{ color: primaryColor }}>Step 1 first:</span> enter patient info to unlock photo upload and preview tools.
        </div>
      );
    }

    return null;
  }

  function renderVideoCard(provider: VideoProvider, title: string) {
    const result = videoResults[provider];
    const pending = pendingVideoJobs[provider];
    const message = providerMessages[provider];

    return (
      <div key={provider} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-900">{title}</p>
          </div>
          {result && <Badge className="bg-green-100 text-[10px] text-green-700">Ready</Badge>}
          {pending && <Badge className="bg-amber-100 text-[10px] text-amber-700">Processing</Badge>}
        </div>
        <div className="bg-slate-50">
          {result?.assetUrl ? (
            <video controls autoPlay loop muted playsInline preload="metadata" className="aspect-[4/3] w-full object-contain bg-slate-950">
              <source src={result.assetUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : pending ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
              <p className="text-sm text-slate-500">Creating video...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <Video className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">Video will appear here</p>
            </div>
          )}
        </div>
        {message && (
          <div
            className={`border-t px-3 py-2 text-xs ${message.type === 'error' ? 'border-red-100 bg-red-50 text-red-700' : message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : ''}`}
            style={message.type === 'info' ? { borderColor: primaryBorder, backgroundColor: primarySoft, color: primaryColor } : undefined}
          >
            {message.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <section id="smile-transform" className="relative bg-slate-50 px-4 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-8 max-w-2xl text-center"
        >
          <p className="mb-3 text-sm font-bold tracking-widest uppercase" style={{ color: primaryColor }}>
            Free AI Smile Preview
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Try it now — see your new smile today
          </h2>
          <p className="mt-3 text-base text-slate-500">
            Three quick steps: tell us who you are, upload a photo, and let the AI design your transformation.
          </p>
        </motion.div>
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-2 lg:items-stretch">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">Step 1: Enter Your Information</h2>
              <p className="mt-1 text-sm text-slate-500">We'll create your personalized smile preview in the next step</p>
            </div>
            <form onSubmit={submitLeadForm} className="space-y-4">
              <div>
                <Label htmlFor="lead-fullName" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <User className="h-4 w-4 text-slate-400" />
                  Full Name *
                </Label>
                <Input
                  id="lead-fullName"
                  value={leadForm.fullName}
                  onChange={(e) => {
                    setLeadForm((current) => ({ ...current, fullName: e.target.value }));
                    if (leadErrors.fullName) setLeadErrors((current) => ({ ...current, fullName: undefined }));
                  }}
                  placeholder="John Smith"
                  className={`h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 placeholder:text-slate-400 ${leadErrors.fullName ? 'border-red-500' : ''}`}
                />
                {leadErrors.fullName && <p className="mt-1 text-xs text-red-600">{leadErrors.fullName}</p>}
              </div>

              <div>
                <Label htmlFor="lead-email" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  Email *
                </Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => {
                    setLeadForm((current) => ({ ...current, email: e.target.value }));
                    if (leadErrors.email) setLeadErrors((current) => ({ ...current, email: undefined }));
                  }}
                  placeholder="john@example.com"
                  className={`h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 placeholder:text-slate-400 ${leadErrors.email ? 'border-red-500' : ''}`}
                />
                {leadErrors.email && <p className="mt-1 text-xs text-red-600">{leadErrors.email}</p>}
              </div>

              <div>
                <Label htmlFor="lead-phone" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  Phone Number *
                </Label>
                <Input
                  id="lead-phone"
                  type="tel"
                  value={leadForm.phone}
                  onChange={(e) => {
                    setLeadForm((current) => ({ ...current, phone: formatPhoneNumber(e.target.value) }));
                    if (leadErrors.phone) setLeadErrors((current) => ({ ...current, phone: undefined }));
                  }}
                  placeholder="(555) 123-4567"
                  className={`h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 placeholder:text-slate-400 ${leadErrors.phone ? 'border-red-500' : ''}`}
                />
                {leadErrors.phone && <p className="mt-1 text-xs text-red-600">{leadErrors.phone}</p>}
              </div>

              <div>
                <Label htmlFor="lead-interest" className="mb-1.5 block text-sm font-medium text-slate-700">Interested In *</Label>
                <div className="relative">
                  <select
                    id="lead-interest"
                    value={leadForm.interestedIn}
                    onChange={(e) => {
                      setLeadForm((current) => ({ ...current, interestedIn: e.target.value }));
                      if (leadErrors.interestedIn) setLeadErrors((current) => ({ ...current, interestedIn: undefined }));
                    }}
                    className={`h-10 w-full rounded-lg border bg-white px-3 pr-10 text-sm text-slate-700 transition focus-visible:outline-none ${leadErrors.interestedIn ? 'border-red-500' : 'border-slate-200'}`}
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                  >
                    <option value="">Select a service...</option>
                    {INTEREST_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                {leadErrors.interestedIn && <p className="mt-1 text-xs text-red-600">{leadErrors.interestedIn}</p>}
              </div>

              <div>
                <Label htmlFor="lead-notes" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Optional Notes
                </Label>
                <Textarea
                  id="lead-notes"
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Tell us about your smile goals or any specific concerns..."
                  className="min-h-[70px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <Button type="submit" disabled={leadSubmitting} className="h-10 w-full rounded-lg text-sm font-semibold text-white shadow-sm" style={{ background: primaryGradient }}>
                {leadSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : isLeadCaptured ? 'Continue to Upload Photo' : 'Get Started Free'}
              </Button>

              <div className="space-y-3 pt-2 text-center">
                <p className="text-xs text-slate-500">
                  By continuing, you agree to be contacted about your smile transformation. Your information is secure.
                </p>
                <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1"><span className="text-emerald-500">✓</span>Privacy-Focused Workflow</span>
                  <span className="inline-flex items-center gap-1"><span className="text-emerald-500">✓</span>Secure</span>
                  <span className="inline-flex items-center gap-1"><span className="text-emerald-500">✓</span>Results in 24h</span>
                </div>
              </div>
            </form>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 sm:p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Why Get Your Free Preview?</h3>
            <div className="mt-4 space-y-3">
              {[
                ['See Your Potential', 'Visualize your transformation before committing'],
                ['100% Free & No Obligation', 'Get your AI preview instantly - no payment required'],
                ['Personalized Consultation', 'Our team will review and provide recommendations'],
                ['Fast Results', 'Get your AI smile transformation in under 30 seconds'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg px-4 py-3 text-center" style={{ border: `1px solid ${primaryBorder}`, backgroundColor: primarySoft }}>
              <p className="text-sm font-semibold" style={{ color: primaryColor }}>Over 10,000+ smiles transformed!</p>
              <p className="mt-0.5 text-xs" style={{ color: primaryColor }}>Join thousands who've discovered their dream smile.</p>
            </div>
          </motion.div>
        </div>

          {renderInfoBanner()}

          <div className={`transition-all duration-300 ${isLeadCaptured ? 'opacity-100' : 'pointer-events-none opacity-40'}`}>
            <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <motion.div id="smile-upload-panel" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="px-4 py-2.5" style={{ background: primaryGradient }}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">2. Upload Photo</h3>
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>Step 2</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div
                        className="group relative aspect-[4/5] rounded-lg border-2 border-dashed transition-all bg-slate-50"
                        style={dragActive ? { borderColor: primaryColor, backgroundColor: primarySoft } : undefined}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        {uploadedImage ? (
                          <div className="relative h-full w-full overflow-hidden rounded-md">
                            <img src={uploadedImage} alt="Original" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute bottom-2 right-2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow-md hover:bg-white"
                            >
                              <Upload className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: primarySoft, color: primaryColor }}>
                              <Upload className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">Click to upload</p>
                              <p className="text-xs text-slate-500">or drag and drop</p>
                            </div>
                          </button>
                        )}
                        <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="px-4 py-2.5" style={{ background: primaryGradient }}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">4. AI Preview</h3>
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>Step 4</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                        {previewImage ? (
                          <img src={previewImage} alt="AI Preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                            {processingPreview ? (
                              <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
                            ) : (
                              <Sparkles className="h-8 w-8 text-slate-300" />
                            )}
                            <p className="text-sm text-slate-500">
                              {processingPreview ? 'Creating preview...' : 'AI preview will appear here'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="grid w-full flex-1 gap-2 sm:grid-cols-3">
{STYLE_OPTIONS.map((option) => {
    const isSelected = style === option.value;
    return (
          <label key={option.value} className="cursor-pointer">
        <input type="radio" name="previewStyle" value={option.value} checked={isSelected} onChange={() => setStyle(option.value)} className="peer sr-only" />
        <div 
          className="rounded-lg border-2 px-3 py-2.5 text-center transition-all"
          style={isSelected 
            ? { borderColor: primaryColor, backgroundColor: primarySoft }
            : { borderColor: '#e2e8f0', backgroundColor: '#ffffff' }
          }
        >
          <p className="text-sm font-medium" style={{ color: isSelected ? primaryColor : '#0f172a' }}>{option.label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{option.helper}</p>
        </div>
      </label>
    );
  })}
                    </div>
                    <Button onClick={generatePreview} disabled={!canGeneratePreview} className="h-10 w-full rounded-lg text-sm font-semibold text-white shadow-sm xl:w-auto xl:min-w-[180px]" style={{ background: primaryGradient }}>
                      {processingPreview ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : 'Generate Preview'}
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    <span>Style: <strong className="text-slate-700">{selectedStyle.label}</strong></span>
                    <span className="hidden sm:inline">Step 3 unlocks preview</span>
                  </div>
                </motion.div>
              </div>

              <div className="space-y-4">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="px-4 py-2.5" style={{ background: primaryGradient }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">5. Video</h3>
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>Step 5</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="mb-3 text-xs text-slate-500">Video may take 2-5 minutes to generate.</p>
                    <Button onClick={() => generateSingleVideo('veo')} disabled={!canGenerateVideos} className="mb-3 h-9 w-full rounded-lg text-sm font-semibold text-white" style={{ background: primaryGradient }}>
                      {videoProcessing === 'veo' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create AI Video'}
                    </Button>
                    {renderVideoCard('veo', 'AI VIDEO RESULT')}
                  </div>
                </motion.div>


              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 space-y-2 px-4">
          {successMessage && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="rounded-lg bg-white/95 p-3 text-sm shadow-lg backdrop-blur-md" style={{ border: `1px solid ${primaryBorder}`, color: primaryColor }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: primaryColor }} />
                <p className="text-xs font-medium">{successMessage}</p>
              </div>
            </motion.div>
          )}
          {(leadSubmitError || previewError || videoError) && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="rounded-lg border border-red-200 bg-white/95 p-3 text-sm text-red-800 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-xs font-medium">{leadSubmitError || previewError || videoError}</p>
              </div>
            </motion.div>
          )}
      </div>
    </section>
  );
}
