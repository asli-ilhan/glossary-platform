"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TutorialOverlay from "@/app/components/TutorialOverlay";
import { glossaryTutorial } from "@/app/utils/tutorialSteps";

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

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [terms, setTerms] = useState<Term[]>([]);
  const [groupedTerms, setGroupedTerms] = useState<GroupedTerm[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<GroupedTerm | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Load terms regardless of authentication status
    fetchTerms();
    
    // Check if user wants to see tutorial
    const hasSeenTutorial = localStorage.getItem('hasSeenGlossaryTutorial');
    if (hasSeenTutorial !== 'true') {
      // Show tutorial after a short delay to let the page load
      setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
    }

    // Listen for manual tutorial trigger from header
    const handleShowTutorial = (event: CustomEvent) => {
      if (event.detail === 'glossary') {
        setShowTutorial(true);
      }
    };

    window.addEventListener('showTutorial', handleShowTutorial as EventListener);
    return () => {
      window.removeEventListener('showTutorial', handleShowTutorial as EventListener);
    };
  }, []);

  const fetchTerms = async () => {
    try {
      const res = await fetch("/api/glossary");
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
        } else {
          console.error("Expected array, got:", data);
          setTerms([]);
          setGroupedTerms([]);
        }
    } catch (err) {
        console.error("Fetch error:", err);
        setTerms([]);
        setGroupedTerms([]);
    }
  };

  const handleAddTermClick = () => {
    if (!session) {
      // Redirect to sign in if user wants to add a term
      router.push('/auth/signin?callbackUrl=/glossary');
      return;
    }
    // Clear any previous messages when opening the modal
    setError("");
    setSuccess("");
    setWarning("");
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setWarning("");
    
    if (!session) {
      setError("You must be signed in to add terms");
      return;
    }
    
    const res = await fetch("/api/glossary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    const data = await res.json();

    if (res.ok) {
      setTitle("");
      setDescription("");
      fetchTerms();
      setIsAddModalOpen(false);
      
      if (data.warning) {
        setWarning(data.warning);
        setSuccess("Your submission is pending review.");
      } else {
        setSuccess("Thank you! Your contribution has been submitted.");
      }
      
      // Clear messages after 7 seconds
      setTimeout(() => {
        setSuccess("");
        setWarning("");
      }, 7000);
    } else {
      setError(data.error || "Failed to add term");
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!session) {
      setError("You must be signed in to delete terms");
      return;
    }

    if (!confirm("Are you sure you want to delete this definition?")) return;

    const res = await fetch(`/api/glossary?id=${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (res.ok) {
      // Refresh the terms list to update grouping
      fetchTerms();
      setSelectedTerm(null);
    } else {
      setError(data.error || "Error deleting the term");
    }
  };

  const handleTutorialComplete = () => {
    localStorage.setItem('hasSeenGlossaryTutorial', 'true');
    setShowTutorial(false);
  };

  const handleTutorialSkip = () => {
    localStorage.setItem('hasSeenGlossaryTutorial', 'true');
    setShowTutorial(false);
  };

  const filteredGroupedTerms = Array.isArray(groupedTerms)
    ? selectedLetter
      ? groupedTerms.filter((t) => t.title.toUpperCase().startsWith(selectedLetter))
      : groupedTerms
    : [];

  if (status === 'loading') {
    return (
      <div className="container text-center mt-12">
        <h1>Loading...</h1>
      </div>
    );
  }

  const user = session?.user as { id: string; email: string; role: string } | undefined;

  return (
    <div className="container">
      <h2 className="text-3xl font-bold mb-3 text-center">Glossary</h2>
      <p className="text-center mb-6 text-gray-300">
        Shared vocabulary for digital justice, built by a community of practice.
      </p>
      {session ? (
        <p className="text-center mb-3">Welcome, {user?.email}</p>
      ) : (
        <p className="text-center mb-3 text-gray-400">
          Browse our comprehensive glossary of terms. 
          <button 
            onClick={() => router.push('/auth/signin?callbackUrl=/glossary')} 
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

      <button 
        className="primary mb-4 w-full add-term-form" 
        onClick={handleAddTermClick}
      >
        {session ? "Add New Term" : "Sign In to Add Terms"}
      </button>

      <div className="tab-container">
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
          <div
            key={letter}
            className={`tab ${selectedLetter === letter ? "active" : ""}`}
            onClick={() => setSelectedLetter(letter)}
          >
            {letter}
          </div>
        ))}
        <div className="tab secondary" onClick={() => setSelectedLetter(null)}>All</div>
      </div>

      <div className="term-list glossary-terms-container">
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

      {isAddModalOpen && (
        <div className="modal fixed inset-0 flex items-center justify-center" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add New Term</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter Term"
                required
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter Description"
                required
              />
              <button type="submit" className="primary w-full">Submit Definition</button>
              <button type="button" className="danger w-full" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedTerm && (
        <div className="modal fixed inset-0 flex items-center justify-center" onClick={() => setSelectedTerm(null)}>
          <div className="modal-content p-6 max-w-2xl max-h-[80vh] overflow-y-auto text-left" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-center mb-6">{selectedTerm.title}</h2>
            
            {selectedTerm.definitions.map((definition, index) => (
                              <div key={definition._id} className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-green-400">
                    Definition {selectedTerm.definitions.length > 1 ? index + 1 : ''}
                  </h3>
                  {definition.userId?.email && (
                    <span className="text-sm text-gray-400">
                      by {definition.userId.email}
                    </span>
                  )}
                </div>
                <p className="text-gray-300 mb-3">{definition.description}</p>
                {session && (
                  <button 
                    className="danger text-sm px-3 py-1" 
                    onClick={() => handleDeleteTerm(definition._id)}
                  >
                    Delete this definition
                  </button>
                )}
              </div>
            ))}
            
            <div className="mt-6 text-center">
              <button className="secondary w-full" onClick={() => setSelectedTerm(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      <TutorialOverlay
        steps={glossaryTutorial}
        isVisible={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />
    </div>
  );
}
