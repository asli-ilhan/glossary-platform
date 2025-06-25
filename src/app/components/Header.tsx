"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isOnLandingPage, setIsOnLandingPage] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const authMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const user = session?.user as { id: string; email: string; role: string } | undefined;
  const isVisualizationPage = pathname === '/';
  const isGlossaryPage = pathname === '/glossary';
  const shouldShowHelpButton = (isVisualizationPage && !isOnLandingPage) || isGlossaryPage;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleShowInstructions = () => {
    // Dispatch event to show instructions in SunburstVisualization
    window.dispatchEvent(new CustomEvent('showInstructions'));
  };

  const handleShowTutorial = () => {
    // Dispatch tutorial event based on current page
    if (isVisualizationPage) {
      window.dispatchEvent(new CustomEvent('showTutorial', { detail: 'visualization' }));
    } else if (isGlossaryPage) {
      window.dispatchEvent(new CustomEvent('showTutorial', { detail: 'glossary' }));
    }
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
          <header className="bg-black text-white px-8 py-2 flex items-center justify-between shadow-lg relative z-50">
      {/* Left Side - Title */}
      <div className="flex items-center">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <h1 className="text-xl font-bold text-white cursor-pointer">Digital Literacy Toolkit</h1>
        </Link>
      </div>

      {/* Right Side - Help, Account Access, Hamburger Menu */}
      <div className="flex items-center space-x-2">
        {/* Help Button - Show on visualization and glossary pages, but not on landing page */}
        {shouldShowHelpButton && (
          <button 
            onClick={isVisualizationPage ? handleShowInstructions : handleShowTutorial}
            className="text-sm px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors help-button"
          >
            Help
          </button>
        )}

        {/* Authentication Section */}
        {status === 'loading' ? (
          <div className="w-8 h-8 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
        ) : session ? (
          <div className="relative" ref={dropdownRef}>
            {/* User Dropdown */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 hover:bg-gray-700 px-3 py-2 rounded transition-colors"
            >
              <div className="w-8 h-8 bg-gray-700 border border-gray-500 rounded flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
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
                  
                  {user?.role === 'admin' && (
                    <>
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
                      <div className="border-t border-gray-700"></div>
                    </>
                  )}
                  
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
                  
                  <div className="border-t border-gray-700"></div>
                  
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
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
              className="flex items-center space-x-1 hover:bg-gray-700 px-3 py-2 rounded transition-colors text-gray-300"
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
                    Sign in to add terms or access admin features
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hamburger Menu - Moved to the end */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center justify-center px-3 py-2 hover:bg-gray-700 rounded transition-colors"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-black rounded-md shadow-lg border border-gray-700 z-50">
              <div className="py-2">
                <Link
                  href="/"
                  className="block px-4 py-3 text-sm text-white hover:bg-gray-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Home</span>
                  </div>
                </Link>
                
                <Link
                  href="/glossary"
                  className="block px-4 py-3 text-sm text-white hover:bg-gray-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Glossary</span>
                  </div>
                </Link>
                
                <Link
                  href="/about"
                  className="block px-4 py-3 text-sm text-white hover:bg-gray-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>About</span>
                  </div>
                </Link>
                
                <div className="border-t border-gray-700 my-2"></div>
                
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    // Dispatch event to show introduction page explicitly
                    window.dispatchEvent(new CustomEvent('showLandingPage', { 
                      detail: { explicit: true } 
                    }));
                  }}
                  className="block w-full text-left px-4 py-3 text-sm text-blue-300 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-10-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>View Introduction</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
