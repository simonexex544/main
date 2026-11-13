import React, { useState } from 'react';
import { Share2, Copy, Check, X, Link, Code2, Users } from 'lucide-react';
import { ModpackData } from '../types/modpack';
import { encodeModpackToUrl } from '../utils/shareUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  modpack: ModpackData;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  modpack
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen) return null;

  const shareUrl = encodeModpackToUrl(modpack);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(modpack, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Udostępnij paczkę znajomym</h3>
              <p className="text-xs text-slate-400">Bezpośredni link ze skompresowaną zawartością paczki</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          
          {/* Link box */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-slate-400" />
              <span>Link do współdzielenia</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 truncate focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Skopiowano!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiuj</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Explanation card */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Jak to działa dla znajomego:</span>
            </div>
            <p className="leading-relaxed">
              Znajomy po otwarciu powyższego linku zobaczy dokładnie tę samą paczkę z kompletem {modpack.mods.length} modów oraz {modpack.configs.length} dopasowanych plików konfiguracyjnych. Może natychmiast kliknąć <strong>"Pobierz .mrpack"</strong> i wgrać paczkę do swojego launchera.
            </p>
          </div>

          {/* Secondary Action: Raw JSON */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{copiedJson ? 'Skopiowano JSON!' : 'Kopiuj strukturę JSON'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Zamknij
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
