'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StudentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    router.push('/glossary');
  }, [session, status, router]);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome Student</h1>
      <p>Redirecting to glossary...</p>
    </div>
  );
}
