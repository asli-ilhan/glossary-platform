'use client';

import { useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPageWithVideo({ onEnter }: LandingPageProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Side - Video */}
      <div className="flex-1 relative overflow-hidden">
        {/* YouTube Video Embed */}
        <iframe
          src="https://www.youtube.com/embed/bEBLDfP3zvg?autoplay=1&mute=1&loop=1&playlist=bEBLDfP3zvg&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&cc_load_policy=0&playsinline=1&enablejsapi=1"
          title="Digital Literacy Toolkit Introduction"
          className="w-full h-full object-cover"
          style={{
            minWidth: '100%',
            minHeight: '100%',
            width: '100%',
            height: '100vh'
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={false}
          onLoad={() => setVideoLoaded(true)}
        />

        {/* Loading Indicator for Video */}
        {!videoLoaded && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white font-medium">Loading video...</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Content Window */}
      <div className="w-96 bg-black border-l border-gray-700 flex flex-col relative overflow-y-auto">
        {/* Content */}
        <div className="flex-1 p-8 pt-4 flex flex-col justify-start">
          <div className="space-y-6">
            <div className="text-gray-300 space-y-4 text-sm leading-relaxed">
              <p>
                The Digital Literacy Toolkit is a public-facing, interdisciplinary platform developed by the MA Internet Equalities course at the Creative Computing Institute, University of the Arts London. It brings together technical knowledge, critical theory, and real-world examples to help students, educators, and the wider public understand and challenge the structural inequalities embedded in digital systems and infrastructures.
              </p>
              
              <p>
                The internet is not just what we see on screens. It is a layered stack of code, interfaces, infrastructures, and decisions shaped by power, abstraction, and omission. As digital technologies grow more complex, the knowledge needed to make sense of them becomes increasingly fragmented across fields like coding, ethics, design, and social theory.
              </p>

              <p>
                This Toolkit brings those fields together. Through interactive maps, glossary contributions, short videos, and hands-on resources, it shows how technologies are built, how inequality is encoded through them, and how alternative approaches can be imagined.
                It is designed to evolve through student-led content, collaborative teaching, and critical engagement with the digital systems shaping our world.
              </p>
            </div>

            {/* Credits Section - Moved higher */}
            <div className="pt-6 border-t border-gray-700">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Created by:</h4>
              <div className="text-xs text-gray-500 space-y-1 leading-relaxed">
                <p>
                  <span className="font-medium text-gray-400">Ceren Yuksel</span> <br /> Concept and System Design | Senior Lecturer and Course Leader at MA Internet Equalities, Creative Computing Institute, UAL
                </p>
                <p>
                  <span className="font-medium text-gray-400">Ayse Asli Ilhan</span> <br /> Interactive Development and Technical Lead | Associate Lecturer at MA Internet Equalities, Creative Computing Institute, UAL
                </p>
              </div>
            </div>

            {/* Enter Button - Smaller and right-aligned */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={onEnter}
                className="flex items-center gap-2 px-4 py-2 text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 rounded-md transition-colors duration-200 font-medium text-sm"
              >
                Enter Platform
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 