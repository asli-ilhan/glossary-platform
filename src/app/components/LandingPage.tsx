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
          <div className="space-y-8 mb-16">
            <h1 className="text-5xl font-bold text-white leading-tight">The Digital Literacy Toolkit</h1>
            <div className="text-xl text-gray-300 max-w-3xl mx-auto space-y-2">
              <p>MA Internet Equalities</p>
              <p>Creative Computing Institute I University of the Arts London</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-3xl mx-auto mb-12">
            <p className="text-base text-gray-300 leading-relaxed text-center">
              A visual glossary and a shared knowledge space that connects disciplines, knowledge areas, and technologies for students, educators, practitioners, artists, and anyone interested in understanding how digital systems work and how they reproduce inequality.
            </p>
          </div>

          {/* Entry Button */}
          <div className="mb-16">
            <button
              onClick={onEnter}
              className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm inline-flex items-center gap-2"
            >
              Enter the Toolkit
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
                
          {/* Authorship Section - Bottom with updated content */}
          <div className="pt-12 border-t border-gray-800 max-w-3xl mx-auto">
            <h4 className="text-xs font-medium text-gray-500 mb-4 text-left uppercase tracking-wide">Created by</h4>
            <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-600 leading-relaxed">
              <div className="text-left">
                <span className="font-medium text-gray-500 block mb-1">Dr. Ceren Yüksel</span>
                <p className="mb-1">Concept I System Design I Editor</p>
                <p className="text-xs mt-1">Senior Lecturer and Course Leader, MA Internet Equalities</p>
                <p className="text-xs">Creative Computing Institute, University of the Arts London</p>
              </div>
              <div className="text-left">
                <span className="font-medium text-gray-500 block mb-1">Ayşe Aslı Ilhan</span>
                <p className="mb-1">Interactive Development I Technical Lead</p>
                <p className="text-xs mt-1">Associate Lecturer, MA Internet Equalities</p>
                <p className="text-xs">Creative Computing Institute, University of the Arts London</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 