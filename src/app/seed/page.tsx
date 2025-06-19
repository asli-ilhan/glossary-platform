'use client';

import { useState } from 'react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to seed database');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Database Seeding Tool
          </h1>
          
          <div className="mb-8">
            <p className="text-gray-600 mb-4">
              This tool will populate your database with comprehensive sample data for testing all features of the MAI Glossary Platform.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Warning</h3>
              <p className="text-sm text-yellow-700">
                This will clear all existing data and replace it with sample data. Use only in development environment.
              </p>
            </div>

            <button
              onClick={handleSeed}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Seeding Database...' : 'Seed Database'}
            </button>
          </div>

          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <p className="text-blue-700">🌱 Seeding database with sample data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <h3 className="text-sm font-medium text-red-800 mb-2">❌ Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-md p-6">
              <h3 className="text-lg font-medium text-green-800 mb-4">✅ Database Seeded Successfully!</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-sm">
                  <div className="font-medium text-gray-700 mb-2">📊 Created Records:</div>
                  <ul className="space-y-1 text-gray-600">
                    <li>👥 Users: {result.data.users}</li>
                    <li>📚 Glossary Terms: {result.data.glossaryTerms}</li>
                    <li>🌟 Sunburst Entries: {result.data.sunburstEntries}</li>
                    <li>📹 Content Modules: {result.data.contentModules}</li>
                    <li>🎤 Guest Credits: {result.data.guestCredits}</li>
                    <li>🔖 Bookmarks: {result.data.bookmarks}</li>
                    <li>🔔 Notifications: {result.data.notifications}</li>
                  </ul>
                </div>
                
                <div className="text-sm">
                  <div className="font-medium text-gray-700 mb-2">🔐 Test Credentials:</div>
                  <ul className="space-y-1 text-gray-600 font-mono text-xs">
                    <li><strong>Admin:</strong><br/>{result.credentials.admin}</li>
                    <li><strong>User 1:</strong><br/>{result.credentials.user}</li>
                    <li><strong>User 2:</strong><br/>{result.credentials.user2}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white border border-green-200 rounded p-4">
                <h4 className="font-medium text-green-800 mb-2">🎯 What you can test now:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• User authentication and role-based access</li>
                  <li>• Enhanced glossary features with categories, difficulty levels, and tags</li>
                  <li>• Content module management with moderation workflow</li>
                  <li>• Sunburst visualization data structure</li>
                  <li>• User bookmarking system</li>
                  <li>• Notification system</li>
                  <li>• Guest credit management</li>
                  <li>• Admin dashboard with pending approvals</li>
                  <li>• Search and filtering across all content types</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-8 text-sm text-gray-500">
            <p>
              After seeding, you can test the application by signing in with the provided credentials 
              and exploring all the enhanced features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 