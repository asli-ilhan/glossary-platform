'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SunburstVisualization from '@/app/components/SunburstVisualization';
import { useState, useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (status !== 'loading' && !session) {
      setShowWelcome(true);
    }
  }, [session, status]);

  const handleSignIn = () => {
    router.push('/auth/signin');
  };

  const handleSignUp = () => {
    router.push('/auth/register');
  };

  if (status === 'loading') {
    return (
      <div className="container text-center mt-12">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        {/* Top Section for Non-Authenticated Users */}
        <div className="w-full px-8">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4">Welcome to MAI Knowledge Platform</h1>
            <p className="text-gray-400 mb-6">Explore the interactive knowledge visualization and comprehensive glossary</p>
            <div className="space-x-4">
              <button onClick={handleSignIn} className="primary">
                Sign In
              </button>
              <button onClick={handleSignUp} className="secondary">
                Sign Up
              </button>
            </div>
          </div>
        </div>
        
        {/* Show full-screen visualization preview */}
        <div className="w-full relative">
          <div className="absolute inset-0 bg-black bg-opacity-50 z-10 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white text-xl mb-4">Sign in to interact with the visualization</p>
              <button onClick={handleSignIn} className="primary">
                Get Started
              </button>
            </div>
          </div>
          <div className="opacity-75 pointer-events-none">
            <SunburstVisualization />
          </div>
        </div>

        {/* Glossary Section for Non-Authenticated */}
        <div className="bg-gray-900 mt-16">
          <div className="w-full px-8 py-12">
            <div className="flex justify-between items-start max-w-none">
              <div className="flex-1 pr-12">
                <h2 className="text-3xl font-bold mb-4">Browse Glossary Terms</h2>
                <button 
                  onClick={handleSignIn} 
                  className="primary text-lg px-8 py-3"
                >
                  Sign In to Explore
                </button>
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-lg leading-relaxed">
                  Access our comprehensive glossary with detailed definitions and explanations of key concepts, 
                  technologies, and methodologies. Create your account to unlock the full learning experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For authenticated users, show the full experience
  return (
    <div>
      {/* Top Section with Title and Help */}
      <div className="w-full px-8">
        <div className="flex justify-between items-center py-6">
          <h1 className="text-3xl font-bold">MAI Knowledge Platform</h1>
          <button 
            onClick={() => {
              // We'll need to pass this to the SunburstVisualization component
              window.dispatchEvent(new CustomEvent('showInstructions'));
            }}
            className="secondary text-sm px-4 py-2"
          >
            Help
          </button>
        </div>
      </div>

      {/* Full Screen Visualization */}
      <div className="w-full">
        <SunburstVisualization />
      </div>

      {/* Glossary Section - Better Layout */}
      <div className="bg-gray-900 mt-16">
        <div className="w-full px-8 py-12">
          <div className="flex justify-between items-start max-w-none">
            <div className="flex-1 pr-12">
              <h2 className="text-3xl font-bold mb-4">Browse Glossary Terms</h2>
              <button 
                onClick={() => router.push('/glossary')} 
                className="primary text-lg px-8 py-3"
              >
                Explore Glossary
              </button>
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-lg leading-relaxed">
                Dive deeper into detailed definitions and explanations of key concepts, 
                technologies, and methodologies. Our comprehensive glossary provides 
                context and clarity for your learning journey.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
