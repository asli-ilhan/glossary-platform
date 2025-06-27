export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover' | 'none';
}

// Tutorial steps for the visualisation page
export const visualizationTutorial: TutorialStep[] = [
  {
    id: 'step-1',
    title: 'Explore the System Map',
    content: 'Use the interactive visual map to navigate connections between disciplines, knowledge areas, practices, and tools. Hovering reveals links; clicking opens the full content structure: from videos to glossary entries and content modules.',
    position: 'center',
    action: 'none'
  },
  {
    id: 'step-2',
    title: 'Engage with Toolkit Content',
    content: 'Each node opens a side panel with layered content: visual explainers, technical demonstrations, key terms, and contextual references. These materials are designed to bridge conceptual inquiry with practical understanding through accessible video content, detailed definitions, and technical deep dive modules.',
    target: 'svg g.nodes',
    position: 'right',
    action: 'click'
  },
  {
    id: 'step-3',
    title: 'Navigate the Platform',
    content: 'Use the menu to access different sections: the glossary for definitions, the about page for course information, and account features for contributing content.',
    target: 'header button[aria-label="Menu"]',
    position: 'bottom',
    action: 'click'
  },
  {
    id: 'step-4',
    title: 'Access Your Account',
    content: 'Sign in to contribute to the glossary, access administrative features, or view your profile. Account holders can submit terms and participate in the collaborative knowledge building process.',
    target: 'header button:has(svg path[d*="M16 7a4 4 0 11-8 0 4 4 0 018 0"]), header button:has(.w-8.h-8.bg-gray-700)',
    position: 'bottom',
    action: 'click'
  }
];

// Tutorial steps for the glossary page
export const glossaryTutorial: TutorialStep[] = [
  {
    id: 'welcome-glossary',
    title: 'Define, Contribute, and Connect',
    content: 'The glossary is a dynamic, co-created space that invites users to define, challenge, and reinterpret key terms within the digital systems we study and build.',
    position: 'center',
    action: 'none'
  },
  {
    id: 'add-term-button',
    title: 'Propose New Terms',
    content: 'Contributors can propose new terms, offer alternative definitions, and link entries to technologies, practices, and knowledge areas. All submissions are reviewed before publication.',
    target: 'button.add-term-form',
    position: 'top',
    action: 'click'
  },
  {
    id: 'browse-letters',
    title: 'Browse by Letter',
    content: 'Use the letter filters to browse terms alphabetically, or click "All" to see the complete glossary. This helps you discover related concepts and terminology.',
    target: '.tab-container',
    position: 'top',
    action: 'click'
  },
  {
    id: 'search-terms',
    title: 'Explore Term Details',
    content: 'Click on any term to see its full definition(s). Terms may have multiple interpretations from different contributors, reflecting the evolving nature of digital discourse.',
    target: '.glossary-terms-container',
    position: 'top',
    action: 'click'
  },
  {
    id: 'multiple-definitions',
    title: 'Living Archive',
    content: 'As a living archive, the glossary evolves through multiple contributions. Some terms have multiple definitions, recognising that meanings are shaped by context, discipline, and experience.',
    target: '.definition-count-badge',
    position: 'left',
    action: 'none'
  },
  {
    id: 'navigation',
    title: 'Platform Navigation',
    content: 'Use the hamburger menu to navigate between the knowledge map, glossary, and other platform sections. Each area offers different ways to engage with the course materials.',
    target: 'header button[aria-label="Menu"]',
    position: 'bottom',
    action: 'click'
  }
];

// General platform tutorial (can be used on any page)
export const generalTutorial: TutorialStep[] = [
  {
    id: 'platform-overview',
    title: 'Platform Overview',
    content: 'Welcome to the Digital Literacy Toolkit! This platform combines interactive visualisations with collaborative critical analysis of digital systems.',
    position: 'center',
    action: 'none'
  },
  {
    id: 'main-navigation',
    title: 'Main Navigation',
    content: 'Use the hamburger menu to navigate between the visualisation, glossary, and about pages.',
    target: 'header button[aria-label="Menu"]',
    position: 'bottom',
    action: 'click'
  },
  {
    id: 'account-system',
    title: 'Account System',
    content: 'Sign in to contribute to the glossary or access administrative features if you have permissions.',
    target: 'header div:last-child button',
    position: 'bottom',
    action: 'none'
  },
  {
    id: 'footer-info',
    title: 'Course Information',
    content: 'This platform is part of the MA Internet Equalities course at the Creative Computing Institute, University of the Arts London.',
    target: 'footer',
    position: 'top',
    action: 'none'
  }
]; 