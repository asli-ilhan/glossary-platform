'use client';

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Centered Content */}
      <div className="max-w-5xl mx-auto py-16">
        <div className="text-center space-y-12">
          
          {/* Title Section */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white mb-2">Digital Literacy Toolkit</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              An interdisciplinary platform for understanding digital inequalities
            </p>
          </div>

          {/* Main Content */}
          <div className="text-gray-300 space-y-8 text-lg leading-relaxed max-w-4xl mx-auto text-left">
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

          {/* Enter Button - Centered */}
          <div className="pt-4">
            <button
              onClick={onEnter}
              className="flex items-center gap-3 px-8 py-3 text-white bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 rounded-md transition-colors duration-200 font-medium text-lg mx-auto"
            >
              Enter Platform
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>

          {/* Credits Section - Centered at bottom */}
          <div className="pt-16 border-t border-gray-700 max-w-3xl mx-auto">
            <h4 className="text-sm font-medium text-gray-400 mb-6 text-left">Created by:</h4>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-500 leading-relaxed">
              <div className="text-center md:text-left">
                <span className="font-medium text-gray-400 block mb-1">Ceren Yuksel</span>
                <p>Concept and System Design</p>
                <p className="text-xs mt-1">Senior Lecturer and Course Leader at MA Internet Equalities, Creative Computing Institute, UAL</p>
              </div>
              <div className="text-center md:text-left">
                <span className="font-medium text-gray-400 block mb-1">Ayse Asli Ilhan</span>
                <p>Interactive Development and Technical Lead</p>
                <p className="text-xs mt-1">Associate Lecturer at MA Internet Equalities, Creative Computing Institute, UAL</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 