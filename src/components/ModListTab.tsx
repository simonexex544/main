import React, { useState } from 'react';
import { Search, Plus, Trash2, Power, Layers, AlertTriangle, Sparkles, ShieldCheck, Box, BookOpen } from 'lucide-react';
import { ModItem, ModpackData } from '../types/modpack';
import { POPULAR_AVAILABLE_MODS } from '../data/presetPacks';
import { autoResolveDependencies } from '../utils/dependencyResolver';

interface ModListTabProps {
  modpack: ModpackData;
  onUpdateMods: (newMods: ModItem[], autoAddedNotice?: string) => void;
  conflictingModIds: Set<string>;
  onOpenAiModal: () => void;
}

export const ModListTab: React.FC<ModListTabProps> = ({
  modpack,
  onUpdateMods,
  conflictingModIds,
  onOpenAiModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'libraries' | 'structures' | 'optimization'>('all');

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'library', label: 'Biblioteki & API' },
    { id: 'optimization', label: 'Optymalizacja' },
    { id: 'worldgen', label: 'Struktury & Świat' },
    { id: 'technology', label: 'Technologia' },
    { id: 'magic', label: 'Magia & RPG' },
    { id: 'gameplay', label: 'Rozgrywka' },
    { id: 'utility', label: 'Interfejs & HUD' }
  ];

  const filteredMods = modpack.mods.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ? true : m.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const toggleMod = (modId: string) => {
    const updated = modpack.mods.map(m =>
      m.id === modId ? { ...m, enabled: m.enabled === false ? true : false } : m
    );
    onUpdateMods(updated);
  };

  const removeMod = (modId: string) => {
    const updated = modpack.mods.filter(m => m.id !== modId);
    onUpdateMods(updated);
  };

  const addModFromCatalog = (mod: ModItem) => {
    if (modpack.mods.some(m => m.id === mod.id)) return;
    
    const newMod: ModItem = {
      ...mod,
      enabled: true,
      reason: 'Dodany z katalogu launchera'
    };

    // Auto-resolve dependencies (e.g. if adding YUNG's Better Mineshafts, auto-add YUNG's API!)
    const { updatedMods, addedLibraries } = autoResolveDependencies(
      [...modpack.mods, newMod],
      modpack.loader,
      modpack.mcVersion
    );

    let notice: string | undefined;
    if (addedLibraries.length > 0) {
      notice = `Automatycznie dołączono bibliotekę: ${addedLibraries.map(l => l.name).join(', ')} (wymaganą przez ${mod.name})!`;
    }

    onUpdateMods(updatedMods, notice);
  };

  const existingModIds = new Set(modpack.mods.map(m => m.id.toLowerCase()));
  const availableToAdd = POPULAR_AVAILABLE_MODS.filter(m => !existingModIds.has(m.id.toLowerCase()));

  const filteredCatalog = availableToAdd.filter(m => {
    if (catalogFilter === 'libraries') return m.category === 'library' || m.isCore;
    if (catalogFilter === 'structures') return m.category === 'worldgen';
    if (catalogFilter === 'optimization') return m.category === 'optimization' || m.category === 'graphics';
    return true;
  });

  return (
    <div className="space-y-4">
      
      {/* Prism Toolbar & Search Bar */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtruj mody w instancji (nazwa, id, funkcja)..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md transition-colors whitespace-nowrap font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dodaj mod / bibliotekę</span>
          </button>
        </div>
      </div>

      {/* Category Filter Badges */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 font-mono text-xs">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-[11px] ${
              selectedCategory === cat.id
                ? 'bg-slate-800 text-white font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* High-Density Prism Launcher Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 font-mono text-xs shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3 w-10 text-center">Stan</th>
                <th className="py-2.5 px-4 font-semibold text-slate-300">Nazwa Modyfikacji</th>
                <th className="py-2.5 px-3 font-semibold text-slate-300">Typ / Kategoria</th>
                <th className="py-2.5 px-3 font-semibold text-slate-300">Wymagane Biblioteki</th>
                <th className="py-2.5 px-3 font-semibold text-slate-300">Plik (.jar)</th>
                <th className="py-2.5 px-3 w-20 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredMods.map((mod) => {
                const isConflicting = conflictingModIds.has(mod.id.toLowerCase());
                const isEnabled = mod.enabled !== false;
                const isLib = mod.isCore || mod.category === 'library';

                // Detect dependencies for display
                let depLabel = '—';
                if (mod.id.includes('better-') || mod.id.includes('yung')) depLabel = "YUNG's API";
                else if (mod.id === 'iris') depLabel = 'Sodium';
                else if (mod.id === 'irons-spells-n-spellbooks') depLabel = 'playerAnimator';
                else if (mod.id === 'create') depLabel = 'Fabric API';
                else if (mod.id === 'rei') depLabel = 'Cloth Config';
                else if (mod.id === 'artifacts') depLabel = 'Trinkets / Curios';

                return (
                  <tr
                    key={mod.id}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      isConflicting
                        ? 'bg-rose-950/20'
                        : !isEnabled
                        ? 'opacity-50 bg-slate-950/40'
                        : isLib
                        ? 'bg-slate-900/30'
                        : ''
                    }`}
                  >
                    {/* Toggle Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleMod(mod.id)}
                        className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                        title={isEnabled ? 'Wyłącz moda' : 'Włącz moda'}
                      />
                    </td>

                    {/* Mod Name & Description */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-xs ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                          {mod.name}
                        </span>
                        {isLib && (
                          <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            Core API
                          </span>
                        )}
                        {isConflicting && (
                          <span className="text-[9px] text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Konflikt
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-1 mt-0.5">
                        {mod.description}
                      </p>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-slate-300 capitalize">
                        {mod.category}
                      </span>
                    </td>

                    {/* Dependencies */}
                    <td className="py-2.5 px-3">
                      {depLabel !== '—' ? (
                        <span className="text-[11px] text-emerald-400 font-mono">
                          {depLabel}
                        </span>
                      ) : (
                        <span className="text-slate-600">Brak</span>
                      )}
                    </td>

                    {/* JAR filename */}
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">
                      {mod.id}.jar
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => removeMod(mod.id)}
                        title="Usuń z instancji"
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredMods.length === 0 && (
          <div className="py-10 text-center text-slate-500 font-sans">
            <Layers className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <p className="text-xs font-semibold">Brak modyfikacji w tej kategorii.</p>
          </div>
        )}
      </div>

      {/* Modal: Add Mod & Libraries Catalog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-100 max-h-[85vh] flex flex-col font-sans">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Katalog Modów & Bibliotek Modrinth</h3>
                  <p className="text-xs text-slate-400 font-mono">Dla {modpack.loader.toUpperCase()} · MC {modpack.mcVersion}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Zamknij
              </button>
            </div>

            {/* Catalog Filter Chips */}
            <div className="flex items-center gap-1.5 py-3 border-b border-slate-800/80 overflow-x-auto text-xs font-mono">
              <button
                onClick={() => setCatalogFilter('all')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  catalogFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-950'
                }`}
              >
                Wszystkie
              </button>
              <button
                onClick={() => setCatalogFilter('libraries')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  catalogFilter === 'libraries' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-400 hover:bg-slate-950'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Biblioteki & Core APIs (np. YUNG's API)</span>
              </button>
              <button
                onClick={() => setCatalogFilter('structures')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  catalogFilter === 'structures' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-950'
                }`}
              >
                Struktury YUNG'a & Świat
              </button>
              <button
                onClick={() => setCatalogFilter('optimization')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  catalogFilter === 'optimization' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-950'
                }`}
              >
                Optymalizacja FPS
              </button>
            </div>

            {/* Mod List items */}
            <div className="overflow-y-auto space-y-2 py-3 flex-1 pr-1 font-mono text-xs">
              {filteredCatalog.map(mod => {
                const isLib = mod.isCore || mod.category === 'library';
                return (
                  <div
                    key={mod.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{mod.name}</span>
                        {isLib && (
                          <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            Wymagana biblioteka API
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">{mod.id}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-1">{mod.description}</p>
                    </div>

                    <button
                      onClick={() => addModFromCatalog(mod)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Dodaj</span>
                    </button>
                  </div>
                );
              })}

              {filteredCatalog.length === 0 && (
                <p className="text-xs text-center text-slate-500 py-6 font-sans">
                  Wszystkie mody z tej kategorii są już dodane do obecnej instancji!
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Automatyczny resolver bibliotek jest aktywny</span>
              </span>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
              >
                Zamknij
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
