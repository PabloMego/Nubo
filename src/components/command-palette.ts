import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { SearchResult } from '../scripts/types';
import { t } from '../scripts/i18n';

export class CommandPalette {
  private backdrop: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private debounceTimer: any = null;

  constructor() {
    this.createDom();
    this.bindEvents();
  }

  private createDom() {
    const el = document.createElement('div');
    el.id = 'command-palette';
    el.className = 'command-palette-backdrop';
    el.innerHTML = `
      <div class="command-palette-window">
        <div class="command-palette-search">
          ${icons.search(18)}
          <input 
            type="text" 
            class="command-palette-input" 
            placeholder="${t('cmd.placeholder')}" 
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <div class="command-palette-results">
          <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
            ${t('cmd.typeToSearch')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    this.backdrop = el;
    this.input = el.querySelector('.command-palette-input');
    this.resultsContainer = el.querySelector('.command-palette-results');
  }

  private bindEvents() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.open();
      }
      if (e.key === 'Escape' && this.backdrop?.classList.contains('open')) {
        this.close();
      }
    });

    this.backdrop?.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    this.input?.addEventListener('input', () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.handleSearch();
      }, 150);
    });
  }

  public open() {
    this.backdrop?.classList.add('open');
    if (this.input) {
      this.input.placeholder = t('cmd.placeholder');
      this.input.value = '';
      this.input.focus();
    }
    this.handleSearch();
  }

  public close() {
    this.backdrop?.classList.remove('open');
  }

  private async handleSearch() {
    if (!this.input || !this.resultsContainer) return;
    const query = this.input.value.trim();

    if (!query) {
      this.resultsContainer.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
          ${t('cmd.typeToSearch')}
        </div>
      `;
      return;
    }

    const state = appStore.getState();
    const currentProjectId = state.currentProject?.id;
    const results = await window.nubo.search.query(query, currentProjectId);

    if (results.length === 0) {
      this.resultsContainer.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
          ${t('cmd.noResults', { query })}
        </div>
      `;
      return;
    }

    this.resultsContainer.innerHTML = results.map((r, index) => {
      let iconSvg = icons.file(16);
      if (r.type === 'project') iconSvg = icons.cloud(16);
      if (r.type === 'task') iconSvg = icons.check(16);
      if (r.type === 'note') iconSvg = icons.fileText(16);
      if (r.type === 'marketing') iconSvg = icons.target(16);
      if (r.type === 'file') iconSvg = icons.folder(16);

      return `
        <div class="command-item ${index === 0 ? 'selected' : ''}" data-index="${index}">
          <div class="command-item-icon">${iconSvg}</div>
          <div class="command-item-content">
            <span class="command-item-title">${r.title}</span>
            <span class="command-item-subtitle">${r.subtitle}</span>
          </div>
        </div>
      `;
    }).join('');

    const items = this.resultsContainer.querySelectorAll('.command-item');
    items.forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectResult(results[index]);
      });
    });
  }

  private async selectResult(item: SearchResult) {
    this.close();
    const state = appStore.getState();

    if (item.type === 'project') {
      const proj = state.projects.find(p => p.id === item.projectId);
      if (proj) {
        appStore.setCurrentProject(proj);
        appStore.setActiveSection('overview');
      }
    } else if (item.projectId) {
      const proj = state.projects.find(p => p.id === item.projectId);
      if (proj) {
        appStore.setCurrentProject(proj);
        if (item.actionPayload?.section) {
          appStore.setActiveSection(item.actionPayload.section);
        }
      }
    }
  }
}
