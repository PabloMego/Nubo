import { icons } from '../scripts/icons';
import { appStore, AppSection } from '../scripts/store';
import { modalManager } from './modal';
import { t } from '../scripts/i18n';

export class Sidebar {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    appStore.subscribe(() => this.render());
  }

  public render() {
    const state = appStore.getState();
    const isCollapsed = state.sidebarCollapsed;
    const currentProj = state.currentProject;
    const activeSec = state.activeSection;

    this.container.className = `sidebar ${isCollapsed ? 'collapsed' : ''}`;

    const projectSections: Array<{ id: AppSection; label: string; icon: string }> = [
      { id: 'overview', label: t('nav.overview'), icon: icons.overview(15) },
      { id: 'guide', label: t('nav.guide'), icon: icons.compass(15) },
      { id: 'development', label: t('nav.development'), icon: icons.code(15) },
      { id: 'brand', label: t('nav.brand'), icon: icons.palette(15) },
      { id: 'website', label: t('nav.website'), icon: icons.globe(15) },
      { id: 'marketing', label: t('nav.marketing'), icon: icons.target(15) },
      { id: 'files', label: t('nav.files'), icon: icons.folder(15) },
      { id: 'notes', label: t('nav.notes'), icon: icons.fileText(15) }
    ];

    this.container.innerHTML = `
      <div class="sidebar-header">
        <div class="brand-title" id="btn-go-home" title="${t('nav.home')}">
          <div class="brand-icon">${icons.cloud(20)}</div>
          <span>NUBO</span>
        </div>
        <button class="btn btn-icon btn-ghost" id="btn-toggle-sidebar" title="${isCollapsed ? 'Expand' : 'Collapse'}">
          ${icons.sidebar(15)}
        </button>
      </div>

      <div class="sidebar-content">
        <div class="nav-item ${activeSec === 'home' ? 'active' : ''}" id="btn-sidebar-home" title="${t('nav.home')}">
          ${icons.home(15)}
          <span>${t('nav.home')}</span>
        </div>

        ${(!currentProj || activeSec === 'home') ? `
          <button class="btn-new-project" id="btn-sidebar-new-proj" title="${t('nav.newProject')}">
            ${icons.plus(15)}
            <span>${t('nav.newProject')}</span>
          </button>
        ` : ''}

        <!-- Current Project Section Navigation (only when a project is selected and not in home) -->
        ${currentProj && activeSec !== 'home' ? `
          <div class="sidebar-section">
            <div class="sidebar-active-proj-header" title="${currentProj.name}">
              ${currentProj.logo ? `
                <img src="${currentProj.logo}" class="sidebar-active-proj-logo" alt="${currentProj.name}" />
              ` : `
                <span class="sidebar-active-proj-dot" style="background-color: ${currentProj.color || 'var(--accent-primary)'};"></span>
              `}
              <span class="sidebar-active-proj-name">${currentProj.name}</span>
            </div>
            ${projectSections.map(sec => `
              <div class="nav-item ${activeSec === sec.id ? 'active' : ''}" data-section="${sec.id}">
                ${sec.icon}
                <span>${sec.label}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Projects List -->
        <div class="sidebar-section">
          <div class="sidebar-section-title">${t('nav.projects')}</div>
          ${state.projects.map(p => {
            const isSelected = currentProj?.id === p.id && activeSec !== 'home';
            return `
              <div class="project-nav-item ${isSelected ? 'active' : ''}" data-project-id="${p.id}" title="${p.name}">
                <div class="project-icon-badge" style="border-left: 2px solid ${p.color || '#111111'};">
                  ${p.logo ? `<img src="${p.logo}" alt="${p.name}" class="project-badge-img" />` : p.name.charAt(0).toUpperCase()}
                </div>
                <span class="project-item-name">${p.name}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="nav-item" id="btn-sidebar-search">
          ${icons.search(15)}
          <span>${t('nav.search')}</span>
          <span class="sidebar-shortcut-hint">Ctrl K</span>
        </div>
        <div class="nav-item ${activeSec === 'settings' ? 'active' : ''}" id="btn-sidebar-settings">
          ${icons.settings(15)}
          <span>${t('nav.settings')}</span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    // Brand title -> Home
    this.container.querySelector('#btn-go-home')?.addEventListener('click', () => {
      appStore.setActiveSection('home');
    });

    // Home nav button -> Home
    this.container.querySelector('#btn-sidebar-home')?.addEventListener('click', () => {
      appStore.setActiveSection('home');
    });

    // Toggle sidebar collapse
    this.container.querySelector('#btn-toggle-sidebar')?.addEventListener('click', () => {
      appStore.toggleSidebar();
    });

    // New project button
    this.container.querySelector('#btn-sidebar-new-proj')?.addEventListener('click', () => {
      modalManager.openNewProjectModal();
    });

    // Project sub-sections navigation
    const secItems = this.container.querySelectorAll('.nav-item[data-section]');
    secItems.forEach(item => {
      item.addEventListener('click', () => {
        const sec = item.getAttribute('data-section') as AppSection;
        if (sec) appStore.setActiveSection(sec);
      });
    });

    // Project switcher items
    const projItems = this.container.querySelectorAll('.project-nav-item[data-project-id]');
    projItems.forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-project-id');
        const proj = appStore.getState().projects.find(p => p.id === id);
        if (proj) {
          appStore.setCurrentProject(proj);
          appStore.setActiveSection('overview');
        }
      });
    });

    // Search trigger
    this.container.querySelector('#btn-sidebar-search')?.addEventListener('click', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });

    // Settings
    this.container.querySelector('#btn-sidebar-settings')?.addEventListener('click', () => {
      appStore.setActiveSection('settings');
    });
  }
}
