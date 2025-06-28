"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// Search result types
interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'glossary' | 'page';
  url: string;
  category?: string;
}

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isOnLandingPage, setIsOnLandingPage] = useState(false);
  
  // Search modal state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActiveTab, setSearchActiveTab] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const authMenuRef = useRef<HTMLDivElement>(null);
  const searchModalRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const user = session?.user as { id: string; email: string; role: string } | undefined;
  const isVisualizationPage = pathname === '/';
  const shouldShowHelpButton = isVisualizationPage && !isOnLandingPage;

  const handleSignOut = async () => {
    try {
      console.log('Attempting to sign out...');
      
      // Force clear session and redirect immediately
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: false // Don't wait for NextAuth redirect
      });
      
      // Force immediate redirect
      window.location.href = '/auth/signin';
      
      console.log('Sign out completed');
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback: force redirect even if signOut fails
      window.location.href = '/auth/signin';
    }
  };

  const handleShowInstructions = () => {
    // Dispatch event to show instructions in SunburstVisualization
    window.dispatchEvent(new CustomEvent('showInstructions'));
  };



  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results: SearchResult[] = [];

      // Search glossary terms
      if (searchActiveTab === 'all' || searchActiveTab === 'entries') {
        try {
          const glossaryRes = await fetch(`/api/glossary?search=${encodeURIComponent(query)}`);
          const glossaryData = await glossaryRes.json();
          
          if (Array.isArray(glossaryData)) {
            const glossaryResults = glossaryData.slice(0, 10).map((term: any) => ({
              id: `glossary-${term._id}`,
              title: term.title,
              description: term.description,
              type: 'glossary' as const,
              url: `/contribute?tab=glossary&search=${encodeURIComponent(term.title)}`,
              category: 'Glossary'
            }));
            results.push(...glossaryResults);
          }
        } catch (error) {
          console.error('Error searching glossary:', error);
        }

        // Search sunburst/map data
        try {
          const sunburstRes = await fetch('/api/sunburst');
          const sunburstData = await sunburstRes.json();
          
          if (Array.isArray(sunburstData)) {
            const filteredSunburst = sunburstData.filter((item: any) => 
              item.toolTechnology?.toLowerCase().includes(query.toLowerCase()) ||
              item.themeCluster?.toLowerCase().includes(query.toLowerCase()) ||
              item.knowledgeArea?.toLowerCase().includes(query.toLowerCase()) ||
              item.discipline?.toLowerCase().includes(query.toLowerCase()) ||
              item.roleSystemOrientation?.toLowerCase().includes(query.toLowerCase())
            );

            const sunburstResults = filteredSunburst.slice(0, 10).map((item: any) => ({
              id: `sunburst-${item._id}`,
              title: item.toolTechnology || item.themeCluster,
              description: item.description || `${item.discipline} - ${item.knowledgeArea}`,
              type: 'glossary' as const,
              url: `/?showVisualization=true&openEntry=${encodeURIComponent(item.toolTechnology || item.themeCluster)}`,
              category: 'Map'
            }));
            results.push(...sunburstResults);
          }
        } catch (error) {
          console.error('Error searching sunburst data:', error);
        }
      }

      // Search pages
      if (searchActiveTab === 'all' || searchActiveTab === 'pages') {
        const pageResults = searchPages(query);
        results.push(...pageResults);
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Search static pages and features
  const searchPages = (query: string): SearchResult[] => {
    const pages = [
      {
        id: 'page-home',
        title: 'Home / Visualization',
        description: 'Interactive knowledge map and main visualization',
        type: 'page' as const,
        url: '/',
        category: 'Navigation'
      },
      {
        id: 'page-about',
        title: 'About',
        description: 'Learn about the Digital Literacy Toolkit',
        type: 'page' as const,
        url: '/about',
        category: 'Information'
      },
      {
        id: 'page-contribute',
        title: 'Contribute',
        description: 'Add glossary terms and submit your work',
        type: 'page' as const,
        url: '/contribute',
        category: 'Contribution'
      },
      {
        id: 'page-contribute-glossary',
        title: 'Glossary',
        description: 'Browse and contribute to the glossary of terms',
        type: 'page' as const,
        url: '/contribute?tab=glossary',
        category: 'Contribution'
      },
      {
        id: 'page-contribute-submit',
        title: 'Submit Your Work',
        description: 'Submit projects, prototypes, and creative work',
        type: 'page' as const,
        url: '/contribute?tab=submit',
        category: 'Contribution'
      },
      {
        id: 'page-profile',
        title: 'User Profile',
        description: 'Manage your account and view contributions',
        type: 'page' as const,
        url: '/student',
        category: 'Account'
      }
    ];

    if (user?.role === 'admin') {
      pages.push({
        id: 'page-admin',
        title: 'Admin Dashboard',
        description: 'Manage users, content, and platform settings',
        type: 'page' as const,
        url: '/admin/dashboard',
        category: 'Administration'
      });
    }

    return pages.filter(page => 
      page.title.toLowerCase().includes(query.toLowerCase())
    );
  };



  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchActiveTab]);

  // Handle search modal close
  const closeSearchModal = () => {
    setSearchModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchActiveTab('all');
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    closeSearchModal();
    router.push(result.url);
  };

  // Listen for landing page state changes
  useEffect(() => {
    const handleLandingPageState = (event: CustomEvent) => {
      setIsOnLandingPage(event.detail.showLanding);
    };

    window.addEventListener('landingPageState', handleLandingPageState as EventListener);
    return () => {
      window.removeEventListener('landingPageState', handleLandingPageState as EventListener);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (authMenuRef.current && !authMenuRef.current.contains(event.target as Node)) {
        setAuthMenuOpen(false);
      }
      if (searchModalRef.current && !searchModalRef.current.contains(event.target as Node)) {
        closeSearchModal();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle escape key for search modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && searchModalOpen) {
        closeSearchModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [searchModalOpen]);

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'glossary':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'page':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );

      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
    }
  };

  return (
    <>
      <header className="bg-black text-white px-8 py-2 flex items-center shadow-lg relative z-50">
        {/* Left Side - Title */}
        <div className="flex-1 flex items-center">
          {!isOnLandingPage && (
            <Link 
              href="/"
              onClick={() => {
                // Ensure we show the landing page when navigating to home
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('showLandingPage', { detail: { explicit: true } }));
                }, 100);
              }}
              className="hover:opacity-80 transition-opacity"
            >
              <h1 className="text-xl font-bold text-white cursor-pointer">Digital Literacy Toolkit</h1>
            </Link>
          )}
        </div>

        {/* Right Side - All Navigation Elements with Equal Spacing */}
        <div className="flex items-center space-x-2">
          {/* Navigation Buttons */}
          <button
            onClick={() => router.push('/about')}
            className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300"
          >
            ABOUT
          </button>
          
          <button
            onClick={() => {
              if (pathname !== '/') {
                router.push('/?showVisualization=true');
              } else {
                window.dispatchEvent(new CustomEvent('showLandingPage', { 
                  detail: { explicit: false } 
                }));
              }
              // Show help window after navigation
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('showInstructions'));
              }, 500);
            }}
            className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300"
          >
            GETTING STARTED
          </button>
          
          <button
            onClick={() => router.push('/contribute')}
            className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300"
          >
            CONTRIBUTE
          </button>

          {/* Help Button - Show on visualization and glossary pages, but not on landing page */}
          {shouldShowHelpButton && (
            <button 
                              onClick={handleShowInstructions}
              className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 help-button"
            >
              HELP
            </button>
          )}

          {/* Search Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Authentication Section */}
          {status === 'loading' ? (
            <div className="w-8 h-8 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
          ) : session ? (
            <div className="relative" ref={dropdownRef}>
              {/* User Dropdown */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {user?.role === 'admin' && (
                  <span className="border border-gray-500 text-gray-300 text-xs px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
                <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-black rounded-md shadow-lg border border-gray-700 z-50">
                  <div className="py-2">
                    <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                      <div className="font-medium">{user?.email}</div>
                      <div className="text-xs text-gray-400">
                        {user?.role === 'admin' ? 'Administrator' : 'User'}
                      </div>
                    </div>
                    
                    <Link
                      href="/student"
                      className="block px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile</span>
                      </div>
                    </Link>
                    
                    {user?.role === 'admin' && (
                      <>
                        <div className="border-t border-gray-700"></div>
                        <Link
                          href="/admin/dashboard"
                          className="block px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Admin Dashboard</span>
                          </div>
                        </Link>
                      </>
                    )}
                    
                    <div className="border-t border-gray-700"></div>
                    
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Sign out button clicked');
                        setDropdownOpen(false);
                        await handleSignOut();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-white transition-colors rounded-none border-0 bg-transparent m-0"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign Out</span>
                      </div>
                                          </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Minimal auth menu for non-authenticated users */
            <div className="relative" ref={authMenuRef}>
              <button
                onClick={() => setAuthMenuOpen(!authMenuOpen)}
                className="flex items-center space-x-1 hover:bg-gray-700 py-2 px-3 rounded transition-colors duration-200 text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <svg className={`w-4 h-4 transition-transform ${authMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {authMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-black rounded-md shadow-lg border border-gray-700 z-50">
                  <div className="py-2">
                    <Link
                      href="/auth/signin"
                      className="block px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                      onClick={() => setAuthMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign In</span>
                      </div>
                    </Link>
                    <Link
                      href="/auth/register"
                      className="block px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                      onClick={() => setAuthMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span>Register</span>
                      </div>
                    </Link>
                    <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-700 mt-2">
                      Sign in to contribute or access admin controls.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <div 
            ref={searchModalRef}
            className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 w-full max-w-2xl mx-4"
          >
            {/* Search Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Search Toolkit</h2>
                <button
                  onClick={closeSearchModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for entries, pages, or functions..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                  autoFocus
                />
              </div>

              {/* Search Tabs */}
              <div className="flex space-x-1 mt-4">
                {[
                  { id: 'all', name: 'All' },
                  { id: 'entries', name: 'Entries' },
                  { id: 'pages', name: 'Pages' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSearchActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      searchActiveTab === tab.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
                  <p className="text-gray-400">Searching...</p>
                </div>
              ) : searchQuery.trim() === '' ? (
                <div className="p-6 text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>Start typing to search the toolkit...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No results found for "{searchQuery}"</p>
                  <p className="text-sm mt-1">Try different keywords or check the spelling</p>
                </div>
              ) : (
                <div className="p-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full p-4 text-left hover:bg-gray-800 rounded-lg transition-colors border-b border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`mt-1 p-2 rounded-lg ${
                          result.type === 'glossary' ? 'bg-blue-600' : 'bg-green-600'
                        }`}>
                          <div className="text-white">
                            {getResultIcon(result.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-white truncate">{result.title}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              result.type === 'glossary' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {result.category}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm line-clamp-2">{result.description}</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>


          </div>
        </div>
      )}
    </>
  );
}
