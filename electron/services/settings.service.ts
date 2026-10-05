import path from 'path';
import fs from 'fs';
import { app, shell } from 'electron';
import { DatabaseService } from './database.service';

export interface GitHubAccount {
  token: string;
  username: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  connected_at: string;
}

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
  githubAccount?: GitHubAccount | null;
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
      configuredEditor,
      githubAccount: this.getGitHubAccount()
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

  public getGitHubAccount(): GitHubAccount | null {
    const db = this.dbService.getAdapter();
    if (!db) return null;
    try {
      const row = db.get<{ key: string; value: string }>('SELECT value FROM settings WHERE key = ?', ['github_account']);
      if (row && row.value) {
        return JSON.parse(row.value) as GitHubAccount;
      }
    } catch (e) {
      console.warn('[SettingsService] Error reading github_account from db:', e);
    }
    return null;
  }

  public setGitHubAccount(account: GitHubAccount | null): void {
    const db = this.dbService.getAdapter();
    if (!db) return;
    try {
      if (account) {
        this.updateSetting('github_account', JSON.stringify(account));
      } else {
        db.run('DELETE FROM settings WHERE key = ?', ['github_account']);
      }
    } catch (e) {
      console.warn('[SettingsService] Error updating github_account in db:', e);
    }
  }

  public async verifyAndConnectGitHub(token: string): Promise<{ success: boolean; account?: GitHubAccount; message?: string }> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, message: 'El token de GitHub no puede estar vacío.' };
    }

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Nubo-Desktop-App'
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          return { success: false, message: 'Token no válido o expirado. Asegúrate de que tenga permisos marcados de "repo".' };
        }
        return { success: false, message: `Error de GitHub (${res.status}): ${res.statusText}` };
      }

      const user = await res.json();

      let email = user.email || '';
      if (!email) {
        try {
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `Bearer ${cleanToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Nubo-Desktop-App'
            }
          });
          if (emailsRes.ok) {
            const emails = await emailsRes.json();
            if (Array.isArray(emails) && emails.length > 0) {
              const primary = emails.find((e: any) => e.primary) || emails[0];
              email = primary.email || '';
            }
          }
        } catch {
          // ignore email fetch fallback
        }
      }

      const account: GitHubAccount = {
        token: cleanToken,
        username: user.login,
        name: user.name || user.login,
        email: email || `${user.login}@users.noreply.github.com`,
        avatar_url: user.avatar_url || '',
        connected_at: new Date().toISOString()
      };

      this.setGitHubAccount(account);
      return { success: true, account };
    } catch (err: any) {
      return { success: false, message: `No se pudo conectar con GitHub: ${err.message || err}` };
    }
  }

  public disconnectGitHub(): { success: boolean } {
    this.setGitHubAccount(null);
    return { success: true };
  }

  public async openTokenGenerator(): Promise<boolean> {
    const url = 'https://github.com/settings/tokens/new?description=Nubo%20Desktop&scopes=repo,read:user,user:email';
    await shell.openExternal(url);
    return true;
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
