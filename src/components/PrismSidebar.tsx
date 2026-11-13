import React from 'react';
import { Box, Plus, Sparkles, HardDrive, Cpu, Sliders, CheckCircle2 } from 'lucide-react';
import { ModpackData } from '../types/modpack';
import { PRESET_PACKS } from '../data/presetPacks';

interface PrismSidebarProps {
  currentPack: ModpackData;
  onSelectPreset: (preset: ModpackData) => void;
  onOpenAiModal: () => void;
  memoryMb: number;
  onChangeMemoryMb: (mb: number) => void;
}

export const PrismSidebar: React.FC<PrismSidebarProps> = ({
  currentPack,
  onSelectPreset,
  onOpenAiModal,
  memoryMb,
  onChangeMemoryMb
}) => {
  return (
    <aside className="w-full lg:w-72 bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col shrink-0">
      
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5 font-mono">
              <span>PRISM</span>
              <span className="text-emerald-400 font-sans text-[11px] font-semibold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/30">CRAFT</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">Launcher & Modpack Studio</p>
          </div>
        </div>

        <button
          onClick={onOpenAiModal}
          className="p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
          title="Utwórz nową paczkę z AI"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Instances list */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Instancje ({PRESET_PACKS.length})
          </span>
          <button
            onClick={onOpenAiModal}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Nowa</span>
          </button>
        </div>

        {/* Current Active Instance Card */}
        <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/50 shadow-sm shadow-emerald-500/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white truncate max-w-[150px]">
                {currentPack.name}
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Aktywna
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
            <span className="uppercase text-slate-300">{currentPack.loader}</span>
            <span>·</span>
            <span>MC {currentPack.mcVersion}</span>
            <span>·</span>
            <span>v{currentPack.version}</span>
          </div>

          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Mody: {currentPack.mods.length}</span>
            <span>Configi: {currentPack.configs.length}</span>
          </div>
        </div>

        {/* Other Preset Profiles */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 block">
            Gotowe profile:
          </span>

          {PRESET_PACKS.map((preset, idx) => {
            const isSelected = preset.name === currentPack.name;
            if (isSelected) return null;

            return (
              <button
                key={idx}
                onClick={() => onSelectPreset(preset)}
                className="w-full text-left p-2.5 rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                    {preset.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {preset.loader}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                  <span>MC {preset.mcVersion}</span>
                  <span>·</span>
                  <span>{preset.mods.length} modów</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Java & RAM Allocation Panel */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 space-y-3 font-mono text-xs">
        
        {/* RAM Allocation Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1 font-sans">
              <Sliders className="w-3 h-3 text-slate-500" /> Przydział RAM:
            </span>
            <span className="text-emerald-400 font-bold tabular-nums">
              {memoryMb} MB ({Math.round(memoryMb / 1024)} GB)
            </span>
          </div>

          <input
            type="range"
            min="2048"
            max="12288"
            step="1024"
            value={memoryMb}
            onChange={(e) => onChangeMemoryMb(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />

          <div className="flex justify-between text-[9px] text-slate-500">
            <span>2 GB</span>
            <span>6 GB</span>
            <span>12 GB</span>
          </div>
        </div>

        {/* Java Runtime status */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-slate-500" />
            <span>Java 21.0.4 (64-Bit)</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>OK</span>
          </span>
        </div>

      </div>

    </aside>
  );
};
