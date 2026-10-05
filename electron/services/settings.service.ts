import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { DatabaseService } from './database.service';

export interface ConfiguredEditor {
  id: string;
  name: string;
  command: string;
}

export interface AppSettings {
  storagePath: string;
  theme: 'system' | 'light' | 'dark';
  sidebarCollapsed: boolean;
  startWithWindows: boolean;
  onboardingCompleted: boolean;
  language: 'es' | 'en';
  version: string;
  configuredEditor: ConfiguredEditor;
}

export class SettingsService {
  private static instance: SettingsService;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  public getDefaultStoragePath(): string {
    const documentsPath = app ? app.getPath('documents') : path.join(process.cwd(), 'NuboProjects');
    const defaultFolder = path.join(documentsPath, 'Nubo Projects');
    if (!fs.existsSync(defaultFolder)) {
      try {
        fs.mkdirSync(defaultFolder, { recursive: true });
      } catch (e) {
        console.error('Could not create default Nubo Projects directory:', e);
      }
    }
    return defaultFolder;
  }

  public getSettings(): AppSettings {
    const db = this.dbService.getAdapter();
    const map = new Map<string, string>();
    if (db) {
      try {
        const rows = db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
        for (const r of rows) {
          map.set(r.key, r.value);
        }
      } catch (e) {
        console.warn('Could not read settings from db:', e);
      }
    }

    const defaultStorage = this.getDefaultStoragePath();
    const storagePath = map.get('storage_path') || defaultStorage;
    const theme = (map.get('theme') as any) || 'light';
    const sidebarCollapsed = map.get('sidebar_collapsed') === 'true';
    const startWithWindows = map.get('start_with_windows') === 'true';
    const onboardingCompleted = map.get('onboarding_completed') === 'true';
    const language = (map.get('language') as any) || 'es';

    let configuredEditor: ConfiguredEditor = {
      id: 'antigravity',
      name: 'Antigravity IDE',
      command: 'antigravity-ide'
    };

    const editorStr = map.get('configured_editor');
    if (editorStr) {
      try {
        configuredEditor = JSON.parse(editorStr);
        if (configuredEditor.id === 'antigravity' || configuredEditor.command === 'agy' || configuredEditor.command === 'antigravity') {
          configuredEditor.command = 'antigravity-ide';
          configuredEditor.name = 'Antigravity IDE';
        }
      } catch {
        // fallback
      }
    }

    return {
      storagePath,
      theme,
      sidebarCollapsed,
      startWithWindows,
      onboardingCompleted,
      language,
      version: app ? app.getVersion() : '1.0.0',
      configuredEditor
    };
  }

  public updateSetting(key: string, value: string): void {
    const db = this.dbService.getAdapter();
    if (!db) return;
    try {
      db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value]
      );
    } catch (e) {
      console.warn('Could not update setting in db:', e);
    }
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    if (partial.storagePath !== undefined) {
      if (!fs.existsSync(partial.storagePath)) {
        fs.mkdirSync(partial.storagePath, { recursive: true });
      }
      this.updateSetting('storage_path', partial.storagePath);
    }
    if (partial.theme !== undefined) {
      this.updateSetting('theme', partial.theme);
    }
    if (partial.language !== undefined) {
      this.updateSetting('language', partial.language);
    }
    if (partial.sidebarCollapsed !== undefined) {
      this.updateSetting('sidebar_collapsed', String(partial.sidebarCollapsed));
    }
    if (partial.onboardingCompleted !== undefined) {
      this.updateSetting('onboarding_completed', String(partial.onboardingCompleted));
    }
    if (partial.configuredEditor !== undefined) {
      this.updateSetting('configured_editor', JSON.stringify(partial.configuredEditor));
    }
    if (partial.startWithWindows !== undefined) {
      this.updateSetting('start_with_windows', String(partial.startWithWindows));
      if (app) {
        app.setLoginItemSettings({
          openAtLogin: partial.startWithWindows
        });
      }
    }
    return this.getSettings();
  }
}
