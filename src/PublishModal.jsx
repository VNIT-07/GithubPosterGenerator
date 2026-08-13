import React, { useState, useEffect } from 'react';
import { X, Check, Copy, ExternalLink, Globe, EyeOff, Lock, Layers } from 'lucide-react';
import { Button } from './shared';
import {
  saveProfileSnapshot,
  getPublicProfileUrl,
  formatSyncedTimestamp,
  unpublishProfile,
  getProfileSnapshot
} from './profileStorage';

export default function PublishModal({ isOpen, onClose, userData, theme }) {
  const [visibility, setVisibility] = useState('public');
  const [isPublished, setIsPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncedTime, setSyncedTime] = useState('');

  useEffect(() => {
    if (isOpen && userData) {
      setSyncedTime(formatSyncedTimestamp(new Date()));
      const slug = userData.login;
      const existing = getProfileSnapshot(slug);

      if (existing && existing.published) {
        setIsPublished(true);
        setVisibility(existing.visibility || 'public');
        setPublishedUrl(getPublicProfileUrl(slug, existing));
      } else {
        setIsPublished(false);
        setPublishedUrl(getPublicProfileUrl(slug));
      }
    }
  }, [isOpen, userData]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !userData) return null;

  const handlePublish = () => {
    try {
      const snapshot = saveProfileSnapshot({
        userData,
        theme,
        visibility
      });
      const url = getPublicProfileUrl(userData.login, snapshot);
      setPublishedUrl(url);
      setIsPublished(true);
      setSyncedTime(formatSyncedTimestamp(snapshot.lastSyncedAt));
    } catch (err) {
      console.error('Failed to publish profile:', err);
      alert('Failed to publish profile. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleUnpublish = () => {
    if (window.confirm('Unpublish Profile?\n\nThis profile will no longer be publicly accessible.')) {
      unpublishProfile(userData.login);
      setIsPublished(false);
    }
  };

  const domainDisplay = window.location.host;
  const username = userData.login || 'username';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <h2 id="modal-title" className="text-lg font-bold text-gray-900">
            {isPublished ? 'Profile Published' : 'Publish Developer Profile'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!isPublished ? (
            <>
              {/* URL Preview */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Your profile URL
                </label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm font-mono text-gray-700 truncate">
                  {domainDisplay}/#/u/{username.toLowerCase()}
                </div>
              </div>

              {/* Visibility Options */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Profile Visibility
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'public',
                      label: 'Public',
                      desc: 'Anyone can view your profile at this URL',
                      icon: Globe
                    },
                    {
                      id: 'unlisted',
                      label: 'Unlisted',
                      desc: 'Only people with the exact link can view it',
                      icon: EyeOff
                    },
                    {
                      id: 'private',
                      label: 'Private',
                      desc: 'Profile is disabled and hidden from public view',
                      icon: Lock
                    }
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                          visibility === option.id
                            ? 'border-[#0a66c2] bg-blue-50/50 ring-1 ring-[#0a66c2]'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={option.id}
                          checked={visibility === option.id}
                          onChange={(e) => setVisibility(e.target.value)}
                          className="mt-1 text-[#0a66c2] focus:ring-[#0a66c2]"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                            <Icon className="w-4 h-4 text-gray-500" />
                            {option.label}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Theme & Timestamp */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  <span>Theme:</span>
                  <span className="capitalize font-semibold text-gray-900">{theme}</span>
                </div>
                <div>
                  <span className="text-gray-400">Last synced: </span>
                  <span className="font-medium text-gray-700">{syncedTime}</span>
                </div>
              </div>
            </>
          ) : (
            /* Published Success State */
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Your developer profile is now live.</p>
                <p className="text-xs text-gray-500 mt-1">Anyone with the link can view your analytics.</p>
              </div>

              {/* URL Display */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="text"
                  readOnly
                  value={publishedUrl}
                  className="flex-1 bg-transparent text-xs font-mono text-gray-700 focus:outline-none truncate px-1"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleCopyLink} variant="primary" className="flex-1 justify-center">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Link copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </Button>
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 justify-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Profile
                </a>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Last updated: {syncedTime}</span>
                <button
                  onClick={handleUnpublish}
                  className="text-red-600 hover:underline font-medium"
                >
                  Unpublish
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isPublished && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePublish}>
              Publish Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
