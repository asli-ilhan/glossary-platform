"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Types
type Term = {
  _id: string;
  title: string;
  description: string;
  approved: boolean;
  tags?: string[];
  category?: string;
  difficulty?: string;
  createdAt: string;
  userId?: {
    email: string;
  };
};

type ContentModule = {
  _id: string;
  title: string;
  description: string;
  contentType: string;
  knowledgeArea: string;
  discipline: string;
  moderationStatus: string;
  youtubeUrl?: string;
  tags: string[];
  createdAt: string;
  createdBy?: {
    email: string;
  };
};

type SunburstEntry = {
  _id: string;
  themeCluster: string;
  knowledgeArea: string;
  discipline: string;
  roleSystemOrientation: string;
  toolTechnology: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    email: string;
  };
};

type ImportResult = {
  success: boolean;
  message: string;
  type: string;
  stats: {
    totalRows: number;
    inserted: number;
    duplicates: number;
    errors: number;
  };
  details: {
    duplicates: string[];
    errors: string[];
  };
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [terms, setTerms] = useState<Term[]>([]);
  const [contentModules, setContentModules] = useState<ContentModule[]>([]);
  const [sunburstEntries, setSunburstEntries] = useState<SunburstEntry[]>([]);
  
  // CSV Import states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'auto' | 'sunburst' | 'content'>('auto');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Edit states
  const [editing, setEditing] = useState<Term | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const user = session.user as { id: string; email: string; role: string } | undefined;
    if (user?.role !== 'admin') {
      router.push('/');
      return;
    }

    setLoading(false);
    fetchAllData();
  }, [session, status, router]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchTerms(),
      fetchContent(),
      fetchSunburstData()
    ]);
  };

  const fetchTerms = async () => {
    try {
    const res = await fetch("/api/glossary");
    const data = await res.json();
    if (Array.isArray(data)) {
      setTerms(data);
      }
    } catch (error) {
      console.error("Failed to fetch terms:", error);
    }
  };

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/content");
      const data = await res.json();
      if (Array.isArray(data)) {
        setContentModules(data);
      }
    } catch (error) {
      console.error("Failed to fetch content:", error);
    }
  };

  const fetchSunburstData = async () => {
    try {
      const res = await fetch("/api/sunburst?includeInactive=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSunburstEntries(data);
      }
    } catch (error) {
      console.error("Failed to fetch sunburst data:", error);
    }
  };

  // Term management functions
  const handleApprove = async (id: string) => {
    await fetch(`/api/glossary?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
    fetchTerms();
  };

  const handleDelete = async (id: string, type: 'term' | 'content' | 'sunburst') => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    let endpoint = '';
    switch (type) {
      case 'term':
        endpoint = `/api/glossary?id=${id}`;
        break;
      case 'content':
        endpoint = `/api/content?id=${id}`;
        break;
      case 'sunburst':
        endpoint = `/api/sunburst?id=${id}`;
        break;
    }
    
    await fetch(endpoint, { method: "DELETE" });
    fetchAllData();
  };

  const handleEdit = (term: Term) => {
    setEditing(term);
    setEditTitle(term.title);
    setEditDescription(term.description);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    await fetch(`/api/glossary?id=${editing._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, description: editDescription }),
    });
    setEditing(null);
    fetchTerms();
  };

  // CSV Import functions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setImportResult(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleImport = async () => {
    if (!csvFile) {
      alert('Please select a CSV file');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      if (importType !== 'auto') {
        formData.append('importType', importType);
      }

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setImportResult(result);

      if (result.success) {
        // Refresh data based on import type
        if (result.type === 'sunburst') {
          fetchSunburstData();
        } else if (result.type === 'content') {
          fetchContent();
        }
        setCsvFile(null);
        // Reset file input
        const fileInput = document.getElementById('csvFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        message: 'Failed to import CSV',
        type: 'unknown',
        stats: { totalRows: 0, inserted: 0, duplicates: 0, errors: 1 },
        details: { duplicates: [], errors: ['Network error or server issue'] }
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async (type: 'sunburst' | 'content') => {
    try {
      const response = await fetch(`/api/import/csv?template=${type}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${type}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download template');
    }
  };

  // Loading and auth checks
  if (loading || status === 'loading') {
    return (
      <div className="container text-center mt-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
        <h1>Loading Admin Dashboard...</h1>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container text-center mt-12">
        <h1>Please sign in to access the admin dashboard</h1>
      </div>
    );
  }

  const user = session.user as { id: string; email: string; role: string } | undefined;
  if (user?.role !== 'admin') {
    return (
      <div className="container text-center mt-12">
        <h1>Access Denied</h1>
        <p>You need admin privileges to access this page.</p>
      </div>
    );
  }

  // Statistics
  const pendingTerms = terms.filter(t => !t.approved).length;
  const pendingContent = contentModules.filter(c => c.moderationStatus === 'pending').length;
  const totalEntries = terms.length + contentModules.length + sunburstEntries.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Welcome, {user.email}</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', count: null },
                { id: 'terms', name: 'Glossary Terms', count: pendingTerms },
                { id: 'content', name: 'Content Modules', count: pendingContent },
                { id: 'sunburst', name: 'Sunburst Data', count: null },
                { id: 'import', name: 'CSV Import', count: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-green-400 text-green-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count !== null && tab.count > 0 && (
                    <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2 py-1">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Dashboard Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Total Entries</h3>
                  <p className="text-3xl font-bold">{totalEntries}</p>
                  <p className="text-blue-200 text-sm">Across all collections</p>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Pending Terms</h3>
                  <p className="text-3xl font-bold">{pendingTerms}</p>
                  <p className="text-yellow-200 text-sm">Awaiting approval</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Pending Content</h3>
                  <p className="text-3xl font-bold">{pendingContent}</p>
                  <p className="text-purple-200 text-sm">Awaiting moderation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Data Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Glossary Terms:</span>
                      <span className="text-white font-semibold">{terms.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Content Modules:</span>
                      <span className="text-white font-semibold">{contentModules.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Sunburst Entries:</span>
                      <span className="text-white font-semibold">{sunburstEntries.length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('import')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
                    >
                      Import CSV Data
                    </button>
                    <button 
                      onClick={() => setActiveTab('terms')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                    >
                      Review Pending Terms
                    </button>
                    <button 
                      onClick={() => setActiveTab('content')}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
                    >
                      Moderate Content
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Glossary Terms Tab */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Glossary Terms Management</h2>
              
              {terms.length === 0 ? (
                <p className="text-gray-400">No glossary terms found.</p>
              ) : (
                terms.map((term) => (
                  <div key={term._id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{term.title}</h3>
                        <p className="text-gray-300 mt-2">{term.description}</p>
                        {term.tags && term.tags.length > 0 && (
                          <div className="mt-2">
                            {term.tags.map((tag, index) => (
                              <span key={index} className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded mr-2">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center mt-2 space-x-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            term.approved ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                          }`}>
                            {term.approved ? 'Approved' : 'Pending'}
                          </span>
                          {term.category && (
                            <span className="text-gray-400 text-sm">Category: {term.category}</span>
                          )}
                          {term.difficulty && (
                            <span className="text-gray-400 text-sm">Difficulty: {term.difficulty}</span>
                          )}
                        </div>
                        {term.userId?.email && (
                          <p className="text-gray-500 text-sm mt-1">Submitted by: {term.userId.email}</p>
                        )}
                      </div>
                      
                      <div className="ml-4 space-x-2 flex">
                        {!term.approved && (
                          <button 
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            onClick={() => handleApprove(term._id)}
                          >
                            Approve
                          </button>
                        )}
                        <button 
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => handleEdit(term)}
                        >
                          Edit
                        </button>
                        <button 
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => handleDelete(term._id, 'term')}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Content Modules Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Content Modules Management</h2>
              
              {contentModules.length === 0 ? (
                <p className="text-gray-400">No content modules found.</p>
              ) : (
                contentModules.map((content) => (
                  <div key={content._id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{content.title}</h3>
                        <p className="text-gray-300 mt-2">{content.description}</p>
                        <div className="mt-2 space-x-4">
                          <span className="text-gray-400 text-sm">Type: {content.contentType}</span>
                          <span className="text-gray-400 text-sm">Area: {content.knowledgeArea}</span>
                          <span className="text-gray-400 text-sm">Discipline: {content.discipline}</span>
                        </div>
                        {content.tags && content.tags.length > 0 && (
                          <div className="mt-2">
                            {content.tags.map((tag, index) => (
                              <span key={index} className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded mr-2">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center mt-2 space-x-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            content.moderationStatus === 'approved' ? 'bg-green-600 text-white' :
                            content.moderationStatus === 'rejected' ? 'bg-red-600 text-white' :
                            'bg-yellow-600 text-white'
                          }`}>
                            {content.moderationStatus}
                          </span>
                          {content.youtubeUrl && (
                            <a href={content.youtubeUrl} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-400 hover:text-blue-300 text-sm">
                              View Video
                            </a>
                          )}
                        </div>
                        {content.createdBy?.email && (
                          <p className="text-gray-500 text-sm mt-1">Created by: {content.createdBy.email}</p>
                        )}
                      </div>
                      
                      <div className="ml-4 space-x-2 flex">
                        {content.moderationStatus === 'pending' && (
                          <>
                            <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors">
                              Approve
                            </button>
                            <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                        <button 
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => handleDelete(content._id, 'content')}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sunburst Data Tab */}
          {activeTab === 'sunburst' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Sunburst Visualization Data</h2>
              
              {sunburstEntries.length === 0 ? (
                <p className="text-gray-400">No sunburst entries found.</p>
              ) : (
                sunburstEntries.map((entry) => (
                  <div key={entry._id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{entry.toolTechnology}</h3>
                        <p className="text-gray-300 mt-2">{entry.description}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <span className="text-gray-400">Theme: <span className="text-white">{entry.themeCluster}</span></span>
                          <span className="text-gray-400">Knowledge Area: <span className="text-white">{entry.knowledgeArea}</span></span>
                          <span className="text-gray-400">Discipline: <span className="text-white">{entry.discipline}</span></span>
                          <span className="text-gray-400">Role: <span className="text-white">{entry.roleSystemOrientation}</span></span>
                        </div>
                        <div className="flex items-center mt-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            entry.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                          }`}>
                            {entry.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {entry.createdBy?.email && (
                          <p className="text-gray-500 text-sm mt-1">Created by: {entry.createdBy.email}</p>
                        )}
                      </div>
                      
                      <div className="ml-4 space-x-2 flex">
                        <button 
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => handleDelete(entry._id, 'sunburst')}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* CSV Import Tab */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">CSV Data Import</h2>
              
              {/* Import Form */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Upload CSV File</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Import Type
                    </label>
                    <select 
                      value={importType} 
                      onChange={(e) => setImportType(e.target.value as 'auto' | 'sunburst' | 'content')}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-green-400 focus:outline-none"
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="sunburst">Sunburst Data</option>
                      <option value="content">Content Modules</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CSV File
                    </label>
                    <input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-green-400 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                    />
                    {csvFile && (
                      <p className="text-sm text-green-400 mt-2">
                        Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={handleImport}
                      disabled={!csvFile || importing}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded transition-colors flex items-center space-x-2"
                    >
                      {importing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Importing...</span>
                        </>
                      ) : (
                        <span>Import CSV</span>
                      )}
                    </button>
                    
                    <button
                      onClick={() => downloadTemplate('sunburst')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors text-sm"
                    >
                      Download Sunburst Template
                    </button>
                    
                    <button
                      onClick={() => downloadTemplate('content')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors text-sm"
                    >
                      Download Content Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Results */}
              {importResult && (
                <div className={`rounded-lg p-6 ${
                  importResult.success ? 'bg-green-900 border border-green-700' : 'bg-red-900 border border-red-700'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 ${
                    importResult.success ? 'text-green-300' : 'text-red-300'
                  }`}>
                    Import Results
                  </h3>
                  
                  <div className="space-y-4">
                    <p className="text-white">{importResult.message}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-800 rounded p-3">
                        <p className="text-gray-400 text-sm">Total Rows</p>
                        <p className="text-white font-bold text-lg">{importResult.stats.totalRows}</p>
                      </div>
                      <div className="bg-green-800 rounded p-3">
                        <p className="text-green-200 text-sm">Inserted</p>
                        <p className="text-white font-bold text-lg">{importResult.stats.inserted}</p>
                      </div>
                      <div className="bg-yellow-800 rounded p-3">
                        <p className="text-yellow-200 text-sm">Duplicates</p>
                        <p className="text-white font-bold text-lg">{importResult.stats.duplicates}</p>
                      </div>
                      <div className="bg-red-800 rounded p-3">
                        <p className="text-red-200 text-sm">Errors</p>
                        <p className="text-white font-bold text-lg">{importResult.stats.errors}</p>
                      </div>
                    </div>
                    
                    {importResult.details.errors.length > 0 && (
                      <div>
                        <h4 className="text-red-300 font-semibold mb-2">Errors:</h4>
                        <ul className="text-red-200 text-sm space-y-1 max-h-40 overflow-y-auto">
                          {importResult.details.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {importResult.details.duplicates.length > 0 && (
                      <div>
                        <h4 className="text-yellow-300 font-semibold mb-2">Duplicates:</h4>
                        <ul className="text-yellow-200 text-sm space-y-1 max-h-40 overflow-y-auto">
                          {importResult.details.duplicates.map((duplicate, index) => (
                            <li key={index}>• {duplicate}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import Instructions */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">CSV Format Requirements</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-green-400 font-medium mb-2">Sunburst Data CSV</h4>
                    <p className="text-gray-300 text-sm mb-2">Required columns:</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Theme Cluster</li>
                      <li>• Knowledge Area</li>
                      <li>• Discipline</li>
                      <li>• Role/System Orientation</li>
                      <li>• Tool/Technology</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-purple-400 font-medium mb-2">Content Modules CSV</h4>
                    <p className="text-gray-300 text-sm mb-2">Required columns:</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Type</li>
                      <li>• Title</li>
                      <li>• Narrative</li>
                      <li>• Linked Knowledge Area</li>
                      <li>• Linked Disciplines</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <div className="p-4 bg-blue-900 rounded">
                    <p className="text-blue-200 text-sm">
                      💡 <strong>Tip:</strong> Download the template files above to see the exact format expected. 
                      The system can auto-detect the CSV type based on the headers.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-orange-900 rounded border border-orange-700">
                    <p className="text-orange-200 text-sm">
                      ⚠️ <strong>Important:</strong> When importing Sunburst Data, all existing sunburst entries will be 
                      automatically cleared and replaced with the new hierarchical structure from your CSV. This ensures 
                      optimal performance and prevents data conflicts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
      {editing && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl w-96 p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-4">Edit Term</h2>
            <input
                className="w-full mb-2 p-2 bg-gray-700 text-white border border-gray-600 rounded focus:border-green-400 focus:outline-none"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Edit Title"
            />
            <textarea
                className="w-full mb-4 p-2 bg-gray-700 text-white border border-gray-600 rounded focus:border-green-400 focus:outline-none h-32"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Edit Description"
            />
              <div className="flex space-x-2">
                <button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors" 
                  onClick={handleSaveEdit}
                >
                  Save
                </button>
                <button 
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors" 
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
}
