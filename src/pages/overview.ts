import { icons } from '../scripts/icons';
import { appStore, AppSection } from '../scripts/store';
import { modalManager } from '../components/modal';
import { showToast } from '../components/toast';
import { Task, Activity } from '../scripts/types';
import { HomePage } from './home';
import { t, getLanguage } from '../scripts/i18n';

export class OverviewPage {
  public static async render(container: HTMLElement): Promise<void> {
    const state = appStore.getState();
    const project = state.currentProject;

    if (!project) {
      container.innerHTML = `
        <div class="empty-state">
          ${icons.folder(36)}
          <h3>${t('overview.noProjectSelected')}</h3>
          <p>${t('overview.selectProjectPrompt')}</p>
          <button class="btn btn-primary" id="btn-empty-create">${t('overview.createProject')}</button>
        </div>
      `;
      container.querySelector('#btn-empty-create')?.addEventListener('click', () => {
        modalManager.openNewProjectModal();
      });
      return;
    }

    // Fetch tasks & activities
    const [tasks, activities] = await Promise.all([
      window.nubo.tasks.getByProject(project.id),
      window.nubo.projects.getActivities(project.id)
    ]);

    // Safety guard: if user navigated away from overview while fetching async data, abort
    if (appStore.getState().activeSection !== 'overview') {
      return;
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: Task) => t.status === 'done').length;
    const pendingTasks = tasks.filter((t: Task) => t.status !== 'done').slice(0, 5);
    const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const pillClass = project.status === 'active' ? 'success' : project.status === 'completed' ? 'info' : project.status === 'paused' ? 'warning' : 'neutral';
    const statusLabel = t(('status.' + project.status) as any) || project.status;
    const isEs = getLanguage() === 'es';
    const type = project.project_type || 'program';
    const typeLabel = type === 'website' ? (isEs ? 'Sitio Web' : 'Website') : type === 'script' ? 'Script' : (isEs ? 'Programa' : 'Program');
    const typeIcon = type === 'website' ? icons.globe(12) : type === 'script' ? icons.terminal(12) : icons.package(12);

    container.innerHTML = `
      <div class="app-page-hero">
        <div class="page-hero-left">
          <div class="page-title-row">
            ${project.logo ? `
              <div class="project-hero-logo-box">
                <img src="${project.logo}" alt="${project.name}" class="project-hero-logo-img" />
              </div>
            ` : `
              <span class="project-hero-cloud-icon" style="color: ${project.color || 'var(--text-primary)'};">${icons.cloud(26)}</span>
            `}
            <h1>${project.name}</h1>
            <span class="project-type-chip type-${type}">
              ${typeIcon}
              <span>${typeLabel}</span>
            </span>
            <div class="nubo-status-dropdown" data-project-id="${project.id}">
              <button type="button" class="nubo-status-pill ${pillClass} nubo-status-trigger btn-overview-status" title="${t('home.changeStatus')}">
                <span class="pulse-dot"></span>
                <span>${statusLabel}</span>
                ${icons.chevronDown(10)}
              </button>
              <div class="nubo-status-menu">
                <div class="nubo-status-option ${project.status === 'active' ? 'selected' : ''}" data-status="active">
                  <span class="status-option-dot" style="background: #10B981; box-shadow: 0 0 6px rgba(16,185,129,0.4);"></span>
                  <span>${t('status.active')}</span>
                </div>
                <div class="nubo-status-option ${project.status === 'completed' ? 'selected' : ''}" data-status="completed">
                  <span class="status-option-dot" style="background: #3B82F6; box-shadow: 0 0 6px rgba(59,130,246,0.4);"></span>
                  <span>${t('status.completed')}</span>
                </div>
                <div class="nubo-status-option ${project.status === 'paused' ? 'selected' : ''}" data-status="paused">
                  <span class="status-option-dot" style="background: #F59E0B; box-shadow: 0 0 6px rgba(245,158,11,0.4);"></span>
                  <span>${t('status.paused')}</span>
                </div>
                <div class="nubo-status-option ${project.status === 'idea' ? 'selected' : ''}" data-status="idea">
                  <span class="status-option-dot" style="background: #8B5CF6; box-shadow: 0 0 6px rgba(139,92,246,0.4);"></span>
                  <span>${t('status.idea')}</span>
                </div>
              </div>
            </div>
          </div>
          <p class="page-subtitle">${project.description || t('overview.defaultDesc')}</p>
        </div>
        <div class="page-hero-actions">
          ${project.website ? `
            <a href="${project.website}" target="_blank" class="btn btn-secondary">
              ${icons.globe(14)}
              <span>${t('overview.openWebsite')}</span>
            </a>
          ` : ''}
          ${project.github ? `
            <a href="${project.github.startsWith('http') ? project.github : `https://github.com/${project.github}`}" target="_blank" class="btn btn-secondary">
              ${icons.github(14)}
              <span>${t('overview.github')}</span>
            </a>
          ` : ''}
          <button class="btn btn-secondary" id="btn-hero-open-folder" title="${t('overview.openFolder')}">
            ${icons.folder(14)}
            <span>${t('overview.openFolder')}</span>
          </button>
          <button class="btn btn-secondary" id="btn-proj-settings">
            ${icons.settings(14)}
            <span>${t('overview.settings')}</span>
          </button>
          <button class="btn btn-ghost btn-icon btn-danger" id="btn-hero-delete-proj" title="${t('overview.deleteProject')}">
            ${icons.trash(14)}
          </button>
        </div>
      </div>

      <div class="overview-grid">
        <div class="overview-main-col">
          <div class="quick-access-section">
            <div class="section-label">${t('overview.quickAccess')}</div>
            <div class="quick-access-cards">
              ${type === 'script' ? `
                <div class="quick-card" data-goto="development" style="border: 1px solid rgba(245, 158, 11, 0.35); background: linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, var(--bg-surface) 100%);">
                  <div class="quick-card-icon" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B;">${icons.terminal(18)}</div>
                  <div class="quick-card-title">${isEs ? 'Script & Terminal' : 'Script & Terminal'}</div>
                  <div class="quick-card-desc">${isEs ? 'Ejecución, código fuente y comandos CLI' : 'Execution, script source code & CLI'}</div>
                </div>
                <div class="quick-card" data-goto="files">
                  <div class="quick-card-icon" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">${icons.folder(18)}</div>
                  <div class="quick-card-title">${isEs ? 'Archivos & Datos' : 'Files & Data'}</div>
                  <div class="quick-card-desc">${isEs ? 'Carpetas Input, Output y resultados procesados' : 'Input, Output and processed data folders'}</div>
                </div>
                <div class="quick-card" data-goto="notes">
                  <div class="quick-card-icon" style="background: rgba(6, 182, 212, 0.1); color: #06B6D4;">${icons.fileText(18)}</div>
                  <div class="quick-card-title">${t('overview.notesTitle')}</div>
                  <div class="quick-card-desc">${isEs ? 'Parámetros, credenciales y apuntes' : 'Parameters, credentials & notes'}</div>
                </div>
              ` : type === 'website' ? `
                <div class="quick-card" data-goto="guide" style="border: 1px solid rgba(59, 130, 246, 0.35); background: linear-gradient(180deg, rgba(59, 130, 246, 0.06) 0%, var(--bg-surface) 100%);">
                  <div class="quick-card-icon" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6;">${icons.compass(18)}</div>
                  <div class="quick-card-title">${t('guide.title') || 'Guía del Proyecto'}</div>
                  <div class="quick-card-desc">${getLanguage() === 'es' ? 'Hoja de ruta paso a paso (4 fases)' : 'Step-by-step roadmap (4 phases)'}</div>
                </div>
                <div class="quick-card" data-goto="website" style="border: 1px solid rgba(139, 92, 246, 0.35); background: linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, var(--bg-surface) 100%);">
                  <div class="quick-card-icon" style="background: rgba(139, 92, 246, 0.15); color: #8B5CF6;">${icons.globe(18)}</div>
                  <div class="quick-card-title">${t('overview.websiteTitle')}</div>
                  <div class="quick-card-desc">${isEs ? 'Código frontend, páginas, diseño UI/UX y SEO' : 'Frontend code, pages, UI/UX design & SEO'}</div>
                </div>
                <div class="quick-card" data-goto="brand">
                  <div class="quick-card-icon" style="background: rgba(255, 154, 0, 0.1); color: #FF9A00;">${icons.palette(18)}</div>
                  <div class="quick-card-title">${t('overview.brandTitle')}</div>
                  <div class="quick-card-desc">${t('overview.brandDesc')}</div>
                </div>
                <div class="quick-card" data-goto="marketing">
                  <div class="quick-card-icon" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">${icons.target(18)}</div>
                  <div class="quick-card-title">${t('overview.marketingTitle')}</div>
                  <div class="quick-card-desc">${t('overview.marketingDesc')}</div>
                </div>
                <div class="quick-card" data-goto="files">
                  <div class="quick-card-icon" style="background: rgba(245, 158, 11, 0.1); color: #F59E0B;">${icons.folder(18)}</div>
                  <div class="quick-card-title">${t('overview.filesTitle')}</div>
                  <div class="quick-card-desc">${t('overview.filesDesc')}</div>
                </div>
                <div class="quick-card" data-goto="notes">
                  <div class="quick-card-icon" style="background: rgba(6, 182, 212, 0.1); color: #06B6D4;">${icons.fileText(18)}</div>
                  <div class="quick-card-title">${t('overview.notesTitle')}</div>
                  <div class="quick-card-desc">${t('overview.notesDesc')}</div>
                </div>
              ` : `
                <div class="quick-card" data-goto="guide" style="border: 1px solid rgba(59, 130, 246, 0.35); background: linear-gradient(180deg, rgba(59, 130, 246, 0.06) 0%, var(--bg-surface) 100%);">
                  <div class="quick-card-icon" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6;">${icons.compass(18)}</div>
                  <div class="quick-card-title">${t('guide.title') || 'Guía del Proyecto'}</div>
                  <div class="quick-card-desc">${getLanguage() === 'es' ? 'Hoja de ruta paso a paso (4 fases)' : 'Step-by-step roadmap (4 phases)'}</div>
                </div>
                <div class="quick-card" data-goto="development">
                  <div class="quick-card-icon" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">${icons.code(18)}</div>
                  <div class="quick-card-title">${t('overview.devTitle')}</div>
                  <div class="quick-card-desc">${t('overview.devDesc')}</div>
                </div>
                <div class="quick-card" data-goto="brand">
                  <div class="quick-card-icon" style="background: rgba(255, 154, 0, 0.1); color: #FF9A00;">${icons.palette(18)}</div>
                  <div class="quick-card-title">${t('overview.brandTitle')}</div>
                  <div class="quick-card-desc">${t('overview.brandDesc')}</div>
                </div>
                <div class="quick-card" data-goto="marketing">
                  <div class="quick-card-icon" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">${icons.target(18)}</div>
                  <div class="quick-card-title">${t('overview.marketingTitle')}</div>
                  <div class="quick-card-desc">${t('overview.marketingDesc')}</div>
                </div>
                <div class="quick-card" data-goto="files">
                  <div class="quick-card-icon" style="background: rgba(245, 158, 11, 0.1); color: #F59E0B;">${icons.folder(18)}</div>
                  <div class="quick-card-title">${t('overview.filesTitle')}</div>
                  <div class="quick-card-desc">${t('overview.filesDesc')}</div>
                </div>
                <div class="quick-card" data-goto="notes">
                  <div class="quick-card-icon" style="background: rgba(6, 182, 212, 0.1); color: #06B6D4;">${icons.fileText(18)}</div>
                  <div class="quick-card-title">${t('overview.notesTitle')}</div>
                  <div class="quick-card-desc">${t('overview.notesDesc')}</div>
                </div>
              `}
            </div>
          </div>

          <div class="dashboard-widget nubo-card">
            <div class="nubo-card-header">
              <div class="nubo-card-title-group">
                <div class="nubo-card-icon-bubble" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">
                  ${icons.activity(16)}
                </div>
                <div>
                  <h3 class="nubo-card-title">${t('overview.recentActivity')}</h3>
                  <span class="nubo-card-subtitle">Historial de cambios y acciones recientes</span>
                </div>
              </div>
            </div>
            <div class="activity-list">
              ${activities.length > 0 ? activities.map((act: Activity) => `
                <div class="activity-item">
                  <div class="activity-bullet"></div>
                  <div class="activity-content">
                    <span class="activity-action">• ${act.action}</span>
                    ${act.details ? `<span class="activity-detail">: ${act.details}</span>` : ''}
                  </div>
                  <span class="activity-time">${act.created_at ? new Date(act.created_at).toLocaleDateString() : ''}</span>
                </div>
              `).join('') : `
                <div style="font-size: 13px; color: var(--text-muted); padding: 12px 0; text-align: center;">
                  ${t('overview.noActivity')}
                </div>
              `}
            </div>
          </div>
        </div>

        <div class="overview-side-col">
          <div class="dashboard-widget nubo-card">
            <div class="nubo-card-header">
              <div class="nubo-card-title-group">
                <div class="nubo-card-icon-bubble" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">
                  ${icons.checkSquare(16)}
                </div>
                <div>
                  <h3 class="nubo-card-title">${t('overview.nextUp')}</h3>
                  <span class="nubo-card-subtitle">Siguientes tareas pendientes</span>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" id="btn-add-next-task" title="${t('dev.newTask')}">
                ${icons.plus(13)}
                <span>Añadir</span>
              </button>
            </div>
            <div class="checklist-widget-items">
              ${totalTasks === 0 ? `
                <div style="font-size: 13px; color: var(--text-muted); padding: 16px 0; text-align: center;">
                  ${getLanguage() === 'es' ? 'No hay tareas creadas todavía.' : 'No tasks created yet.'}
                </div>
              ` : pendingTasks.length > 0 ? pendingTasks.map((tItem: Task) => `
                <div class="checklist-row">
                  <input type="checkbox" class="checklist-checkbox" data-task-id="${tItem.id}" />
                  <span>${tItem.title}</span>
                </div>
              `).join('') : `
                <div style="font-size: 13px; color: var(--text-muted); padding: 12px 0; text-align: center;">
                  ${getLanguage() === 'es' ? '¡Todas las tareas completadas!' : 'All tasks completed!'}
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelectorAll('.quick-card[data-goto]').forEach(card => {
      card.addEventListener('click', () => {
        const sec = card.getAttribute('data-goto') as AppSection;
        if (sec) appStore.setActiveSection(sec);
      });
    });

    container.querySelector('#btn-hero-open-folder')?.addEventListener('click', () => {
      if (project.folder_path) {
        window.nubo.files.openContainingFolder(project.folder_path);
      }
    });

    container.querySelector('#btn-hero-delete-proj')?.addEventListener('click', () => {
      HomePage.confirmDeleteProject(project, container);
    });

    container.querySelector('#btn-proj-settings')?.addEventListener('click', () => {
      modalManager.openEditProjectModal(project, () => {
        OverviewPage.render(container);
      });
    });

    // Overview status dropdown toggle
    container.querySelector('.btn-overview-status')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = container.querySelector('.nubo-status-dropdown');
      dropdown?.classList.toggle('open');
    });

    // Overview status option click
    container.querySelectorAll('.nubo-status-option').forEach((opt) => {
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        container.querySelector('.nubo-status-dropdown')?.classList.remove('open');
        const newStatus = opt.getAttribute('data-status') as 'active' | 'paused' | 'completed' | 'idea';
        if (!newStatus) return;
        const updated = await window.nubo.projects.update(project.id, { status: newStatus });
        if (updated) {
          appStore.setCurrentProject(updated);
          const all = await window.nubo.projects.getAll();
          appStore.setProjects(all);
          const statusText = t(('status.' + newStatus) as any) || newStatus;
          showToast(getLanguage() === 'es' ? `Proyecto marcado como "${statusText}".` : `Project marked as "${statusText}".`);
          OverviewPage.render(container);
        }
      });
    });

    // Close on click outside
    const onOverviewWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nubo-status-dropdown')) {
        container.querySelector('.nubo-status-dropdown')?.classList.remove('open');
      }
    };
    document.addEventListener('click', onOverviewWindowClick, { once: true });

    container.querySelector('#btn-add-next-task')?.addEventListener('click', () => {
      modalManager.openNewTaskModal(project.id, () => {
        OverviewPage.render(container);
      });
    });

    // Toggle checklist checkbox
    container.querySelectorAll('.checklist-checkbox').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const input = e.target as HTMLInputElement;
        const taskId = input.getAttribute('data-task-id');
        if (taskId && input.checked) {
          await window.nubo.tasks.update(taskId, { status: 'done' });
          const allProjects = await window.nubo.projects.getAll();
          appStore.setProjects(allProjects);
          OverviewPage.render(container);
        }
      });
    });
  }
}
