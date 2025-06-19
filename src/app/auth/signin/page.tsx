'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });
    if (res?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="container max-w-md mx-auto mt-16 p-6 bg-gray-900 rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
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
        {error && <div className="text-red-500 text-center">{error}</div>}
        <button type="submit" className="primary w-full">Sign In</button>
      </form>
      <p className="mt-4 text-center text-gray-400">
        Don&apos;t have an account? <a href="/auth/register" className="text-blue-400 underline">Register</a>
      </p>
    </div>
  );
} 