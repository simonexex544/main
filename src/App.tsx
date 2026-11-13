/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import {
  AppLogEntry,
  AppSettings,
  ConfigBackup,
  DownloadTask,
  ModItem,
  ModpackProject,
  ModpackVersion,
  NavSection,
  ValidationAutoFix,
  ValidationReport,
} from './types/modpack';
import { AppSidebar } from './components/layout/AppSidebar';
import { TopBar } from './components/layout/TopBar';
import { HomeView } from './components/views/HomeView';
import { CreateModpackWizard } from './components/views/CreateModpackWizard';
import { MyModpacksView } from './components/views/MyModpacksView';
import { ProjectWorkspaceView } from './components/views/ProjectWorkspaceView';
import { ModrinthBrowserView } from './components/views/ModrinthBrowserView';
import { QuestDesignerView } from './components/views/QuestDesignerView';
import { DownloadsView } from './components/views/DownloadsView';
import { SettingsView } from './components/views/SettingsView';
import { ShareModal } from './components/ShareModal';
import { InstallationGuideModal } from './components/InstallationGuideModal';
import {
  createEmptyModpack,
  createProjectFromData,
  duplicateProjectRecord,
  getActiveProjectId,
  loadProjects,
  loadSettings,
  saveProjects,
  saveSettings,
  setActiveProjectId,
} from './services/projectStorage';
import { downloadManager } from './services/downloadManager';
import { addLog, getLogs, subscribeLogs } from './services/logger';
import { createConfigBackup, loadBackups } from './utils/backupStorage';
import { downloadMrpack, generateMrpackBlob } from './utils/mrpackGenerator';
import { decodeModpackFromUrl } from './utils/shareUtils';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [projects, setProjects] = useState<ModpackProject[]>(() => {
    const existing = loadProjects();
    const shared = decodeModpackFromUrl();
    if (shared) {
      const sharedProj = createProjectFromData(shared);
      const next = [sharedProj, ...existing];
      saveProjects(next);
      return next;
    }
    return existing;
  });

  const [activeProjectIdState, setActiveProjectIdState] = useState<string>(() =>
    getActiveProjectId(projects)
  );
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [backups, setBackups] = useState<ConfigBackup[]>(() => loadBackups());
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>(() =>
    downloadManager.getTasks()
  );
  const [logs, setLogs] = useState<AppLogEntry[]>(() => getLogs());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const hasLaunchedRef = useRef(false);

  const activeProject =
    projects.find((p) => p.id === activeProjectIdState) || projects[0] || null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Sync Tailwind dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveSettings(settings);
  }, [settings]);

  // Persist projects & active project selection
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    if (activeProjectIdState) {
      setActiveProjectId(activeProjectIdState);
    }
  }, [activeProjectIdState]);

  // Subscribe to download tasks & logs
  useEffect(() => {
    const unsubDl = downloadManager.subscribe(setDownloadTasks);
    const unsubLogs = subscribeLogs(setLogs);
    return () => {
      unsubDl();
      unsubLogs();
    };
  }, []);

  // Automatic config backup on app launch
  useEffect(() => {
    if (!hasLaunchedRef.current && activeProject) {
      hasLaunchedRef.current = true;
      const autoBak = createConfigBackup(activeProject, 'app_launch');
      setBackups(loadBackups());
      addLog('info', 'Backup', `Auto-kopia konfiguracji przy starcie: ${activeProject.name}`);
      showToast(`Automatyczna kopia zapasowa konfiguracji utworzona (${autoBak.timestamp})`);
    }
  }, []);

  // Real-time Validation Check when active project changes
  const runValidation = async (targetProject: ModpackProject | null = activeProject) => {
    if (!targetProject) return null;
    setIsValidating(true);
    try {
      const res = await fetch('/api/validate-modpack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modpack: targetProject, verifyOnline: true }),
      });
      if (res.ok) {
        const report: ValidationReport = await res.json();
        setValidationReport(report);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === targetProject.id
              ? {
                  ...p,
                  validationStatus: report.overallStatus,
                  loaderVersion: p.loaderVersion || report.loaderVersion,
                }
              : p
          )
        );
        return report;
      }
    } catch (e) {
      console.error('Validation failed:', e);
    } finally {
      setIsValidating(false);
    }
    return null;
  };

  useEffect(() => {
    if (!activeProject) return;
    const timer = setTimeout(() => {
      runValidation(activeProject);
    }, 350);
    return () => clearTimeout(timer);
  }, [
    activeProject?.id,
    activeProject?.mods.length,
    activeProject?.loader,
    activeProject?.loaderVersion,
    activeProject?.mcVersion,
    activeProject?.shaders?.length,
  ]);

  const handleUpdateProject = (updated: ModpackProject) => {
    const stamped: ModpackProject = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => prev.map((p) => (p.id === stamped.id ? stamped : p)));
  };

  const handleSelectProject = (id: string) => {
    setActiveProjectIdState(id);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, lastOpenedAt: new Date().toISOString() } : p))
    );
  };

  const handleOpenProjectWorkspace = (id: string) => {
    handleSelectProject(id);
    setEditingWorkspace(true);
    setActiveSection('modpacks');
  };

  const handleDuplicateProject = (id: string) => {
    const src = projects.find((p) => p.id === id);
    if (!src) return;
    const copy = duplicateProjectRecord(src);
    setProjects((prev) => [copy, ...prev]);
    addLog('info', 'Projects', `Zduplikowano projekt "${src.name}"`);
    showToast(`Utworzono kopię: ${copy.name}`);
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      showToast('Musi pozostać przynajmniej jeden projekt w bibliotece.');
      return;
    }
    const target = projects.find((p) => p.id === id);
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (activeProjectIdState === id && remaining[0]) {
      setActiveProjectIdState(remaining[0].id);
      setEditingWorkspace(false);
    }
    if (target) {
      addLog('warn', 'Projects', `Usunięto projekt "${target.name}"`);
      showToast(`Usunięto projekt "${target.name}"`);
    }
  };

  const handleRenameProject = (id: string, newName: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p
      )
    );
    showToast(`Zmieniono nazwę projektu na "${newName}"`);
  };

  const handleCreateEmptyQuick = () => {
    const empty = createEmptyModpack({
      name: `Nowy Modpack ${projects.length + 1}`,
      loader: 'fabric',
      mcVersion: '1.21.1',
    });
    setProjects((prev) => [empty, ...prev]);
    setActiveProjectIdState(empty.id);
    setEditingWorkspace(true);
    setActiveSection('modpacks');
    addLog('info', 'Projects', `Utworzono pusty modpack "${empty.name}"`);
    showToast(`Utworzono pusty modpack "${empty.name}"`);
  };

  const handleApplyAutoFix = async (fix: ValidationAutoFix) => {
    if (!activeProject) return;

    if (fix.type === 'update_loader_version' && fix.recommendedValue) {
      handleUpdateProject({ ...activeProject, loaderVersion: fix.recommendedValue });
      showToast(`Zaktualizowano wersję loadera do ${fix.recommendedValue}`);
      return;
    }

    if (fix.type === 'remove_mod' && fix.targetId) {
      handleUpdateProject({
        ...activeProject,
        mods: activeProject.mods.filter(
          (m) => m.id.toLowerCase() !== fix.targetId!.toLowerCase()
        ),
      });
      showToast(`Usunięto kolidujący mod: ${fix.targetName || fix.targetId}`);
      return;
    }

    if ((fix.type === 'add_mod' || fix.type === 'enable_shader_mod') && fix.targetId) {
      const seed: ModItem = {
        id: fix.targetId,
        name: fix.targetName || fix.targetId,
        category: fix.type === 'enable_shader_mod' ? 'graphics' : 'library',
        description: 'Dodano automatycznie przez Walidator',
        enabled: true,
        isAutoAdded: true,
      };
      const res = await fetch('/api/resolve-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mods: [...activeProject.mods, seed],
          loader: activeProject.loader,
          mcVersion: activeProject.mcVersion,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        handleUpdateProject({ ...activeProject, mods: data.mods });
        showToast(`Naprawiono: dodano ${fix.targetName || fix.targetId}`);
        addLog('info', 'Validator', `Auto-Fix dodał ${fix.targetName || fix.targetId}`);
      }
    }
  };

  const handleExportProject = async (target: ModpackProject | null = activeProject) => {
    if (!target) return;

    setIsExporting(true);
    const task = downloadManager.createTask({
      fileName: `${target.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-${target.version || '1.0.0'}.mrpack`,
      itemType: 'mrpack',
    });

    try {
      // 1. Validate first
      downloadManager.updateTask(task.id, { status: 'verifying', progress: 10 });
      const report = await runValidation(target);
      if (report && report.overallStatus === 'ERROR') {
        const firstErr = report.items.find((i) => i.status === 'ERROR');
        throw new Error(firstErr?.message || 'Walidacja wykryła błędy krytyczne blokujące eksport.');
      }

      // 2. Build & validate ZIP archive
      const { blob, report: resolveReport } = await generateMrpackBlob(target, (_msg, pct) => {
        downloadManager.updateTask(task.id, {
          status: 'downloading',
          progress: pct || 50,
        });
      });

      const fileName = downloadMrpack(target, blob);
      downloadManager.updateTask(task.id, {
        fileName,
        status: 'completed',
        progress: 100,
        totalBytes: blob.size,
        downloadedBytes: blob.size,
      });

      addLog(
        'info',
        'Export',
        `Wyeksportowano ${fileName} (${resolveReport.resolvedCount} modów zweryfikowanych)`
      );
      showToast(`Pobrano zweryfikowany plik ${fileName}!`);
    } catch (err: any) {
      downloadManager.updateTask(task.id, {
        status: 'failed',
        error: err?.message || 'Błąd eksportu .mrpack',
      });
      addLog('error', 'Export', `Błąd eksportu: ${err?.message}`);
      showToast(`Eksport wstrzymany: ${err?.message || 'Błąd walidacji'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNavigate = (section: NavSection) => {
    setActiveSection(section);
    if (section !== 'modpacks') {
      setEditingWorkspace(false);
    }
    setMobileMenuOpen(false);
  };

  const handleCreateManualBackup = (title?: string) => {
    if (!activeProject) return;
    const bak = createConfigBackup(activeProject, 'manual', title);
    setBackups(loadBackups());
    addLog('info', 'Backup', `Utworzono kopię zapasową: ${bak.title}`);
    showToast(`Utworzono kopię bezpieczeństwa (${bak.timestamp})`);
  };

  const handleRestoreBackup = (backup: ConfigBackup) => {
    if (!activeProject) return;
    handleUpdateProject({
      ...activeProject,
      configs: JSON.parse(JSON.stringify(backup.configs)),
    });
    addLog('info', 'Backup', `Przywrócono konfiguracje z kopii "${backup.title}"`);
    showToast(`Przywrócono ${backup.configs.length} plików konfiguracyjnych!`);
  };

  const handleCreateVersion = (versionNum: string, changelog: string[]) => {
    if (!activeProject) return;
    const newVer: ModpackVersion = {
      versionNumber: versionNum,
      releasedAt: new Date().toLocaleDateString('pl-PL'),
      changelog,
      modsCount: activeProject.mods.length,
      configsCount: activeProject.configs.length,
      snapshotState: {
        mods: JSON.parse(JSON.stringify(activeProject.mods)),
        configs: JSON.parse(JSON.stringify(activeProject.configs)),
        shaders: JSON.parse(JSON.stringify(activeProject.shaders || [])),
        resourcePacks: JSON.parse(JSON.stringify(activeProject.resourcePacks || [])),
        datapacks: JSON.parse(JSON.stringify(activeProject.datapacks || [])),
        loader: activeProject.loader,
        loaderVersion: activeProject.loaderVersion,
        mcVersion: activeProject.mcVersion,
      },
    };
    handleUpdateProject({
      ...activeProject,
      version: versionNum,
      changelog,
      versions: [newVer, ...activeProject.versions],
    });
    addLog('info', 'Versions', `Wydano wersję v${versionNum} dla "${activeProject.name}"`);
    showToast(`Wydano wersję v${versionNum}!`);
  };

  const handleRestoreVersion = (ver: ModpackVersion) => {
    if (!activeProject) return;
    createConfigBackup(activeProject, 'manual', `Przed przełączeniem na v${ver.versionNumber}`);
    setBackups(loadBackups());
    handleUpdateProject({
      ...activeProject,
      version: ver.versionNumber,
      changelog: ver.changelog,
      mods: ver.snapshotState.mods,
      configs: ver.snapshotState.configs,
      shaders: ver.snapshotState.shaders || activeProject.shaders,
      resourcePacks: ver.snapshotState.resourcePacks || activeProject.resourcePacks,
      datapacks: ver.snapshotState.datapacks || activeProject.datapacks,
      loader: ver.snapshotState.loader,
      loaderVersion: ver.snapshotState.loaderVersion,
      mcVersion: ver.snapshotState.mcVersion,
    });
    showToast(`Przywrócono wersję v${ver.versionNumber}`);
  };

  const activeDownloadsCount = downloadTasks.filter(
    (t) => t.status === 'downloading' || t.status === 'queued' || t.status === 'verifying'
  ).length;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <AppSidebar
          activeSection={activeSection}
          onNavigate={handleNavigate}
          activeProject={activeProject}
          activeDownloadsCount={activeDownloadsCount}
          language={settings.language}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="relative z-10 flex">
            <AppSidebar
              activeSection={activeSection}
              onNavigate={handleNavigate}
              activeProject={activeProject}
              activeDownloadsCount={activeDownloadsCount}
              language={settings.language}
            />
          </div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          activeProject={activeProject}
          projects={projects}
          onSelectProject={handleSelectProject}
          validationReport={validationReport}
          isValidating={isValidating}
          isExporting={isExporting}
          onValidate={() => runValidation(activeProject)}
          onExportMrpack={() => handleExportProject(activeProject)}
          onOpenShare={() => setIsShareModalOpen(true)}
          onOpenGuide={() => setIsGuideModalOpen(true)}
          theme={settings.theme}
          onToggleTheme={() =>
            setSettings((prev) => ({
              ...prev,
              theme: prev.theme === 'dark' ? 'light' : 'dark',
            }))
          }
          language={settings.language}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto overflow-y-auto">
          {activeSection === 'home' && (
            <HomeView
              projects={projects}
              logs={logs}
              language={settings.language}
              onNavigate={handleNavigate}
              onOpenProject={handleOpenProjectWorkspace}
              onExportProject={(p) => handleExportProject(p)}
              onCreateEmptyQuick={handleCreateEmptyQuick}
            />
          )}

          {activeSection === 'create' && (
            <CreateModpackWizard
              onProjectCreated={(newProj, exportNow) => {
                setProjects((prev) => [newProj, ...prev]);
                setActiveProjectIdState(newProj.id);
                setEditingWorkspace(true);
                setActiveSection('modpacks');
                showToast(`Utworzono projekt "${newProj.name}"!`);
                if (exportNow) {
                  handleExportProject(newProj);
                }
              }}
            />
          )}

          {activeSection === 'modpacks' && !editingWorkspace && (
            <MyModpacksView
              projects={projects}
              activeProjectId={activeProjectIdState}
              onOpenProject={handleOpenProjectWorkspace}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onRenameProject={handleRenameProject}
              onExportProject={(p) => handleExportProject(p)}
              onNavigate={handleNavigate}
              onCreateEmpty={handleCreateEmptyQuick}
            />
          )}

          {activeSection === 'modpacks' && editingWorkspace && activeProject && (
            <ProjectWorkspaceView
              project={activeProject}
              validationReport={validationReport}
              isValidating={isValidating}
              backups={backups}
              onBackToList={() => setEditingWorkspace(false)}
              onUpdateProject={handleUpdateProject}
              onRunValidation={() => runValidation(activeProject)}
              onApplyAutoFix={handleApplyAutoFix}
              onExportMrpack={() => handleExportProject(activeProject)}
              onOpenShare={() => setIsShareModalOpen(true)}
              onNavigate={handleNavigate}
              onCreateManualBackup={handleCreateManualBackup}
              onRestoreBackup={handleRestoreBackup}
              onRefreshBackups={setBackups}
              onCreateVersion={handleCreateVersion}
              onRestoreVersion={handleRestoreVersion}
            />
          )}

          {activeSection === 'mods' && (
            <ModrinthBrowserView
              mode="mod"
              activeProject={activeProject}
              onUpdateProject={handleUpdateProject}
              onNotify={showToast}
            />
          )}

          {activeSection === 'shaders' && (
            <ModrinthBrowserView
              mode="shader"
              activeProject={activeProject}
              onUpdateProject={handleUpdateProject}
              onNotify={showToast}
            />
          )}

          {activeSection === 'resourcepacks' && (
            <ModrinthBrowserView
              mode="resourcepack"
              activeProject={activeProject}
              onUpdateProject={handleUpdateProject}
              onNotify={showToast}
            />
          )}

          {activeSection === 'datapacks' && (
            <ModrinthBrowserView
              mode="datapack"
              activeProject={activeProject}
              onUpdateProject={handleUpdateProject}
              onNotify={showToast}
            />
          )}

          {activeSection === 'quests' && (
            <QuestDesignerView
              activeProject={activeProject}
              onUpdateProject={handleUpdateProject}
              onNotify={showToast}
            />
          )}

          {activeSection === 'downloads' && <DownloadsView tasks={downloadTasks} />}

          {activeSection === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={setSettings}
              projects={projects}
              onImportProjects={(imported) => {
                setProjects((prev) => [...imported, ...prev]);
                addLog('info', 'Settings', `Zaimportowano ${imported.length} projektów z kopii JSON`);
              }}
              logs={logs}
              onNotify={showToast}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono rounded-xl shadow-2xl">
          <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-500 hover:text-zinc-200 ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Share & Installation Guide Modals */}
      {activeProject && (
        <>
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            modpack={activeProject}
          />
          <InstallationGuideModal
            isOpen={isGuideModalOpen}
            onClose={() => setIsGuideModalOpen(false)}
            loader={activeProject.loader}
            mcVersion={activeProject.mcVersion}
          />
        </>
      )}
    </div>
  );
}
