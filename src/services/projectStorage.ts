import {
  AppSettings,
  ModLoader,
  ModpackData,
  ModpackProject,
  ModpackVersion,
  ValidationStatus,
} from '../types/modpack';
import { INITIAL_DEFAULT_MODPACK, PRESET_PACKS } from '../data/presetPacks';

const PROJECTS_KEY = 'craftpack_projects_v2';
const ACTIVE_PROJECT_ID_KEY = 'craftpack_active_project_id_v2';
const SETTINGS_KEY = 'craftpack_settings_v2';
const LEGACY_PACK_KEY = 'craftpack_current_pack';
const LEGACY_VERSIONS_KEY = 'craftpack_versions_history';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'pl',
  projectFolder: 'CraftPackStudio/Projects',
  exportFolder: 'Downloads/Modpacks',
  downloadConcurrency: 4,
  maxRetries: 3,
  verifySha: true,
  preferReleaseVersions: true,
  aiTone: 'balanced',
};

const COVERS: ModpackProject['coverAccent'][] = ['emerald', 'sky', 'amber', 'violet', 'rose'];

function pickCover(seed: string): ModpackProject['coverAccent'] {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return COVERS[sum % COVERS.length];
}

export function createProjectFromData(
  data: ModpackData,
  options?: { id?: string; validationStatus?: ValidationStatus; versions?: ModpackVersion[] }
): ModpackProject {
  const now = new Date().toISOString();
  const id = options?.id || data.id || `pack_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const initialVersion: ModpackVersion = {
    versionNumber: data.version || '1.0.0',
    releasedAt: new Date().toLocaleDateString('pl-PL'),
    changelog: data.changelog || ['Utworzenie projektu modpacka'],
    modsCount: data.mods.length,
    configsCount: data.configs.length,
    snapshotState: {
      mods: data.mods,
      configs: data.configs,
      shaders: data.shaders || [],
      resourcePacks: data.resourcePacks || [],
      datapacks: data.datapacks || [],
      loader: data.loader,
      loaderVersion: data.loaderVersion,
      mcVersion: data.mcVersion,
    },
  };

  return {
    ...data,
    id,
    shaders: data.shaders || [],
    resourcePacks: data.resourcePacks || [],
    datapacks: data.datapacks || [],
    coverAccent: pickCover(data.name || id),
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    validationStatus: options?.validationStatus,
    versions: options?.versions && options.versions.length > 0 ? options.versions : [initialVersion],
  };
}

export function createEmptyModpack(params: {
  name: string;
  loader: ModLoader;
  mcVersion: string;
  loaderVersion?: string;
  author?: string;
}): ModpackProject {
  return createProjectFromData({
    name: params.name.trim() || 'Nowa Paczka Modów',
    summary: `Pusty modpack bazowy dla Minecraft ${params.mcVersion} (${params.loader.toUpperCase()})`,
    version: '1.0.0',
    author: params.author || 'Gracz',
    loader: params.loader,
    loaderVersion: params.loaderVersion,
    mcVersion: params.mcVersion,
    recommendedMemory: '6GB',
    shaderAdvice: 'Dodaj Iris (Fabric/NeoForge) lub Oculus (Forge), aby korzystać z shaderów.',
    mods: [],
    shaders: [],
    resourcePacks: [],
    datapacks: [],
    configs: [
      {
        path: 'config/craftpack-tuning.json',
        content: JSON.stringify(
          {
            packName: params.name,
            loader: params.loader,
            mcVersion: params.mcVersion,
            allocatedRam: '6GB',
          },
          null,
          2
        ),
        description: 'Podstawowy profil techniczny modpacka',
      },
    ],
    changelog: ['Inicjalizacja pustego projektu modpacka'],
  });
}

export function loadProjects(): ModpackProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Migrate legacy pack if present
    const legacyRaw = localStorage.getItem(LEGACY_PACK_KEY);
    if (legacyRaw) {
      const legacyPack = JSON.parse(legacyRaw) as ModpackData;
      let legacyVersions: ModpackVersion[] = [];
      try {
        const vRaw = localStorage.getItem(LEGACY_VERSIONS_KEY);
        if (vRaw) legacyVersions = JSON.parse(vRaw);
      } catch {
        // ignore
      }
      const migrated = createProjectFromData(legacyPack, { versions: legacyVersions });
      const starterPresets = PRESET_PACKS.slice(1).map((p, idx) =>
        createProjectFromData(p, { id: `preset_${idx + 1}` })
      );
      const initial = [migrated, ...starterPresets];
      saveProjects(initial);
      return initial;
    }

    // Seed with curated preset projects on first visit
    const seeded = PRESET_PACKS.map((p, idx) =>
      createProjectFromData(p, { id: idx === 0 ? 'preset_default' : `preset_${idx}` })
    );
    saveProjects(seeded);
    return seeded;
  } catch {
    return [createProjectFromData(INITIAL_DEFAULT_MODPACK, { id: 'preset_default' })];
  }
}

export function saveProjects(projects: ModpackProject[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects:', e);
  }
}

export function getActiveProjectId(projects: ModpackProject[]): string {
  try {
    const saved = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    if (saved && projects.some((p) => p.id === saved)) return saved;
  } catch {
    // ignore
  }
  return projects[0]?.id || '';
}

export function setActiveProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
  } catch {
    // ignore
  }
}

export function duplicateProjectRecord(project: ModpackProject): ModpackProject {
  const now = new Date().toISOString();
  return {
    ...JSON.parse(JSON.stringify(project)),
    id: `pack_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${project.name} (Kopia)`,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function exportAllProjectsBackup(projects: ModpackProject[]): string {
  const payload = {
    format: 'craftpack-studio-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    projects,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseProjectsBackupJson(jsonText: string): ModpackProject[] {
  const parsed = JSON.parse(jsonText);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.projects)) return parsed.projects;
  throw new Error('Nieprawidłowy format pliku kopii zapasowej projektów.');
}
