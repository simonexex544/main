import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Info, CheckCircle2, RefreshCw, Wrench, Sparkles } from 'lucide-react';
import { CompatibilityReport, ModItem } from '../types/modpack';
import { POPULAR_AVAILABLE_MODS } from '../data/presetPacks';

interface CompatibilityTabProps {
  report: CompatibilityReport | null;
  isLoading: boolean;
  onRefresh: () => void;
  mods: ModItem[];
  onUpdateMods: (newMods: ModItem[]) => void;
  loader: string;
  mcVersion: string;
}

export const CompatibilityTab: React.FC<CompatibilityTabProps> = ({
  report,
  isLoading,
  onRefresh,
  mods,
  onUpdateMods,
  loader,
  mcVersion
}) => {
  const issues = report?.issues || [];
  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  const infos = issues.filter(i => i.type === 'info');

  const handleAutoFix = (issue: any) => {
    if (!issue.autoFixModId) return;

    if (issue.autoFixModId === 'optifine') {
      // Remove OptiFine
      const updated = mods.filter(m => m.id.toLowerCase() !== 'optifine');
      onUpdateMods(updated);
      return;
    }

    if (issue.autoFixModId === 'xaeros-minimap' && mods.some(m => m.id === 'journeymap')) {
      // Keep only JourneyMap
      const updated = mods.filter(m => m.id.toLowerCase() !== 'xaeros-minimap');
      onUpdateMods(updated);
      return;
    }

    if (issue.autoFixModId === 'rei' && mods.some(m => m.id === 'jei')) {
      // Keep only JEI
      const updated = mods.filter(m => m.id.toLowerCase() !== 'rei');
      onUpdateMods(updated);
      return;
    }

    // Otherwise add the missing required mod from database
    const modToAdd = POPULAR_AVAILABLE_MODS.find(m => m.id.toLowerCase() === issue.autoFixModId.toLowerCase());
    if (modToAdd && !mods.some(m => m.id === modToAdd.id)) {
      onUpdateMods([...mods, { ...modToAdd, enabled: true, reason: 'Automatycznie dodany w celu rozwiązania zależności' }]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Status Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            errors.length > 0
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : warnings.length > 0
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {errors.length > 0 ? (
              <ShieldAlert className="w-6 h-6" />
            ) : warnings.length > 0 ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                {errors.length > 0
                  ? 'Wykryto kolizje wymagające naprawy'
                  : warnings.length > 0
                  ? 'Paczka stabilna z ostrzeżeniami'
                  : 'Wszystkie modyfikacje są w pełni kompatybilne'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sprawdzono {mods.length} modyfikacji pod kątem Minecraft {mcVersion} i loadera {loader.toUpperCase()}.
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Sprawdź w chmurze</span>
        </button>
      </div>

      {/* AI Stability & Cloud Insights */}
      {report?.aiInsights && (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
          <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-emerald-200 block">Ekspertyza Architekta AI (Modrinth Standards):</span>
            <p className="text-emerald-300/90 leading-relaxed">{report.aiInsights}</p>
          </div>
        </div>
      )}

      {/* Conflict & Issue List */}
      <div className="space-y-3">
        {errors.map((issue, idx) => (
          <div
            key={'err_' + idx}
            className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-rose-300">{issue.title}</h4>
                <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">{issue.message}</p>
              </div>
            </div>

            {issue.autoFixModId && (
              <button
                onClick={() => handleAutoFix(issue)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-lg transition-colors whitespace-nowrap self-start sm:self-center shrink-0"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{issue.action || 'Napraw automatycznie'}</span>
              </button>
            )}
          </div>
        ))}

        {warnings.map((issue, idx) => (
          <div
            key={'warn_' + idx}
            className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-300">{issue.title}</h4>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">{issue.message}</p>
              </div>
            </div>

            {issue.autoFixModId && (
              <button
                onClick={() => handleAutoFix(issue)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap self-start sm:self-center shrink-0"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{issue.action || 'Rozwiąż'}</span>
              </button>
            )}
          </div>
        ))}

        {infos.map((issue, idx) => (
          <div
            key={'info_' + idx}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-slate-300"
          >
            <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">{issue.title}</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{issue.message}</p>
            </div>
          </div>
        ))}

        {issues.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
            <h4 className="text-sm font-bold text-white">Idealna zgodność!</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Brak zduplikowanych identyfikatorów, brak kolizji renderowania Sodium/OptiFine, a wszystkie wymagane biblioteki są obecne.
            </p>
          </div>
        )}
      </div>

      {/* Cloud Compatibility Knowledge Base Reference */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
        <h4 className="font-semibold text-slate-300">Reguły silnika weryfikacji w chmurze:</h4>
        <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
          <li><strong>Sodium + Iris vs OptiFine:</strong> OptiFine modyfikuje kod Vanilla w sposób blokujący nowoczesne shadery i powodujący crashe w wersji 1.20+. Zastąpiono go nowocześniejszym tandemem Sodium + Iris.</li>
          <li><strong>Fabric API:</strong> Wymagane przez większość modów Fabric do rejestracji bloków, sieci pakietów i renderingu.</li>
          <li><strong>Zarządzanie Pamięcią:</strong> FerriteCore kompresuje stany bloków w pamięci RAM, obniżając obciążenie JVM nawet o 50%.</li>
        </ul>
      </div>

    </div>
  );
};
