'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        setSuccess(data.message);
        
        // Redirect based on role and approval status
        if (role === 'admin') {
          // Admin can sign in immediately
          setTimeout(() => router.push('/auth/signin'), 2000);
        } else {
          // Students and contributors go to pending approval page
          setTimeout(() => {
            router.push(`/auth/pending-approval?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`);
          }, 2000);
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 140px)' }}>
      <div className="max-w-md w-full p-8 bg-black border border-gray-700 rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-left text-white">Register</h1>
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
            className="auth-input w-full p-3 border rounded placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            style={{ 
              backgroundColor: '#1f2937 !important', 
              color: 'white !important', 
              borderColor: '#4b5563 !important',
              boxShadow: 'none !important'
            }}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password (min. 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
            className="auth-input w-full p-3 border rounded placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            style={{ 
              backgroundColor: '#1f2937 !important', 
              color: 'white !important', 
              borderColor: '#4b5563 !important',
              boxShadow: 'none !important'
            }}
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="role" className="block text-sm font-medium text-gray-300">Account Type</label>
          <select 
            id="role"
            value={role} 
            onChange={e => setRole(e.target.value)} 
            className="auth-input w-full p-3 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            style={{ 
              backgroundColor: '#1f2937 !important', 
              color: 'white !important', 
              borderColor: '#4b5563 !important',
              boxShadow: 'none !important'
            }}
            disabled={loading}
          >
            <option value="student">Student</option>
            <option value="contributor">Contributor</option>
            <option value="admin">Administrator</option>
          </select>
          
          <div className="text-xs text-gray-400 mt-2">
            {role === 'student' && (
              <p>Explore, learn, and contribute to the digital literacy toolkit. Account requires admin approval.</p>
            )}
            {role === 'contributor' && (
              <p>Explore, reflect, and contribute to the digital literacy toolkit. Account requires admin approval.</p>
            )}
            {role === 'admin' && (
              <p>Manage users, approve content, and access admin dashboard. Restricted to authorised emails only.</p>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded text-center text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-400 p-3 rounded text-center text-sm">
            {success}
            {role !== 'admin' && (
              <p className="mt-2 text-xs">Redirecting to approval status page...</p>
            )}
          </div>
        )}
        
        <div className="flex justify-center">
          <button 
            type="submit" 
            className="py-1.5 px-4 bg-white hover:bg-gray-100 text-black text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={loading}
          >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Registering...
            </>
          ) : (
            'Register'
          )}
          </button>
        </div>
      </form>
      
        <p className="mt-4 text-center text-gray-400 text-sm">
          Already have an account? <a href="/auth/signin" className="text-blue-400 underline hover:text-blue-300">Sign In</a>
        </p>
      </div>
    </div>
  );
} 