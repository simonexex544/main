import React, { useState } from 'react';
import { Sparkles, X, Loader2, Cpu, Sliders, ShieldCheck, SunMedium } from 'lucide-react';
import { ModLoader, MinecraftVersion, ModpackData } from '../types/modpack';

interface AiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateSuccess: (newPack: ModpackData) => void;
  currentLoader: ModLoader;
  currentVersion: MinecraftVersion;
}

export const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerateSuccess,
  currentLoader,
  currentVersion
}) => {
  const [prompt, setPrompt] = useState('');
  const [loader, setLoader] = useState<ModLoader>(currentLoader);
  const [mcVersion, setMcVersion] = useState<MinecraftVersion>(currentVersion);
  const [playstyle, setPlaystyle] = useState('rpg_exploration');
  const [memoryBudget, setMemoryBudget] = useState('6GB - 8GB');
  const [includeShaders, setIncludeShaders] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const quickPrompts = [
    { label: 'Optymalizacja & Shadery 200+ FPS', text: 'Maksymalna optymalizacja klatek na sekundę dla słabszych i średnich PC, zoptymalizowane shadery Iris i Sodium oraz płynne GUI.' },
    { label: 'Create: Kinetyka & Maszyny', text: 'Zbalansowana technologia oparta na Create, koła zębate, automatyzacja pociągów, przepisy JEI i wydajność silnika.' },
    { label: 'RPG Magia & Wielkie Lochy', text: 'Świat fantasy z księgami czarów, systemem many, nowymi bossami w lochach, punktami szybkiej podróży i reliktami.' },
    { label: 'Vanilla+ Eksploracja & Gotowanie', text: 'Spokojny survival rozszerzający waniliowe mechaniki o gotowanie z Farmer\'s Delight, nowe biomy Terralith i klimatyczną muzykę.' }
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/generate-modpack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || quickPrompts[0].text,
          loader,
          mcVersion,
          playstyle,
          memoryBudget,
          includeShaders
        })
      });

      if (!res.ok) {
        throw new Error('Błąd serwera podczas generowania paczki.');
      }

      const data = await res.json();
      
      const constructedPack: ModpackData = {
        name: data.name || 'Nowa Paczka CraftPack AI',
        summary: data.summary || 'Paczka wygenerowana przez sztuczną inteligencję.',
        version: '1.0.0',
        author: 'CraftPack Architect AI',
        loader,
        mcVersion,
        recommendedMemory: data.recommendedMemory || memoryBudget,
        shaderAdvice: data.shaderAdvice || (includeShaders ? 'Complementary Reimagined r5.1' : 'Brak shaderów'),
        changelog: [
          `Inicjalna generacja paczki przez AI na bazie promptu: "${prompt || quickPrompts[0].label}"`,
          `Skonfigurowano ${data.mods?.length || 0} modów dla ${loader.toUpperCase()} ${mcVersion}.`,
          `Wygenerowano gotowe profile konfiguracyjne dla folderu overrides.`
        ],
        mods: (data.mods || []).map((m: any) => ({
          ...m,
          enabled: true
        })),
        configs: data.configs || []
      };

      onGenerateSuccess(constructedPack);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Nie udało się wygenerować paczki. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Architekt Paczek Modów AI</h2>
              <p className="text-xs text-slate-400">Opisz wymarzony styl gry — model dobierze mody i skomponuje optymalne configi.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleGenerate} className="mt-5 space-y-4">
          
          {/* Main prompt input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Twój pomysł na paczkę (styl rozgrywki, cele, klimat)
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="np. Realistyczny survival z nowym jedzeniem, lochami RPG, shaderami i maksymalną optymalizacją FPS..."
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="block text-[11px] font-medium text-slate-400 mb-1.5">
              Szybkie szablony stylu:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((qp, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setPrompt(qp.text)}
                  disabled={isLoading}
                  className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loader & MC Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-400" /> Modloader
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLoader('fabric')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                    loader === 'fabric'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Fabric
                </button>
                <button
                  type="button"
                  onClick={() => setLoader('neoforge')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                    loader === 'neoforge'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  NeoForge
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" /> Wersja Minecraft
              </label>
              <select
                value={mcVersion}
                onChange={(e) => setMcVersion(e.target.value as MinecraftVersion)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="1.21.4">Minecraft 1.21.4 (Najnowsza)</option>
                <option value="1.21.1">Minecraft 1.21.1 (Zalecana pod mody)</option>
                <option value="1.20.4">Minecraft 1.20.4</option>
                <option value="1.20.1">Minecraft 1.20.1 (Złoty wiek modów)</option>
              </select>
            </div>
          </div>

          {/* RAM & Shaders options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Zalecana pamięć RAM
              </label>
              <select
                value={memoryBudget}
                onChange={(e) => setMemoryBudget(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="4GB - 6GB">4GB - 6GB (Lekkie komputery / laptopy)</option>
                <option value="6GB - 8GB">6GB - 8GB (Optymalny standard gracza)</option>
                <option value="8GB - 12GB">8GB - 12GB (Ciężkie paczki techniczne)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <SunMedium className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-xs font-medium text-slate-200 block">Wsparcie dla shaderów</span>
                  <span className="text-[11px] text-slate-500 block">Dodaje silnik Iris + Sodium</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeShaders}
                onChange={(e) => setIncludeShaders(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg shadow-sm transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>AI komponuje paczkę i configi...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Wygeneruj Paczkę .mrpack</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
