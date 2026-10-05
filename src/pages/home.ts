import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { modalManager } from '../components/modal';
import { showToast } from '../components/toast';
import { Project } from '../scripts/types';
import { t, getLanguage } from '../scripts/i18n';

export class HomePage {
  public static render(container: HTMLElement): void {
    const state = appStore.getState();
    const projects = state.projects;
    const activeCount = projects.filter((p) => p.status === 'active').length;

    container.innerHTML = `
      <div class="app-page-hero">
        <div class="page-hero-left">
          <div class="page-title-row">
            <h2>${t('home.title')}</h2>
            <span class="page-stats-badge">📁 ${projects.length} ${projects.length === 1 ? 'proyecto' : 'proyectos'}</span>
            ${activeCount > 0 ? `<span class="page-stats-badge"><span class="pulse-dot"></span> ${activeCount} activos</span>` : ''}
          </div>
          <p class="page-subtitle">${t('home.subtitle')}</p>
        </div>
        <div class="page-hero-actions">
          <button class="btn btn-secondary" id="btn-open-projects-dir" title="${t('home.folderTooltip')}">
            ${icons.folder(15)}
            <span>${t('home.openProjectsFolder')}</span>
          </button>
          <button class="btn btn-primary" id="btn-create-proj-home">
            ${icons.plus(15)}
            <span>${t('home.newProject')}</span>
          </button>
        </div>
      </div>

      <div class="projects-grid">
        ${projects.map((p) => HomePage.renderProjectCard(p)).join('')}

        <div class="project-card new-project-card" id="card-new-proj">
          <div class="new-project-icon">
            ${icons.plus(20)}
          </div>
          <span style="font-size: 14px; font-weight: 500;">${t('home.createNew')}</span>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector('#btn-create-proj-home')?.addEventListener('click', () => {
      modalManager.openNewProjectModal();
    });

    container.querySelector('#card-new-proj')?.addEventListener('click', () => {
      modalManager.openNewProjectModal();
    });

    // Open root projects directory
    container.querySelector('#btn-open-projects-dir')?.addEventListener('click', async () => {
      const settings = await window.nubo.settings.get();
      if (settings?.storagePath) {
        window.nubo.files.openContainingFolder(settings.storagePath);
      }
    });

    // Project card click to navigate
    const projectCards = container.querySelectorAll('.project-card[data-project-id]');
    projectCards.forEach((card) => {
      card.addEventListener('click', (e) => {
        // Prevent navigation if action buttons or status dropdown were clicked
        const target = e.target as HTMLElement;
        if (target.closest('.btn-card-delete') || target.closest('.btn-card-folder') || target.closest('.nubo-status-dropdown')) {
          return;
        }

        const id = card.getAttribute('data-project-id');
        const proj = projects.find((p) => p.id === id);
        if (proj) {
          appStore.setCurrentProject(proj);
          appStore.setActiveSection('overview');
        }
      });
    });

    // Custom status dropdown trigger toggle
    container.querySelectorAll('.btn-project-status').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = btn.closest('.nubo-status-dropdown');
        const isOpen = dropdown?.classList.contains('open');
        container.querySelectorAll('.nubo-status-dropdown.open').forEach((d) => d.classList.remove('open'));
        if (!isOpen) {
          dropdown?.classList.add('open');
        }
      });
    });

    // Custom status option selection
    container.querySelectorAll('.nubo-status-option').forEach((opt) => {
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        const dropdown = opt.closest('.nubo-status-dropdown');
        dropdown?.classList.remove('open');
        const id = dropdown?.getAttribute('data-project-id');
        const newStatus = opt.getAttribute('data-status') as 'active' | 'paused' | 'completed' | 'idea';
        if (!id || !newStatus) return;

        const updated = await window.nubo.projects.update(id, { status: newStatus });
        if (updated) {
          const all = await window.nubo.projects.getAll();
          appStore.setProjects(all);
          const statusText = t(('status.' + newStatus) as any) || newStatus;
          showToast(getLanguage() === 'es' ? `Estado cambiado a "${statusText}".` : `Status changed to "${statusText}".`);
          HomePage.render(container);
        }
      });
    });

    // Close any open status dropdown when clicking elsewhere
    const onWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nubo-status-dropdown')) {
        container.querySelectorAll('.nubo-status-dropdown.open').forEach((d) => d.classList.remove('open'));
      }
    };
    document.addEventListener('click', onWindowClick, { once: true });

    // Open individual project folder
    container.querySelectorAll('.btn-card-folder').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-project-id');
        const proj = projects.find((p) => p.id === id);
        if (proj?.folder_path) {
          window.nubo.files.openContainingFolder(proj.folder_path);
        }
      });
    });

    // Delete project button on card
    container.querySelectorAll('.btn-card-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-project-id');
        const proj = projects.find((p) => p.id === id);
        if (proj) {
          HomePage.confirmDeleteProject(proj, container);
        }
      });
    });
  }

  public static confirmDeleteProject(proj: Project, container: HTMLElement): void {
    const bodyHtml = `
      <p style="font-size: 13.5px; color: var(--text-primary); margin-bottom: 12px;">
        ${t('deleteModal.confirmQuestion', { name: proj.name })}
      </p>
      <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 16px;">
        ${t('deleteModal.warning')}
      </p>
      <div style="background-color: var(--bg-subtle); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
        <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 13px;">
          <input type="checkbox" id="check-delete-physical-files" checked style="margin-top: 3px; cursor: pointer;" />
          <div>
            <strong>${t('deleteModal.deletePhysical')}</strong>
            <div style="font-size: 11px; color: var(--text-muted); word-break: break-all; margin-top: 2px;">${proj.folder_path}</div>
          </div>
        </label>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="btn-cancel-delete">${t('deleteModal.cancel')}</button>
      <button class="btn btn-primary" id="btn-confirm-delete" style="background-color: var(--status-danger); border-color: var(--status-danger);">
        ${t('deleteModal.confirm')}
      </button>
    `;

    modalManager.open(t('deleteModal.title'), bodyHtml, footerHtml);

    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => {
      modalManager.close();
    });

    document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
      const deleteFilesInput = document.getElementById('check-delete-physical-files') as HTMLInputElement | null;
      const deleteFiles = deleteFilesInput ? deleteFilesInput.checked : true;
      modalManager.close();

      await window.nubo.projects.delete(proj.id, deleteFiles);
      showToast(t('deleteModal.toastDeleted', { name: proj.name }));

      const all = await window.nubo.projects.getAll();
      appStore.setProjects(all);

      if (appStore.getState().currentProject?.id === proj.id) {
        appStore.setCurrentProject(null);
      }

      if (appStore.getState().activeSection !== 'home') {
        appStore.setActiveSection('home');
      } else {
        HomePage.render(container);
      }
    });
  }

  private static renderProjectCard(p: Project): string {
    const initial = p.name ? p.name.charAt(0).toUpperCase() : 'P';
    const progress = p.progress || 0;
    const pillClass = p.status === 'active' ? 'success' : p.status === 'completed' ? 'info' : p.status === 'paused' ? 'warning' : 'neutral';
    const statusText = t(('status.' + p.status) as any) || p.status;

    return `
      <div class="project-card" data-project-id="${p.id}">
        <div class="project-card-header">
          <div class="project-card-identity">
            <div class="project-avatar" style="border-top: 3px solid ${p.color || 'var(--text-primary)'};">
              ${p.logo ? `<img src="${p.logo}" alt="${p.name}" />` : initial}
            </div>
            <div class="project-card-info">
              <div class="project-card-name">${p.name}</div>
              <div class="nubo-status-dropdown" data-project-id="${p.id}">
                <button type="button" class="nubo-status-pill ${pillClass} nubo-status-trigger btn-project-status" title="${t('home.changeStatus')}">
                  <span class="pulse-dot"></span>
                  <span>${statusText}</span>
                  ${icons.chevronDown(10)}
                </button>
                <div class="nubo-status-menu">
                  <div class="nubo-status-option ${p.status === 'active' ? 'selected' : ''}" data-status="active">
                    <span class="status-option-dot" style="background: #10B981; box-shadow: 0 0 6px rgba(16,185,129,0.4);"></span>
                    <span>${t('status.active')}</span>
                  </div>
                  <div class="nubo-status-option ${p.status === 'completed' ? 'selected' : ''}" data-status="completed">
                    <span class="status-option-dot" style="background: #3B82F6; box-shadow: 0 0 6px rgba(59,130,246,0.4);"></span>
                    <span>${t('status.completed')}</span>
                  </div>
                  <div class="nubo-status-option ${p.status === 'paused' ? 'selected' : ''}" data-status="paused">
                    <span class="status-option-dot" style="background: #F59E0B; box-shadow: 0 0 6px rgba(245,158,11,0.4);"></span>
                    <span>${t('status.paused')}</span>
                  </div>
                  <div class="nubo-status-option ${p.status === 'idea' ? 'selected' : ''}" data-status="idea">
                    <span class="status-option-dot" style="background: #8B5CF6; box-shadow: 0 0 6px rgba(139,92,246,0.4);"></span>
                    <span>${t('status.idea')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 2px;">
            <button class="btn btn-ghost btn-icon btn-sm btn-card-folder" data-project-id="${p.id}" title="${t('home.folderTooltip')}">
              ${icons.folder(14)}
            </button>
            <button class="btn btn-ghost btn-icon btn-sm btn-card-delete" data-project-id="${p.id}" title="${t('home.deleteTooltip')}">
              ${icons.trash(14)}
            </button>
          </div>
        </div>

        <div class="project-card-desc">
          ${p.description || t('home.noDesc')}
        </div>

        <div class="project-card-footer">
          <div class="project-progress-row">
            <span>${t('home.progress')}</span>
            <span style="font-weight: 600; color: var(--text-primary);">${progress}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progress}%; background-color: ${p.color || 'var(--text-primary)'};"></div>
          </div>
        </div>
      </div>
    `;
  }
}
