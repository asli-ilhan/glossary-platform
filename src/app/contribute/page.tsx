'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Term = { 
  _id: string; 
  title: string; 
  description: string; 
  userId?: { _id: string; email: string };
  approved?: boolean;
  createdAt?: string;
};

type GroupedTerm = {
  title: string;
  definitions: Term[];
};

export default function Contribute() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('glossary');

  useEffect(() => {
    // Check URL parameters for tab selection
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'submit') {
      setActiveTab('submit');
    } else if (tabParam === 'glossary') {
      setActiveTab('glossary');
    }
  }, []);
  
  // Glossary-related state
  const [terms, setTerms] = useState<Term[]>([]);
  const [groupedTerms, setGroupedTerms] = useState<GroupedTerm[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<GroupedTerm | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');

  
  // Multi-step modal state
  const [modalStep, setModalStep] = useState(1); // 1: title+tag, 2: description, 3: success
  const [selectedTag, setSelectedTag] = useState('');
  const [isExpandingEntry, setIsExpandingEntry] = useState(false);
  const [existingTerm, setExistingTerm] = useState<GroupedTerm | null>(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<Term | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalEntries: 0,
    totalContributors: 0,
    recentEntries: 0,
    pendingEntries: 0
  });

  const [contentAnalytics, setContentAnalytics] = useState({
    totalProjects: 0,
    totalCollaborators: 0,
    recentSubmissions: 0,
    approvedProjects: 0
  });

  const fetchContentAnalytics = async () => {
    try {
      // Fetch content modules/projects data
      const res = await fetch('/api/content');
      const data = await res.json();
      if (Array.isArray(data)) {
        const uniqueCreators = new Set(data.filter((item: any) => item.createdBy?._id).map((item: any) => item.createdBy._id));
        const approvedContent = data.filter((item: any) => item.moderationStatus === 'approved');
        const recentContent = data.filter((item: any) => {
          if (!item.createdAt) return false;
          const createdDate = new Date(item.createdAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return createdDate > thirtyDaysAgo;
        });

        setContentAnalytics({
          totalProjects: data.length,
          totalCollaborators: uniqueCreators.size,
          recentSubmissions: recentContent.length,
          approvedProjects: approvedContent.length
        });
      }
    } catch (err) {
      console.error('Error fetching content analytics:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'glossary') {
      // Load terms when glossary tab is active
      fetchTerms();
    } else if (activeTab === 'submit') {
      // Load content analytics when submit tab is active
      fetchContentAnalytics();
    }
  }, [activeTab]);

  const fetchTerms = async () => {
    try {
      const res = await fetch('/api/glossary');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTerms(data);
        // Group terms by title
        const grouped = data.reduce((acc: GroupedTerm[], term: Term) => {
          const existingGroup = acc.find(group => group.title === term.title);
          if (existingGroup) {
            existingGroup.definitions.push(term);
          } else {
            acc.push({
              title: term.title,
              definitions: [term]
            });
          }
          return acc;
        }, []);
        setGroupedTerms(grouped);
        
        // Calculate analytics from the data
        const uniqueContributors = new Set(data.filter((term: Term) => term.userId?._id).map((term: Term) => term.userId!._id));
        const approvedEntries = data.filter((term: Term) => term.approved !== false);
        const pendingEntries = data.filter((term: Term) => term.approved === false);
        const recentEntries = data.filter((term: Term) => {
          if (!term.createdAt) return false;
          const createdDate = new Date(term.createdAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return createdDate > thirtyDaysAgo;
        });

        setAnalytics({
          totalEntries: approvedEntries.length,
          totalContributors: uniqueContributors.size,
          recentEntries: recentEntries.length,
          pendingEntries: pendingEntries.length
        });
      } else {
        console.error('Expected array, got:', data);
        setTerms([]);
        setGroupedTerms([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setTerms([]);
      setGroupedTerms([]);
    }
  };

  const handleAddTermClick = () => {
    if (!session) {
      // Redirect to sign in if user wants to add a term
      router.push('/auth/signin?callbackUrl=/contribute');
      return;
    }
    // Clear any previous messages and reset modal state when opening
    setError('');
    setSuccess('');
    setWarning('');
    setModalStep(1);
    setTitle('');
    setDescription('');
    setSelectedTag('');
    setIsExpandingEntry(false);
    setExistingTerm(null);
    setIsAddModalOpen(true);
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!session) {
      setError('You must be signed in to add terms');
      return;
    }

    if (modalStep === 1) {
      // Step 1: Check if term exists and move to step 2
      if (!title.trim() || !selectedTag) {
        setError('Please enter a title and select a tag');
        return;
      }

      // Check if term already exists
      const existing = groupedTerms.find(group => 
        group.title.toLowerCase() === title.trim().toLowerCase()
      );

      if (existing) {
        setIsExpandingEntry(true);
        setExistingTerm(existing);
      } else {
        setIsExpandingEntry(false);
        setExistingTerm(null);
      }
      
      setModalStep(2);
    } else if (modalStep === 2) {
      // Step 2: Submit the final entry
      if (!description.trim()) {
        setError('Please enter a description');
        return;
      }

      const res = await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: title.trim(), 
          description: description.trim(),
          tag: selectedTag,
          isExpansion: isExpandingEntry
        }),
      });

      const data = await res.json();

      if (res.ok) {
        fetchTerms();
        setModalStep(3); // Move to success step
        // Dispatch event to update visualization
        window.dispatchEvent(new CustomEvent('glossaryUpdated'));
      } else {
        setError(data.error || 'Failed to submit entry');
      }
    }
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setModalStep(1);
    setTitle('');
    setDescription('');
    setSelectedTag('');
    setIsExpandingEntry(false);
    setExistingTerm(null);
    setError('');
  };

  const handleEditClick = (definition: Term) => {
    setIsEditing(true);
    setEditingDefinition(definition);
    setEditTitle(selectedTerm?.title || '');
    setEditDescription(definition.description);
    setError('');
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditingDefinition(null);
    setEditTitle('');
    setEditDescription('');
    setError('');
  };

  const handleEditSave = async () => {
    if (!editingDefinition || !session) {
      setError('Unable to save changes');
      return;
    }

    if (!editTitle.trim() || !editDescription.trim()) {
      setError('Title and description are required');
      return;
    }

    const res = await fetch(`/api/glossary?id=${editingDefinition._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDescription.trim(),
      }),
    });

    const data = await res.json();

    if (res.ok) {
      fetchTerms();
      setIsEditing(false);
      setEditingDefinition(null);
      setSelectedTerm(null);
      // Dispatch event to update visualization
      window.dispatchEvent(new CustomEvent('glossaryUpdated'));
    } else {
      setError(data.error || 'Error updating the term');
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!session) {
      setError('You must be signed in to delete terms');
      return;
    }

    if (!confirm('Are you sure you want to delete this definition?')) return;

    const res = await fetch(`/api/glossary?id=${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();

    if (res.ok) {
      // Refresh the terms list to update grouping
      fetchTerms();
      setSelectedTerm(null);
      setIsEditing(false);
      setEditingDefinition(null);
      // Dispatch event to update visualization
      window.dispatchEvent(new CustomEvent('glossaryUpdated'));
    } else {
      setError(data.error || 'Error deleting the term');
    }
  };



  const filteredGroupedTerms = Array.isArray(groupedTerms)
    ? selectedLetter
      ? groupedTerms.filter((t) => t.title.toUpperCase().startsWith(selectedLetter))
      : groupedTerms
    : [];

  const user = session?.user as { id: string; email: string; role: string } | undefined;

  if (status === 'loading') {
    return (
      <div className="container text-center mt-12">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">CONTRIBUTE</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-8 mb-8 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('glossary')}
          className={`pb-4 px-2 text-xl font-semibold transition-colors duration-200 ${
            activeTab === 'glossary'
              ? 'text-yellow-300 border-b-2 border-yellow-300'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Glossary
        </button>
        <button
          onClick={() => setActiveTab('submit')}
          className={`pb-4 px-2 text-xl font-semibold transition-colors duration-200 ${
            activeTab === 'submit'
              ? 'text-orange-300 border-b-2 border-orange-300'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Submit Your Work
        </button>
      </div>

      {/* Tab Content */}
      <div className="text-lg text-gray-300 leading-relaxed">
        {activeTab === 'glossary' && (
          <div className="w-full">
            <div className="mb-6">
              <p className="text-left text-gray-300">
                All submissions are reviewed before publication to ensure clarity and relevance.
              </p>
              <p className="text-left text-gray-300 mt-2">
                Approved terms are credited and interlinked across the Toolkit, allowing users to trace how concepts shift across disciplines, tools, and real-world examples.
              </p>
            </div>
            {!session && (
              <p className="text-center mb-3 text-gray-400">
                Browse our comprehensive glossary of terms. 
                <button 
                  onClick={() => router.push('/auth/signin?callbackUrl=/contribute')} 
                  className="text-green-400 hover:text-green-300 underline ml-1"
                >
                  Sign in
                </button> to add new terms.
              </p>
            )}

            {error && (
              <div className="bg-red-500 text-white p-3 rounded mb-4 text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500 text-white p-3 rounded mb-4 text-center">
                {success}
              </div>
            )}

            {warning && (
              <div className="bg-yellow-600 text-white p-3 rounded mb-4 text-center">
                <strong>Note:</strong> {warning}
              </div>
            )}

            {/* Community Analytics */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-2">So far;</h3>
              <div className="text-gray-300 text-sm">
                <p>
                  <span className="text-cyan-400 font-semibold">{analytics.totalEntries}</span> entries are published by{' '}
                  <span className="text-green-400 font-semibold">{analytics.totalContributors}</span> contributors, and{' '}
                  <span className="text-purple-400 font-semibold">{analytics.pendingEntries}</span> awaiting for approval.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <button 
                className="primary px-6 py-2 add-term-form" 
                onClick={handleAddTermClick}
              >
                {session ? 'Propose a New Entry' : 'Sign In to Add Terms'}
              </button>
            </div>

            <div className="tab-container justify-start">
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
                <div
                  key={letter}
                  className={`tab ${selectedLetter === letter ? 'active' : ''}`}
                  onClick={() => setSelectedLetter(letter)}
                >
                  {letter}
                </div>
              ))}
              <div className="tab secondary" onClick={() => setSelectedLetter(null)}>All</div>
            </div>

            <div className="term-list glossary-terms-container justify-center">
              {filteredGroupedTerms.length === 0 ? (
                <p className="text-gray-400 text-center">No terms found.</p>
              ) : (
                filteredGroupedTerms.map((groupedTerm, index) => (
                  <button key={groupedTerm.title} className={`term-item glossary-term-box ${index === 0 ? 'first-term' : ''}`} onClick={() => setSelectedTerm(groupedTerm)}>
                    {groupedTerm.title}
                    {groupedTerm.definitions.length > 1 && (
                      <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded-full definition-count-badge">
                        {groupedTerm.definitions.length} definitions
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Add Term Modal */}
            {isAddModalOpen && (
              <div className="modal fixed inset-0 flex items-center justify-center" onClick={(e) => e.target === e.currentTarget && handleModalClose()}>
                <div className="modal-content max-w-6xl w-full mx-4 p-10" onClick={(e) => e.stopPropagation()}>
                  {modalStep === 1 && (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Propose a New Entry</h2>
                        <button 
                          onClick={handleModalClose}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <form onSubmit={handleStepSubmit} className="space-y-4">
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Title of the entry"
                          required
                        />
                        <select
                          value={selectedTag}
                          onChange={(e) => setSelectedTag(e.target.value)}
                          required
                          className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white"
                        >
                          <option value="">Select a layer</option>
                          <option value="discipline">Discipline</option>
                          <option value="tools-technology">Tools & Technology</option>
                          <option value="knowledge-area">Knowledge Area</option>
                        </select>
                        {error && (
                          <div className="bg-red-500 text-white p-2 rounded text-sm">
                            {error}
                          </div>
                        )}
                        <button type="submit" className="primary w-full">Continue</button>
                      </form>
                    </>
                  )}

                  {modalStep === 2 && (
                    <>
                      <h2 className="text-xl font-bold mb-4">
                        {isExpandingEntry ? `Expand: ${title}` : `New Entry: ${title}`}
                      </h2>
                      {isExpandingEntry && existingTerm && (
                        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-600 rounded">
                          <p className="text-sm text-blue-300 mb-2">This entry already exists with {existingTerm.definitions.length} definition(s). You're adding a new perspective.</p>
                        </div>
                      )}
                      <form onSubmit={handleStepSubmit} className="space-y-4">
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Your definition"
                          rows={4}
                          required
                          className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white"
                        />
                        {error && (
                          <div className="bg-red-500 text-white p-2 rounded text-sm">
                            {error}
                          </div>
                        )}
                        <button type="submit" className="primary w-full">Submit Entry</button>
                        <button type="button" className="secondary w-full" onClick={() => setModalStep(1)}>
                          Back
                        </button>
                      </form>
                    </>
                  )}

                  {modalStep === 3 && (
                    <>
                      <h2 className="text-xl font-bold mb-4">Entry Submitted!</h2>
                      <div className="bg-green-900/30 border border-green-600 rounded p-4 mb-4">
                        <p className="text-green-300">
                          Thank you! Your contribution has been submitted. This entry is awaiting moderation.
                        </p>
                      </div>
                      <button className="primary w-full" onClick={handleModalClose}>
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Term Detail Modal */}
            {selectedTerm && (
              <div className="modal fixed inset-0 flex items-center justify-center" onClick={() => setSelectedTerm(null)}>
                <div className={`modal-content p-10 ${selectedTerm.definitions.length === 1 ? 'max-w-2xl' : selectedTerm.definitions.length === 2 ? 'max-w-5xl' : 'max-w-[80vw]'} w-full mx-4 max-h-[90vh] overflow-y-auto text-left`} onClick={(e) => e.stopPropagation()}>
                                                          {/* Top row with back, edit and close icons */}
                    <div className="flex justify-between items-center mb-4 -mx-6">
                      <div>
                        {isEditing && (
                          <button 
                            onClick={handleEditCancel}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center -space-x-4">
                        {/* Edit button - only show for user's own entries */}
                        {selectedTerm.definitions.some(def => def.userId?._id === user?.id) && !isEditing && (
                          <button 
                            onClick={() => {
                              const userDefinition = selectedTerm.definitions.find(def => def.userId?._id === user?.id);
                              if (userDefinition) handleEditClick(userDefinition);
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {/* Close button */}
                        <button 
                          onClick={() => setSelectedTerm(null)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Title row */}
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-left">{selectedTerm.title}</h2>
                    </div>
                  
                  {isEditing && editingDefinition ? (
                    <div className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
                      <h3 className="text-xl font-semibold text-green-400 mb-6">Edit Entry</h3>
                      
                      {error && (
                        <div className="bg-red-500 text-white p-2 rounded text-sm mb-4">
                          {error}
                        </div>
                      )}
                      
                                              <div className="space-y-6">
                          <div>
                            <label className="block text-base font-medium text-gray-300 mb-3">Title</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white text-base"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-base font-medium text-gray-300 mb-3">Description</label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={5}
                              className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white text-base"
                            />
                          </div>
                        
                                                </div>
                        
                        <div className="flex justify-center space-x-4 pt-6">
                          <button 
                            onClick={handleEditSave}
                            className="primary px-6 py-3 text-base"
                          >
                            Save
                          </button>
                          <button 
                            className="danger px-6 py-3 text-base" 
                            onClick={() => handleDeleteTerm(editingDefinition._id)}
                          >
                            Delete
                          </button>
                        </div>
                    </div>
                  ) : (
                    <div className={`grid gap-6 ${selectedTerm.definitions.length === 1 ? 'grid-cols-1' : selectedTerm.definitions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {selectedTerm.definitions.map((definition, index) => (
                        <div key={definition._id} className={`p-6 bg-gray-800 border border-gray-700 rounded-lg ${selectedTerm.definitions.length === 1 ? 'w-full' : 'min-w-[300px] max-w-[400px]'}`}>
                          {/* Show pending review message for user's own unapproved entries */}
                          {definition.approved === false && definition.userId?._id === user?.id && (
                            <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded">
                              <p className="text-sm text-yellow-300 text-left">Your entry is pending review.</p>
                            </div>
                          )}
                          
                          <div className="mb-4">
                            <h3 className="text-xl font-semibold text-green-400 text-left">
                              Definition
                            </h3>
                          </div>
                          
                          <p className="text-gray-300 text-base leading-relaxed mb-4 text-left">{definition.description}</p>
                          
                          {definition.userId?.email && (
                            <div className="flex justify-end">
                              <span className="text-sm text-gray-400">
                                by {definition.userId.email}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  

                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'submit' && (
          <div>
            {/* Project Collaboration Analytics */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-2">So far;</h3>
              <div className="text-gray-300 text-sm">
                <p>
                  <span className="text-cyan-400 font-semibold">{contentAnalytics.totalProjects}</span> works are submitted by{' '}
                  <span className="text-green-400 font-semibold">{contentAnalytics.totalCollaborators}</span> contributors and{' '}
                  <span className="text-purple-400 font-semibold">{contentAnalytics.approvedProjects}</span> projects are being featured.
                </p>
              </div>
            </div>

            <p className="mb-6">
              Contact{' '}
              <a 
                href="mailto:a.ilhan@arts.ac.uk" 
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
              >
                a.ilhan@arts.ac.uk
              </a>
              {' '}and/or{' '}
              <a 
                href="mailto:c.yuksel@arts.ac.uk" 
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
              >
                c.yuksel@arts.ac.uk.
              </a>
            </p>
          </div>
        )}
      </div>

    </div>
  );
} 