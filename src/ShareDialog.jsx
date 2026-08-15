import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { Button } from './shared';

export default function ShareDialog({ isOpen, onClose, username, profileUrl }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = `${username} — GitHub Developer Profile`;
  const text = `Explore ${username}'s GitHub developer profile, repositories, languages, and analytics!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: profileUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Web share failed:', err);
        }
      }
    }
  };

  // Social Share URLs
  const encodedUrl = encodeURIComponent(profileUrl);
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title);

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#0a66c2]" />
            Share Developer Profile
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Native Web Share API if supported */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button
              variant="primary"
              onClick={handleNativeShare}
              className="w-full justify-center py-2.5"
            >
              <Share2 className="w-4 h-4" />
              Share via System App
            </Button>
          )}

          {/* Copy Link */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Profile Link
            </label>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="text"
                readOnly
                value={profileUrl}
                className="flex-1 bg-transparent text-xs font-mono text-gray-700 focus:outline-none truncate px-1"
              />
              <Button
                variant={copied ? "secondary" : "primary"}
                onClick={handleCopyLink}
                className="py-1.5 px-3 text-xs shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Social Platforms */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Share on Social Media
            </label>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 text-gray-700 hover:text-blue-600 transition-all text-xs font-medium gap-1"
              >
                <span className="font-bold text-sm">in</span>
                LinkedIn
              </a>
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-slate-800 hover:bg-slate-50 text-gray-700 hover:text-slate-900 transition-all text-xs font-medium gap-1"
              >
                <span className="font-bold text-sm">𝕏</span>
                X / Twitter
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50/50 text-gray-700 hover:text-green-600 transition-all text-xs font-medium gap-1"
              >
                <span className="font-bold text-sm">💬</span>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
