'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Types for user contributions
interface Term {
  _id: string;
  title: string;
  description: string;
  approved: boolean;
  createdAt: string;
  userId?: { email: string };
}

interface UserContribution {
  glossaryTerms: number;
  totalContributions: number;
  recentActivity: Date | null;
  entries: {
    glossaryTerms: Term[];
  };
}

export default function StudentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [userContributions, setUserContributions] = useState<UserContribution | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Fetch user contributions when contributions tab is active
  useEffect(() => {
    if (activeTab === 'contributions' && session?.user?.email) {
      fetchUserContributions();
    }
  }, [activeTab, session]);

  const fetchUserContributions = async () => {
    if (!session?.user?.email) return;
    
    setLoading(true);
    try {
      // Fetch all glossary terms
      const res = await fetch('/api/glossary?all=true');
      const terms = await res.json();
      
      if (Array.isArray(terms)) {
        // Filter terms by current user
        const userTerms = terms.filter(term => 
          term.userId?.email === session.user?.email
        );
        
        const contribution: UserContribution = {
          glossaryTerms: userTerms.length,
          totalContributions: userTerms.length,
          recentActivity: userTerms.length > 0 
            ? new Date(Math.max(...userTerms.map(t => new Date(t.createdAt).getTime())))
            : null,
          entries: {
            glossaryTerms: userTerms,
          }
        };
        
        setUserContributions(contribution);
      }
    } catch (error) {
      console.error('Error fetching user contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  const user = session.user as { id: string; email: string; role: string } | undefined;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-8 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">User Profile</h1>
            <p className="text-gray-400 text-lg">Manage your account settings and preferences</p>
          </div>

          {/* User Info Card */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gray-700 border border-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {session.user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{session.user?.email}</h2>
                <p className="text-gray-400">
                  {user?.role === 'admin' ? 'Administrator' : user?.role === 'contributor' ? 'Contributor' : 'Student'}
                </p>
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-white mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Email:</span>
                  <span className="ml-2 text-white">{session.user?.email}</span>
                </div>
                <div>
                  <span className="text-gray-400">Role:</span>
                  <span className="ml-2 text-white">
                    {user?.role === 'admin' ? 'Administrator' : user?.role === 'contributor' ? 'Contributor' : 'Student'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-700">
              <nav className="-mb-px flex justify-center space-x-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 min-w-max ${
                    activeTab === 'profile'
                      ? 'border-green-400 text-green-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('contributions')}
                  className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 min-w-max ${
                    activeTab === 'contributions'
                      ? 'border-green-400 text-green-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Contributions
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-8 text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-yellow-300 mb-2">Page Under Development</h3>
                <p className="text-yellow-200 mb-6">
                  We're working on building comprehensive profile management features. 
                  This page will include settings and preferences.
                </p>
              </div>
            )}

            {/* Contributions Tab */}
            {activeTab === 'contributions' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Your Contributions</h2>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading contributions...</p>
                  </div>
                ) : userContributions ? (
                  <>
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                        <h3 className="text-lg font-semibold mb-2">Glossary Terms</h3>
                        <p className="text-3xl font-bold">{userContributions.glossaryTerms}</p>
                        <p className="text-blue-200 text-sm">Terms submitted</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
                        <h3 className="text-lg font-semibold mb-2">Total Contributions</h3>
                        <p className="text-3xl font-bold">{userContributions.totalContributions}</p>
                        <p className="text-green-200 text-sm">All content types</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
                        <h3 className="text-lg font-semibold mb-2">Last Activity</h3>
                        <p className="text-lg font-bold">
                          {userContributions.recentActivity 
                            ? userContributions.recentActivity.toLocaleDateString()
                            : 'No activity'
                          }
                        </p>
                        <p className="text-purple-200 text-sm">Most recent submission</p>
                      </div>
                    </div>

                    {/* Detailed Contributions */}
                    {userContributions.entries.glossaryTerms.length > 0 ? (
                      <div className="bg-gray-700 rounded-lg p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">
                          Your Glossary Terms ({userContributions.entries.glossaryTerms.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {userContributions.entries.glossaryTerms.map((term) => (
                            <div key={term._id} className="bg-gray-600 rounded-lg p-4 border border-gray-500">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-white capitalize">{term.title}</h5>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  term.approved ? 'bg-green-600 text-green-100' : 'bg-yellow-600 text-yellow-100'
                                }`}>
                                  {term.approved ? 'Approved' : 'Pending'}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm mb-3 line-clamp-3">{term.description}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">
                                  {formatDate(term.createdAt)}
                                </span>
                                <button
                                  onClick={() => router.push(`/contribute?tab=glossary&search=${encodeURIComponent(term.title)}`)}
                                  className="text-blue-400 hover:text-blue-300 text-xs underline"
                                >
                                  View in Glossary →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-700 rounded-lg p-8 text-center">
                        <p className="text-gray-400 mb-4">You haven't made any contributions yet.</p>
                        <button
                          onClick={() => router.push('/contribute')}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          Start Contributing
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Unable to load contributions</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
