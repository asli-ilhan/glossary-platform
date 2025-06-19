"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Term = { id: string; title: string; description: string };

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchTerms();
  }, [session, status, router]);

  const fetchTerms = async () => {
    try {
      const res = await fetch("/api/glossary");
      const data = await res.json();
        if (Array.isArray(data)) {
          setTerms(data);
        } else {
          console.error("Expected array, got:", data);
          setTerms([]);
        }
    } catch (err) {
        console.error("Fetch error:", err);
        setTerms([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
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
    } else {
      setError(data.error || "Failed to add term");
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!confirm("Are you sure you want to delete this term?")) return;

    const res = await fetch(`/api/glossary?id=${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (res.ok) {
      setTerms(terms.filter((term) => term.id !== id));
      setSelectedTerm(null);
    } else {
      setError(data.error || "Error deleting the term");
    }
  };

  const filteredTerms = Array.isArray(terms)
    ? selectedLetter
      ? terms.filter((t) => t.title.toUpperCase().startsWith(selectedLetter))
      : terms
    : [];

  if (status === 'loading') {
    return (
      <div className="container text-center mt-12">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container text-center mt-12">
        <h1>Please sign in to view the glossary</h1>
      </div>
    );
  }

  const user = session.user as { id: string; email: string; role: string } | undefined;

  return (
    <div className="container">
      <h2 className="text-3xl font-bold mb-6 text-center">MA IE Glossary</h2>
      <p className="text-center mb-6">Welcome, {user?.email}</p>

      {error && (
        <div className="bg-red-500 text-white p-3 rounded mb-4 text-center">
          {error}
        </div>
      )}

      <button className="primary mb-4 w-full" onClick={() => setIsAddModalOpen(true)}>
        Add New Key Term
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

      <div className="term-list">
        {filteredTerms.length === 0 ? (
          <p className="text-gray-400 text-center">No terms found.</p>
        ) : (
          filteredTerms.map((term) => (
            <button key={term.id} className="term-item" onClick={() => setSelectedTerm(term)}>
              {term.title}
            </button>
          ))
        )}
      </div>

      {isAddModalOpen && (
        <div className="modal fixed inset-0 flex items-center justify-center" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add New Key Term</h2>
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
              <button type="submit" className="primary w-full">Save</button>
              <button type="button" className="danger w-full" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedTerm && (
        <div className="modal fixed inset-0 flex items-center justify-center" onClick={() => setSelectedTerm(null)}>
          <div className="modal-content p-6 w-96 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold">{selectedTerm.title}</h2>
            <p className="mt-4 text-gray-300">{selectedTerm.description}</p>
            <div className="mt-6 space-y-2">
              <button className="danger w-full" onClick={() => handleDeleteTerm(selectedTerm.id)}>
                Delete
              </button>
              <button className="secondary w-full" onClick={() => setSelectedTerm(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
