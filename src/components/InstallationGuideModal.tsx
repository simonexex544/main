import React, { useState } from 'react';
import { HelpCircle, X, Download, Monitor, CheckCircle, ExternalLink, Gamepad2 } from 'lucide-react';
import { ModLoader } from '../types/modpack';

interface InstallationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  loader: ModLoader;
  mcVersion: string;
}

export const InstallationGuideModal: React.FC<InstallationGuideModalProps> = ({
  isOpen,
  onClose,
  loader,
  mcVersion
}) => {
  const [activeLauncher, setActiveLauncher] = useState<'prism' | 'modrinth' | 'curseforge' | 'lan'>('modrinth');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Wsparcie i Instrukcja Instalacji .mrpack</h3>
              <p className="text-xs text-slate-400">Pobrana paczka jest w 100% zgodna z oficjalnymi launcherami</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Launcher selector tabs */}
        <div className="flex items-center gap-1.5 pt-4 pb-2 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveLauncher('modrinth')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeLauncher === 'modrinth'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Modrinth App (Zalecany)
          </button>

          <button
            onClick={() => setActiveLauncher('prism')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeLauncher === 'prism'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Prism Launcher
          </button>

          <button
            onClick={() => setActiveLauncher('curseforge')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeLauncher === 'curseforge'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            CurseForge App
          </button>

          <button
            onClick={() => setActiveLauncher('lan')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeLauncher === 'lan'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Gra Ze Znajomymi (LAN/Serwer)
          </button>
        </div>

        {/* Content body */}
        <div className="py-4 overflow-y-auto flex-1 space-y-4 text-xs text-slate-300 pr-1">
          {activeLauncher === 'modrinth' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <div>
                  <h4 className="font-semibold text-white">Pobierz plik paczki</h4>
                  <p className="text-slate-400 mt-0.5">Kliknij zielony przycisk <strong>"Pobierz .mrpack"</strong> w prawym górnym rogu aplikacji. Plik zapisze się na Twoim dysku.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <div>
                  <h4 className="font-semibold text-white">Otwórz Modrinth App i przeciągnij plik</h4>
                  <p className="text-slate-400 mt-0.5">Uruchom oficjalną aplikację Modrinth App. Możesz po prostu <strong>przeciągnąć pobrany plik .mrpack bezpośrednio na okno launchera</strong>!</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <div>
                  <h4 className="font-semibold text-white">Automatyczna instalacja i start</h4>
                  <p className="text-slate-400 mt-0.5">Modrinth automatycznie zainstaluje {loader.toUpperCase()} dla Minecraft {mcVersion}, pobierze mody i skopiuje gotowe configi z folderu overrides. Kliknij "Graj" i ciesz się grą!</p>
                </div>
              </div>
            </div>
          )}

          {activeLauncher === 'prism' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <div>
                  <h4 className="font-semibold text-white">W Prism Launcher kliknij "Dodaj instancję"</h4>
                  <p className="text-slate-400 mt-0.5">W lewym górnym rogu Prism Launcher wybierz przycisk <strong>Dodaj instancję (Add Instance)</strong>.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <div>
                  <h4 className="font-semibold text-white">Wybierz "Importuj z pliku zip"</h4>
                  <p className="text-slate-400 mt-0.5">W menu bocznym kliknij "Importuj" i wskaż pobrany z naszej aplikacji plik <strong>.mrpack</strong>.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <div>
                  <h4 className="font-semibold text-white">Zatwierdź i graj</h4>
                  <p className="text-slate-400 mt-0.5">Prism rozpakuje konfiguracje i pobierze właściwe wersje modów dla {loader.toUpperCase()}. Wszystko jest gotowe w kilkanaście sekund.</p>
                </div>
              </div>
            </div>
          )}

          {activeLauncher === 'curseforge' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <div>
                  <h4 className="font-semibold text-white">Przejdź do zakładki Minecraft w CurseForge</h4>
                  <p className="text-slate-400 mt-0.5">Kliknij ikonę trzech kropek obok przycisku "Create Custom Profile" na górnym pasku.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <div>
                  <h4 className="font-semibold text-white">Wybierz "Import Profile"</h4>
                  <p className="text-slate-400 mt-0.5">Wskaż plik <strong>.mrpack</strong>. CurseForge automatycznie zsynchronizuje kompatybilne modyfikacje.</p>
                </div>
              </div>
            </div>
          )}

          {activeLauncher === 'lan' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-emerald-400" />
                  <span>Darmowa gra ze znajomymi przez sieć P2P (e4mc / Essential)</span>
                </h4>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Aby zagrać ze znajomym bez stawiania dedykowanego serwera, upewnijcie się, że oboje macie ten sam link do paczki. Wystarczy, że w grze jeden z Was wejdzie w menu pauzy (ESC) i kliknie "Otwórz dla sieci LAN" z modem <strong>e4mc</strong> — mod wygeneruje link, którym drugi gracz łączy się bezpośrednio!
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <h4 className="font-semibold text-white">Dedykowany serwer (VPS / Hosting)</h4>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Zmień rozszerzenie pliku <code>.mrpack</code> na <code>.zip</code>. Wypakuj folder <code>overrides/config</code> do głównego katalogu serwera, a listę modów zainstaluj na serwerze {loader.toUpperCase()}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
          >
            Rozumiem, dziękuję!
          </button>
        </div>

      </div>
    </div>
  );
};
