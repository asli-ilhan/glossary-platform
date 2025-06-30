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
    return 'text-gray-400 bg-gray-600';
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
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-300 mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Welcome, {user.email}</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-600">
            <nav className="-mb-px flex justify-center space-x-4 overflow-x-auto">
              {[
                { id: 'overview', name: 'Overview', count: null },
                { id: 'users', name: 'User Management', count: pendingUsersCount },
                { id: 'terms', name: 'Glossary Entries', count: pendingTerms },
                { id: 'content', name: 'Content Work', count: pendingContent },
                { id: 'sunburst', name: 'Interactive Map Data', count: null },
                { id: 'import', name: 'CSV Import', count: null },
                { id: 'analytics', name: 'Analytics', count: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 rounded-sm min-w-max ${
                    activeTab === tab.id
                      ? 'text-white border-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count !== null && tab.count > 0 && (
                    <span className="ml-2 bg-gray-600 text-gray-400 text-xs rounded-full px-2 py-1">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-black border border-gray-600 rounded-lg shadow-xl p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-300 mb-4">Dashboard Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black border border-gray-600 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-300 mb-4">Data Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Entries:</span>
                      <span className="text-gray-300 font-semibold">{totalEntries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pending Users:</span>
                      <span className="text-gray-300 font-semibold">{pendingUsersCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pending Entries:</span>
                      <span className="text-gray-300 font-semibold">{pendingTerms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pending Work:</span>
                      <span className="text-gray-300 font-semibold">{pendingContent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Glossary Terms:</span>
                      <span className="text-gray-300 font-semibold">{terms.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Works:</span>
                      <span className="text-gray-300 font-semibold">{contentModules.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Interactive Map Entries:</span>
                      <span className="text-gray-300 font-semibold">{sunburstEntries.length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black border border-gray-600 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-300 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('users')}
                      className="w-full py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
                    >
                      Approve Users ({pendingUsersCount})
                    </button>
                    <button 
                      onClick={() => setActiveTab('terms')}
                      className="w-full py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
                    >
                      Review Pending Entries
                    </button>
                    <button 
                      onClick={() => setActiveTab('content')}
                      className="w-full py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
                    >
                      Moderate Work
                    </button>
                    <button 
                      onClick={() => setActiveTab('import')}
                      className="w-full py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
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
              <h2 className="text-2xl font-bold text-gray-300 mb-4">User Management</h2>
              
              {/* Pending Users Section */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-300 mb-4 flex items-center">
                  Pending User Approvals 
                  <span className="ml-2 bg-black border border-gray-600 text-gray-400 text-sm rounded-full px-2 py-1">
                    {pendingUsersCount}
                  </span>
                </h3>
                
                {pendingUsers.length === 0 ? (
                  <div className="bg-black border border-gray-600 rounded-lg p-6 text-center">
                    <p className="text-gray-400">No pending user approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((user) => (
                      <div key={user._id} className="bg-black border border-gray-600 rounded-lg p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-300">{user.email}</h4>
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-black border border-gray-600 text-gray-400 flex items-center">
                                {user.role === 'student' ? (
                                  <>
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    Student
                                  </>
                                ) : user.role === 'contributor' ? (
                                  <>
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Contributor
                                  </>
                                ) : user.role}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-3">
                              Registered: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                            {user.profile && (
                              <div className="text-sm text-gray-500">
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
                              className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason (optional):');
                                if (reason !== null) {
                                  handleUserAction(user._id, 'reject', reason);
                                }
                              }}
                              disabled={actionLoading === user._id}
                              className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Reject
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
                <h3 className="text-xl font-semibold text-gray-300 mb-4 flex items-center">
                  Approved Users
                  <span className="ml-2 bg-black border border-gray-600 text-gray-400 text-sm rounded-full px-2 py-1">
                    {approvedUsers.length}
                  </span>
                </h3>
                
                {approvedUsers.length === 0 ? (
                  <div className="bg-black border border-gray-600 rounded-lg p-6 text-center">
                    <p className="text-gray-400">No approved users</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {approvedUsers.map((user) => (
                      <div key={user._id} className="bg-black border border-gray-600 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-semibold text-gray-300 truncate">{user.email}</h4>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-black border border-gray-600 text-gray-400 flex items-center">
                            {user.role === 'admin' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            ) : user.role === 'student' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                            ) : user.role === 'contributor' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Approved: {user.approvedAt ? new Date(user.approvedAt).toLocaleDateString() : 'N/A'}
                        </p>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="py-1 px-2 border-b-2 border-transparent font-medium text-xs whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
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
              <h2 className="text-2xl font-bold text-gray-300 mb-4">Glossary Entries Management</h2>
              
              {terms.length === 0 ? (
                <p className="text-gray-400">No glossary terms found.</p>
              ) : (
                terms.map((term) => (
                  <div key={term._id} className="bg-black border border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-300">{term.title}</h3>
                        <p className="text-gray-400 mt-2">{term.description}</p>
                        {term.tags && term.tags.length > 0 && (
                          <div className="mt-2">
                            {term.tags.map((tag, index) => (
                              <span key={index} className="inline-block bg-black border border-gray-600 text-gray-400 text-xs px-2 py-1 rounded mr-2">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center mt-2 space-x-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            term.approved ? 'bg-black border border-gray-600 text-gray-400' : 'bg-black border border-gray-600 text-gray-400'
                          }`}>
                            {term.approved ? 'Approved' : 'Pending'}
                          </span>
                          {term.category && (
                            <span className="text-gray-500 text-sm">Category: {term.category}</span>
                          )}
                          {term.difficulty && (
                            <span className="text-gray-500 text-sm">Difficulty: {term.difficulty}</span>
                          )}
                        </div>
                        {term.userId?.email && (
                          <p className="text-gray-500 text-sm mt-1">Submitted by: {term.userId.email}</p>
                        )}
                      </div>
                      
                      <div className="ml-4 space-x-2 flex">
                        {!term.approved && (
                          <button 
                            className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
                            onClick={() => handleApprove(term._id)}
                          >
                            Approve
                          </button>
                        )}
                        <button 
                          className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
                          onClick={() => handleEdit(term)}
                        >
                          Edit
                        </button>
                        <button 
                          className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
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

          {/* Works Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-300 mb-4">Works Management</h2>
              
              {contentModules.length === 0 ? (
                <p className="text-gray-400">No works found.</p>
              ) : (
                contentModules.map((content) => (
                  <div key={content._id} className="bg-black border border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-300">{content.title}</h3>
                        <p className="text-gray-400 mt-2">{content.description}</p>
                        <div className="mt-2 space-x-4">
                          <span className="text-gray-500 text-sm">Type: {content.contentType}</span>
                          <span className="text-gray-500 text-sm">Area: {content.knowledgeArea}</span>
                          <span className="text-gray-500 text-sm">Discipline: {content.discipline}</span>
                        </div>
                        {content.tags && content.tags.length > 0 && (
                          <div className="mt-2">
                            {content.tags.map((tag, index) => (
                              <span key={index} className="inline-block bg-black border border-gray-600 text-gray-400 text-xs px-2 py-1 rounded mr-2">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="px-2 py-1 rounded text-xs bg-black border border-gray-600 text-gray-400">
                            {content.moderationStatus}
                          </span>
                          {content.youtubeUrl && (
                            <a href={content.youtubeUrl} target="_blank" rel="noopener noreferrer" 
                               className="text-gray-400 hover:text-gray-300 text-sm underline">
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
                            <button className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm">
                              Approve
                            </button>
                            <button className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm">
                              Reject
                            </button>
                          </>
                        )}
                        <button 
                          className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
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

          {/* Interactive Map Data Tab */}
          {activeTab === 'sunburst' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-300 mb-4">Interactive Map Visualisation Data</h2>
              
              {sunburstEntries.length === 0 ? (
                <p className="text-gray-400">No interactive map entries found.</p>
              ) : (
                sunburstEntries.map((entry) => (
                  <div key={entry._id} className="bg-black border border-gray-600 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-300">{entry.toolTechnology}</h3>
                        <p className="text-gray-400 mt-2">{entry.description}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <span className="text-gray-500">Theme: <span className="text-gray-400">{entry.themeCluster}</span></span>
                          <span className="text-gray-500">Knowledge Area: <span className="text-gray-400">{entry.knowledgeArea}</span></span>
                          <span className="text-gray-500">Discipline: <span className="text-gray-400">{entry.discipline}</span></span>
                          <span className="text-gray-500">Role: <span className="text-gray-400">{entry.roleSystemOrientation}</span></span>
                        </div>
                        <div className="flex items-center mt-2">
                          <span className="px-2 py-1 rounded text-xs bg-black border border-gray-600 text-gray-400">
                            {entry.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {entry.createdBy?.email && (
                          <p className="text-gray-500 text-sm mt-1">Created by: {entry.createdBy.email}</p>
                        )}
                      </div>
                      
                      <div className="ml-4 space-x-2 flex">
                        <button 
                          className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm"
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
              <h2 className="text-2xl font-bold text-gray-300 mb-4">CSV Data Import</h2>
              
              {/* Import Form */}
              <div className="bg-black border border-gray-600 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Upload CSV File</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Import Type
                    </label>
                    <select 
                      value={importType} 
                      onChange={(e) => setImportType(e.target.value as 'auto' | 'sunburst' | 'content')}
                      className="w-full px-3 py-2 bg-black text-gray-300 rounded border border-gray-600 focus:border-gray-400 focus:outline-none"
                    >
                      <option value="auto">Auto-detect</option>
                                              <option value="sunburst">Interactive Map Data</option>
                        <option value="content">Works</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      CSV File
                    </label>
                    <input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 bg-black text-gray-400 rounded border border-gray-600 focus:border-gray-400 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-gray-400 hover:file:bg-gray-500"
                    />
                    {csvFile && (
                      <p className="text-sm text-gray-400 mt-2">
                        Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={handleImport}
                      disabled={!csvFile || importing}
                      className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {importing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Import CSV</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => downloadTemplate('sunburst')}
                      className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download Interactive Map Data Template</span>
                    </button>
                    
                    <button
                      onClick={() => downloadTemplate('content')}
                      className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download Work Submission Template</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Results */}
              {importResult && (
                <div className="bg-black border border-gray-600 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-300">
                    Import Results
                  </h3>
                  
                  <div className="space-y-4">
                    <p className="text-gray-400">{importResult.message}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-black border border-gray-600 rounded p-3">
                        <p className="text-gray-500 text-sm">Total Rows</p>
                        <p className="text-gray-300 font-bold text-lg">{importResult.stats.totalRows}</p>
                      </div>
                      <div className="bg-black border border-gray-600 rounded p-3">
                        <p className="text-gray-500 text-sm">Inserted</p>
                        <p className="text-gray-300 font-bold text-lg">{importResult.stats.inserted}</p>
                      </div>
                      <div className="bg-black border border-gray-600 rounded p-3">
                        <p className="text-gray-500 text-sm">Duplicates</p>
                        <p className="text-gray-300 font-bold text-lg">{importResult.stats.duplicates}</p>
                      </div>
                      <div className="bg-black border border-gray-600 rounded p-3">
                        <p className="text-gray-500 text-sm">Errors</p>
                        <p className="text-gray-300 font-bold text-lg">{importResult.stats.errors}</p>
                      </div>
                    </div>
                    
                    {importResult.details.errors.length > 0 && (
                      <div>
                        <h4 className="text-gray-400 font-semibold mb-2">Errors:</h4>
                        <ul className="text-gray-500 text-sm space-y-1 max-h-40 overflow-y-auto">
                          {importResult.details.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {importResult.details.duplicates.length > 0 && (
                      <div>
                        <h4 className="text-gray-400 font-semibold mb-2">Duplicates:</h4>
                        <ul className="text-gray-500 text-sm space-y-1 max-h-40 overflow-y-auto">
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
              <div className="bg-black border border-gray-600 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">CSV Format Requirements</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-gray-400 font-medium mb-2">Interactive Map Data CSV</h4>
                    <p className="text-gray-400 text-sm mb-2">Required columns:</p>
                    <ul className="text-gray-500 text-sm space-y-1">
                      <li>• Theme Cluster</li>
                      <li>• Knowledge Area</li>
                      <li>• Discipline</li>
                      <li>• Role/System Orientation</li>
                      <li>• Tool/Technology</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-gray-400 font-medium mb-2">Works CSV</h4>
                    <p className="text-gray-400 text-sm mb-2">Required columns:</p>
                    <ul className="text-gray-500 text-sm space-y-1">
                      <li>• Type</li>
                      <li>• Title</li>
                      <li>• Narrative</li>
                      <li>• Linked Knowledge Area</li>
                      <li>• Linked Disciplines</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <div className="p-4 bg-black border border-gray-600 rounded">
                    <p className="text-gray-400 text-sm flex items-start space-x-2">
                      <svg className="w-5 h-5 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span><strong>Tip:</strong> Download the template files above to see the exact format expected. 
                      The system can auto-detect the CSV type based on the headers.</span>
                    </p>
                  </div>
                  
                  <div className="p-4 bg-black border border-gray-600 rounded">
                    <p className="text-gray-400 text-sm flex items-start space-x-2">
                      <svg className="w-5 h-5 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span><strong>Important:</strong> When importing Interactive Map Data, all existing interactive map entries will be 
                      automatically cleared and replaced with the new hierarchical structure from your CSV. This ensures 
                      optimal performance and prevents data conflicts.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-300 mb-4">Analytics</h2>
              
              {analyticsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Loading analytics...</p>
                </div>
              ) : (
                <>
                  {/* Overall Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-black border border-gray-600 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-2 text-gray-300">Active Contributors</h3>
                      <p className="text-3xl font-bold text-gray-300">{userContributions.length}</p>
                      <p className="text-gray-500 text-sm">Users submitted entries or works</p>
                    </div>
                    
                    <div className="bg-black border border-gray-600 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-2 text-gray-300">Total Contributions</h3>
                      <p className="text-3xl font-bold text-gray-300">
                        {userContributions.reduce((sum, user) => sum + user.totalContributions, 0)}
                      </p>
                      <p className="text-gray-500 text-sm">All content types</p>
                    </div>
                    
                    <div className="bg-black border border-gray-600 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-2 text-gray-300">Most Active User</h3>
                      <p className="text-lg font-bold truncate text-gray-300">
                        {userContributions.length > 0 ? userContributions[0].userEmail.split('@')[0] : 'N/A'}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {userContributions.length > 0 ? `${userContributions[0].totalContributions} contributions` : 'No data'}
                      </p>
                    </div>
                    
                    <div className="bg-black border border-gray-600 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-2 text-gray-300">Avg per User</h3>
                      <p className="text-3xl font-bold text-gray-300">
                        {userContributions.length > 0 
                          ? Math.round(userContributions.reduce((sum, user) => sum + user.totalContributions, 0) / userContributions.length)
                          : 0
                        }
                      </p>
                      <p className="text-gray-500 text-sm">Contributions</p>
                    </div>
                  </div>

                  {/* User Contributions Table */}
                  <div className="bg-black border border-gray-600 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-300 mb-4">User Contributions Overview</h3>
                    
                    {userContributions.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No user contributions found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-600">
                              <th className="py-3 px-4 text-gray-400 font-medium">User</th>
                              <th className="py-3 px-4 text-gray-400 font-medium">Role</th>
                              <th className="py-3 px-4 text-gray-400 font-medium">Glossary Entries</th>
                              <th className="py-3 px-4 text-gray-400 font-medium">Works</th>
                              <th className="py-3 px-4 text-gray-400 font-medium">Interactive Map Entries</th>
                              <th className="py-3 px-4 text-gray-400 font-medium">Total</th>
                              <th className="py-3 px-4 text-gray-400 font-medium">Last Activity</th>
                              <th className="py-3 px-4 text-gray-400 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userContributions.map((contribution) => (
                              <tr key={contribution.userId} className="border-b border-gray-600 hover:bg-gray-900">
                                <td className="py-3 px-4">
                                  <div className="text-gray-300 font-medium">{contribution.userEmail}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(contribution.userRole)}`}>
                                    {contribution.userRole}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-gray-400 font-semibold">{contribution.glossaryTerms}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-gray-400 font-semibold">{contribution.contentModules}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-gray-400 font-semibold">{contribution.sunburstEntries}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-gray-300 font-bold">{contribution.totalContributions}</span>
                                </td>
                                <td className="py-3 px-4 text-gray-400 text-sm">
                                  {contribution.totalContributions > 0 
                                    ? formatDate(contribution.recentActivity.toISOString())
                                    : 'No activity'
                                  }
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => setSelectedUser(selectedUser === contribution.userId ? null : contribution.userId)}
                                    className="py-2 px-3 border-b-2 border-transparent font-medium text-sm whitespace-nowrap transition-colors duration-200 text-gray-400 hover:text-gray-300 hover:border-gray-300 rounded-sm flex items-center space-x-1"
                                  >
                                    <span>{selectedUser === contribution.userId ? 'Hide Details' : 'View Details'}</span>
                                    {selectedUser === contribution.userId ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    )}
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
                    <div className="bg-black border border-gray-600 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-300 mb-4">
                        Detailed Entries for {userContributions.find(u => u.userId === selectedUser)?.userEmail}
                      </h3>
                      
                      {(() => {
                        const selectedContribution = userContributions.find(u => u.userId === selectedUser);
                        if (!selectedContribution) return null;

                        return (
                          <div className="space-y-6">
                            {/* Glossary Entries */}
                            {selectedContribution.entries.glossaryTerms.length > 0 && (
                              <div>
                                <h4 className="text-lg font-medium text-gray-400 mb-3">
                                  Glossary Entries ({selectedContribution.entries.glossaryTerms.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedContribution.entries.glossaryTerms.map((term) => (
                                    <div key={term._id} className="bg-black border border-gray-600 rounded-lg p-4">
                                      <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-medium text-gray-300 truncate">{term.title}</h5>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          term.approved ? 'bg-gray-600 text-gray-300' : 'bg-gray-700 text-gray-400'
                                        }`}>
                                          {term.approved ? 'Approved' : 'Pending'}
                                        </span>
                                      </div>
                                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{term.description}</p>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">
                                          {formatDate(term.createdAt)}
                                        </span>
                                        <a
                                          href={`/contribute?tab=glossary&search=${encodeURIComponent(term.title)}`}
                                          className="text-gray-400 hover:text-gray-300 text-xs underline"
                                        >
                                          View in Glossary →
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Works */}
                            {selectedContribution.entries.contentModules.length > 0 && (
                              <div>
                                <h4 className="text-lg font-medium text-gray-400 mb-3">
                                  Works ({selectedContribution.entries.contentModules.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedContribution.entries.contentModules.map((content) => (
                                    <div key={content._id} className="bg-black border border-gray-600 rounded-lg p-4">
                                      <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-medium text-gray-300 truncate">{content.title}</h5>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          content.moderationStatus === 'approved' ? 'bg-gray-600 text-gray-300' :
                                          content.moderationStatus === 'rejected' ? 'bg-gray-700 text-gray-400' :
                                          'bg-gray-700 text-gray-400'
                                        }`}>
                                          {content.moderationStatus}
                                        </span>
                                      </div>
                                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">{content.description}</p>
                                      <div className="text-xs text-gray-500 mb-3 flex items-center space-x-3">
                                        <span className="inline-flex items-center">
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                          </svg>
                                          {content.knowledgeArea}
                                        </span>
                                        <span className="inline-flex items-center">
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                          </svg>
                                          {content.discipline}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">
                                          {formatDate(content.createdAt)}
                                        </span>
                                        {content.youtubeUrl && (
                                          <a
                                            href={content.youtubeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-gray-300 text-xs underline"
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

                            {/* Interactive Map Entries */}
                            {selectedContribution.entries.sunburstEntries.length > 0 && (
                              <div>
                                <h4 className="text-lg font-medium text-gray-400 mb-3">
                                  Interactive Map Entries ({selectedContribution.entries.sunburstEntries.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedContribution.entries.sunburstEntries.map((entry) => (
                                    <div key={entry._id} className="bg-black border border-gray-600 rounded-lg p-4">
                                      <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-medium text-gray-300 truncate">{entry.themeCluster}</h5>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          entry.isActive ? 'bg-gray-600 text-gray-300' : 'bg-gray-700 text-gray-400'
                                        }`}>
                                          {entry.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">{entry.description}</p>
                                      <div className="text-xs text-gray-500 mb-3 space-y-1">
                                        <div className="flex items-center">
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                          </svg>
                                          {entry.knowledgeArea} → {entry.discipline}
                                        </div>
                                        <div className="flex items-center">
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                          {entry.toolTechnology}
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">
                                          {formatDate(entry.createdAt)}
                                        </span>
                                        <a
                                          href="/"
                                          className="text-gray-400 hover:text-gray-300 text-xs underline"
                                        >
                                          View Interactive Map →
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
