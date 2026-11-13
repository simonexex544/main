import React from 'react';
import {
  Download,
  ShieldCheck,
  Share2,
  HelpCircle,
  Sun,
  Moon,
  Loader2,
  Menu,
} from 'lucide-react';
import { ModpackProject, NavSection, ValidationReport } from '../../types/modpack';
import { AppLanguage, t } from '../../services/i18n';

interface TopBarProps {
  activeSection: NavSection;
  activeProject: ModpackProject | null;
  projects: ModpackProject[];
  onSelectProject: (id: string) => void;
  validationReport: ValidationReport | null;
  isValidating: boolean;
  isExporting: boolean;
  onValidate: () => void;
  onExportMrpack: () => void;
  onOpenShare: () => void;
  onOpenGuide: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  language: AppLanguage;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  activeProject,
  projects,
  onSelectProject,
  validationReport,
  isValidating,
  isExporting,
  onValidate,
  onExportMrpack,
  onOpenShare,
  onOpenGuide,
  theme,
  onToggleTheme,
  language,
  onToggleMobileMenu,
}) => {
  const sectionTitles: Record<NavSection, string> = {
    home: t(language, 'nav_home'),
    create: t(language, 'nav_create'),
    modpacks: t(language, 'nav_modpacks'),
    mods: t(language, 'nav_mods'),
    shaders: t(language, 'nav_shaders'),
    resourcepacks: t(language, 'nav_resourcepacks'),
    datapacks: t(language, 'nav_datapacks'),
    quests: t(language, 'nav_quests'),
    downloads: t(language, 'nav_downloads'),
    settings: t(language, 'nav_settings'),
  };

  const statusColor =
    validationReport?.overallStatus === 'ERROR'
      ? 'text-rose-500'
      : validationReport?.overallStatus === 'WARNING'
        ? 'text-amber-500'
        : 'text-emerald-500';

  return (
    <header className="h-14 shrink-0 px-4 lg:px-6 bg-white dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between gap-4">
      {/* Left: Title + Active Project Switcher */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <h1 className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
          {sectionTitles[activeSection]}
        </h1>

        {activeProject && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 min-w-0">
            <span aria-hidden="true">/</span>
            <select
              value={activeProject.id}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-md px-2 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200 max-w-[200px] truncate focus:outline-none focus:border-emerald-500"
              aria-label="Active modpack selector"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.loader} {p.mcVersion})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Studio Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
          title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {activeProject && (
          <>
            <button
              type="button"
              onClick={onOpenGuide}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t(language, 'install_guide')}</span>
            </button>

            <button
              type="button"
              onClick={onOpenShare}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t(language, 'share_pack')}</span>
            </button>

            <button
              type="button"
              onClick={onValidate}
              disabled={isValidating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 transition-colors disabled:opacity-50"
            >
              {isValidating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              ) : (
                <ShieldCheck className={`w-3.5 h-3.5 ${statusColor}`} />
              )}
              <span className="hidden sm:inline">
                {validationReport ? validationReport.overallStatus : t(language, 'validate_pack')}
              </span>
            </button>

            <button
              type="button"
              onClick={onExportMrpack}
              disabled={isExporting || validationReport?.overallStatus === 'ERROR'}
              title={
                validationReport?.overallStatus === 'ERROR'
                  ? 'Napraw błędy walidacji przed eksportem .mrpack'
                  : 'Eksportuj paczkę do pliku .mrpack'
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors disabled:opacity-45 disabled:cursor-not-allowed shadow-sm"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{t(language, 'export_mrpack')}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
