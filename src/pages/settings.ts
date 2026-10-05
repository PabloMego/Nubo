import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { showToast } from '../components/toast';
import { AppSettings } from '../scripts/types';
import { t, getLanguage } from '../scripts/i18n';

export class SettingsPage {
  public static async render(container: HTMLElement): Promise<void> {
    const settings: AppSettings = await window.nubo.settings.get();
    const currentProj = appStore.getState().currentProject;
    const currentLang = getLanguage();

    container.innerHTML = `
      <div class="app-page-hero">
        <div class="page-hero-left">
          <div class="page-title-row">
            <h2>${t('settings.title')}</h2>
            <span class="page-stats-badge">v${settings.version}</span>
            <span class="page-stats-badge"><span class="pulse-dot"></span> Desktop Core</span>
          </div>
          <p class="page-subtitle">${t('settings.subtitle')}</p>
        </div>
      </div>

      <div style="max-width: 760px; display: flex; flex-direction: column; gap: var(--space-lg);">
        <!-- Language Card -->
        <div class="nubo-card">
          <div class="nubo-card-header">
            <div class="nubo-card-icon-bubble" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">
              ${icons.globe(18)}
            </div>
            <div>
              <h3 class="nubo-card-title">${t('settings.language')}</h3>
              <p class="nubo-card-subtitle">${currentLang === 'es' ? 'Selecciona el idioma de visualización de Nubo' : 'Select Nubo interface language'}</p>
            </div>
          </div>

          <div class="form-group" style="margin: 0;">
            <div style="display: flex; gap: 14px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; background: var(--bg-surface); transition: all var(--transition-fast);">
                <input type="radio" name="lang-radio" value="es" ${currentLang === 'es' ? 'checked' : ''} style="cursor: pointer;" />
                <span style="font-weight: 500;">🇪🇸 ${t('settings.langEs')}</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; background: var(--bg-surface); transition: all var(--transition-fast);">
                <input type="radio" name="lang-radio" value="en" ${currentLang === 'en' ? 'checked' : ''} style="cursor: pointer;" />
                <span style="font-weight: 500;">🇬🇧 ${t('settings.langEn')}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- General Section -->
        <div class="nubo-card">
          <div class="nubo-card-header">
            <div class="nubo-card-icon-bubble" style="background: rgba(245, 158, 11, 0.1); color: #d97706;">
              ${icons.folder(18)}
            </div>
            <div>
              <h3 class="nubo-card-title">${t('settings.general')}</h3>
              <p class="nubo-card-subtitle">${currentLang === 'es' ? 'Rutas de almacenamiento en disco y comportamiento' : 'Disk storage directories and startup behavior'}</p>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: var(--space-md);">
            <label class="form-label">${t('settings.storagePath')}</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="setting-storage-path" value="${settings.storagePath}" style="flex: 1;" readonly />
              <button class="btn btn-secondary" id="btn-browse-storage">
                ${icons.folder(14)}
                <span>${t('settings.browse')}</span>
              </button>
            </div>
            <span class="form-hint" style="margin-top: 4px;">${t('settings.storageHint')}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; padding-top: var(--space-xs); border-top: 1px solid var(--border-subtle);">
            <input type="checkbox" id="setting-start-windows" ${settings.startWithWindows ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;" />
            <label for="setting-start-windows" class="form-label" style="cursor: pointer; margin: 0; font-size: 13px;">${t('settings.startWindows')}</label>
          </div>
        </div>

        <!-- Appearance Section -->
        <div class="nubo-card">
          <div class="nubo-card-header">
            <div class="nubo-card-icon-bubble" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
              ${icons.palette(18)}
            </div>
            <div>
              <h3 class="nubo-card-title">${t('settings.appearance')}</h3>
              <p class="nubo-card-subtitle">${currentLang === 'es' ? 'Adapta la interfaz visual a tu preferencia' : 'Customize interface theme'}</p>
            </div>
          </div>

          <div class="form-group" style="margin: 0;">
            <div style="display: flex; gap: 14px; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; background: var(--bg-surface);">
                <input type="radio" name="theme-radio" value="light" ${settings.theme === 'light' ? 'checked' : ''} style="cursor: pointer;" />
                <span>☀️ ${t('settings.themeLight')}</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; background: var(--bg-surface);">
                <input type="radio" name="theme-radio" value="dark" ${settings.theme === 'dark' ? 'checked' : ''} style="cursor: pointer;" />
                <span>🌙 ${t('settings.themeDark')}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Backups & Import/Export -->
        <div class="nubo-card">
          <div class="nubo-card-header">
            <div class="nubo-card-icon-bubble" style="background: rgba(16, 185, 129, 0.1); color: #059669;">
              ${icons.upload(18)}
            </div>
            <div>
              <h3 class="nubo-card-title">${t('settings.backups')}</h3>
              <p class="nubo-card-subtitle">${t('settings.backupsDesc')}</p>
            </div>
          </div>

          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            ${currentProj ? `
              <button class="btn btn-secondary" id="btn-export-project">
                ${icons.upload(14)}
                <span>${t('settings.exportProject', { name: currentProj.name })}</span>
              </button>
            ` : ''}

            <button class="btn btn-secondary" id="btn-import-project">
              ${icons.plus(14)}
              <span>${t('settings.importProject')}</span>
            </button>
          </div>
        </div>

        <!-- About Section -->
        <div class="nubo-card">
          <div class="nubo-card-header">
            <div class="nubo-card-icon-bubble" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">
              ${icons.info(18)}
            </div>
            <div>
              <h3 class="nubo-card-title">${t('settings.about')}</h3>
              <p class="nubo-card-subtitle">Nubo Desktop v${settings.version} • Local First Architecture</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; font-size: 12.5px; color: var(--text-secondary); background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div><strong>${t('settings.version')}:</strong> v${settings.version}</div>
            <div><strong>${t('settings.platform')}:</strong> Electron + TS + Vite</div>
            <div><strong>${t('settings.database')}:</strong> SQLite (sql.js WASM)</div>
            <div><strong>${t('settings.philosophy')}:</strong> ${t('settings.philosophyDesc')}</div>
          </div>
        </div>
      </div>
    `;

    SettingsPage.bindEvents(container, settings);
  }

  private static bindEvents(container: HTMLElement, settings: AppSettings): void {
    // Language radio change
    container.querySelectorAll('input[name="lang-radio"]').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        const val = (e.target as HTMLInputElement).value as 'es' | 'en';
        await appStore.setLanguage(val);
        showToast(t('settings.toastLang'));
      });
    });

    // Browse storage directory
    container.querySelector('#btn-browse-storage')?.addEventListener('click', async () => {
      const selected = await window.nubo.settings.selectDirectory();
      if (selected) {
        await window.nubo.settings.update({ storagePath: selected });
        const input = container.querySelector('#setting-storage-path') as HTMLInputElement;
        if (input) input.value = selected;
        showToast(t('settings.toastStorage'));
      }
    });

    // Toggle start with windows
    container.querySelector('#setting-start-windows')?.addEventListener('change', async (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      await window.nubo.settings.update({ startWithWindows: checked });
      showToast(checked ? (getLanguage() === 'es' ? 'Inicio automático activado.' : 'Auto-start enabled.') : (getLanguage() === 'es' ? 'Inicio automático desactivado.' : 'Auto-start disabled.'));
    });

    // Theme radio change
    container.querySelectorAll('input[name="theme-radio"]').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        const val = (e.target as HTMLInputElement).value;
        await window.nubo.settings.update({ theme: val });
        if (val === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
        showToast(getLanguage() === 'es' ? `Tema cambiado a ${val}.` : `Theme changed to ${val}.`);
      });
    });

    // Export project
    container.querySelector('#btn-export-project')?.addEventListener('click', async () => {
      const currentProj = appStore.getState().currentProject;
      if (!currentProj) return;

      const res = await window.nubo.backup.export(currentProj.id);
      if (res.success) {
        showToast(getLanguage() === 'es' ? `Proyecto exportado a ${res.filePath}` : `Project exported to ${res.filePath}`);
      }
    });

    // Import project
    container.querySelector('#btn-import-project')?.addEventListener('click', async () => {
      const res = await window.nubo.backup.import();
      if (res.success && res.project) {
        showToast(getLanguage() === 'es' ? `Proyecto "${res.project.name}" importado con éxito.` : `Project "${res.project.name}" imported successfully.`);
        const all = await window.nubo.projects.getAll();
        appStore.setProjects(all);
        appStore.setCurrentProject(res.project);
        appStore.setActiveSection('overview');
      }
    });
  }
}
