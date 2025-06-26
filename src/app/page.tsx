'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SunburstVisualization from '@/app/components/SunburstVisualization';
import LandingPage from '@/app/components/LandingPage';
import TutorialOverlay from '@/app/components/TutorialOverlay';
import { visualizationTutorial } from '@/app/utils/tutorialSteps';
import { useState, useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showLanding, setShowLanding] = useState(true); // Always start with introduction
  const [showTutorial, setShowTutorial] = useState(false);

  // Handle URL parameters for specific navigation requests
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const showVisualization = urlParams.get('showVisualization');
    
    if (showVisualization === 'true') {
      setShowLanding(false);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
    // Default: keep showing landing page (already true)
  }, []);

  // Listen for landing page trigger from header
  useEffect(() => {
    const handleShowLanding = (event: CustomEvent) => {
      // Only show landing page if explicitly requested (e.g., from Introduction menu item)
      if (event.detail && event.detail.explicit) {
        setShowLanding(true);
      } else {
        // Regular home navigation goes to visualization
        setShowLanding(false);
      }
    };

    const handleShowTutorial = (event: CustomEvent) => {
      if (event.detail === 'visualization') {
        setShowTutorial(true);
      }
    };
    
    window.addEventListener('showLandingPage', handleShowLanding as EventListener);
    window.addEventListener('showTutorial', handleShowTutorial as EventListener);
    return () => {
      window.removeEventListener('showLandingPage', handleShowLanding as EventListener);
      window.removeEventListener('showTutorial', handleShowTutorial as EventListener);
    };
  }, []);

  // Communicate landing page state to header
  useEffect(() => {
    // Dispatch event to let header know about landing page state
    window.dispatchEvent(new CustomEvent('landingPageState', { 
      detail: { showLanding } 
    }));
  }, [showLanding]);

  const handleEnterPlatform = () => {
    setShowLanding(false);
    
    // Check if user wants to see tutorial
    const hasSeenTutorial = localStorage.getItem('hasSeenVisualizationTutorial');
    if (hasSeenTutorial !== 'true') {
      // Show tutorial after a short delay to let the page load
      setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
    }
  };

  const handleTutorialComplete = () => {
    localStorage.setItem('hasSeenVisualizationTutorial', 'true');
    setShowTutorial(false);
  };

  const handleTutorialSkip = () => {
    localStorage.setItem('hasSeenVisualizationTutorial', 'true');
    setShowTutorial(false);
  };

  if (status === 'loading') {
    return (
      <div className="container text-center mt-12">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div>
      {/* Show landing page if user hasn't seen it before */}
      {showLanding ? (
        <LandingPage onEnter={handleEnterPlatform} />
      ) : (
        <>
          {/* Full Screen Visualization */}
          <div className="w-full">
            <SunburstVisualization />
          </div>

          {/* Contribution Section - Better Layout */}
          <div className="bg-black mt-1">
            <div className="w-full px-8 py-12">
              <div className="max-w-2xl">
                <p className="text-gray-400 text-lg leading-relaxed mb-6">
                  This toolkit evolves through collaborative contributions. Contributors can add new terms, expand existing descriptions, propose alternative interpretations, and actively make connections between disciplines, knowledge areas, and technologies.
                </p>
                <button 
                  onClick={() => router.push('/glossary')} 
                  className="primary text-base px-4 py-2"
                >
                  Contribute to the Toolkit
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tutorial Overlay */}
      <TutorialOverlay
        steps={visualizationTutorial}
        isVisible={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />
    </div>
  );
}
