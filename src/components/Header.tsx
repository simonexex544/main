import React from 'react';
import { Play, Download, Share2, Sparkles, HelpCircle, ShieldAlert, CheckCircle2, Sliders, Layers } from 'lucide-react';
import { ModpackData, CompatibilityReport } from '../types/modpack';

interface HeaderProps {
  modpack: ModpackData;
  activeTab: 'mods' | 'compatibility' | 'configs' | 'versions' | 'backups';
  setActiveTab: (tab: 'mods' | 'compatibility' | 'configs' | 'versions' | 'backups') => void;
  report: CompatibilityReport | null;
  onOpenAiModal: () => void;
  onOpenShareModal: () => void;
  onOpenGuideModal: () => void;
  onDownloadMrpack: () => void;
  isDownloading: boolean;
  downloadProgress?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  modpack,
  activeTab,
  setActiveTab,
  report,
  onOpenAiModal,
  onOpenShareModal,
  onOpenGuideModal,
  onDownloadMrpack,
  isDownloading,
  downloadProgress
}) => {
  const hasErrors = report?.issues.some(i => i.type === 'error');
  const hasWarnings = report?.issues.some(i => i.type === 'warning');

  // Count core libraries
  const coreLibrariesCount = modpack.mods.filter(m => m.isCore || m.category === 'library').length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      
      {/* Top Prism Action Toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        
        {/* Left: Instance Breadcrumb */}
        <div className="flex items-center gap-2 truncate">
          <span className="text-xs font-mono text-slate-500 hidden sm:inline">Instancja:</span>
          <span className="text-sm font-bold text-white tracking-tight truncate font-mono">
            {modpack.name}
          </span>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase shrink-0">
            {modpack.loader} {modpack.mcVersion}
          </span>
        </div>

        {/* Right: Primary Launcher Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenAiModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap"
            title="Architekt AI do paczek"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Kreator AI</span>
          </button>

          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
            title="Udostępnij paczkę znajomym bezpośrednim linkiem"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Udostępnij</span>
          </button>

          <button
            onClick={onOpenGuideModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap"
            title="Instrukcja importu w launcherze"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Instalacja</span>
          </button>

          {/* Big Prism Launch / Export Button */}
          <button
            onClick={onDownloadMrpack}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-75 rounded-lg shadow-sm shadow-emerald-500/20 transition-all font-mono whitespace-nowrap"
            title="Generuj i pobierz plik paczki w formacie .mrpack"
          >
            {isDownloading ? (
              <Download className="w-3.5 h-3.5 animate-bounce" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>
              {isDownloading
                ? (downloadProgress || 'Weryfikacja Modrinth...')
                : 'POBIERZ .MRPACK'}
            </span>
          </button>
        </div>

      </div>

      {/* Prism Tab Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 border-t border-slate-800/80 overflow-x-auto py-1.5 font-mono text-xs">
        <button
          onClick={() => setActiveTab('mods')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'mods'
              ? 'bg-slate-800 text-white font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Modyfikacje ({modpack.mods.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('compatibility')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'compatibility'
              ? 'bg-slate-800 text-white font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {hasErrors ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          ) : hasWarnings ? (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Biblioteki & Zgodność</span>
          {coreLibrariesCount > 0 && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
              {coreLibrariesCount} API
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('configs')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'configs'
              ? 'bg-slate-800 text-white font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Konfiguracja ({modpack.configs.length})
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'versions'
              ? 'bg-slate-800 text-white font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Wersje (v{modpack.version})
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'backups'
              ? 'bg-slate-800 text-white font-bold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Kopie Zapasowe
        </button>
      </div>

    </header>
  );
};
