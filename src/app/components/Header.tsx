"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = session?.user as { id: string; email: string; role: string } | undefined;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-lg">
      {/* Logo */}
      <Link href="/">
        <Image 
          src="/logo.png" 
          alt="Glossary Logo" 
          width={200}
          height={80}
          className="hover:opacity-90 transition-all"
        />
      </Link>

      {/* Navigation */}
      <nav className="flex items-center space-x-6">
        <Link href="/" className="hover:bg-gray-700 px-4 py-2 rounded transition-colors">
          Home
        </Link>
        <Link href="/glossary" className="hover:bg-gray-700 px-4 py-2 rounded transition-colors">
          Glossary
        </Link>
        <Link href="/about" className="hover:bg-gray-700 px-4 py-2 rounded transition-colors">
          About
        </Link>

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
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden md:block text-sm">{user?.email}</span>
              {user?.role === 'admin' && (
                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                  Admin
                </span>
              )}
              <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50">
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
          <div className="flex items-center space-x-3">
            <Link
              href="/auth/signin"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="border border-gray-500 hover:border-gray-400 text-gray-300 hover:text-white px-4 py-2 rounded transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile Menu Toggle (for future mobile responsiveness) */}
      <button className="md:hidden flex items-center px-3 py-2 border rounded text-gray-400 border-gray-600 hover:text-white hover:border-white">
        <svg className="fill-current h-3 w-3" viewBox="0 0 20 20">
          <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
        </svg>
      </button>
    </header>
  );
}
