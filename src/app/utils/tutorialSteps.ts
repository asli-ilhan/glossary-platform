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
    content: 'Use the interactive visual map to navigate connections between disciplines, knowledge areas, practices, and tools. Hovering reveals links; clicking opens the full content structure: from videos to glossary entries and project modules.',
    position: 'center',
    action: 'none'
  },
  {
    id: 'step-2',
    title: 'Engage with Toolkit Content',
    content: 'Each node opens a side panel with layered content: visual explainers, technical demonstrations, key terms, and contextual references. These materials are designed to connect conceptual inquiry with hands-on exploration.',
    target: '.nodes',
    position: 'right',
    action: 'click'
  },
  {
    id: 'step-3',
    title: 'Contribute to the Glossary',
    content: 'Students and contributors can propose new key terms, suggest edits, or offer alternative definitions. Entries are reviewed before publication and dynamically linked to relevant concepts and technologies, building a shared, evolving knowledge system.',
    target: 'header button[aria-label="Menu"]',
    position: 'bottom',
    action: 'click'
  },
  {
    id: 'step-4',
    title: 'Submit Projects (Beta)',
    content: 'As part of the course, students can submit project outcomes that reflect critical, creative, or research-based approaches to internet inequalities. Projects will be linked to the visual map and contribute to the wider archive as this feature develops.',
    target: 'header div:last-child button',
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
    id: 'navigation-back',
    title: 'Navigation',
    content: 'Use the hamburger menu to navigate between different sections of the platform.',
    target: 'header button[aria-label="Menu"]',
    position: 'bottom',
    action: 'click'
  },
  {
    id: 'browse-terms',
    title: 'Search and Discover',
    content: 'Use the letter filters or full-text search to browse terms. Clicking on an entry reveals related resources from technical tools to student projects and positions the term within the larger conceptual map.',
    target: '.glossary-terms-container',
    position: 'top',
    action: 'none'
  },
  {
    id: 'term-boxes',
    title: 'Living Archive',
    content: 'As a living archive, it evolves through multiple contributions, recognising that definitions are shaped by context, discipline, and experience.',
    target: '.first-term',
    position: 'right',
    action: 'click'
  },
  {
    id: 'multiple-definitions',
    title: 'Shared Vocabulary',
    content: 'This is more than a glossary. It is a shared vocabulary for digital justice, built by a community of practice.',
    target: '.definition-count-badge',
    position: 'left',
    action: 'none'
  },
  {
    id: 'add-term-section',
    title: 'Propose New Terms',
    content: 'Contributors can propose new terms, offer alternative definitions, and link entries to technologies, practices, and knowledge areas.',
    target: '.add-term-form',
    position: 'top',
    action: 'none'
  },
  {
    id: 'term-submission',
    title: 'Review Process',
    content: 'All submissions are reviewed before publication to ensure clarity and relevance. Approved terms are credited and interlinked across the Toolkit.',
    target: '.add-term-form',
    position: 'bottom',
    action: 'click'
  },
  {
    id: 'sign-in-required',
    title: 'Account Required',
    content: 'You need to sign in to submit terms. Use the account menu in the header to sign in or register.',
    target: 'header div:last-child button',
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