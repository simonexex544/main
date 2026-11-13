import React, { useState } from 'react';
import {
  FolderOpen,
  Copy,
  Download,
  Trash2,
  Pencil,
  Check,
  X,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { ModpackProject, NavSection } from '../../types/modpack';

interface MyModpacksViewProps {
  projects: ModpackProject[];
  activeProjectId: string;
  onOpenProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onExportProject: (project: ModpackProject) => void;
  onNavigate: (section: NavSection) => void;
  onCreateEmpty: () => void;
}

const ACCENT_CLASSES: Record<ModpackProject['coverAccent'], string> = {
  emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-500',
  sky: 'from-sky-500/20 to-indigo-500/5 text-sky-500',
  amber: 'from-amber-500/20 to-orange-500/5 text-amber-500',
  violet: 'from-violet-500/20 to-fuchsia-500/5 text-violet-500',
  rose: 'from-rose-500/20 to-pink-500/5 text-rose-500',
};

export const MyModpacksView: React.FC<MyModpacksViewProps> = ({
  projects,
  activeProjectId,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  onRenameProject,
  onExportProject,
  onNavigate,
  onCreateEmpty,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const startRename = (proj: ModpackProject) => {
    setEditingId(proj.id);
    setEditingName(proj.name);
  };

  const commitRename = (id: string) => {
    if (editingName.trim()) {
      onRenameProject(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Biblioteka Modpacków ({projects.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Wszystkie projekty zapisują się automatycznie lokalnie wraz z historią wersji i kopiami konfiguracji.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateEmpty}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pusty projekt</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nowy z AI</span>
          </button>
        </div>
      </div>

      {/* Modpacks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          const isRenaming = editingId === proj.id;
          const accent = ACCENT_CLASSES[proj.coverAccent] || ACCENT_CLASSES.emerald;

          return (
            <div
              key={proj.id}
              className={`rounded-2xl bg-white dark:bg-zinc-900 border transition-colors overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'border-emerald-500/60 shadow-sm'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
              }`}
            >
              {/* Cover Banner */}
              <div>
                <div className={`h-20 px-4 flex items-center justify-between bg-gradient-to-br ${accent}`}>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider">
                    {proj.loader} · {proj.mcVersion}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    {proj.validationStatus === 'ERROR' ? (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    ) : proj.validationStatus === 'WARNING' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                    <span className="text-slate-700 dark:text-zinc-200 font-semibold">
                      {proj.validationStatus || 'DRAFT'}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-2">
                  {isRenaming ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(proj.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-emerald-500 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => commitRename(proj.id)}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {proj.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => startRename(proj)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded"
                        title="Zmień nazwę"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 min-h-[32px]">
                    {proj.summary || 'Brak opisu projektu.'}
                  </p>

                  <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 tabular-nums pt-1">
                    {proj.mods.length} modów · {proj.shaders?.length || 0} shaderów · v{proj.version} ·{' '}
                    {new Date(proj.createdAt).toLocaleDateString('pl-PL')}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-950/60 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenProject(proj.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Otwórz i Edytuj</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onExportProject(proj)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                    title="Eksportuj .mrpack"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateProject(proj.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800"
                    title="Duplikuj projekt"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteProject(proj.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                    title="Usuń projekt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
