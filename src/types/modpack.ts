export type ModLoader = 'fabric' | 'forge' | 'neoforge' | 'quilt';
export type MinecraftVersion = string;

export type ModCategory =
  | 'optimization'
  | 'graphics'
  | 'library'
  | 'utility'
  | 'gameplay'
  | 'technology'
  | 'magic'
  | 'adventure'
  | 'worldgen';

export type ValidationStatus = 'PASS' | 'WARNING' | 'ERROR';

export type NavSection =
  | 'home'
  | 'create'
  | 'modpacks'
  | 'mods'
  | 'shaders'
  | 'resourcepacks'
  | 'datapacks'
  | 'quests'
  | 'downloads'
  | 'settings';

export interface ModDependencyRef {
  projectId: string;
  versionId?: string;
  slug?: string;
  name?: string;
  dependencyType: 'required' | 'optional' | 'incompatible' | 'embedded';
}

export interface ModItem {
  id: string; // Modrinth slug
  projectId?: string;
  versionId?: string;
  name: string;
  category: ModCategory;
  description: string;
  reason?: string;
  isCore?: boolean;
  isAutoAdded?: boolean;
  locked?: boolean;
  loaders?: ModLoader[];
  versions?: string[];
  conflicts?: string[];
  dependencies?: string[];
  resolvedDependencies?: ModDependencyRef[];
  requiredBy?: string[];
  enabled?: boolean;
  version?: string;
  author?: string;
  iconUrl?: string;
  downloads?: number;
  modrinthUrl?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileSizeBytes?: number;
  hashes?: {
    sha1: string;
    sha512: string;
  };
  environment?: 'client' | 'server' | 'both' | 'unknown';
  compatibilityStatus?: 'compatible' | 'warning' | 'incompatible' | 'unverified';
  compatibilityNote?: string;
  alternatives?: Array<{ id: string; name: string; reason: string }>;
}

export interface AddonItem {
  id: string; // Modrinth slug
  projectId: string;
  type: 'shader' | 'resourcepack' | 'datapack';
  name: string;
  description: string;
  author: string;
  iconUrl?: string;
  galleryUrls?: string[];
  downloads?: number;
  versionId?: string;
  versionNumber?: string;
  fileName?: string;
  fileSizeBytes?: number;
  downloadUrl?: string;
  hashes?: {
    sha1: string;
    sha512: string;
  };
  supportedVersions?: string[];
  supportedLoaders?: string[];
  modrinthUrl?: string;
  enabled: boolean;
}

export interface ConfigFile {
  path: string; // e.g. "config/sodium-options.json"
  content: string;
  description: string;
  lastModified?: string;
}

export interface QuestObjective {
  id: string;
  type: 'item' | 'kill' | 'dimension' | 'advancement' | 'checkmark';
  title: string;
  target: string; // e.g. "create:mechanical_press" or "minecraft:diamond"
  count: number;
  modId: string;
}

export interface QuestReward {
  id: string;
  type: 'item' | 'xp' | 'loot';
  title: string;
  item?: string;
  count?: number;
  xp?: number;
}

export interface QuestNode {
  id: string;
  title: string;
  description: string;
  isSideQuest: boolean;
  iconItem: string;
  modId: string;
  dependencies: string[];
  objectives: QuestObjective[];
  rewards: QuestReward[];
  x: number;
  y: number;
}

export interface QuestChapter {
  id: string;
  title: string;
  subtitle: string;
  iconItem: string;
  order: number;
  quests: QuestNode[];
}

export interface QuestLine {
  id: string;
  title: string;
  storyPremise: string;
  generatedAt: string;
  ftbQuestsCompatible: boolean;
  ftbCompatibilityNote: string;
  chapters: QuestChapter[];
}

export interface ModpackVersion {
  versionNumber: string;
  releasedAt: string;
  changelog: string[];
  modsCount: number;
  configsCount: number;
  snapshotState: {
    mods: ModItem[];
    configs: ConfigFile[];
    shaders?: AddonItem[];
    resourcePacks?: AddonItem[];
    datapacks?: AddonItem[];
    loader: ModLoader;
    loaderVersion?: string;
    mcVersion: MinecraftVersion;
  };
}

export interface ConfigBackup {
  id: string;
  timestamp: string;
  title: string;
  trigger: 'app_launch' | 'manual' | 'pre_generation' | 'restore';
  configs: ConfigFile[];
  modsCount: number;
  packName: string;
}

export interface ModpackCreationSettings {
  javaVersion: '17' | '21' | '22';
  gameplayType: 'survival_plus' | 'rpg' | 'tech' | 'magic' | 'exploration' | 'hardcore' | 'creative' | 'lightweight';
  difficulty: 'casual' | 'balanced' | 'hard' | 'expert';
  visualStyle: 'vanilla' | 'enhanced' | 'cinematic_shaders' | 'atmospheric';
  performanceProfile: 'potato_max_fps' | 'balanced' | 'high_quality';
  targetRam: '4GB' | '6GB' | '8GB' | '12GB';
  playMode: 'singleplayer' | 'multiplayer_server' | 'lan_friends';
  includeShaders: boolean;
}

export interface ModpackData {
  id?: string;
  name: string;
  summary: string;
  version: string;
  author: string;
  loader: ModLoader;
  loaderVersion?: string;
  mcVersion: MinecraftVersion;
  recommendedMemory: string;
  shaderAdvice: string;
  mods: ModItem[];
  shaders?: AddonItem[];
  resourcePacks?: AddonItem[];
  datapacks?: AddonItem[];
  configs: ConfigFile[];
  changelog: string[];
  questLine?: QuestLine | null;
  creationSettings?: ModpackCreationSettings;
}

export interface ModpackProject extends ModpackData {
  id: string;
  coverAccent: 'emerald' | 'sky' | 'amber' | 'violet' | 'rose';
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  validationStatus?: ValidationStatus;
  versions: ModpackVersion[];
}

export interface ValidationAutoFix {
  type: 'add_mod' | 'remove_mod' | 'update_loader_version' | 'switch_alternative' | 'enable_shader_mod';
  label: string;
  targetId?: string;
  targetName?: string;
  recommendedValue?: string;
}

export interface ValidationCheckItem {
  id: string;
  category: 'minecraft' | 'loader' | 'compatibility' | 'dependencies' | 'files' | 'duplicates' | 'metadata' | 'manifest' | 'addons';
  status: ValidationStatus;
  title: string;
  message: string;
  affectedModId?: string;
  affectedModName?: string;
  proposedFix?: string;
  autoFix?: ValidationAutoFix;
}

export interface ValidationReport {
  overallStatus: ValidationStatus;
  canExport: boolean;
  checkedAt: string;
  mcVersion: string;
  loader: ModLoader;
  loaderVersion: string;
  recommendedLoaderVersion?: string;
  items: ValidationCheckItem[];
  summary: {
    passCount: number;
    warningCount: number;
    errorCount: number;
  };
  aiInsights?: string;
}

export interface ConflictIssue {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoFixModId?: string;
  action?: string;
}

export interface CompatibilityReport {
  status: 'ok' | 'warning' | 'error';
  totalMods: number;
  loader: ModLoader;
  mcVersion: MinecraftVersion;
  issues: ConflictIssue[];
  aiInsights?: string;
}

export interface DownloadTask {
  id: string;
  fileName: string;
  itemType: 'mod' | 'shader' | 'resourcepack' | 'datapack' | 'mrpack' | 'metadata';
  progress: number; // 0-100
  speedBytesPerSec: number;
  totalBytes: number;
  downloadedBytes: number;
  status: 'queued' | 'downloading' | 'verifying' | 'completed' | 'failed';
  error?: string;
  retries: number;
  url?: string;
  sha1?: string;
  createdAt: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  language: 'pl' | 'en';
  projectFolder: string;
  exportFolder: string;
  downloadConcurrency: number;
  maxRetries: number;
  verifySha: boolean;
  preferReleaseVersions: boolean;
  aiTone: 'balanced' | 'performance' | 'content_rich';
}

export interface AppLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
}
