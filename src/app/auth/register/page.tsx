'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Registration failed');
    } else {
      setSuccess('Registration successful! Redirecting to sign in...');
      setTimeout(() => router.push('/auth/signin'), 1500);
    }
  };

  return (
    <div className="container max-w-md mx-auto mt-16 p-6 bg-gray-900 rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-center">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 border rounded text-black">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        {error && <div className="text-red-500 text-center">{error}</div>}
        {success && <div className="text-green-500 text-center">{success}</div>}
        <button type="submit" className="primary w-full">Register</button>
      </form>
      <p className="mt-4 text-center text-gray-400">
        Already have an account? <a href="/auth/signin" className="text-blue-400 underline">Sign In</a>
      </p>
    </div>
  );
} 