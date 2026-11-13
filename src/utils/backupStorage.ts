import { ConfigBackup, ConfigFile, ModpackData } from '../types/modpack';

const BACKUPS_STORAGE_KEY = 'craftpack_config_backups';
const MAX_BACKUPS = 20;

export function loadBackups(): ConfigBackup[] {
  try {
    const raw = localStorage.getItem(BACKUPS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse backups from localStorage:', e);
    return [];
  }
}

export function saveBackups(backups: ConfigBackup[]): void {
  try {
    // Keep max recent backups
    const trimmed = backups.slice(0, MAX_BACKUPS);
    localStorage.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save backups to localStorage:', e);
  }
}

export function createConfigBackup(
  pack: ModpackData,
  trigger: 'app_launch' | 'manual' | 'pre_generation' | 'restore',
  customTitle?: string
): ConfigBackup {
  const existing = loadBackups();
  const date = new Date();
  const timestampStr = date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  let defaultTitle = `Auto-Kopia: Uruchomienie aplikacji (${pack.name})`;
  if (trigger === 'manual') defaultTitle = customTitle || `Ręczna migawka konfiguracji (${pack.name})`;
  if (trigger === 'pre_generation') defaultTitle = `Kopia bezpieczeństwa przed generowaniem AI (${pack.name})`;
  if (trigger === 'restore') defaultTitle = `Migawka przed przywróceniem konfiguracji`;

  const newBackup: ConfigBackup = {
    id: 'bak_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: timestampStr,
    title: customTitle || defaultTitle,
    trigger,
    packName: pack.name,
    modsCount: pack.mods.length,
    configs: JSON.parse(JSON.stringify(pack.configs))
  };

  // Add to top of list
  const updated = [newBackup, ...existing];
  saveBackups(updated);
  return newBackup;
}

export function deleteBackup(backupId: string): ConfigBackup[] {
  const existing = loadBackups();
  const filtered = existing.filter(b => b.id !== backupId);
  saveBackups(filtered);
  return filtered;
}

export function exportBackupsAsJson(): void {
  const backups = loadBackups();
  const blob = new Blob([JSON.stringify(backups, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `craftpack-backups-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
