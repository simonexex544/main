import React, { useState } from 'react';
import { FileCode, Save, Plus, Trash2, ShieldCheck, Download, Undo2 } from 'lucide-react';
import { ConfigFile, ModpackData } from '../types/modpack';

interface ConfigEditorTabProps {
  modpack: ModpackData;
  onUpdateConfigs: (newConfigs: ConfigFile[]) => void;
  onTakeBackup: (title: string) => void;
}

export const ConfigEditorTab: React.FC<ConfigEditorTabProps> = ({
  modpack,
  onUpdateConfigs,
  onTakeBackup
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeContent, setActiveContent] = useState(
    modpack.configs[0]?.content || ''
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState('config/custom-options.json');
  const [newFileDesc, setNewFileDesc] = useState('Własna konfiguracja moda');

  const selectedFile = modpack.configs[selectedIndex] || modpack.configs[0];

  const handleSelectFile = (index: number) => {
    setSelectedIndex(index);
    setActiveContent(modpack.configs[index]?.content || '');
    setHasUnsavedChanges(false);
  };

  const handleContentChange = (val: string) => {
    setActiveContent(val);
    setHasUnsavedChanges(val !== selectedFile?.content);
  };

  const handleSave = () => {
    if (!selectedFile) return;

    // Create backup before saving
    onTakeBackup(`Zapis pliku ${selectedFile.path}`);

    const updated = modpack.configs.map((cfg, idx) =>
      idx === selectedIndex ? { ...cfg, content: activeContent, lastModified: new Date().toLocaleTimeString('pl-PL') } : cfg
    );

    onUpdateConfigs(updated);
    setHasUnsavedChanges(false);
  };

  const handleRevert = () => {
    if (!selectedFile) return;
    setActiveContent(selectedFile.content);
    setHasUnsavedChanges(false);
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath) return;

    const newConfig: ConfigFile = {
      path: newFilePath.startsWith('config/') ? newFilePath : `config/${newFilePath}`,
      content: '// Nowy plik konfiguracyjny modyfikacji\n',
      description: newFileDesc || 'Konfiguracja modyfikacji',
      lastModified: new Date().toLocaleTimeString('pl-PL')
    };

    const updated = [...modpack.configs, newConfig];
    onUpdateConfigs(updated);
    setSelectedIndex(updated.length - 1);
    setActiveContent(newConfig.content);
    setHasUnsavedChanges(false);
    setIsAddingFile(false);
    setNewFilePath('config/custom-options.json');
    setNewFileDesc('');
  };

  const handleDeleteFile = (index: number) => {
    if (modpack.configs.length <= 1) {
      return;
    }

    onTakeBackup(`Usunięcie pliku ${modpack.configs[index].path}`);
    const updated = modpack.configs.filter((_, idx) => idx !== index);
    onUpdateConfigs(updated);
    setSelectedIndex(0);
    setActiveContent(updated[0]?.content || '');
    setHasUnsavedChanges(false);
  };

  const handleDownloadSingleFile = () => {
    if (!selectedFile) return;
    const blob = new Blob([activeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.path.split('/').pop() || 'config.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Edytor Konfiguracji Modów (Overrides / Config)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Wszystkie poniższe pliki trafią do folderu <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded">overrides/config</code> w archiwum .mrpack.
          </p>
        </div>

        <button
          onClick={() => setIsAddingFile(true)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Nowy plik config</span>
        </button>
      </div>

      {/* Editor Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        
        {/* Left: File list */}
        <div className="lg:col-span-1 space-y-1.5 bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 block">
            Pliki w paczce ({modpack.configs.length})
          </span>

          {modpack.configs.map((file, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={file.path + idx}
                onClick={() => handleSelectFile(idx)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-mono transition-colors ${
                  isSelected
                    ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700'
                    : 'text-slate-400 hover:bg-slate-950 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.path.split('/').pop()}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(idx);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-opacity"
                  title="Usuń plik"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: Code Editor Box */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          
          {/* File Toolbar */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-200">{selectedFile?.path}</span>
              {hasUnsavedChanges && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  Niezapisane zmiany
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <button
                  onClick={handleRevert}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Cofnij</span>
                </button>
              )}

              <button
                onClick={handleDownloadSingleFile}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="Pobierz ten plik osobno"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz</span>
              </button>

              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded-lg transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Zapisz zmiany</span>
              </button>
            </div>
          </div>

          {selectedFile?.description && (
            <div className="px-3.5 py-1.5 bg-slate-950/50 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
              <span className="text-slate-500">Przeznaczenie:</span>
              <span>{selectedFile.description}</span>
            </div>
          )}

          {/* Code Textarea */}
          <textarea
            value={activeContent}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={18}
            spellCheck={false}
            className="w-full p-4 bg-slate-950 font-mono text-xs text-emerald-300/90 leading-relaxed focus:outline-none resize-y selection:bg-emerald-500/30"
          />

          <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Linie: {activeContent.split('\n').length}</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Automatyczny backup włączony przy zapisie</span>
            </span>
          </div>

        </div>

      </div>

      {/* Modal: New File */}
      {isAddingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-100">
            <h3 className="text-sm font-bold text-white mb-3">Dodaj plik konfiguracyjny</h3>
            
            <form onSubmit={handleCreateFile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Ścieżka pliku (w overrides)
                </label>
                <input
                  type="text"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder="config/moj-mod.json"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Opis konfiguracji
                </label>
                <input
                  type="text"
                  value={newFileDesc}
                  onChange={(e) => setNewFileDesc(e.target.value)}
                  placeholder="np. Opcje renderowania grafiki"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingFile(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
                >
                  Utwórz plik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
