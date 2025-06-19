'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const user = session.user as { id: string; email: string; role: string } | undefined;
    if (user?.role === 'admin') {
      router.push('/admin/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="container text-center mt-12">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container text-center mt-12">
        <h1>Please sign in to access admin features</h1>
      </div>
    );
  }

  const user = session.user as { id: string; email: string; role: string } | undefined;
  if (user?.role !== 'admin') {
    return (
      <div className="container text-center mt-12">
        <h1>Access Denied</h1>
        <p>You need admin privileges to access this page.</p>
        <button onClick={() => router.push('/')} className="primary mt-4">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="container text-center mt-12">
      <h1>Redirecting to admin dashboard...</h1>
    </div>
  );
}
