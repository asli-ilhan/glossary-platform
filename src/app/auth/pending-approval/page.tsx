'use client';

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PendingApprovalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const role = searchParams.get('role');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center px-8">
      <div className="max-w-md w-full bg-black rounded-lg shadow-xl p-8 text-center border border-gray-700">
        {/* Waiting Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-yellow-600/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-4">Account Pending Approval</h1>
        
        {/* Message */}
        <div className="space-y-4 mb-8">
          <p className="text-gray-300">
            Thank you for registering! Your account is currently being reviewed by our administrators.
          </p>
          
          {email && (
            <div className="bg-black border border-gray-600 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Account Details:</p>
              <p className="text-white font-medium">{email}</p>
              {role && (
                <p className="text-sm text-gray-400">
                  Role: <span className="text-yellow-400 capitalize">{role}</span>
                </p>
              )}
            </div>
          )}
          
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <h3 className="text-blue-300 font-semibold mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-200 space-y-1 text-left">
              <li>• An administrator will review your registration</li>
              <li>• You'll receive an email notification once approved</li>
              <li>• You can then sign in and start contributing to critical digital literacy</li>
            </ul>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
            <h3 className="text-yellow-300 font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-yellow-200">
              If you have any questions about your account status, please contact the administrators.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/auth/signin')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Try Sign In Again
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Explore Platform (Guest Mode)
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-xs text-gray-500">
          This process typically takes 1-2 business days
        </p>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <PendingApprovalContent />
    </Suspense>
  );
} 