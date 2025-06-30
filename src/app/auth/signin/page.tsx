'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Handle different error types
        switch (result.error) {
          case 'MISSING_CREDENTIALS':
            setError('Please fill in all required fields.');
            break;
          case 'INVALID_CREDENTIALS':
            setError('Invalid email or password. Please try again.');
            break;
          case 'ACCOUNT_BLOCKED':
            setError('Your account has been blocked. Please contact an administrator for assistance.');
            break;
          case 'ACCOUNT_NOT_APPROVED':
            // Extract email and role from session to redirect properly
            const userEmail = email;
            router.push(`/auth/pending-approval?email=${encodeURIComponent(userEmail)}`);
            return;
          default:
            setError('Sign-in failed. Please try again.');
        }
      } else {
        // Success - check session and redirect appropriately
        const session = await getSession();
        if (session?.user) {
          if (session.user.role === 'admin') {
            router.push('/admin/dashboard');
          } else {
            router.push('/');
          }
        }
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
      <div className="max-w-md w-full p-8 bg-black border border-gray-700 rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-left text-white">Sign In</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full p-3 bg-black border border-gray-600 rounded placeholder-gray-400 text-white focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full p-3 bg-black border border-gray-600 rounded placeholder-gray-400 text-white focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            />
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded text-center">
              {error}
            </div>
          )}

          <div className="mt-6 text-center space-y-3">
            <p className="text-gray-400">
              Don&apos;t have an account? <a href="/auth/register" className="text-gray-400 underline hover:text-gray-300">Register</a>
            </p>
            
            <div className="bg-black border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Account Status Issues?</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• New accounts require admin approval</li>
                <li>• Check your email for approval notifications</li>
                <li>• You can still explore the platform without signing in</li>
              </ul>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 