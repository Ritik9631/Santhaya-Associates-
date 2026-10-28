'use client';

import React, { useState } from 'react';
import { updateOwnProfileNameAction } from '@/lib/auth/staff-actions';
import { User, Check, Edit2, Loader2 } from 'lucide-react';

interface ProfileNameEditorProps {
  initialName: string;
}

export function ProfileNameEditor({ initialName }: ProfileNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setFeedback({ message: 'Full name must be at least 2 characters.', isError: true });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('fullName', name.trim());

    const result = await updateOwnProfileNameAction(null, formData);
    setLoading(false);

    if (result.error) {
      setFeedback({ message: result.error, isError: true });
    } else {
      setFeedback({ message: 'Name updated successfully.', isError: false });
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <User className="w-4 h-4 text-slate-400" />
          <div>
            <div className="text-[11px] text-slate-400">Display Name</div>
            <div className="text-xs font-semibold text-slate-200">{name || 'Not set'}</div>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 transition-colors"
        >
          <Edit2 className="w-3 h-3 text-slate-400" />
          <span>Edit</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-2">
      <div className="text-xs font-medium text-slate-300">Edit Display Name</div>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          maxLength={100}
          className="flex-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
          placeholder="Your full legal name"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1.5 rounded bg-gold-500 hover:bg-gold-400 text-slate-900 text-xs font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save</span>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setName(initialName);
            setIsEditing(false);
            setFeedback(null);
          }}
          className="px-2.5 py-1.5 rounded bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
      {feedback && (
        <p className={`text-[11px] ${feedback.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
          {feedback.message}
        </p>
      )}
    </form>
  );
}

