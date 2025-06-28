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

interface User {
  _id: string;
  email: string;
  role: 'admin' | 'student' | 'contributor';
  isApproved: boolean;
  isBlocked: boolean;
  approvedAt?: string;
  approvedBy?: { email: string };
  blockedAt?: string;
  blockedBy?: { email: string };
  blockReason?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface AdminSettings {
  registrationEnabled: boolean;
  blockedEmails: string[];
  blockedDomains: string[];
  lastUpdatedBy: string;
  updatedAt: string;
}

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  blockedUsers: number;
  totalGlossaryTerms: number;
  totalContent: number;
}

interface UserContribution {
  userId: string;
  userEmail: string;
  userRole: 'admin' | 'student' | 'contributor';
  glossaryTerms: number;
  contentModules: number;
  sunburstEntries: number;
  totalContributions: number;
  recentActivity: Date;
  entries: {
    glossaryTerms: Term[];
    contentModules: ContentModule[];
    sunburstEntries: SunburstEntry[];
  };
}

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
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<any[]>([]);
  
  // CSV Import states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'auto' | 'sunburst' | 'content'>('auto');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Edit states
  const [editing, setEditing] = useState<Term | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // New states for user management
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    blockedUsers: 0,
    totalGlossaryTerms: 0,
    totalContent: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    registrationEnabled: true,
    blockedEmails: [],
    blockedDomains: [],
    lastUpdatedBy: '',
    updatedAt: '',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newBlockedEmail, setNewBlockedEmail] = useState('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Analytics states
  const [userContributions, setUserContributions] = useState<UserContribution[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Authentication check - ALWAYS first useEffect
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

  // Effect to fetch user contributions when selectedUser changes - ALWAYS second useEffect
  useEffect(() => {
    if (selectedUser && terms.length > 0 && contentModules.length > 0 && sunburstEntries.length > 0) {
      fetchUserContributions();
    }
  }, [selectedUser, terms, contentModules, sunburstEntries]);

  // Effect to fetch all contributions when tab is analytics and data is loaded - ALWAYS third useEffect
  useEffect(() => {
    if (activeTab === 'analytics' && terms.length > 0 && contentModules.length > 0 && sunburstEntries.length > 0 && users.length > 0) {
      fetchAllUserContributions();
    }
  }, [activeTab, terms, contentModules, sunburstEntries, users]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchTerms(),
      fetchContent(),
      fetchSunburstData(),
      fetchUsers()
    ]);
  };

  const fetchTerms = async () => {
    try {
    const res = await fetch("/api/glossary?all=true");
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
      const res = await fetch("/api/content?all=true");
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

  const fetchUsers = async () => {
    try {
      // Fetch all users
      const allUsersRes = await fetch("/api/users?status=all");
      const allUsersData = await allUsersRes.json();
      if (Array.isArray(allUsersData)) {
        setUsers(allUsersData);
        
        // Update legacy state for backwards compatibility
        setPendingUsers(allUsersData.filter((u: User) => !u.isApproved && !u.isBlocked));
        setApprovedUsers(allUsersData.filter((u: User) => u.isApproved && !u.isBlocked));
        
        // Calculate stats
        const totalUsers = allUsersData.length;
        const pendingUsers = allUsersData.filter((u: User) => !u.isApproved && !u.isBlocked).length;
        const approvedUsers = allUsersData.filter((u: User) => u.isApproved && !u.isBlocked).length;
        const blockedUsers = allUsersData.filter((u: User) => u.isBlocked).length;
        
        setStats(prev => ({
          ...prev,
          totalUsers,
          pendingUsers,
          approvedUsers,
          blockedUsers,
        }));
      }

      // Fetch admin settings
      const settingsRes = await fetch('/api/admin/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setAdminSettings(settingsData);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
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
    // Dispatch event to update visualization
    window.dispatchEvent(new CustomEvent('glossaryUpdated'));
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
    // Dispatch appropriate event based on type
    if (type === 'term') {
      window.dispatchEvent(new CustomEvent('glossaryUpdated'));
    } else if (type === 'content') {
      window.dispatchEvent(new CustomEvent('contentUpdated'));
    } else if (type === 'sunburst') {
      window.dispatchEvent(new CustomEvent('sunburstUpdated'));
    }
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
    // Dispatch event to update visualization
    window.dispatchEvent(new CustomEvent('glossaryUpdated'));
  };

  // User management functions
  const handleUserAction = async (userId: string, action: string, reason?: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, reason }),
      });

      if (response.ok) {
        await fetchUsers(); // Fixed function name
        setBlockReason(''); // Clear reason input
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUsers(); // Fixed function name
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
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
          // Dispatch event to update visualization
          window.dispatchEvent(new CustomEvent('sunburstUpdated'));
        } else if (result.type === 'content') {
          fetchContent();
          // Dispatch event to update visualization
          window.dispatchEvent(new CustomEvent('contentUpdated'));
        }
        // Dispatch general CSV import event
        window.dispatchEvent(new CustomEvent('csvImported'));
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



  const updateSettings = async (updates: Partial<AdminSettings>) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...adminSettings, ...updates }),
      });

      if (response.ok) {
        const data = await response.json();
        setAdminSettings(data.settings);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings');
    }
  };

  const addToBlocklist = async (type: 'email' | 'domain', value: string) => {
    if (!value.trim()) return;

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value: value.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setAdminSettings(data.settings);
        if (type === 'email') setNewBlockedEmail('');
        if (type === 'domain') setNewBlockedDomain('');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding to blocklist:', error);
      alert('Failed to add to blocklist');
    }
  };

  const removeFromBlocklist = async (type: 'email' | 'domain', value: string) => {
    const updatedList = type === 'email' 
      ? adminSettings.blockedEmails.filter(email => email !== value)
      : adminSettings.blockedDomains.filter(domain => domain !== value);

    const updates = type === 'email' 
      ? { blockedEmails: updatedList }
      : { blockedDomains: updatedList };

    await updateSettings(updates);
  };

  const fetchUserContributions = async () => {
    if (!selectedUser) return;
    
    setAnalyticsLoading(true);
    try {
      // Find the selected user
      const user = users.find(u => u._id === selectedUser);
      if (!user) return;

      // Filter entries by user
      const userTerms = terms.filter(term => 
        term.userId?.email === user.email || 
        (term as any).createdBy?.email === user.email
      );
      
      const userContent = contentModules.filter(content => 
        content.createdBy?.email === user.email
      );
      
      const userSunburst = sunburstEntries.filter(entry => 
        entry.createdBy?.email === user.email
      );

      // Calculate contribution data
      const contribution: UserContribution = {
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        glossaryTerms: userTerms.length,
        contentModules: userContent.length,
        sunburstEntries: userSunburst.length,
        totalContributions: userTerms.length + userContent.length + userSunburst.length,
        recentActivity: new Date(Math.max(
          ...userTerms.map(t => new Date(t.createdAt).getTime()),
          ...userContent.map(c => new Date(c.createdAt).getTime()),
          ...userSunburst.map(s => new Date(s.createdAt).getTime()),
          0
        )),
        entries: {
          glossaryTerms: userTerms,
          contentModules: userContent,
          sunburstEntries: userSunburst,
        }
      };

      setUserContributions([contribution]);
    } catch (error) {
      console.error('Error fetching user contributions:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchAllUserContributions = async () => {
    setAnalyticsLoading(true);
    try {
      const contributions: UserContribution[] = [];
      
      for (const user of users.filter(u => u.isApproved && !u.isBlocked)) {
        // Filter entries by user
        const userTerms = terms.filter(term => 
          term.userId?.email === user.email || 
          (term as any).createdBy?.email === user.email
        );
        
        const userContent = contentModules.filter(content => 
          content.createdBy?.email === user.email
        );
        
        const userSunburst = sunburstEntries.filter(entry => 
          entry.createdBy?.email === user.email
        );

        const totalContributions = userTerms.length + userContent.length + userSunburst.length;
        
        // Only include users with contributions
        if (totalContributions > 0) {
          const contribution: UserContribution = {
            userId: user._id,
            userEmail: user.email,
            userRole: user.role,
            glossaryTerms: userTerms.length,
            contentModules: userContent.length,
            sunburstEntries: userSunburst.length,
            totalContributions,
            recentActivity: new Date(Math.max(
              ...userTerms.map(t => new Date(t.createdAt).getTime()),
              ...userContent.map(c => new Date(c.createdAt).getTime()),
              ...userSunburst.map(s => new Date(s.createdAt).getTime()),
              0
            )),
            entries: {
              glossaryTerms: userTerms,
              contentModules: userContent,
              sunburstEntries: userSunburst,
            }
          };
          
          contributions.push(contribution);
        }
      }
      
      // Sort by total contributions (descending)
      contributions.sort((a, b) => b.totalContributions - a.totalContributions);
      setUserContributions(contributions);
    } catch (error) {
      console.error('Error fetching all user contributions:', error);
    } finally {
      setAnalyticsLoading(false);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-purple-600 bg-purple-100';
      case 'contributor': return 'text-blue-600 bg-blue-100';
      case 'student': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.isBlocked) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Blocked</span>;
    }
    if (!user.isApproved) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>;
  };

  // Early returns to prevent conditional hook issues
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  const user = session.user as { id: string; email: string; role: string } | undefined;
  if (!user || user.role !== 'admin') {
    return null; // Will redirect in useEffect
  }

  // Calculate derived values
  const totalEntries = terms.length + contentModules.length + sunburstEntries.length;
  const pendingTerms = terms.filter(term => !term.approved).length;
  const pendingContent = contentModules.filter(module => module.moderationStatus === 'pending').length;
  const pendingUsersCount = pendingUsers.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Welcome, {user.email}</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex justify-center space-x-4 overflow-x-auto">
              {[
                { id: 'overview', name: 'Overview', count: null },
                { id: 'users', name: 'User Management', count: pendingUsersCount },
                { id: 'terms', name: 'Glossary Terms', count: pendingTerms },
                { id: 'content', name: 'Content Modules', count: pendingContent },
                { id: 'sunburst', name: 'Knowledge Map Data', count: null },
                { id: 'import', name: 'CSV Import', count: null },
                { id: 'analytics', name: 'Content Analytics', count: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 min-w-max ${
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Total Entries</h3>
                  <p className="text-3xl font-bold">{totalEntries}</p>
                  <p className="text-blue-200 text-sm">Across all collections</p>
                </div>
                
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Pending Users</h3>
                  <p className="text-3xl font-bold">{pendingUsersCount}</p>
                  <p className="text-red-200 text-sm">Awaiting approval</p>
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
                      <span className="text-gray-300">Knowledge Map Entries:</span>
                      <span className="text-white font-semibold">{sunburstEntries.length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('users')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
                    >
                      Approve Users ({pendingUsersCount})
                    </button>
                    <button 
                      onClick={() => setActiveTab('terms')}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded transition-colors"
                    >
                      Review Pending Terms
                    </button>
                    <button 
                      onClick={() => setActiveTab('content')}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
                    >
                      Moderate Content
                    </button>
                    <button 
                      onClick={() => setActiveTab('import')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
                    >
                      Import CSV Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>
              
              {/* Pending Users Section */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  Pending User Approvals 
                  <span className="ml-2 bg-red-600 text-white text-sm rounded-full px-2 py-1">
                    {pendingUsersCount}
                  </span>
                </h3>
                
                {pendingUsers.length === 0 ? (
                  <div className="bg-gray-700 rounded-lg p-6 text-center">
                    <p className="text-gray-400">No pending user approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((user) => (
                      <div key={user._id} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-white">{user.email}</h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                user.role === 'student' ? 'bg-blue-600 text-blue-100' :
                                user.role === 'contributor' ? 'bg-green-600 text-green-100' :
                                'bg-gray-600 text-gray-100'
                              }`}>
                                {user.role === 'student' ? '📚 Student' : 
                                 user.role === 'contributor' ? '✍️ Contributor' : user.role}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm mb-3">
                              Registered: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                            {user.profile && (
                              <div className="text-sm text-gray-400">
                                {user.profile.firstName && (
                                  <p>Name: {user.profile.firstName} {user.profile.lastName}</p>
                                )}
                                {user.profile.institution && (
                                  <p>Institution: {user.profile.institution}</p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleUserAction(user._id, 'approve')}
                              disabled={actionLoading === user._id}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason (optional):');
                                if (reason !== null) {
                                  handleUserAction(user._id, 'reject', reason);
                                }
                              }}
                              disabled={actionLoading === user._id}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approved Users Section */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  Approved Users
                  <span className="ml-2 bg-green-600 text-white text-sm rounded-full px-2 py-1">
                    {approvedUsers.length}
                  </span>
                </h3>
                
                {approvedUsers.length === 0 ? (
                  <div className="bg-gray-700 rounded-lg p-6 text-center">
                    <p className="text-gray-400">No approved users</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {approvedUsers.map((user) => (
                      <div key={user._id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-semibold text-white truncate">{user.email}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'admin' ? 'bg-red-600 text-red-100' :
                            user.role === 'student' ? 'bg-blue-600 text-blue-100' :
                            user.role === 'contributor' ? 'bg-green-600 text-green-100' :
                            'bg-gray-600 text-gray-100'
                          }`}>
                            {user.role === 'admin' ? '👑' :
                             user.role === 'student' ? '📚' :
                             user.role === 'contributor' ? '✍️' : '👤'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          Approved: {user.approvedAt ? new Date(user.approvedAt).toLocaleDateString() : 'N/A'}
                        </p>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="text-red-400 hover:text-red-300 text-xs underline"
                          >
                            Delete User
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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

          {/* Knowledge Map Data Tab */}
          {activeTab === 'sunburst' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Knowledge Map Visualization Data</h2>
              
              {sunburstEntries.length === 0 ? (
                <p className="text-gray-400">No knowledge map entries found.</p>
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
                      <option value="sunburst">Knowledge Map Data</option>
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
                      Download Knowledge Map Template
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
                    <h4 className="text-green-400 font-medium mb-2">Knowledge Map Data CSV</h4>
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
                      ⚠️ <strong>Important:</strong> When importing Knowledge Map Data, all existing knowledge map entries will be 
                      automatically cleared and replaced with the new hierarchical structure from your CSV. This ensures 
                      optimal performance and prevents data conflicts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Content Analytics</h2>
              
              {analyticsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Loading analytics...</p>
                </div>
              ) : (
                <>
                  {/* Overall Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
                      <h3 className="text-lg font-semibold mb-2">Active Contributors</h3>
                      <p className="text-3xl font-bold">{userContributions.length}</p>
                      <p className="text-blue-200 text-sm">Users with content</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
                      <h3 className="text-lg font-semibold mb-2">Total Contributions</h3>
                      <p className="text-3xl font-bold">
                        {userContributions.reduce((sum, user) => sum + user.totalContributions, 0)}
                      </p>
                      <p className="text-green-200 text-sm">All content types</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
                      <h3 className="text-lg font-semibold mb-2">Most Active User</h3>
                      <p className="text-lg font-bold truncate">
                        {userContributions.length > 0 ? userContributions[0].userEmail.split('@')[0] : 'N/A'}
                      </p>
                      <p className="text-purple-200 text-sm">
                        {userContributions.length > 0 ? `${userContributions[0].totalContributions} contributions` : 'No data'}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-6 text-white">
                      <h3 className="text-lg font-semibold mb-2">Avg per User</h3>
                      <p className="text-3xl font-bold">
                        {userContributions.length > 0 
                          ? Math.round(userContributions.reduce((sum, user) => sum + user.totalContributions, 0) / userContributions.length)
                          : 0
                        }
                      </p>
                      <p className="text-orange-200 text-sm">Contributions</p>
                    </div>
                  </div>

                  {/* User Contributions Table */}
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">User Contributions Overview</h3>
                    
                    {userContributions.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No user contributions found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-600">
                              <th className="py-3 px-4 text-gray-300 font-medium">User</th>
                              <th className="py-3 px-4 text-gray-300 font-medium">Role</th>
                              <th className="py-3 px-4 text-gray-300 font-medium">Glossary Terms</th>
                              <th className="py-3 px-4 text-gray-300 font-medium">Content Modules</th>
                              <th className="py-3 px-4 text-gray-300 font-medium">Knowledge Map Entries</th>
                              <th className="py-3 px-4 text-gray-300 font-medium">Total</th>
                              <th className="py-3 px-4 text-gray-300 font-medium">Last Activity</th>
                              <th className="py-3 px-4 text-gray-300 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userContributions.map((contribution) => (
                              <tr key={contribution.userId} className="border-b border-gray-600 hover:bg-gray-600">
                                <td className="py-3 px-4">
                                  <div className="text-white font-medium">{contribution.userEmail}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(contribution.userRole)}`}>
                                    {contribution.userRole}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-blue-400 font-semibold">{contribution.glossaryTerms}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-green-400 font-semibold">{contribution.contentModules}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-purple-400 font-semibold">{contribution.sunburstEntries}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-yellow-400 font-bold">{contribution.totalContributions}</span>
                                </td>
                                <td className="py-3 px-4 text-gray-300 text-sm">
                                  {contribution.totalContributions > 0 
                                    ? formatDate(contribution.recentActivity.toISOString())
                                    : 'No activity'
                                  }
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => setSelectedUser(selectedUser === contribution.userId ? null : contribution.userId)}
                                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                                  >
                                    {selectedUser === contribution.userId ? 'Hide Details' : 'View Details'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Detailed User Entries */}
                  {selectedUser && (
                    <div className="bg-gray-700 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">
                        Detailed Entries for {userContributions.find(u => u.userId === selectedUser)?.userEmail}
                      </h3>
                      
                      {(() => {
                        const selectedContribution = userContributions.find(u => u.userId === selectedUser);
                        if (!selectedContribution) return null;

                        return (
                          <div className="space-y-6">
                            {/* Glossary Terms */}
                            {selectedContribution.entries.glossaryTerms.length > 0 && (
                              <div>
                                <h4 className="text-lg font-medium text-blue-400 mb-3">
                                  Glossary Terms ({selectedContribution.entries.glossaryTerms.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedContribution.entries.glossaryTerms.map((term) => (
                                    <div key={term._id} className="bg-gray-600 rounded-lg p-4 border border-gray-500">
                                      <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-medium text-white truncate">{term.title}</h5>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          term.approved ? 'bg-green-600 text-green-100' : 'bg-yellow-600 text-yellow-100'
                                        }`}>
                                          {term.approved ? 'Approved' : 'Pending'}
                                        </span>
                                      </div>
                                      <p className="text-gray-300 text-sm mb-3 line-clamp-2">{term.description}</p>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">
                                          {formatDate(term.createdAt)}
                                        </span>
                                        <a
                                          href={`/contribute?tab=glossary&search=${encodeURIComponent(term.title)}`}
                                          className="text-blue-400 hover:text-blue-300 text-xs underline"
                                        >
                                          View in Glossary →
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Content Modules */}
                            {selectedContribution.entries.contentModules.length > 0 && (
                              <div>
                                <h4 className="text-lg font-medium text-green-400 mb-3">
                                  Content Modules ({selectedContribution.entries.contentModules.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedContribution.entries.contentModules.map((content) => (
                                    <div key={content._id} className="bg-gray-600 rounded-lg p-4 border border-gray-500">
                                      <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-medium text-white truncate">{content.title}</h5>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          content.moderationStatus === 'approved' ? 'bg-green-600 text-green-100' :
                                          content.moderationStatus === 'rejected' ? 'bg-red-600 text-red-100' :
                                          'bg-yellow-600 text-yellow-100'
                                        }`}>
                                          {content.moderationStatus}
                                        </span>
                                      </div>
                                      <p className="text-gray-300 text-sm mb-2 line-clamp-2">{content.description}</p>
                                      <div className="text-xs text-gray-400 mb-3">
                                        <span className="inline-block mr-2">📚 {content.knowledgeArea}</span>
                                        <span className="inline-block">🎯 {content.discipline}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">
                                          {formatDate(content.createdAt)}
                                        </span>
                                        {content.youtubeUrl && (
                                          <a
                                            href={content.youtubeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-400 hover:text-green-300 text-xs underline"
                                          >
                                            View Content →
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Knowledge Map Entries */}
                            {selectedContribution.entries.sunburstEntries.length > 0 && (
                              <div>
                                <h4 className="text-lg font-medium text-purple-400 mb-3">
                                  Knowledge Map Entries ({selectedContribution.entries.sunburstEntries.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedContribution.entries.sunburstEntries.map((entry) => (
                                    <div key={entry._id} className="bg-gray-600 rounded-lg p-4 border border-gray-500">
                                      <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-medium text-white truncate">{entry.themeCluster}</h5>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          entry.isActive ? 'bg-green-600 text-green-100' : 'bg-gray-600 text-gray-100'
                                        }`}>
                                          {entry.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                      <p className="text-gray-300 text-sm mb-2 line-clamp-2">{entry.description}</p>
                                      <div className="text-xs text-gray-400 mb-3 space-y-1">
                                        <div>🎯 {entry.knowledgeArea} → {entry.discipline}</div>
                                        <div>🔧 {entry.toolTechnology}</div>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">
                                          {formatDate(entry.createdAt)}
                                        </span>
                                        <a
                                          href="/"
                                          className="text-purple-400 hover:text-purple-300 text-xs underline"
                                        >
                                          View Knowledge Map →
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
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
