export type AppLanguage = 'pl' | 'en';

export const UI_LABELS: Record<AppLanguage, Record<string, string>> = {
  pl: {
    nav_home: 'Home',
    nav_create: 'Kreator Paczki',
    nav_modpacks: 'Moje Paczki',
    nav_mods: 'Przeglądarka Modów',
    nav_shaders: 'Shadery',
    nav_resourcepacks: 'Resource Packi',
    nav_datapacks: 'Datapacki',
    nav_quests: 'Quest Designer',
    nav_downloads: 'Pobieranie',
    nav_settings: 'Ustawienia',
    create_new_modpack: 'UTWÓRZ NOWY MODPACK',
    export_mrpack: 'Eksportuj .mrpack',
    validate_pack: 'Waliduj paczkę',
    share_pack: 'Udostępnij',
    install_guide: 'Instrukcja',
  },
  en: {
    nav_home: 'Home',
    nav_create: 'Create Modpack',
    nav_modpacks: 'My Modpacks',
    nav_mods: 'Mod Browser',
    nav_shaders: 'Shaders',
    nav_resourcepacks: 'Resource Packs',
    nav_datapacks: 'Datapacks',
    nav_quests: 'Quest Designer',
    nav_downloads: 'Downloads',
    nav_settings: 'Settings',
    create_new_modpack: 'CREATE NEW MODPACK',
    export_mrpack: 'Export .mrpack',
    validate_pack: 'Validate Pack',
    share_pack: 'Share',
    install_guide: 'Install Guide',
  },
};

export function t(lang: AppLanguage, key: string): string {
  return UI_LABELS[lang]?.[key] || UI_LABELS.pl[key] || key;
}
