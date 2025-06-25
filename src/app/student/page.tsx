'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StudentPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect all users directly to glossary
    router.push('/glossary');
  }, [router]);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome Student</h1>
      <p>Redirecting to glossary...</p>
    </div>
  );
}
