import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  ScrollText,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Save,
  Loader2,
  CheckCircle2,
  Code2,
  GitBranch,
} from 'lucide-react';
import { ModpackProject, QuestChapter, QuestLine, QuestNode } from '../../types/modpack';
import { exportQuestLineToSnbtFiles, serializeChapterToSnbt } from '../../utils/questExporter';
import { addLog } from '../../services/logger';

interface QuestDesignerViewProps {
  activeProject: ModpackProject | null;
  onUpdateProject: (updated: ModpackProject) => void;
  onNotify: (msg: string) => void;
}

export const QuestDesignerView: React.FC<QuestDesignerViewProps> = ({
  activeProject,
  onUpdateProject,
  onNotify,
}) => {
  const [theme, setTheme] = useState('Od pierwszych narzędzi po mistrzostwo technologii i magii');
  const [chaptersCount, setChaptersCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0);
  const [showSnbtPreview, setShowSnbtPreview] = useState(false);

  const questLine: QuestLine | null = activeProject?.questLine || null;
  const activeChapter: QuestChapter | null = questLine?.chapters?.[selectedChapterIdx] || null;

  const handleGenerateQuests = async () => {
    if (!activeProject) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modpackName: activeProject.name,
          loader: activeProject.loader,
          mcVersion: activeProject.mcVersion,
          installedMods: activeProject.mods.filter((m) => m.enabled !== false),
          theme,
          chaptersCount,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.questLine) {
        onUpdateProject({ ...activeProject, questLine: data.questLine });
        setSelectedChapterIdx(0);
        onNotify(`Wygenerowano linię zadań (${data.questLine.chapters.length} rozdziały) opartą wyłącznie na zainstalowanych modach!`);
        addLog('info', 'Quest Designer', `Wygenerowano questline dla "${activeProject.name}"`);
      }
    } catch (err: any) {
      onNotify(err?.message || 'Błąd podczas generowania questów');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateQuestLine = (next: QuestLine) => {
    if (!activeProject) return;
    onUpdateProject({ ...activeProject, questLine: next });
  };

  const handleAddChapter = () => {
    const base: QuestLine = questLine || {
      id: `ql_${Date.now()}`,
      title: `Kroniki ${activeProject?.name || 'Modpacka'}`,
      storyPremise: theme,
      generatedAt: new Date().toISOString(),
      ftbQuestsCompatible: true,
      ftbCompatibilityNote: 'Eksport FTB Quests SNBT aktywny.',
      chapters: [],
    };
    const nextChapter: QuestChapter = {
      id: `chapter_${base.chapters.length + 1}`,
      title: `Rozdział ${base.chapters.length + 1}: Nowe Wyzwanie`,
      subtitle: 'Własny rozdział progresji',
      iconItem: 'minecraft:writable_book',
      order: base.chapters.length,
      quests: [],
    };
    updateQuestLine({ ...base, chapters: [...base.chapters, nextChapter] });
    setSelectedChapterIdx(base.chapters.length);
  };

  const handleAddQuest = () => {
    if (!questLine || !activeChapter) return;
    const newQuest: QuestNode = {
      id: `q_${Date.now()}`,
      title: 'Nowe Zadanie',
      description: 'Opisz cel zadania i wymagane przedmioty z zainstalowanych modów.',
      isSideQuest: false,
      iconItem: 'minecraft:emerald',
      modId: activeProject?.mods[0]?.id || 'minecraft',
      dependencies: activeChapter.quests.length > 0 ? [activeChapter.quests[activeChapter.quests.length - 1].id] : [],
      objectives: [
        {
          id: `obj_${Date.now()}`,
          type: 'item',
          title: 'Zdobądź wymagany przedmiot',
          target: 'minecraft:iron_ingot',
          count: 8,
          modId: 'minecraft',
        },
      ],
      rewards: [{ id: `rew_${Date.now()}`, type: 'xp', title: '100 XP', xp: 100 }],
      x: activeChapter.quests.length * 3,
      y: 0,
    };

    const nextChapters = questLine.chapters.map((ch, idx) =>
      idx === selectedChapterIdx ? { ...ch, quests: [...ch.quests, newQuest] } : ch
    );
    updateQuestLine({ ...questLine, chapters: nextChapters });
  };

  const handleUpdateQuestField = (questId: string, patch: Partial<QuestNode>) => {
    if (!questLine) return;
    const nextChapters = questLine.chapters.map((ch, idx) =>
      idx === selectedChapterIdx
        ? {
            ...ch,
            quests: ch.quests.map((q) => (q.id === questId ? { ...q, ...patch } : q)),
          }
        : ch
    );
    updateQuestLine({ ...questLine, chapters: nextChapters });
  };

  const handleDeleteQuest = (questId: string) => {
    if (!questLine) return;
    const nextChapters = questLine.chapters.map((ch, idx) =>
      idx === selectedChapterIdx
        ? { ...ch, quests: ch.quests.filter((q) => q.id !== questId) }
        : ch
    );
    updateQuestLine({ ...questLine, chapters: nextChapters });
  };

  const handleDownloadSnbtBundle = async () => {
    if (!questLine || !activeProject) return;
    const files = exportQuestLineToSnbtFiles(questLine);
    const zip = new JSZip();
    for (const f of files) {
      zip.file(`overrides/${f.path}`, f.content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-ftbquests-snbt.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('Pobrano paczkę plików .snbt dla FTB Quests!');
  };

  if (!activeProject) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center text-sm text-slate-500">
        Najpierw wybierz lub utwórz projekt modpacka, aby projektować questy.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* AI Quest Generator Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-emerald-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                AI Quest Designer (FTB Quests .snbt)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Generuje fabułę, rozdziały, zadania poboczne i nagrody wykorzystując <strong>wyłącznie {activeProject.mods.length} modów zainstalowanych</strong> w paczce "{activeProject.name}".
            </p>
          </div>

          {questLine && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSnbtPreview(!showSnbtPreview)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showSnbtPreview ? 'Edytor wizualny' : 'Podgląd SNBT'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSnbtBundle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz .snbt</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
              Motyw przewodni linii zadań
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
              Liczba rozdziałów
            </label>
            <select
              value={chaptersCount}
              onChange={(e) => setChaptersCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
            >
              <option value={2}>2 rozdziały</option>
              <option value={3}>3 rozdziały</option>
              <option value={4}>4 rozdziały</option>
              <option value={5}>5 rozdziałów</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerateQuests}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isGenerating ? 'Tworzenie...' : 'Generuj Questy AI'}</span>
            </button>
          </div>
        </div>

        {questLine && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {questLine.ftbCompatibilityNote} Questline zapisany automatycznie do eksportu .mrpack.
            </span>
          </div>
        )}
      </div>

      {/* Interactive Chapter & Quest Workspace */}
      {questLine ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Left: Chapters */}
          <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                Rozdziały ({questLine.chapters.length})
              </span>
              <button
                type="button"
                onClick={handleAddChapter}
                className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                title="Dodaj rozdział"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {questLine.chapters.map((ch, idx) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChapterIdx(idx)}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors ${
                  selectedChapterIdx === idx
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="truncate">{ch.title}</div>
                <div className="text-[11px] opacity-75 font-mono mt-0.5">
                  {ch.quests.length} zadań
                </div>
              </button>
            ))}
          </div>

          {/* Right: Quests or SNBT Code */}
          <div className="lg:col-span-3 space-y-3">
            {activeChapter && !showSnbtPreview && (
              <>
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeChapter.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {activeChapter.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuest}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj quest</span>
                  </button>
                </div>

                {activeChapter.quests.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={q.title}
                          onChange={(e) => handleUpdateQuestField(q.id, { title: e.target.value })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm font-bold text-slate-900 dark:text-white"
                        />
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-zinc-400">
                          <span>Mod: {q.modId}</span>
                          <span>·</span>
                          <span>{q.isSideQuest ? 'Zadanie poboczne' : 'Główne'}</span>
                          {q.dependencies.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <GitBranch className="w-3 h-3" />
                                {q.dependencies.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuest(q.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={q.description}
                      onChange={(e) =>
                        handleUpdateQuestField(q.id, { description: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                          Cele (Objectives):
                        </div>
                        {q.objectives.map((o) => (
                          <div key={o.id} className="font-mono text-[11px] text-slate-700 dark:text-zinc-300">
                            · {o.title}: {o.count}x {o.target}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                          Nagrody (Rewards):
                        </div>
                        {q.rewards.map((r) => (
                          <div key={r.id} className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                            · {r.title} {r.item ? `(${r.count || 1}x ${r.item})` : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeChapter && showSnbtPreview && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre">
                {serializeChapterToSnbt(activeChapter, selectedChapterIdx)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Brak linii zadań w paczce "{activeProject.name}". Wygeneruj ją przez AI lub dodaj pierwszy rozdział ręcznie.
          </p>
          <button
            type="button"
            onClick={handleAddChapter}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dodaj pusty rozdział</span>
          </button>
        </div>
      )}
    </div>
  );
};
