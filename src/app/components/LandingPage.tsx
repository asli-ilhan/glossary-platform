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
          <div className="space-y-6 mb-24">
            <h1 className="text-4xl font-bold text-white mb-4">The Digital Literacy Toolkit</h1>
            <div className="text-lg text-gray-400 max-w-3xl mx-auto space-y-2">
              <p>MA Internet Equalities</p>
              <p>Creative Computing Institute I University of the Arts London</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="text-gray-300 text-lg leading-relaxed max-w-4xl mx-auto text-left space-y-6">
            <p>
              The internet is not just what we see on digital interfaces. It is a stack of technologies cables, protocols, code, algorithms, and databases that work together through abstraction. It means we don't need to understand the layered complexity beneath when we open an app, interact on social media, or consume data. But that same abstraction makes it harder to ask: Who holds power through access to finances, technical resources, organising capacity, and skills? Whose knowledge is stored, surfaced, or silenced from infrastructure to interface, from offline to online, as people who are data subjects become subjects of data. Inequality lands hardest on those already pushed to the margins through race, class, gender, nationality, migration status, or disability. The technical layers of the internet have evolved, but they have not replaced these long-standing issues of power and control. They simply continue to operate within them.
            </p>
            <p>
              This toolkit is a visual glossary that connects disciplines, knowledge areas, and technologies for students, educators, practitioners, artists, and anyone interested in understanding how digital systems work and how they reproduce inequality. It creates a shared knowledge space to explore the layers of technology and power and supports those working to question and change these systems.
            </p>
                </div>
                
          {/* Authorship Section - Bottom with updated content */}
          <div className="pt-16 border-t border-gray-700 max-w-3xl mx-auto">
            <h4 className="text-sm font-medium text-gray-400 mb-6 text-left">Created by</h4>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-500 leading-relaxed">
              <div className="text-left">
                <span className="font-medium text-gray-400 block mb-1">Dr. Ceren Yüksel</span>
                <p className="mb-1">Concept I System Design I Editor</p>
                <p className="text-xs mt-1">Senior Lecturer and Course Leader, MA Internet Equalities</p>
                <p className="text-xs">Creative Computing Institute, University of the Arts London</p>
              </div>
              <div className="text-left">
                <span className="font-medium text-gray-400 block mb-1">Ayşe Aslı Ilhan</span>
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