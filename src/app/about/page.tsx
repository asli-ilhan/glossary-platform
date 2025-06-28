'use client';

export default function About() {
  return (
    <div className="px-8 py-8 pr-96">
      <h1 className="text-3xl font-bold text-white mb-8">WHAT IS THE TOOLKIT?</h1>
      
      <div className="text-lg text-gray-300 mb-12 leading-relaxed">
        <p className="mb-8">
          The Digital Literacy Toolkit began as a side project, a simple prototype developed while building the curriculum for MA Internet Equalities course at the Creative Computing Institute, University of the Arts London. The course is shaped around a search for not to teach technology as isolated coding or discipline specific skill, but to use it as a site of inquiry into the systems that shape digital life and the inequalities built into them. But the expertise needed to understand how digital systems work and how they affect people differently sits across disciplines, tools, practices, and fields that ask different questions, use different methods, and often speak in different languages for different audiences. The Toolkit brings those pieces together through accessible explanations, shared vocabulary, and a visual structure that connects terms, practices, and technologies. While the current version is simple, we are building the infrastructure to support its growth into a shared resource shaped by and contributing to the work of students, educators, practitioners, and researchers working toward more just digital futures.
        </p>
      </div>

      <h2 className="text-2xl font-bold text-white mb-6">WHO IS THE TOOLKIT FOR?</h2>
      
      <div className="space-y-8 mb-12">
        <div>
          <h3 className="text-xl font-semibold text-blue-300 mb-3">As a student</h3>
          <p className="text-lg text-gray-300 leading-relaxed">
            You can explore how systems like algorithms, data platforms, or interfaces work. The Toolkit helps you learn technical ideas in simple terms and connect them to questions of power, inequality, and justice. It supports your learning across both practical and theoretical work.
          </p>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-green-300 mb-3">As an educator</h3>
          <p className="text-lg text-gray-300 leading-relaxed">
            You can use the Toolkit to support teaching across computing, design, media, or critical theory. It helps you bring shared terms, references, and system maps into class. It also supports interdisciplinary learning by connecting technical topics with social and political analysis.
          </p>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-purple-300 mb-3">As a practitioner or researcher</h3>
          <p className="text-lg text-gray-300 leading-relaxed">
            You can use the Toolkit to reflect on the systems you work with whether in AI, infrastructure, policy, or design. It offers a shared space to trace how digital systems operate and how justice-related questions emerge across different fields.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-cyan-300 mb-3">As someone without a technical background</h3>
          <p className="text-lg text-gray-300 leading-relaxed">
            You can use the Toolkit to understand how the technologies around you actually work. You can search for key terms, see how they connect to social issues, and learn from real-world examples. You don't need to be an expert. The Toolkit is built to make these ideas clear and open to everyone.
          </p>
        </div>
      </div>

      <h2 id="how-can-you-contribute" className="text-2xl font-bold text-white mb-6 scroll-mt-24">HOW CAN YOU CONTRIBUTE?</h2>
      
      <div className="text-lg text-gray-300 mb-8 leading-relaxed">
        <p className="mb-6">
          The Toolkit is designed to grow, not only in content, but in community. While the current version is modest in scope, we are working toward building the infrastructure to support a living, evolving knowledge resource. One that is co-created by students, educators, practitioners, and researchers working toward more just digital futures. If your work engages with technology and questions of justice, whether through design, research, education, or advocacy, your input can help shape this Toolkit. You can contribute in different ways depending on your experience and interests:
        </p>
      </div>

      <div className="space-y-8 mb-12">
        <div>
          <a href="/contribute?tab=glossary" className="inline-flex items-center text-xl font-semibold text-yellow-300 hover:text-yellow-200 mb-4 transition-colors duration-200 underline decoration-2 underline-offset-8">
            Glossary
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="text-lg text-gray-300 leading-relaxed mb-4 mt-4">
            You can propose a new entry, edit or expand an existing entry which is a short, clear explanation of:
          </p>
          <ul className="list-disc list-inside text-lg text-gray-300 space-y-1 ml-4">
            <li>A discipline</li>
            <li>A knowledge area</li>
            <li>A tool or technology</li>
          </ul>
        </div>

        <div>
          <a href="/contribute?tab=submit" className="inline-flex items-center text-xl font-semibold text-orange-300 hover:text-orange-200 mb-4 transition-colors duration-200 underline decoration-2 underline-offset-8">
            Submit Your Work
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="text-lg text-gray-300 leading-relaxed mb-4">
            You can submit:
          </p>
          
          <div className="space-y-4 ml-4">
            <div>
              <h4 className="text-lg font-medium text-white mb-2">Roadmap or Method Walkthrough</h4>
              <p className="text-gray-300 leading-relaxed">
                Share how you approached a problem whether through design, activism, research, or community practice. This could be a step-by-step visual, short video, or annotated process that others can learn from.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-white mb-2">Project or Prototype</h4>
              <p className="text-gray-300 leading-relaxed">
                Submit a creative or critical project that responds to an issue in digital systems. This might be a tool, data story, interface critique, or public intervention.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-white mb-2">Talk, Clip, or Voice Snippet</h4>
              <p className="text-gray-300 leading-relaxed">
                Record a short video, voice line, or quote that introduces a theme or poses a question. These are used throughout the Toolkit to open up ideas in an engaging way.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-white mb-2">Teaching Material or Workshop Format</h4>
              <p className="text-gray-300 leading-relaxed">
                Share exercises, templates, or examples that help others explore a concept. These could come from your own teaching, facilitation, or practice.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <button 
          onClick={() => {
            // Navigate to visualization and trigger instructions popup (same as Getting Started)
            window.location.href = '/?showVisualization=true';
            // Show help window after navigation
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('showInstructions'));
            }, 500);
          }}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 border border-gray-600 rounded hover:border-gray-500"
        >
          Explore
          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
  

