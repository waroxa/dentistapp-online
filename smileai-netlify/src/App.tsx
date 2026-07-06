import React, { useEffect, useState } from 'react';
import { SmileVisionProApp } from './components/ghl/SmileVisionProApp';
import { Hero } from './components/Hero';
import { SmileTransformationSection } from './components/SmileTransformationSection';
import { PremiumExamples } from './components/PremiumExamples';
import { VideoExamples } from './components/VideoExamples';
import { HowItWorks } from './components/HowItWorks';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';
import { SocialProofNotifications } from './components/SocialProofNotifications';
import { GettingStarted } from './components/docs/GettingStarted';
import { SetupGuide } from './components/docs/SetupGuide';
import { Support } from './components/docs/Support';
import { Privacy } from './components/docs/Privacy';
import { Terms } from './components/docs/Terms';
import { PrivacyNotice } from './components/docs/HipaaNotice';
import { StaffLoginModal } from './components/StaffLoginModal';
import { getClinicBranding } from './utils/ghl-storage';
import { LandingPageTestimonial } from './data/testimonials';
import { createDefaultClinicBranding } from './data/defaultBranding';

export interface ClinicBranding {
  clinicName: string;
  logo?: string;
  primaryColor: string;
  accentColor: string;
  heroImage?: string;
  contactInfo?: { address?: string; phone?: string; email?: string };
  socialMedia?: { facebook?: string; instagram?: string; tiktok?: string; linkedin?: string; youtube?: string };
  testimonials?: LandingPageTestimonial[];
  googleReviewsScript?: string;
}

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clinicBranding, setClinicBranding] = useState<ClinicBranding>(createDefaultClinicBranding);

  const path = window.location.pathname;
  const search = window.location.search;

  const resolveWorkspaceKey = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('location_id') || params.get('locationId') || sessionStorage.getItem('workspace_current_location_id') || localStorage.getItem('workspace_location_id') || 'default';
  };

  useEffect(() => {
    document.title = 'SmileVisionPro AI';
    const workspaceKey = resolveWorkspaceKey();
    fetch(`/api/admin/session?workspaceKey=${encodeURIComponent(workspaceKey)}`, { credentials: 'include' })
      .then((res) => setIsAdmin(res.ok))
      .catch(() => setIsAdmin(false));

    getClinicBranding()
      .then((branding) => {
        if (!branding) return;
        setClinicBranding((current) => ({
          ...current,
          ...branding,
          accentColor: branding.accentColor || current.accentColor,
        }));
      })
      .catch(() => {});
  }, []);

  if (path === '/getting-started') return <GettingStarted />;
  if (path === '/setup-guide') return <SetupGuide />;
  if (path === '/support') return <Support />;
  if (path === '/privacy') return <Privacy />;
  if (path === '/terms') return <Terms />;
  if (path === '/privacy-notice' || path === '/hipaa-notice') return <PrivacyNotice />;
  if (path === '/ghl-callback') {
    window.location.replace('/admin/integrations');
    return null;
  }

  if (path.startsWith('/admin')) {
    return isAdmin ? (
      <SmileVisionProApp
        clinicBranding={clinicBranding}
        onBrandingChange={setClinicBranding}
        onLogout={async () => {
          await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
          window.location.href = '/';
        }}
      />
    ) : (
      <>
        <StaffLoginModal
          isOpen={true}
          onClose={() => { window.location.href = '/'; }}
          onSuccess={() => {
            setIsAdmin(true);
            window.location.href = `/admin${search}`;
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Hero clinicBranding={clinicBranding} />
      <div id="examples">
        <PremiumExamples clinicBranding={clinicBranding} />
      </div>
      <VideoExamples clinicBranding={clinicBranding} />
      <SmileTransformationSection clinicBranding={clinicBranding} />
      <div id="how-it-works">
        <HowItWorks clinicBranding={clinicBranding} />
      </div>
      <Testimonials clinicBranding={clinicBranding} />
      <FAQ clinicBranding={clinicBranding} />
      <FinalCTA clinicBranding={clinicBranding} />
      <Footer clinicBranding={clinicBranding} />
      <SocialProofNotifications enabled={!showLogin} />
      <StaffLoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => {
          setShowLogin(false);
          setIsAdmin(true);
          window.location.href = `/admin${search}`;
        }}
      />
    </div>
  );
}

export default App;

