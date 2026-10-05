import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { t, getLanguage } from '../scripts/i18n';
import { showToast } from './toast';

export class Header {
  private container: HTMLElement;
  private isMaximized: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    appStore.subscribe(() => this.render());

    if (window.nubo?.window) {
      window.nubo.window.isMaximized().then((max) => {
        this.isMaximized = max;
        this.updateMaximizeIcon();
      });
      window.nubo.window.onMaximizedChange((max) => {
        this.isMaximized = max;
        this.updateMaximizeIcon();
      });
    }

    // Double click on empty draggable header area toggles maximize/restore
    this.container.addEventListener('dblclick', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.header-breadcrumbs') || target.closest('.header-actions') || target.closest('button') || target.closest('a')) {
        return;
      }
      window.nubo?.window?.maximize().then((max) => {
        this.isMaximized = max;
        this.updateMaximizeIcon();
      });
    });
  }

  public render() {
    const state = appStore.getState();
    const currentProj = state.currentProject;
    const sec = state.activeSection;
    const lang = getLanguage();

    let breadcrumbsHtml = '';

    if (sec === 'home') {
      breadcrumbsHtml = `<span class="current">${t('header.home')}</span>`;
    } else if (sec === 'settings') {
      breadcrumbsHtml = `
        <span class="crumb-link" id="crumb-home">${t('header.home')}</span>
        <span class="separator">/</span>
        <span class="current">${t('header.settings')}</span>
      `;
    } else if (currentProj) {
      breadcrumbsHtml = `
        <span class="crumb-link" id="crumb-home">${t('header.home')}</span>
        <span class="separator">/</span>
        <span class="crumb-link" id="crumb-proj">
          ${currentProj.logo ? `<img src="${currentProj.logo}" alt="" class="crumb-proj-logo" />` : ''}
          ${currentProj.name}
        </span>
        <span class="separator">/</span>
        <span class="current">${this.formatSectionTitle(sec)}</span>
      `;
    }

    this.container.innerHTML = `
      <div class="header-breadcrumbs">
        ${breadcrumbsHtml}
      </div>
      <div class="header-actions">
        ${currentProj && sec !== 'home' && sec !== 'settings' ? `
          ${currentProj.website ? `
            <a href="${currentProj.website}" target="_blank" class="btn btn-secondary btn-sm" title="${t('header.openWebsiteTooltip')}">
              ${icons.globe(13)}
              <span>Web</span>
            </a>
          ` : ''}
          ${currentProj.github ? `
            <a href="${currentProj.github.startsWith('http') ? currentProj.github : `https://github.com/${currentProj.github}`}" target="_blank" class="btn btn-secondary btn-sm" title="${t('header.openGithubTooltip')}">
              ${icons.github(13)}
              <span>GitHub</span>
            </a>
          ` : ''}
          <button class="btn btn-ghost btn-sm btn-icon" id="btn-open-proj-folder" title="${t('header.openFolderTooltip')}">
            ${icons.folder(14)}
          </button>
        ` : ''}

        <button class="btn btn-ghost btn-sm" id="btn-header-lang" title="${lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}" style="font-size: 11px; font-weight: 600; padding: 4px 8px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); letter-spacing: 0.5px;">
          ${lang.toUpperCase()}
        </button>

        <!-- Notion-style Integrated Window Controls -->
        <div class="window-controls" id="window-controls">
          <button class="window-control-btn btn-win-minimize" id="btn-win-minimize" title="${lang === 'es' ? 'Minimizar' : 'Minimize'}">
            <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
          <button class="window-control-btn btn-win-maximize" id="btn-win-maximize" title="${this.isMaximized ? (lang === 'es' ? 'Restaurar' : 'Restore') : (lang === 'es' ? 'Maximizar' : 'Maximize')}">
            ${this.getMaximizeSvg()}
          </button>
          <button class="window-control-btn btn-win-close" id="btn-win-close" title="${lang === 'es' ? 'Cerrar' : 'Close'}">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private getMaximizeSvg(): string {
    if (this.isMaximized) {
      return `
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 1.5H8.5V7.5" stroke="currentColor" stroke-width="1"/>
          <rect x="1.5" y="2.5" width="6" height="6" stroke="currentColor" stroke-width="1"/>
        </svg>
      `;
    }
    return `
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <rect x="1" y="1" width="8" height="8" stroke="currentColor" stroke-width="1"/>
      </svg>
    `;
  }

  private updateMaximizeIcon(): void {
    const btn = this.container.querySelector('#btn-win-maximize');
    if (btn) {
      btn.innerHTML = this.getMaximizeSvg();
      const lang = getLanguage();
      btn.setAttribute('title', this.isMaximized ? (lang === 'es' ? 'Restaurar' : 'Restore') : (lang === 'es' ? 'Maximizar' : 'Maximize'));
    }
  }

  private formatSectionTitle(sec: string): string {
    const map: Record<string, string> = {
      overview: t('nav.overview'),
      guide: t('nav.guide'),
      development: t('nav.development'),
      brand: t('nav.brand'),
      website: t('nav.website'),
      marketing: t('nav.marketing'),
      content: t('nav.content'),
      files: t('nav.files'),
      notes: t('nav.notes')
    };
    return map[sec] || sec;
  }

  private bindEvents() {
    this.container.querySelector('#crumb-home')?.addEventListener('click', () => {
      appStore.setActiveSection('home');
    });

    this.container.querySelector('#crumb-proj')?.addEventListener('click', () => {
      appStore.setActiveSection('overview');
    });

    this.container.querySelector('#btn-open-proj-folder')?.addEventListener('click', () => {
      const proj = appStore.getState().currentProject;
      if (proj?.folder_path && window.nubo?.files) {
        window.nubo.files.openContainingFolder(proj.folder_path);
      }
    });

    this.container.querySelector('#btn-header-lang')?.addEventListener('click', async () => {
      const current = getLanguage();
      const nextLang = current === 'es' ? 'en' : 'es';
      await appStore.setLanguage(nextLang);
      showToast(nextLang === 'es' ? 'Idioma cambiado a Español.' : 'Language changed to English.');
    });

    // Window controls actions
    this.container.querySelector('#btn-win-minimize')?.addEventListener('click', (e) => {
      e.stopPropagation();
      window.nubo?.window?.minimize();
    });

    this.container.querySelector('#btn-win-maximize')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (window.nubo?.window) {
        const isMax = await window.nubo.window.maximize();
        this.isMaximized = isMax;
        this.updateMaximizeIcon();
      }
    });

    this.container.querySelector('#btn-win-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      window.nubo?.window?.close();
    });
  }
}
