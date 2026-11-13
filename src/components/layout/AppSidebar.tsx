import React from 'react';
import {
  Home,
  Sparkles,
  FolderKanban,
  Search,
  SunMedium,
  Image as ImageIcon,
  Database,
  ScrollText,
  Download,
  Settings,
  Box,
} from 'lucide-react';
import { ModpackProject, NavSection } from '../../types/modpack';
import { AppLanguage, t } from '../../services/i18n';

interface AppSidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  activeProject: ModpackProject | null;
  activeDownloadsCount: number;
  language: AppLanguage;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeSection,
  onNavigate,
  activeProject,
  activeDownloadsCount,
  language,
}) => {
  const navItems: Array<{ id: NavSection; labelKey: string; icon: React.ReactNode; count?: number }> = [
    { id: 'home', labelKey: 'nav_home', icon: <Home className="w-4 h-4" /> },
    { id: 'create', labelKey: 'nav_create', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'modpacks', labelKey: 'nav_modpacks', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'mods', labelKey: 'nav_mods', icon: <Search className="w-4 h-4" /> },
    { id: 'shaders', labelKey: 'nav_shaders', icon: <SunMedium className="w-4 h-4" /> },
    { id: 'resourcepacks', labelKey: 'nav_resourcepacks', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'datapacks', labelKey: 'nav_datapacks', icon: <Database className="w-4 h-4" /> },
    { id: 'quests', labelKey: 'nav_quests', icon: <ScrollText className="w-4 h-4" /> },
    {
      id: 'downloads',
      labelKey: 'nav_downloads',
      icon: <Download className="w-4 h-4" />,
      count: activeDownloadsCount > 0 ? activeDownloadsCount : undefined,
    },
    { id: 'settings', labelKey: 'nav_settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-60 shrink-0 bg-white dark:bg-zinc-900/95 border-r border-slate-200 dark:border-zinc-800/80 flex flex-col justify-between select-none">
      <div>
        {/* Brand Identity */}
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-slate-200 dark:border-zinc-800/80">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-sm">
            <Box className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
              CraftPack Studio
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
              .mrpack Architect
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-2.5 space-y-0.5" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <span className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{t(language, item.labelKey)}</span>
                </span>
                {item.count !== undefined && (
                  <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Workspace Project Footer */}
      {activeProject && (
        <div className="p-3 border-t border-slate-200 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => onNavigate('modpacks')}
            className="w-full text-left p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-950/80 dark:hover:bg-zinc-800/70 transition-colors"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              {language === 'en' ? 'Active Project' : 'Aktywny Projekt'}
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate mt-0.5">
              {activeProject.name}
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5 tabular-nums">
              {activeProject.loader} · {activeProject.mcVersion} · {activeProject.mods.length} modów
            </div>
          </button>
        </div>
      )}
    </aside>
  );
};
