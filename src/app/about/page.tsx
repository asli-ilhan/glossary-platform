export default function About() {
  return (
    <div className="px-8 py-8 pr-96">
      <h1 className="text-3xl font-bold text-white mb-8">About</h1>
      
      <div className="text-lg text-gray-300 mb-8 leading-relaxed">
        <p className="mb-6">
          The Digital Literacy Toolkit is a collaborative platform developed by the MA Internet Equalities course at the Creative Computing Institute, University of the Arts London. It supports users critically engaging with the underlying power structures of digital systems.
        </p>
        
        <p className="mb-6">
          Rather than offering surface-level tools or static definitions, the Toolkit invites users to explore how digital infrastructures operate and how inequalities are encoded into the very architecture of the internet. From data governance to algorithmic bias, from participatory design to critical prototyping, the Toolkit traces how knowledge, power, and technology intersect.
        </p>

        <p className="mb-6">
          Bringing together conceptual tools and technical knowledge across disciplines such as media studies, critical design, data ethics, and computer science. Through interactive visual maps, glossary entries, videos, and tutorials, it helps users explore how technologies are built, how they shape society, and how they can be reimagined.
        </p>
      </div>

      <h3 className="text-2xl font-bold text-white mt-12 mb-6">Living Internet Knowledge Archive</h3>
      <p className="text-lg text-gray-300 mb-6 leading-relaxed">
        Designed as a living internet knowledge archive, the Toolkit evolves through contributions from students, educators, and researchers. It supports:
      </p>
      
      <div className="space-y-4 mb-8">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-1 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <div>
            <p className="text-lg text-gray-200"><strong className="text-white">Students</strong> exploring the relationship between digital systems and justice</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-1 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <div>
            <p className="text-lg text-gray-200"><strong className="text-white">Educators</strong> embedding interdisciplinary methods into their teaching</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-1 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <div>
            <p className="text-lg text-gray-200"><strong className="text-white">Publics</strong> seeking accessible entry points into digital critique and technical inquiry</p>
          </div>
        </div>
      </div>

      <p className="text-lg text-gray-300 mb-8 leading-relaxed">
        It is both a learning platform and a community of practice, enabling shared reflection, collaborative exploration, and critical intervention.
      </p>

      <p className="text-lg text-gray-300 leading-relaxed">
        At its core, the Toolkit is about making connections, between fields, between concepts and practices, and between infrastructures and the inequalities they maintain. It offers a shared space to understand, intervene in, and reimagine the systems that shape digital life.
      </p>
    </div>
  );
}
  

