import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { modalManager } from '../components/modal';
import { showToast } from '../components/toast';
import { Task, ProductSpec, ProductFeature, GitStatusResult, GitHubAccount, DetectedBuildItem } from '../scripts/types';
import { t, getLanguage } from '../scripts/i18n';

export class DevelopmentPage {
  // Navigation tab: 'all' (Todo) | 'code' (Código & Git) | 'kanban' (Tareas) | 'specs' (Especificaciones) | 'build' (Build & .exe)
  private static activeTab: 'all' | 'overview' | 'code' | 'kanban' | 'specs' | 'build' = 'all';

  // Kanban view state
  private static viewMode: 'kanban' | 'list' = 'kanban';
  private static filterStatus: 'all' | 'todo' | 'in_progress' | 'done' = 'all';
  private static filterPriority: string = 'all';
  private static filterType: string = 'all';
  private static searchQuery: string = '';
  private static activeQuickAddCol: 'todo' | 'in_progress' | 'done' | null = null;
  private static draggedTaskId: string | null = null;

  // Cached git, specs and builds state
  private static cachedGitStatus: GitStatusResult | null = null;
  private static cachedGitStatusFolder: string | null = null;
  private static cachedSpecs: ProductSpec | null = null;
  private static cachedDetectedBuilds: DetectedBuildItem[] | null = null;
  private static isLoadingGit: boolean = false;

  public static clearCache(): void {
    DevelopmentPage.cachedGitStatus = null;
    DevelopmentPage.cachedGitStatusFolder = null;
    DevelopmentPage.cachedSpecs = null;
    DevelopmentPage.cachedDetectedBuilds = null;
  }

  public static async render(container: HTMLElement): Promise<void> {
    const project = appStore.getState().currentProject;
    if (!project) return;

    try {
      const isScript = project.project_type === 'script';
      // Dedicated folder path: Script for scripts, Development/Proyecto for apps/programs
      const devCodePath = project.folder_path
        ? (isScript ? `${project.folder_path}\\Script` : `${project.folder_path}\\Development\\Proyecto`)
        : '';

      if (isScript && DevelopmentPage.activeTab === 'build') {
        DevelopmentPage.activeTab = 'all';
      }

      // Invalidate git status cache if switched to a different project/folder
      if (DevelopmentPage.cachedGitStatusFolder !== devCodePath) {
        DevelopmentPage.cachedGitStatus = null;
        DevelopmentPage.cachedGitStatusFolder = devCodePath;
      }

      // Ensure development folders exist on disk
      if (project.folder_path) {
        try {
          if (window.nubo?.development?.ensureFolders) {
            await window.nubo.development.ensureFolders(project.folder_path);
          }
        } catch (err) {
          console.warn('[DevelopmentPage] Error ensuring development folders:', err);
        }
      }

      // Load tasks, specs, settings and github account safely
      let allTasks: Task[] = [];
      let settings: any = {};
      let githubAccount: GitHubAccount | null = null;
      try {
        const [loadedTasks, loadedSettings, loadedGh] = await Promise.all([
          window.nubo?.tasks?.getByProject ? window.nubo.tasks.getByProject(project.id) : [],
          window.nubo?.settings?.get ? window.nubo.settings.get() : {},
          window.nubo?.github?.getAccount ? window.nubo.github.getAccount() : null
        ]);
        allTasks = Array.isArray(loadedTasks) ? loadedTasks : [];
        settings = loadedSettings || {};
        githubAccount = loadedGh || settings.githubAccount || null;
      } catch (err) {
        console.warn('[DevelopmentPage] Error loading tasks/settings:', err);
      }

      // Fetch product specs safely
      let specs = DevelopmentPage.cachedSpecs;
      if (!specs || specs.project_id !== project.id) {
        try {
          if (window.nubo?.development?.getSpecs) {
            specs = await window.nubo.development.getSpecs(project.id);
          }
        } catch (err) {
          console.warn('[DevelopmentPage] Error loading specs from backend:', err);
        }
        if (!specs) {
          specs = {
            id: 'spec_' + project.id,
            project_id: project.id,
            what_is_it: project.description || '',
            problem_solved: '',
            target_audience: '',
            goals: '',
            features: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        DevelopmentPage.cachedSpecs = specs;
      }

      // Fetch git status if in all/code/overview tab and folder exists
      let gitStatus = DevelopmentPage.cachedGitStatus;
      if ((DevelopmentPage.activeTab === 'all' || DevelopmentPage.activeTab === 'overview' || DevelopmentPage.activeTab === 'code') && !gitStatus) {
        try {
          if (window.nubo?.development?.getGitStatus && devCodePath) {
            gitStatus = await window.nubo.development.getGitStatus(devCodePath);
          }
        } catch (err) {
          console.warn('[DevelopmentPage] Error loading git status:', err);
        }
        if (!gitStatus) {
          gitStatus = {
            isGitRepo: false,
            gitInstalled: true,
            connectedToGitHub: false,
            hasChanges: false,
            modifiedCount: 0,
            untrackedCount: 0,
            statusText: 'No conectado'
          };
        }
        DevelopmentPage.cachedGitStatus = gitStatus;
        DevelopmentPage.cachedGitStatusFolder = devCodePath;
      }

      // Fetch detected builds if in all or build tab
      let detectedBuilds = DevelopmentPage.cachedDetectedBuilds;
      if ((DevelopmentPage.activeTab === 'all' || DevelopmentPage.activeTab === 'build') && !detectedBuilds && project.folder_path) {
        try {
          if (window.nubo?.development?.scanBuildExecutables) {
            detectedBuilds = await window.nubo.development.scanBuildExecutables(project.folder_path);
          }
        } catch (err) {
          console.warn('[DevelopmentPage] Error scanning builds:', err);
        }
        detectedBuilds = detectedBuilds || [];
        DevelopmentPage.cachedDetectedBuilds = detectedBuilds;
      }

      // Check if project folder exists on disk
      let folderExists = true;
      try {
        if (window.nubo?.development?.checkFolder && devCodePath) {
          const check = await window.nubo.development.checkFolder(devCodePath);
          folderExists = check.exists;
        }
      } catch {
        folderExists = true;
      }

      // Calculate overall statistics
      const counts = {
        all: allTasks.length,
        todo: allTasks.filter(item => item.status === 'todo').length,
        in_progress: allTasks.filter(item => item.status === 'in_progress').length,
        done: allTasks.filter(item => item.status === 'done').length
      };
      const completionRate = counts.all > 0 ? Math.round((counts.done / counts.all) * 100) : 0;

      // Safety guard: if user navigated away while fetching async data, abort
      if (appStore.getState().activeSection !== 'development') {
        return;
      }

      container.innerHTML = `
        <div class="dev-container">
          <!-- Main Hero Header -->
          <div class="dev-header-hero">
            <div class="dev-header-left">
              <div class="dev-title-row">
                <h1>${isScript ? (getLanguage() === 'es' ? 'Script & Terminal' : 'Script & Terminal') : t('dev.title')}</h1>
                <div class="dev-header-stats-badge">
                  ${icons.checkCircle(13)}
                  <span>${counts.all > 0 ? `${completionRate}% ${t('dev.progress')}` : (getLanguage() === 'es' ? 'Sin tareas' : 'No tasks')}</span>
                </div>
              </div>
              <p class="dev-subtitle">${isScript ? (getLanguage() === 'es' ? 'Código fuente del script, terminal CLI, ejecuciones y tareas.' : 'Script source code, CLI terminal, execution and tasks.') : t('dev.subtitle')}</p>
            </div>

            <div class="dev-header-actions">
              <!-- Global New Task Button -->
              <button class="btn btn-primary" id="btn-add-dev-task" style="display: inline-flex; align-items: center; gap: 6px;">
                ${icons.plus(15)}
                <span>${t('dev.newTask')}</span>
              </button>
            </div>
          </div>

          <!-- Development Subnav Tabs -->
          <div class="dev-subnav-tabs">
            <button class="dev-tab-item ${DevelopmentPage.activeTab === 'all' || DevelopmentPage.activeTab === 'overview' ? 'active' : ''}" data-dev-tab="all">
              ${icons.grid(14)}
              <span>${t('dev.tabAll') || 'Todo'}</span>
            </button>
            <button class="dev-tab-item ${DevelopmentPage.activeTab === 'code' ? 'active' : ''}" data-dev-tab="code">
              ${isScript ? icons.terminal(14) : icons.code(14)}
              <span>${isScript ? (getLanguage() === 'es' ? 'Script & Git' : 'Script & Git') : (t('dev.tabCode') || 'Código & Git')}</span>
            </button>
            <button class="dev-tab-item ${DevelopmentPage.activeTab === 'kanban' ? 'active' : ''}" data-dev-tab="kanban">
              ${icons.columns(14)}
              <span>${t('dev.tabKanban') || 'Tareas'} (${counts.all})</span>
            </button>
            <button class="dev-tab-item ${DevelopmentPage.activeTab === 'specs' ? 'active' : ''}" data-dev-tab="specs">
              ${icons.fileText(14)}
              <span>${isScript ? (getLanguage() === 'es' ? 'Parámetros & Docs' : 'Specs & Docs') : (t('dev.tabSpecs') || 'Especificaciones')}</span>
            </button>
            ${!isScript ? `
              <button class="dev-tab-item ${DevelopmentPage.activeTab === 'build' ? 'active' : ''}" data-dev-tab="build">
                ${icons.package(14)}
                <span>${t('dev.tabBuild') || 'Build & .exe'}</span>
              </button>
            ` : ''}
          </div>

          <!-- TAB CONTENT -->
          ${DevelopmentPage.activeTab === 'all' || DevelopmentPage.activeTab === 'overview'
            ? DevelopmentPage.renderAllView(project, settings, specs, gitStatus, folderExists, counts, completionRate, allTasks, githubAccount, detectedBuilds || [])
            : DevelopmentPage.activeTab === 'code'
            ? DevelopmentPage.renderCodeAndGit(project, settings, gitStatus, folderExists, githubAccount)
            : DevelopmentPage.activeTab === 'specs'
            ? DevelopmentPage.renderSpecifications(specs)
            : DevelopmentPage.activeTab === 'build'
            ? DevelopmentPage.renderBuildView(project, settings, specs, devCodePath, detectedBuilds || [])
            : DevelopmentPage.renderKanbanView(allTasks, counts, completionRate)}
        </div>
      `;

      DevelopmentPage.bindEvents(container, project, allTasks, specs, settings, detectedBuilds || []);
    } catch (err: any) {
      console.error('[DevelopmentPage] Render error:', err);
      container.innerHTML = `
        <div style="padding: 32px; color: var(--text-primary);">
          <h3>Error al cargar Desarrollo</h3>
          <p style="color: var(--text-muted); margin-top: 8px;">${err.message || err}</p>
          <button class="btn btn-secondary" style="margin-top: 16px;" onclick="location.reload()">Recargar vista</button>
        </div>
      `;
    }
  }

  // ==========================================
  // 1. MODULAR HTML HELPERS & COMPONENT RENDERERS
  // ==========================================

  // A. Workspace Hero Strip
  private static renderWorkspaceStripHtml(project: any, editor: any, folderExists: boolean): string {
    return `
      <div class="dev-workspace-strip">
        <div class="dev-workspace-left">
          <div class="dev-workspace-icon-bubble">
            ${icons.folder(20)}
          </div>
          <div class="dev-workspace-details">
            <div class="dev-workspace-title-row">
              <span class="dev-workspace-name">Entorno de Código</span>
              ${folderExists ? `
                <span class="dev-status-pill success" title="Carpeta lista y verificada">
                  <span class="pulse-dot"></span>
                  Carpeta lista
                </span>
              ` : `
                <span class="dev-status-pill warning" title="La carpeta no existe todavía">
                  <span class="pulse-dot warning"></span>
                  Carpeta no creada
                </span>
              `}
            </div>
            <div class="dev-workspace-path-row">
              <span class="dev-workspace-path" id="code-project-path" title="${project.folder_path}\\Development\\Proyecto">
                ${project.folder_path}\\Development\\Proyecto
              </span>
              <button class="btn btn-ghost btn-icon btn-sm" id="btn-copy-path" title="Copiar ruta">
                ${icons.copy(12)}
              </button>
            </div>
          </div>
        </div>

        <div class="dev-workspace-actions">
          ${folderExists ? `
            <button class="btn btn-primary" id="btn-open-in-editor" style="display: inline-flex; align-items: center; gap: 8px;">
              ${icons.code(14)}
              <span>Abrir en ${editor.name}</span>
            </button>
            <button class="btn btn-secondary btn-icon" id="btn-open-terminal" title="Abrir Terminal de comandos">
              ${icons.terminal(14)}
            </button>
            <button class="btn btn-secondary btn-icon" id="btn-open-folder" title="Abrir carpeta en el Explorador">
              ${icons.folder(14)}
            </button>
            <button class="btn btn-ghost btn-icon" id="btn-configure-editor" title="Cambiar editor configurado (${editor.name})">
              ${icons.settings(14)}
            </button>
          ` : `
            <button class="btn btn-primary btn-sm" id="btn-create-folder">
              ${icons.plus(13)}
              <span>Crear carpeta</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-change-folder">
              ${icons.folder(13)}
              <span>Cambiar carpeta</span>
            </button>
          `}
        </div>
      </div>
    `;
  }

  // B. Git & GitHub Card
  private static renderGitCardHtml(
    isGit: boolean | undefined,
    isConnectedToGitHub: boolean | undefined,
    gitStatus: GitStatusResult | null,
    gitBranch: string,
    gitChanges: string,
    githubAccount?: GitHubAccount | null
  ): string {
    return `
      <div class="dev-card">
        <div class="dev-card-header">
          <div class="dev-card-title-group">
            <div class="dev-card-icon-bubble git">
              ${icons.github(18)}
            </div>
            <div>
              <h3 class="dev-card-title">GitHub & Control de Versiones</h3>
              <span class="dev-card-subtitle">Sincronización de la carpeta Proyecto</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            ${githubAccount ? `
              <button class="btn btn-ghost btn-xs" id="btn-dev-gh-account" title="Cuenta activa: @${githubAccount.username} (clic para cambiar)" style="display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 11px;">
                <img src="${githubAccount.avatar_url || 'https://github.com/' + githubAccount.username + '.png'}" style="width: 14px; height: 14px; border-radius: 50%;" />
                <span>@${githubAccount.username}</span>
              </button>
            ` : `
              <button class="btn btn-ghost btn-xs" id="btn-dev-gh-account" title="Conectar cuenta de GitHub con Token" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm); font-size: 11px; color: var(--text-secondary);">
                ${icons.github(12)}
                <span>Conectar cuenta</span>
              </button>
            `}

            ${isConnectedToGitHub ? `
              <span class="dev-status-pill ${gitStatus?.hasChanges ? 'warning' : 'success'}">
                <span class="pulse-dot ${gitStatus?.hasChanges ? 'warning' : ''}"></span>
                ${gitStatus?.hasChanges ? 'Cambios pendientes' : 'Sincronizado'}
              </span>
            ` : isGit ? `
              <span class="dev-status-pill neutral">Git local</span>
            ` : `
              <span class="dev-status-pill neutral">Sin conectar</span>
            `}
          </div>
        </div>

        <div class="dev-card-body">
          ${isGit ? `
            <div class="dev-git-meta-box">
              <div class="dev-git-meta-item">
                <span class="dev-meta-label">Repositorio</span>
                ${gitStatus?.remoteUrl ? `
                  <a href="#" class="dev-repo-link" id="link-open-repo" title="Ver en GitHub">
                    <span>${gitStatus.cleanRemoteUrl ? gitStatus.cleanRemoteUrl.replace('https://github.com/', '') : 'Repositorio vinculado'}</span>
                    ${icons.external(11)}
                  </a>
                ` : `
                  <span style="font-size: 12px; color: var(--text-muted);">Sin remoto conectado</span>
                `}
              </div>

              <div class="dev-git-meta-item">
                <span class="dev-meta-label">Rama activa</span>
                <div class="dev-branch-badge">
                  ${icons.gitBranch(13)}
                  <span>${gitBranch}</span>
                </div>
              </div>
            </div>

            <div class="dev-git-status-message ${gitStatus?.hasChanges ? 'has-changes' : 'up-to-date'}">
              <div class="dev-status-message-icon">
                ${gitStatus?.hasChanges ? icons.arrowUp(15) : icons.check(15)}
              </div>
              <div class="dev-status-message-content">
                <strong>${gitChanges}</strong>
                <span>${gitStatus?.hasChanges ? 'Pulsa "Push" para subir los cambios a GitHub.' : 'Tu código local está sincronizado con la nube.'}</span>
              </div>
            </div>

            <!-- Archivos pendientes de subir (si existen) -->
            ${gitStatus?.changedFiles && gitStatus.changedFiles.length > 0 ? `
              <div class="dev-git-pending-box">
                <div class="dev-git-box-title-row">
                  <span class="dev-git-box-title">Archivos modificados (${gitStatus.changedFiles.length})</span>
                  <span class="dev-git-box-badge">Sin subir</span>
                </div>
                <div class="dev-git-files-list">
                  ${gitStatus.changedFiles.map(f => `
                    <div class="dev-git-file-item" title="${f.file}">
                      <span class="dev-git-file-badge ${f.status}">
                        ${f.status === 'modified' ? 'MOD' : f.status === 'untracked' ? 'NUEVO' : f.status === 'deleted' ? 'DEL' : 'ADD'}
                      </span>
                      <span class="dev-git-file-path">${f.file}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Lista de últimos cambios / commits -->
            ${gitStatus?.recentCommits && gitStatus.recentCommits.length > 0 ? `
              <div class="dev-git-recent-box">
                <div class="dev-git-box-title-row">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${icons.clock(12)}
                    <span class="dev-git-box-title">Últimos cambios (${gitStatus.recentCommits.length})</span>
                  </div>
                  ${gitStatus.cleanRemoteUrl ? `
                    <a href="#" class="dev-git-view-all-commits" id="link-view-all-commits" title="Ver historial completo en GitHub">
                      <span>Ver en GitHub</span>
                      ${icons.external(10)}
                    </a>
                  ` : ''}
                </div>
                <div class="dev-git-commits-list">
                  ${gitStatus.recentCommits.map(commit => `
                    <div class="dev-git-commit-row">
                      <div class="dev-git-commit-left">
                        ${gitStatus.cleanRemoteUrl ? `
                          <a href="#" class="dev-commit-hash-link" data-hash="${commit.hash}" title="Ver commit ${commit.hash} en GitHub">
                            ${commit.hash}
                          </a>
                        ` : `
                          <span class="dev-commit-hash">${commit.hash}</span>
                        `}
                        <span class="dev-commit-msg" title="${commit.message}">${commit.message}</span>
                      </div>
                      <div class="dev-git-commit-right">
                        <span class="dev-commit-author" title="${commit.author}">${commit.author}</span>
                        <span class="dev-commit-dot">·</span>
                        <span class="dev-commit-date">${commit.date}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div class="dev-git-no-commits">
                <span>Sin commits en el repositorio todavía. Haz tu primer push para registrar los cambios.</span>
              </div>
            `}
          ` : `
            <div class="dev-empty-git-state">
              <p style="margin: 0;">Inicializa Git en la carpeta Proyecto para llevar control de versiones y sincronizar tus cambios con GitHub.</p>
            </div>
          `}
        </div>

        <div class="dev-card-footer">
          ${isGit ? `
            ${gitStatus?.remoteUrl ? `
              <div class="dev-footer-primary-actions">
                <button class="btn btn-primary btn-sm" id="btn-git-push" style="display: inline-flex; align-items: center; gap: 6px;">
                  ${icons.arrowUp(13)}
                  <span>Push</span>
                </button>
                <button class="btn btn-secondary btn-sm" id="btn-git-pull" style="display: inline-flex; align-items: center; gap: 6px;">
                  ${icons.arrowDown(13)}
                  <span>Pull</span>
                </button>
                <button class="btn btn-secondary btn-sm" id="btn-open-github" title="Abrir en GitHub">
                  ${icons.external(12)}
                  <span>GitHub</span>
                </button>
              </div>

              <div class="dev-footer-more-actions">
                <button class="btn btn-ghost btn-sm btn-icon" id="btn-refresh-git" title="Refrescar estado de Git">
                  ${icons.refresh(13)}
                </button>
                <div style="position: relative;">
                  <button class="btn btn-ghost btn-sm" id="btn-git-menu" title="Más opciones" style="padding: 4px 8px; font-weight: 700; letter-spacing: 1px;">
                    ···
                  </button>
                  <div class="dropdown-menu-custom" id="git-dropdown-menu" style="display: none;">
                    <button class="dropdown-item" id="btn-disconnect-remote">
                      ${icons.link(13)}
                      <span>Desconectar repositorio</span>
                    </button>
                    <button class="dropdown-item danger" id="btn-remove-git">
                      ${icons.trash(13)}
                      <span>Quitar Git del proyecto</span>
                    </button>
                  </div>
                </div>
              </div>
            ` : `
              <button class="btn btn-primary btn-sm" id="btn-connect-repo">
                ${icons.github(13)}
                <span>Conectar con GitHub</span>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon" id="btn-refresh-git" title="Refrescar">
                ${icons.refresh(13)}
              </button>
            `}
          ` : `
            <button class="btn btn-primary btn-sm" id="btn-init-git">
              ${icons.code(13)}
              <span>Inicializar Git</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-connect-repo">
              ${icons.github(13)}
              <span>Conectar con GitHub</span>
            </button>
          `}
        </div>
      </div>
    `;
  }

  // C. Sprint & Metrics Card
  private static renderSprintCardHtml(
    completionRate: number,
    counts: { all: number; todo: number; in_progress: number; done: number },
    specs: ProductSpec,
    project: any
  ): string {
    return `
      <div class="dev-card">
        <div class="dev-card-header">
          <div class="dev-card-title-group">
            <div class="dev-card-icon-bubble kanban">
              ${icons.columns(18)}
            </div>
            <div>
              <h3 class="dev-card-title">Sprint & Tareas de Desarrollo</h3>
              <span class="dev-card-subtitle">Seguimiento de tareas y avance técnico</span>
            </div>
          </div>

          <span class="dev-status-pill neutral">
            <strong>${counts.all}</strong> ${counts.all === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>

        <div class="dev-card-body">
          <div class="dev-progress-box">
            <div class="dev-progress-header">
              ${counts.all > 0 ? `
                <span class="dev-progress-big">${completionRate}%</span>
                <span class="dev-progress-label">del desarrollo completado</span>
              ` : `
                <span class="dev-progress-big" style="font-size: 16px; font-weight: 700; color: var(--text-muted);">No hay tareas</span>
                <span class="dev-progress-label">Crea tareas para medir el avance</span>
              `}
            </div>
            <div class="dev-progress-bar-modern">
              <div class="dev-progress-fill-modern" style="width: ${counts.all > 0 ? completionRate : 0}%;"></div>
            </div>
          </div>

          <!-- Pastillas de estado interactivas -->
          <div class="dev-task-pills-row">
            <div class="dev-task-pill" id="pill-filter-todo" title="Ver tareas por hacer en Kanban">
              <span class="task-dot todo"></span>
              <span class="task-pill-count">${counts.todo}</span>
              <span class="task-pill-name">Por hacer</span>
            </div>
            <div class="dev-task-pill" id="pill-filter-in-progress" title="Ver tareas en progreso en Kanban">
              <span class="task-dot in_progress"></span>
              <span class="task-pill-count">${counts.in_progress}</span>
              <span class="task-pill-name">En progreso</span>
            </div>
            <div class="dev-task-pill" id="pill-filter-done" title="Ver tareas completadas en Kanban">
              <span class="task-dot done"></span>
              <span class="task-pill-count">${counts.done}</span>
              <span class="task-pill-name">Completadas</span>
            </div>
          </div>

          <!-- Resumen del Producto -->
          <div class="dev-spec-snippet">
            <div class="dev-spec-snippet-header">
              <span class="dev-spec-tag">Producto</span>
              <a href="#" id="link-jump-specs" class="dev-spec-link" title="Ir a Especificaciones">
                <span>Ver especificaciones</span>
                ${icons.chevronRight(11)}
              </a>
            </div>
            <p class="dev-spec-text">
              ${specs.what_is_it || project.description || 'Sin definición detallada aún. Pulsa en especificaciones para definir objetivos y público.'}
            </p>
          </div>
        </div>

        <div class="dev-card-footer">
          <button class="btn btn-primary btn-sm" id="btn-jump-kanban" style="display: inline-flex; align-items: center; gap: 6px;">
            ${icons.columns(13)}
            <span>Abrir Tablero Kanban</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-quick-new-task" style="display: inline-flex; align-items: center; gap: 6px;">
            ${icons.plus(13)}
            <span>Añadir tarea</span>
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 2. RENDER VISTA "TODO" (PANEL COMPLETO)
  // ==========================================
  private static renderAllView(
    project: any,
    settings: any,
    specs: ProductSpec,
    gitStatus: GitStatusResult | null,
    folderExists: boolean,
    counts: { all: number; todo: number; in_progress: number; done: number },
    completionRate: number,
    allTasks: Task[],
    githubAccount?: GitHubAccount | null,
    detectedBuilds: DetectedBuildItem[] = []
  ): string {
    const editor = settings.configuredEditor || { id: 'code', name: 'Visual Studio Code', command: 'code' };

    // Git Status
    const isGit = gitStatus?.isGitRepo;
    const isConnectedToGitHub = gitStatus?.connectedToGitHub;
    const gitBranch = gitStatus?.currentBranch || 'main';
    const gitChanges = gitStatus?.statusText || (isGit ? 'Sin cambios pendientes' : 'No inicializado');

    return `
      <div class="dev-overview-wrapper">
        <!-- 1. Barra de Entorno de Código -->
        ${this.renderWorkspaceStripHtml(project, editor, folderExists)}

        <!-- 2. Rejilla de Métricas & Git (2 Tarjetas) -->
        <div class="dev-dashboard-grid">
          ${this.renderGitCardHtml(isGit, isConnectedToGitHub, gitStatus, gitBranch, gitChanges, githubAccount)}
          ${this.renderSprintCardHtml(completionRate, counts, specs, project)}
        </div>

        <!-- 3. Sección Todo: Tablero Kanban Completo -->
        <div class="dev-all-section">
          <div class="dev-all-section-header">
            <div class="dev-all-section-title-group">
              <div class="dev-card-icon-bubble kanban" style="width: 34px; height: 34px;">
                ${icons.columns(16)}
              </div>
              <div>
                <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0;">
                  Tablero de Tareas (${counts.all})
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Tareas activas del desarrollo y flujo de trabajo
                </span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-open-full-kanban">
              ${icons.columns(13)}
              <span>Ver solo Tareas</span>
            </button>
          </div>

          ${this.renderKanbanView(allTasks, counts, completionRate)}
        </div>

        <!-- 4. Sección Todo: Ficha de Especificaciones del Producto -->
        <div class="dev-all-section">
          <div class="dev-all-section-header">
            <div class="dev-all-section-title-group">
              <div class="dev-card-icon-bubble" style="width: 34px; height: 34px; background: rgba(59, 130, 246, 0.08); color: #3B82F6; border: 1px solid rgba(59, 130, 246, 0.2);">
                ${icons.fileText(16)}
              </div>
              <div>
                <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0;">
                  Especificaciones & Visión del Producto
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Definición conceptual y objetivos clave del proyecto
                </span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-open-full-specs">
              ${icons.edit(13)}
              <span>Editar Especificaciones</span>
            </button>
          </div>

          <div class="dev-specs-preview-grid">
            <div class="specs-preview-card">
              <span class="specs-preview-label">${t('dev.specsWhatIsIt')}</span>
              <p class="specs-preview-val">${specs.what_is_it || project.description || 'Sin especificar todavía.'}</p>
            </div>
            <div class="specs-preview-card">
              <span class="specs-preview-label">${t('dev.specsProblemSolved')}</span>
              <p class="specs-preview-val">${specs.problem_solved || 'Sin especificar todavía.'}</p>
            </div>
            <div class="specs-preview-card">
              <span class="specs-preview-label">${t('dev.specsTargetAudience')}</span>
              <p class="specs-preview-val">${specs.target_audience || 'Sin especificar todavía.'}</p>
            </div>
            <div class="specs-preview-card">
              <span class="specs-preview-label">${t('dev.specsGoals')}</span>
              <p class="specs-preview-val">${specs.goals || 'Sin especificar todavía.'}</p>
            </div>
          </div>
        </div>

        <!-- 5. Sección Todo: Build & Programa Lanzado (.exe) -->
        <div class="dev-all-section">
          <div class="dev-all-section-header">
            <div class="dev-all-section-title-group">
              <div class="dev-card-icon-bubble" style="width: 34px; height: 34px; background: rgba(16, 185, 129, 0.08); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2);">
                ${icons.package(16)}
              </div>
              <div>
                <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0;">
                  Build & Programa Lanzado (.exe)
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  ${specs.build_info?.executablePath ? `Ejecutable vinculado: ${specs.build_info.executableName || 'App.exe'}` : 'Sin ejecutable vinculado todavía'}
                </span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-jump-build-tab">
              ${icons.package(13)}
              <span>Ver sección Build & .exe</span>
            </button>
          </div>

          <div class="dev-build-summary-box">
            ${specs.build_info?.executablePath ? `
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px 16px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                  <div style="width: 38px; height: 38px; border-radius: var(--radius-sm); background: rgba(16, 185, 129, 0.1); color: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    ${icons.play(16)}
                  </div>
                  <div style="min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <strong style="font-size: 14px; color: var(--text-primary);">${specs.build_info.executableName || 'Programa.exe'}</strong>
                      <span class="dev-status-pill success" style="font-size: 10px; padding: 1px 6px;">Listo</span>
                      <span style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: var(--bg-app); border: 1px solid var(--border-subtle); color: var(--text-secondary);">v${specs.build_info.version || '1.0.0'}</span>
                    </div>
                    <span style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; max-width: 500px;" title="${specs.build_info.executablePath}">${specs.build_info.executablePath}</span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="btn btn-primary btn-sm" id="btn-quick-launch-exe" style="display: inline-flex; align-items: center; gap: 6px;">
                    ${icons.play(13)}
                    <span>Lanzar programa (.exe)</span>
                  </button>
                  <button class="btn btn-secondary btn-sm btn-icon" id="btn-quick-open-exe-folder" title="Abrir carpeta en el Explorador">
                    ${icons.folder(13)}
                  </button>
                </div>
              </div>
            ` : `
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px 16px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                <div>
                  <strong style="font-size: 13.5px; color: var(--text-primary); display: block; margin-bottom: 2px;">Compilación y Ejecutables (.exe)</strong>
                  <span style="font-size: 12px; color: var(--text-secondary);">Vincula tu archivo ejecutable o instalador para lanzarlo directamente desde Nubo.</span>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-jump-build-tab-2" style="display: inline-flex; align-items: center; gap: 6px;">
                  ${icons.plus(13)}
                  <span>Configurar Build & .exe</span>
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 3. RENDER VISTA DEDICADA "CÓDIGO & GIT"
  // ==========================================
  private static renderCodeAndGit(
    project: any,
    settings: any,
    gitStatus: GitStatusResult | null,
    folderExists: boolean,
    githubAccount?: GitHubAccount | null
  ): string {
    const editor = settings.configuredEditor || { id: 'code', name: 'Visual Studio Code', command: 'code' };

    // Git Status
    const isGit = gitStatus?.isGitRepo;
    const isConnectedToGitHub = gitStatus?.connectedToGitHub;
    const gitBranch = gitStatus?.currentBranch || 'main';
    const gitChanges = gitStatus?.statusText || (isGit ? 'Sin cambios pendientes' : 'No inicializado');

    return `
      <div class="dev-code-section-wrapper">
        <!-- 1. Barra de Entorno de Código -->
        ${this.renderWorkspaceStripHtml(project, editor, folderExists)}

        <!-- 2. Grid enfocado de Código & Git -->
        <div class="dev-code-grid">
          <!-- Tarjeta 1: GitHub & Control de Versiones -->
          ${this.renderGitCardHtml(isGit, isConnectedToGitHub, gitStatus, gitBranch, gitChanges, githubAccount)}

          <!-- Tarjeta 2: Herramientas del Entorno Local -->
          <div class="dev-card">
            <div class="dev-card-header">
              <div class="dev-card-title-group">
                <div class="dev-card-icon-bubble" style="background: rgba(99, 102, 241, 0.08); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2);">
                  ${icons.terminal(18)}
                </div>
                <div>
                  <h3 class="dev-card-title">Herramientas & Terminal</h3>
                  <span class="dev-card-subtitle">Accesos rápidos a tu espacio local</span>
                </div>
              </div>
            </div>

            <div class="dev-card-body">
              <div class="dev-tools-list">
                <div class="dev-tool-row">
                  <div class="dev-tool-info">
                    <strong>Editor predeterminado</strong>
                    <span>${editor.name}</span>
                  </div>
                  <button class="btn btn-secondary btn-sm" id="btn-open-in-editor">
                    ${icons.code(13)}
                    <span>Abrir</span>
                  </button>
                </div>

                <div class="dev-tool-row">
                  <div class="dev-tool-info">
                    <strong>Terminal de comandos</strong>
                    <span>Terminal / PowerShell en la carpeta raíz</span>
                  </div>
                  <button class="btn btn-secondary btn-sm" id="btn-open-terminal">
                    ${icons.terminal(13)}
                    <span>Abrir</span>
                  </button>
                </div>

                <div class="dev-tool-row">
                  <div class="dev-tool-info">
                    <strong>Explorador de archivos</strong>
                    <span>Carpeta Development/Proyecto en Windows</span>
                  </div>
                  <button class="btn btn-secondary btn-sm" id="btn-open-folder">
                    ${icons.folder(13)}
                    <span>Ver</span>
                  </button>
                </div>
              </div>

              <div class="dev-code-tip-box">
                <span class="dev-tip-title">ℹ️ Aislamiento de código</span>
                <p class="dev-tip-desc">
                  Solo los archivos dentro de la subcarpeta <code>Development/Proyecto</code> forman parte del repositorio Git y se sincronizan con GitHub. Los documentos, notas y recursos de Nubo permanecen privados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Alias for backward compatibility
  private static renderControlCenter(
    project: any,
    settings: any,
    specs: ProductSpec,
    gitStatus: GitStatusResult | null,
    folderExists: boolean,
    counts: { all: number; todo: number; in_progress: number; done: number },
    completionRate: number,
    allTasks: Task[] = []
  ): string {
    return this.renderAllView(project, settings, specs, gitStatus, folderExists, counts, completionRate, allTasks);
  }

  // ==========================================
  // 2. RENDER ESPECIFICACIONES (PRODUCTO)
  // ==========================================
  private static renderSpecifications(specs: ProductSpec): string {
    return `
      <div class="dev-specs-container">
        <!-- Specs Header & Save Action -->
        <div class="dev-specs-header">
          <div>
            <h2 style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px 0;">
              ${t('dev.tabSpecs')}
            </h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
              Define con claridad qué estás construyendo, qué problema resuelve, a quién va dirigido y tus objetivos principales.
            </p>
          </div>

          <button class="btn btn-primary" id="btn-save-specs">
            ${icons.check(14)}
            <span>${t('dev.specsSave')}</span>
          </button>
        </div>

        <!-- Specs Fields Grid -->
        <div class="dev-specs-grid">
          <!-- Qué es el producto -->
          <div class="specs-field-card">
            <div class="specs-field-title-group">
              <span class="specs-field-title">${t('dev.specsWhatIsIt')}</span>
              <span class="specs-field-desc">${t('dev.specsWhatIsItDesc')}</span>
            </div>
            <textarea class="specs-textarea" id="spec-what-is-it" placeholder="Ej: Nubo es un workspace personal para desarrolladores y creadores...">${specs.what_is_it || ''}</textarea>
          </div>

          <!-- Qué problema resuelve -->
          <div class="specs-field-card">
            <div class="specs-field-title-group">
              <span class="specs-field-title">${t('dev.specsProblemSolved')}</span>
              <span class="specs-field-desc">${t('dev.specsProblemSolvedDesc')}</span>
            </div>
            <textarea class="specs-textarea" id="spec-problem-solved" placeholder="Ej: Elimina la dispersión de información y archivos del proyecto...">${specs.problem_solved || ''}</textarea>
          </div>

          <!-- Público objetivo -->
          <div class="specs-field-card">
            <div class="specs-field-title-group">
              <span class="specs-field-title">${t('dev.specsTargetAudience')}</span>
              <span class="specs-field-desc">${t('dev.specsTargetAudienceDesc')}</span>
            </div>
            <textarea class="specs-textarea" id="spec-target-audience" placeholder="Ej: Desarrolladores independientes, solopreneurs, makers...">${specs.target_audience || ''}</textarea>
          </div>

          <!-- Objetivos -->
          <div class="specs-field-card">
            <div class="specs-field-title-group">
              <span class="specs-field-title">${t('dev.specsGoals')}</span>
              <span class="specs-field-desc">${t('dev.specsGoalsDesc')}</span>
            </div>
            <textarea class="specs-textarea" id="spec-goals" placeholder="Ej: 1. Velocidad extrema en la gestión diaria. 2. Control total del código...">${specs.goals || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 3. RENDER VISTA DEDICADA "BUILD & .EXE"
  // ==========================================
  private static renderBuildView(
    project: any,
    settings: any,
    specs: ProductSpec,
    devCodePath: string,
    detectedBuilds: DetectedBuildItem[] = []
  ): string {
    const buildInfo = specs.build_info || {};
    const isExeLinked = Boolean(buildInfo.executablePath);

    return `
      <div class="dev-build-container">
        <!-- 1. Header Hero de Build -->
        <div class="dev-build-header">
          <div>
            <h2 style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px 0;">
              ${t('dev.buildTitle') || 'Build & Programa Lanzado (.exe)'}
            </h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
              ${t('dev.buildSubtitle') || 'Lanza tu aplicación compilada, configura comandos de empaquetado y genera instaladores (.exe / .msi).'}
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-secondary btn-sm" id="btn-scan-builds" style="display: inline-flex; align-items: center; gap: 6px;">
              ${icons.refresh(13)}
              <span>Escanear builds</span>
            </button>
            <button class="btn btn-primary btn-sm" id="btn-save-build-config" style="display: inline-flex; align-items: center; gap: 6px;">
              ${icons.check(14)}
              <span>Guardar configuración</span>
            </button>
          </div>
        </div>

        <div class="dev-build-grid">
          <!-- 2. Tarjeta Programa Lanzado / Ejecutable Principal -->
          <div class="dev-card ${isExeLinked ? 'dev-card-highlight' : ''}">
            <div class="dev-card-header">
              <div class="dev-card-title-group">
                <div class="dev-card-icon-bubble" style="background: rgba(16, 185, 129, 0.08); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2);">
                  ${icons.play(18)}
                </div>
                <div>
                  <h3 class="dev-card-title">Programa Lanzado / Ejecutable Principal</h3>
                  <span class="dev-card-subtitle">Acceso directo para ejecutar la versión compilada de tu software</span>
                </div>
              </div>

              ${isExeLinked ? `
                <span class="dev-status-pill success">
                  <span class="pulse-dot"></span>
                  Ejecutable listo
                </span>
              ` : `
                <span class="dev-status-pill neutral">Sin vincular</span>
              `}
            </div>

            <div class="dev-card-body">
              ${isExeLinked ? `
                <div class="dev-exe-hero-box">
                  <div class="dev-exe-hero-left">
                    <div class="dev-exe-hero-icon">
                      ${icons.package(26)}
                    </div>
                    <div class="dev-exe-hero-details">
                      <div class="dev-exe-hero-title-row">
                        <strong class="dev-exe-name">${buildInfo.executableName || 'Programa.exe'}</strong>
                        <span class="dev-exe-version-badge">v${buildInfo.version || '1.0.0'}</span>
                        <span class="dev-exe-type-badge">${(buildInfo.installerType || '').includes('NSIS') || (buildInfo.executableName || '').toLowerCase().includes('setup') ? 'Instalador' : 'Ejecutable'}</span>
                      </div>
                      <div class="dev-exe-path-row">
                        <span class="dev-exe-path" title="${buildInfo.executablePath}">${buildInfo.executablePath}</span>
                      </div>
                    </div>
                  </div>

                  <div class="dev-exe-hero-actions">
                    <button class="btn btn-primary" id="btn-launch-main-exe" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; padding: 10px 22px; font-size: 14px;">
                      ${icons.play(16)}
                      <span>Lanzar programa (.exe)</span>
                    </button>
                  </div>
                </div>
              ` : `
                <div class="dev-empty-box" style="padding: 28px 20px; text-align: center; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-app);">
                  <div style="margin: 0 auto 12px auto; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); color: var(--text-muted); border: 1px solid var(--border-subtle);">
                    ${icons.package(22)}
                  </div>
                  <h4 style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 6px 0;">No hay ningún ejecutable (.exe) vinculado</h4>
                  <p style="font-size: 12.5px; color: var(--text-secondary); max-width: 460px; margin: 0 auto 16px auto;">
                    Selecciona el archivo ejecutable o instalador de tu programa para poder lanzarlo con un solo clic, o fíjalo desde la lista de builds detectados.
                  </p>
                  <div style="display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;">
                    <button class="btn btn-primary btn-sm" id="btn-browse-main-exe" style="display: inline-flex; align-items: center; gap: 6px;">
                      ${icons.plus(13)}
                      <span>Vincular archivo .exe o Instalador</span>
                    </button>
                    <button class="btn btn-secondary btn-sm" id="btn-open-dev-build-folder" style="display: inline-flex; align-items: center; gap: 6px;">
                      ${icons.folder(13)}
                      <span>Abrir carpeta Development/Build</span>
                    </button>
                  </div>
                </div>
              `}
            </div>

            ${isExeLinked ? `
              <div class="dev-card-footer">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="btn btn-secondary btn-sm" id="btn-open-main-exe-folder" style="display: inline-flex; align-items: center; gap: 6px;">
                    ${icons.folder(13)}
                    <span>Abrir carpeta</span>
                  </button>
                  <button class="btn btn-secondary btn-sm" id="btn-browse-main-exe" style="display: inline-flex; align-items: center; gap: 6px;">
                    ${icons.edit(13)}
                    <span>Cambiar ejecutable</span>
                  </button>
                </div>
                <button class="btn btn-ghost btn-sm danger" id="btn-unlink-main-exe" style="display: inline-flex; align-items: center; gap: 5px;">
                  ${icons.trash(12)}
                  <span>Desvincular</span>
                </button>
              </div>
            ` : ''}
          </div>

          <!-- 3. Tarjeta Compilación & Creación de Instalador -->
          <div class="dev-card">
            <div class="dev-card-header">
              <div class="dev-card-title-group">
                <div class="dev-card-icon-bubble" style="background: rgba(245, 158, 11, 0.08); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2);">
                  ${icons.terminal(18)}
                </div>
                <div>
                  <h3 class="dev-card-title">Compilación & Creación de Instalador</h3>
                  <span class="dev-card-subtitle">Flujo de empaquetado para generar ejecutables e instaladores distribuidos</span>
                </div>
              </div>
            </div>

            <div class="dev-card-body">
              <div class="dev-build-form-grid">
                <!-- Comando de Build -->
                <div class="dev-build-form-field full-width">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                    <label style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin: 0;">
                      Comando de compilación / empaquetado
                    </label>
                    <!-- Presets rápidos -->
                    <div class="dev-build-presets" style="display: flex; gap: 5px; flex-wrap: wrap;">
                      <button type="button" class="btn btn-ghost btn-xs btn-preset-cmd" data-cmd="npm run build" style="font-size: 11px; padding: 2px 7px;">npm run build</button>
                      <button type="button" class="btn btn-ghost btn-xs btn-preset-cmd" data-cmd="npx electron-builder --win" style="font-size: 11px; padding: 2px 7px;">Electron Builder</button>
                      <button type="button" class="btn btn-ghost btn-xs btn-preset-cmd" data-cmd="cargo build --release" style="font-size: 11px; padding: 2px 7px;">Rust / Tauri</button>
                      <button type="button" class="btn btn-ghost btn-xs btn-preset-cmd" data-cmd="pyinstaller --noconsole --onefile main.py" style="font-size: 11px; padding: 2px 7px;">PyInstaller</button>
                    </div>
                  </div>
                  <div>
                    <input type="text" class="form-input" id="build-cmd-input" value="${buildInfo.buildCommand || 'npm run build'}" placeholder="Ej: npm run build o npx electron-builder --win" style="font-family: var(--font-mono); font-size: 12.5px; width: 100%; box-sizing: border-box;" />
                  </div>
                </div>

                <!-- Versión y Tipo de Instalador -->
                <div class="dev-build-form-field">
                  <label style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">
                    Versión del producto
                  </label>
                  <input type="text" class="form-input" id="build-version-input" value="${buildInfo.version || '1.0.0'}" placeholder="1.0.0" style="font-size: 12.5px; width: 100%; box-sizing: border-box;" />
                </div>

                <div class="dev-build-form-field">
                  <label style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">
                    Tipo de instalador / Formato
                  </label>
                  <select class="form-input" id="build-installer-type-select" style="font-size: 12.5px; width: 100%; box-sizing: border-box;">
                    <option value="Instalador NSIS / Setup.exe" ${(buildInfo.installerType || '').includes('NSIS') ? 'selected' : ''}>Instalador NSIS (Setup.exe con asistente)</option>
                    <option value="Inno Setup (.exe)" ${(buildInfo.installerType || '').includes('Inno') ? 'selected' : ''}>Inno Setup (.exe)</option>
                    <option value="Instalador MSI (.msi)" ${(buildInfo.installerType || '').includes('MSI') ? 'selected' : ''}>Instalador MSI (.msi para Windows)</option>
                    <option value="Portable (.exe sin instalador)" ${(buildInfo.installerType || '').includes('Portable') ? 'selected' : ''}>Portable (.exe directo sin instalación)</option>
                    <option value="ZIP comprimido (.zip)" ${(buildInfo.installerType || '').includes('ZIP') ? 'selected' : ''}>Paquete ZIP comprimido</option>
                  </select>
                </div>

                <!-- Carpeta de salida -->
                <div class="dev-build-form-field full-width">
                  <label style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">
                    Carpeta de salida (dist / release / build)
                  </label>
                  <input type="text" class="form-input" id="build-output-dir-input" value="${buildInfo.outputDir || 'dist'}" placeholder="dist o Development/Build" style="font-size: 12.5px; width: 100%; box-sizing: border-box;" />
                </div>

                <!-- Notas de versión / Changelog -->
                <div class="dev-build-form-field full-width">
                  <label style="font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; display: block;">
                    Notas de la versión / Changelog
                  </label>
                  <textarea class="specs-textarea" id="build-release-notes" placeholder="Novedades, mejoras y correcciones de esta versión..." style="min-height: 80px; width: 100%; box-sizing: border-box;">${buildInfo.releaseNotes || ''}</textarea>
                </div>
              </div>

              <!-- Guía Rápida para Crear Instaladores -->
              <div class="dev-installer-guide-section" style="margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
                <h4 style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 0 0 10px 0;">
                  💡 Guía rápida para crear instaladores (.exe / .msi)
                </h4>
                <div class="dev-installer-guide-grid">
                  <div class="installer-guide-card">
                    <strong>Electron (electron-builder)</strong>
                    <p>Genera un instalador NSIS (.exe) automático para Windows:</p>
                    <code>npx electron-builder --win</code>
                  </div>
                  <div class="installer-guide-card">
                    <strong>Inno Setup</strong>
                    <p>Software gratuito para empaquetar cualquier carpeta o .exe en un instalador profesional con desinstalador:</p>
                    <a href="https://jrsoftware.org/isinfo.php" target="_blank" style="color: var(--accent-primary); font-size: 11.5px; text-decoration: underline;">Descargar Inno Setup</a>
                  </div>
                  <div class="installer-guide-card">
                    <strong>Python (PyInstaller)</strong>
                    <p>Empaqueta un script de Python con dependencias en un ejecutable único:</p>
                    <code>pyinstaller --noconsole --onefile app.py</code>
                  </div>
                </div>
              </div>
            </div>

            <div class="dev-card-footer">
              <div style="display: flex; align-items: center; gap: 8px;">
                <button class="btn btn-primary btn-sm" id="btn-open-build-terminal" style="display: inline-flex; align-items: center; gap: 6px;">
                  ${icons.terminal(13)}
                  <span>Abrir terminal para compilar</span>
                </button>
                <button class="btn btn-secondary btn-sm" id="btn-open-dist-folder" style="display: inline-flex; align-items: center; gap: 6px;">
                  ${icons.folder(13)}
                  <span>Abrir carpeta de salida</span>
                </button>
              </div>
              <button class="btn btn-primary btn-sm" id="btn-save-build-config-bottom">
                ${icons.check(13)}
                <span>Guardar cambios</span>
              </button>
            </div>
          </div>

          <!-- 4. Tarjeta Builds e Instaladores Detectados en Disco -->
          <div class="dev-card">
            <div class="dev-card-header">
              <div class="dev-card-title-group">
                <div class="dev-card-icon-bubble" style="background: rgba(14, 165, 233, 0.08); color: #0ea5e9; border: 1px solid rgba(14, 165, 233, 0.2);">
                  ${icons.box(18)}
                </div>
                <div>
                  <h3 class="dev-card-title">Builds e Instaladores Detectados en Disco (${detectedBuilds.length})</h3>
                  <span class="dev-card-subtitle">Archivos ejecutables (.exe, .msi, .zip) encontrados en las carpetas de compilación</span>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm btn-icon" id="btn-refresh-builds-list" title="Volver a escanear disco">
                ${icons.refresh(13)}
              </button>
            </div>

            <div class="dev-card-body" style="padding: ${detectedBuilds.length > 0 ? '0' : '20px'};">
              ${detectedBuilds.length > 0 ? `
                <div class="dev-builds-table">
                  ${detectedBuilds.map(b => `
                    <div class="dev-build-row ${buildInfo.executablePath === b.path ? 'is-main-exe' : ''}">
                      <div class="dev-build-left">
                        <div class="dev-build-badge ${b.kind}">
                          ${b.kind === 'installer' ? 'INSTALADOR' : b.kind === 'executable' ? 'EXE' : 'ZIP'}
                        </div>
                        <div class="dev-build-info">
                          <div class="dev-build-name-row">
                            <strong class="dev-build-file-name">${b.name}</strong>
                            ${buildInfo.executablePath === b.path ? `
                              <span class="dev-status-pill success" style="font-size: 10px; padding: 1px 6px;">Principal</span>
                            ` : ''}
                          </div>
                          <div class="dev-build-meta-row">
                            <span class="dev-build-folder-pill">${b.folder}</span>
                            <span class="dev-build-dot">·</span>
                            <span class="dev-build-size">${b.sizeFormatted}</span>
                            <span class="dev-build-dot">·</span>
                            <span class="dev-build-date">${new Date(b.modifiedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div class="dev-build-actions">
                        <button class="btn btn-primary btn-xs btn-launch-detected-exe" data-path="${b.path}" style="display: inline-flex; align-items: center; gap: 5px;">
                          ${icons.play(12)}
                          <span>Lanzar</span>
                        </button>
                        <button class="btn btn-secondary btn-xs btn-open-detected-folder" data-path="${b.path}" title="Ver en el Explorador de Windows">
                          ${icons.folder(12)}
                          <span>Carpeta</span>
                        </button>
                        ${buildInfo.executablePath !== b.path ? `
                          <button class="btn btn-ghost btn-xs btn-set-main-exe" data-path="${b.path}" data-name="${b.name}" title="Fijar como ejecutable principal de lanzamiento">
                            ${icons.target(12)}
                            <span>Fijar principal</span>
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="dev-empty-box" style="padding: 24px; text-align: center; background: var(--bg-app); border-radius: var(--radius-md);">
                  <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 10px 0;">
                    No se han detectado archivos .exe en las carpetas habituales (dist, release, build).
                  </p>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 14px 0;">
                    Puedes compilar tu proyecto desde el botón superior o colocar manualmente el instalador en <code>Development/Build</code>.
                  </p>
                  <button class="btn btn-secondary btn-sm" id="btn-open-dev-build-folder-2">
                    ${icons.folder(13)}
                    <span>Abrir carpeta Development/Build</span>
                  </button>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 3. RENDER TABLERO KANBAN (EXISTENTE Y PULIDO)
  // ==========================================
  private static renderKanbanView(
    allTasks: Task[],
    counts: { all: number; todo: number; in_progress: number; done: number },
    completionRate: number
  ): string {
    const query = DevelopmentPage.searchQuery.trim().toLowerCase();
    const filteredTasks = allTasks.filter(task => {
      if (DevelopmentPage.filterStatus !== 'all' && task.status !== DevelopmentPage.filterStatus) return false;
      if (DevelopmentPage.filterPriority !== 'all' && task.priority !== DevelopmentPage.filterPriority) return false;
      if (DevelopmentPage.filterType !== 'all' && task.type !== DevelopmentPage.filterType) return false;
      if (query) {
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        const matchesTag = Array.isArray(task.tags) && task.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTag) return false;
      }
      return true;
    });

    const columns: Array<{ id: 'todo' | 'in_progress' | 'done'; title: string; color: string }> = [
      { id: 'todo', title: t('dev.colTodo'), color: '#64748B' },
      { id: 'in_progress', title: t('dev.colInProgress'), color: '#F59E0B' },
      { id: 'done', title: t('dev.colDone'), color: '#10B981' }
    ];

    return `
      <!-- Progress Overview Banner -->
      <div class="dev-progress-banner">
        <div class="dev-progress-info">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap;">
            ${counts.all > 0 ? `${completionRate}% completado` : 'No hay tareas'}
          </span>
          <div class="dev-progress-track">
            <div class="dev-progress-fill" style="width: ${counts.all > 0 ? completionRate : 0}%;"></div>
          </div>
        </div>
        <div class="dev-progress-counts">
          <div class="dev-progress-stat">
            <span class="dev-stat-dot todo"></span>
            <span><strong>${counts.todo}</strong> ${t('dev.filterTodo')}</span>
          </div>
          <div class="dev-progress-stat">
            <span class="dev-stat-dot in_progress"></span>
            <span><strong>${counts.in_progress}</strong> ${t('dev.filterInProgress')}</span>
          </div>
          <div class="dev-progress-stat">
            <span class="dev-stat-dot done"></span>
            <span><strong>${counts.done}</strong> ${t('dev.filterDone')}</span>
          </div>
        </div>
      </div>

      <!-- Search & Filter Bar -->
      <div class="dev-toolbar">
        <div class="dev-toolbar-left">
          <div class="dev-search-box">
            <span class="dev-search-icon">${icons.search(14)}</span>
            <input 
              type="text" 
              class="dev-search-input" 
              id="dev-search-input" 
              placeholder="${t('dev.searchPlaceholder')}" 
              value="${DevelopmentPage.searchQuery}"
            />
            ${DevelopmentPage.searchQuery ? `
              <button class="dev-search-clear" id="dev-search-clear" title="Clear">
                ${icons.close(13)}
              </button>
            ` : ''}
          </div>

          <div class="dev-filter-group">
            <select class="dev-filter-select ${DevelopmentPage.filterPriority !== 'all' ? 'active' : ''}" id="dev-filter-priority">
              <option value="all">${t('dev.priorityFilter')}: ${t('common.all') || 'Todas'}</option>
              <option value="urgent" ${DevelopmentPage.filterPriority === 'urgent' ? 'selected' : ''}>🔴 ${t('priority.urgent') || 'Urgente'}</option>
              <option value="high" ${DevelopmentPage.filterPriority === 'high' ? 'selected' : ''}>🟠 ${t('priority.high') || 'Alta'}</option>
              <option value="medium" ${DevelopmentPage.filterPriority === 'medium' ? 'selected' : ''}>🟡 ${t('priority.medium') || 'Media'}</option>
              <option value="low" ${DevelopmentPage.filterPriority === 'low' ? 'selected' : ''}>⚪ ${t('priority.low') || 'Baja'}</option>
            </select>

            <select class="dev-filter-select ${DevelopmentPage.filterType !== 'all' ? 'active' : ''}" id="dev-filter-type">
              <option value="all">${t('dev.typeFilter')}: ${t('common.all') || 'Todos'}</option>
              <option value="task" ${DevelopmentPage.filterType === 'task' ? 'selected' : ''}>📋 ${t('type.task') || 'Tarea'}</option>
              <option value="feature" ${DevelopmentPage.filterType === 'feature' ? 'selected' : ''}>✨ ${t('type.feature') || 'Feature'}</option>
              <option value="bug" ${DevelopmentPage.filterType === 'bug' ? 'selected' : ''}>🐞 ${t('type.bug') || 'Bug'}</option>
              <option value="milestone" ${DevelopmentPage.filterType === 'milestone' ? 'selected' : ''}>🎯 ${t('type.milestone') || 'Hito'}</option>
            </select>

            ${(DevelopmentPage.filterPriority !== 'all' || DevelopmentPage.filterType !== 'all' || DevelopmentPage.searchQuery || DevelopmentPage.filterStatus !== 'all') ? `
              <button class="dev-btn-reset-filters" id="dev-btn-reset">
                ${icons.minus(11)} ${t('dev.clearFilters')}
              </button>
            ` : ''}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <!-- View Switcher -->
          <div class="dev-view-toggle">
            <button class="dev-view-btn ${DevelopmentPage.viewMode === 'kanban' ? 'active' : ''}" id="view-toggle-kanban" title="${t('dev.viewKanban')}">
              ${icons.columns(13)}
              <span>${t('dev.viewKanban')}</span>
            </button>
            <button class="dev-view-btn ${DevelopmentPage.viewMode === 'list' ? 'active' : ''}" id="view-toggle-list" title="${t('dev.viewList')}">
              ${icons.list(13)}
              <span>${t('dev.viewList')}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- KANBAN COLUMNS OR LIST -->
      ${DevelopmentPage.viewMode === 'kanban' ? `
        <div class="dev-kanban-board">
          ${columns.map(col => {
            const colTasks = filteredTasks.filter(item => item.status === col.id);
            const isQuickAddActive = DevelopmentPage.activeQuickAddCol === col.id;

            return `
              <div class="kanban-column" data-status="${col.id}">
                <div class="kanban-column-header">
                  <div class="kanban-column-title-group">
                    <span class="kanban-column-indicator"></span>
                    <span class="kanban-column-title">${col.title}</span>
                    <span class="kanban-column-count">${colTasks.length}</span>
                  </div>
                  <button class="kanban-btn-add-column btn-add-task-col" data-col="${col.id}" title="${t('dev.addTaskInCol')}">
                    ${icons.plus(14)}
                  </button>
                </div>

                <div class="kanban-column-body" data-status="${col.id}">
                  ${colTasks.length === 0 ? `
                    <div class="kanban-empty-state">
                      ${icons.columns(28)}
                      <p>${t('dev.emptyTasks')}</p>
                      <button class="btn-add-inline-task btn-quick-add-col" data-col="${col.id}">
                        ${t('dev.addTaskInCol')}
                      </button>
                    </div>
                  ` : colTasks.map(task => DevelopmentPage.renderKanbanCard(task)).join('')}
                </div>

                <div class="kanban-column-footer">
                  ${isQuickAddActive ? `
                    <div class="kanban-quick-add-form" data-col="${col.id}">
                      <input 
                        type="text" 
                        class="kanban-quick-add-input" 
                        placeholder="${t('dev.quickAddPlaceholder')}" 
                        data-col="${col.id}"
                        autofocus
                      />
                      <div class="kanban-quick-add-actions">
                        <button class="btn btn-secondary btn-sm btn-cancel-quick-add" data-col="${col.id}">
                          ${t('common.cancel')}
                        </button>
                        <button class="btn btn-primary btn-sm btn-save-quick-add" data-col="${col.id}">
                          ${t('common.save')}
                        </button>
                      </div>
                    </div>
                  ` : `
                    <button class="btn-column-quick-add btn-quick-add-col" data-col="${col.id}">
                      ${icons.plus(13)}
                      <span>${t('dev.addTaskInCol')}</span>
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="dev-list-view">
          <div class="project-tabs-nav" style="margin-bottom: var(--space-sm);">
            <button class="tab-btn ${DevelopmentPage.filterStatus === 'all' ? 'active' : ''}" data-status-tab="all">
              <span>${t('dev.filterAll')} (${counts.all})</span>
            </button>
            <button class="tab-btn ${DevelopmentPage.filterStatus === 'todo' ? 'active' : ''}" data-status-tab="todo">
              <span>${t('dev.filterTodo')} (${counts.todo})</span>
            </button>
            <button class="tab-btn ${DevelopmentPage.filterStatus === 'in_progress' ? 'active' : ''}" data-status-tab="in_progress">
              <span>${t('dev.filterInProgress')} (${counts.in_progress})</span>
            </button>
            <button class="tab-btn ${DevelopmentPage.filterStatus === 'done' ? 'active' : ''}" data-status-tab="done">
              <span>${t('dev.filterDone')} (${counts.done})</span>
            </button>
          </div>

          <div class="content-list">
            ${filteredTasks.length === 0 ? `
              <div class="empty-state">
                ${icons.code(36)}
                <h3>${t('dev.noTasksFound')}</h3>
                <p>${t('dev.noTasksFoundDesc')}</p>
              </div>
            ` : filteredTasks.map(task => DevelopmentPage.renderListRow(task)).join('')}
          </div>
        </div>
      `}
    `;
  }

  private static renderKanbanCard(task: Task): string {
    const isDone = task.status === 'done';

    let priorityClass = 'badge-priority low';
    let priorityLabel = t(('priority.' + task.priority) as any) || task.priority;
    if (task.priority === 'urgent') priorityClass = 'badge-priority urgent';
    else if (task.priority === 'high') priorityClass = 'badge-priority high';
    else if (task.priority === 'medium') priorityClass = 'badge-priority medium';

    const typeLabel = t(('type.' + task.type) as any) || task.type;
    let typeIcon = icons.checkCircle(11);
    if (task.type === 'feature') typeIcon = icons.sparkles(11);
    else if (task.type === 'bug') typeIcon = icons.bug(11);
    else if (task.type === 'milestone') typeIcon = icons.flag(11);

    const tagsHtml = (task.tags && Array.isArray(task.tags) && task.tags.length > 0)
      ? task.tags.map(tag => `<span class="card-tag-pill">#${tag}</span>`).join('')
      : '';

    let dueDateHtml = '';
    if (task.due_date) {
      dueDateHtml = `
        <span style="display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--text-muted);" title="Fecha límite">
          ${icons.clock(11)}
          <span>${task.due_date}</span>
        </span>
      `;
    }

    return `
      <div class="kanban-task-card" draggable="true" data-task-id="${task.id}">
        <div class="card-header-row">
          <div class="card-tags-badges">
            <span class="${priorityClass}">${priorityLabel}</span>
            <span class="badge-type ${task.type}">
              ${typeIcon}
              <span>${typeLabel}</span>
            </span>
          </div>

          <div class="card-actions-hover">
            <button class="card-btn-action btn-edit-task" data-task-id="${task.id}" title="${t('common.edit')}">
              ${icons.edit(12)}
            </button>
            <button class="card-btn-action delete btn-del-task" data-task-id="${task.id}" title="${t('common.delete')}">
              ${icons.trash(12)}
            </button>
            <div class="card-drag-grip" title="Arrastra para mover">${icons.grip(13)}</div>
          </div>
        </div>

        <div class="card-content-area">
          <div class="card-title-row">
            <input 
              type="checkbox" 
              class="card-checkbox task-row-checkbox" 
              data-task-id="${task.id}" 
              ${isDone ? 'checked' : ''} 
              title="${isDone ? 'Marcar pendiente' : 'Marcar completada'}"
            />
            <span class="card-title ${isDone ? 'completed' : ''}">${task.title}</span>
          </div>
          ${task.description ? `<p class="card-description">${task.description}</p>` : ''}
        </div>

        <div class="card-footer">
          <div class="card-footer-left">
            ${dueDateHtml}
            ${tagsHtml}
          </div>

          <select class="card-quick-move task-status-select" data-task-id="${task.id}" title="${(t as any)('dev.moveTo') || 'Mover a...'}">
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>${t('taskStatus.todo')}</option>
            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>${t('taskStatus.in_progress')}</option>
            <option value="done" ${task.status === 'done' ? 'selected' : ''}>${t('taskStatus.done')}</option>
          </select>
        </div>
      </div>
    `;
  }

  private static renderListRow(taskItem: Task): string {
    let priorityClass = '';
    if (taskItem.priority === 'urgent' || taskItem.priority === 'high') priorityClass = 'badge-danger';
    else if (taskItem.priority === 'medium') priorityClass = 'badge-warning';

    const isDone = taskItem.status === 'done';
    const priorityLabel = t(('priority.' + taskItem.priority) as any) || taskItem.priority;
    const typeLabel = t(('type.' + taskItem.type) as any) || taskItem.type;

    return `
      <div class="content-item-row" data-task-id="${taskItem.id}">
        <div class="content-row-left">
          <input 
            type="checkbox" 
            class="task-row-checkbox" 
            data-task-id="${taskItem.id}" 
            ${isDone ? 'checked' : ''} 
            style="cursor: pointer; width: 16px; height: 16px;" 
          />
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span class="content-item-title" style="${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
              ${taskItem.title}
            </span>
            ${taskItem.description ? `<span class="content-item-desc">${taskItem.description}</span>` : ''}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge ${priorityClass}">${priorityLabel}</span>
          <span class="badge">${typeLabel}</span>
          <select class="task-status-select" data-task-id="${taskItem.id}" style="padding: 2px 6px; font-size: 11px;">
            <option value="todo" ${taskItem.status === 'todo' ? 'selected' : ''}>${t('taskStatus.todo')}</option>
            <option value="in_progress" ${taskItem.status === 'in_progress' ? 'selected' : ''}>${t('taskStatus.in_progress')}</option>
            <option value="done" ${taskItem.status === 'done' ? 'selected' : ''}>${t('taskStatus.done')}</option>
          </select>
          <button class="btn btn-ghost btn-icon btn-sm btn-edit-task" data-task-id="${taskItem.id}" title="${t('common.edit')}">
            ${icons.edit(12)}
          </button>
          <button class="btn btn-ghost btn-icon btn-sm btn-del-task" data-task-id="${taskItem.id}" title="${t('common.delete')}">
            ${icons.trash(12)}
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 4. EVENT BINDINGS
  // ==========================================
  private static bindEvents(
    container: HTMLElement,
    project: any,
    tasks: Task[],
    specs: ProductSpec,
    settings: any,
    detectedBuilds: DetectedBuildItem[] = []
  ): void {
    const devCodePath = project.folder_path ? `${project.folder_path}\\Development\\Proyecto` : '';

    // Subnav Tab Switching
    container.querySelectorAll('.dev-tab-item[data-dev-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        DevelopmentPage.activeTab = btn.getAttribute('data-dev-tab') as any;
        DevelopmentPage.render(container);
      });
    });

    // Jump from overview cards to other tabs
    container.querySelector('#btn-jump-specs')?.addEventListener('click', () => {
      DevelopmentPage.activeTab = 'specs';
      DevelopmentPage.render(container);
    });

    container.querySelector('#btn-jump-kanban')?.addEventListener('click', () => {
      DevelopmentPage.activeTab = 'kanban';
      DevelopmentPage.render(container);
    });

    container.querySelector('#btn-open-full-kanban')?.addEventListener('click', () => {
      DevelopmentPage.activeTab = 'kanban';
      DevelopmentPage.render(container);
    });

    container.querySelector('#btn-open-full-specs')?.addEventListener('click', () => {
      DevelopmentPage.activeTab = 'specs';
      DevelopmentPage.render(container);
    });

    container.querySelector('#btn-jump-build-tab')?.addEventListener('click', () => {
      DevelopmentPage.activeTab = 'build';
      DevelopmentPage.render(container);
    });

    container.querySelector('#btn-jump-build-tab-2')?.addEventListener('click', () => {
      DevelopmentPage.activeTab = 'build';
      DevelopmentPage.render(container);
    });

    // Quick launch from All view
    container.querySelector('#btn-quick-launch-exe')?.addEventListener('click', async () => {
      if (specs.build_info?.executablePath) {
        try {
          showToast(`Iniciando ${specs.build_info.executableName || 'programa'}...`);
          await window.nubo.files.openFile(specs.build_info.executablePath);
        } catch (err: any) {
          alert('Error al lanzar el ejecutable: ' + (err.message || err));
        }
      }
    });

    container.querySelector('#btn-quick-open-exe-folder')?.addEventListener('click', async () => {
      if (specs.build_info?.executablePath) {
        await window.nubo.files.openContainingFolder(specs.build_info.executablePath);
      }
    });

    // --- OVERVIEW / ALL / CODE TAB ACTIONS ---
    if (DevelopmentPage.activeTab === 'all' || DevelopmentPage.activeTab === 'overview' || DevelopmentPage.activeTab === 'code') {
      // Copy Folder Path
      container.querySelector('#btn-copy-path')?.addEventListener('click', async () => {
        const fullPath = `${project.folder_path}\\Development\\Proyecto`;
        navigator.clipboard.writeText(fullPath);
        showToast('Ruta del proyecto copiada al portapapeles.');
      });

      // Configure Editor
      container.querySelector('#btn-configure-editor')?.addEventListener('click', () => {
        modalManager.openConfigureEditorModal(settings?.configuredEditor || { id: 'code', name: 'Visual Studio Code', command: 'code' }, async () => {
          DevelopmentPage.render(container);
        });
      });

      // Open in Editor
      container.querySelectorAll('#btn-open-in-editor').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cmd = settings?.configuredEditor?.command || 'antigravity-ide';
          const res = await window.nubo.development.openInEditor(devCodePath, cmd);
          if (res.success) {
            showToast(`Proyecto abierto con ${settings?.configuredEditor?.name || 'editor'}.`);
          } else {
            alert(res.error || 'No se pudo abrir el editor.');
            modalManager.openConfigureEditorModal(settings?.configuredEditor || { id: 'code', name: 'Visual Studio Code', command: 'code' }, () => DevelopmentPage.render(container));
          }
        });
      });

      // Open Folder
      container.querySelectorAll('#btn-open-folder').forEach(btn => {
        btn.addEventListener('click', async () => {
          await window.nubo.development.openFolder(devCodePath);
        });
      });

      // Open Terminal
      container.querySelectorAll('#btn-open-terminal').forEach(btn => {
        btn.addEventListener('click', async () => {
          const res = await window.nubo.development.openTerminal(devCodePath);
          if (!res.success) alert(res.error || 'Error al abrir terminal.');
        });
      });

      // Create Folder
      container.querySelector('#btn-create-folder')?.addEventListener('click', async () => {
        const res = await window.nubo.development.createFolder(devCodePath);
        if (res.success) {
          showToast('Carpeta creada con éxito.');
          DevelopmentPage.render(container);
        } else {
          alert('No se pudo crear la carpeta.');
        }
      });

      // Change Folder
      container.querySelector('#btn-change-folder')?.addEventListener('click', async () => {
        const newDir = await window.nubo.settings.selectDirectory();
        if (newDir) {
          await window.nubo.projects.update(project.id, { folder_path: newDir });
          const all = await window.nubo.projects.getAll();
          appStore.setProjects(all);
          DevelopmentPage.cachedGitStatus = null;
          DevelopmentPage.render(container);
        }
      });

      // Open GitHub
      container.querySelector('#btn-open-github')?.addEventListener('click', async () => {
        const git = DevelopmentPage.cachedGitStatus;
        if (git?.remoteUrl) {
          await window.nubo.development.openGitHub(git.remoteUrl);
        }
      });

      // Git Push
      container.querySelector('#btn-git-push')?.addEventListener('click', () => {
        const currentGit = DevelopmentPage.cachedGitStatus;
        modalManager.openGitPushModal({
          folderPath: devCodePath,
          branch: currentGit?.currentBranch || 'main',
          hasChanges: currentGit?.hasChanges,
          statusText: currentGit?.statusText,
          onPush: async (commitMsg) => {
            const btn = container.querySelector('#btn-git-push') as HTMLButtonElement | null;
            if (btn) btn.disabled = true;
            showToast('Enviando cambios a GitHub (push)...', 'info');
            try {
              const res = await window.nubo.development.gitPush(devCodePath, commitMsg);
              showToast(res.message, res.success ? 'success' : 'error');
              DevelopmentPage.cachedGitStatus = await window.nubo.development.getGitStatus(devCodePath);
              DevelopmentPage.render(container);
            } catch (err: any) {
              showToast(err.message || 'Error en push', 'error');
            } finally {
              if (btn) btn.disabled = false;
            }
          }
        });
      });

      // Git Pull
      container.querySelector('#btn-git-pull')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        if (btn && btn.disabled) return;
        if (btn) btn.disabled = true;
        showToast('Descargando cambios desde GitHub (pull)...', 'info');
        try {
          const res = await window.nubo.development.gitPull(devCodePath);
          showToast(res.message, res.success ? 'success' : 'error');
          DevelopmentPage.cachedGitStatus = await window.nubo.development.getGitStatus(devCodePath);
          DevelopmentPage.render(container);
        } catch (err: any) {
          showToast(err.message || 'Error en pull', 'error');
        } finally {
          if (btn) btn.disabled = false;
        }
      });

      // Git Init
      container.querySelector('#btn-init-git')?.addEventListener('click', async () => {
        const res = await window.nubo.development.gitInit(devCodePath);
        if (res.success) {
          showToast('Repositorio Git inicializado.');
          DevelopmentPage.cachedGitStatus = await window.nubo.development.getGitStatus(devCodePath);
          DevelopmentPage.render(container);
        } else {
          alert(res.message);
        }
      });

      // GitHub Account button in card
      container.querySelector('#btn-dev-gh-account')?.addEventListener('click', () => {
        modalManager.openGitHubAccountModal(async () => {
          DevelopmentPage.cachedGitStatus = null;
          await DevelopmentPage.render(container);
        });
      });

      // Connect Repo
      container.querySelector('#btn-connect-repo')?.addEventListener('click', () => {
        modalManager.openConnectGitModal(devCodePath, DevelopmentPage.cachedGitStatus?.remoteUrl || '', async () => {
          DevelopmentPage.cachedGitStatus = await window.nubo.development.getGitStatus(devCodePath);
          DevelopmentPage.render(container);
        });
      });

      // Open GitHub Web in browser
      container.querySelectorAll('#btn-open-github-web').forEach(btn => {
        btn.addEventListener('click', async () => {
          await window.nubo.development.openGitHub('https://github.com/new');
        });
      });

      // Disconnect Remote
      container.querySelector('#btn-disconnect-remote')?.addEventListener('click', async () => {
        if (confirm('¿Desconectar el repositorio remoto de GitHub? (El código local no se borrará)')) {
          showToast('Desconectando repositorio remoto...');
          try {
            const res = await window.nubo.development.gitDisconnectRemote(devCodePath);
            showToast(res.message);
          } catch (err: any) {
            console.error('[Git] Error disconnecting remote:', err);
            showToast('Error al desconectar remoto: ' + (err.message || err));
          }
          DevelopmentPage.cachedGitStatus = null;
          DevelopmentPage.render(container);
        }
      });

      // Remove Git
      container.querySelectorAll('#btn-remove-git').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('¿Eliminar el control de versiones Git (.git) de este proyecto? No se borrarán tus archivos de código, pero el proyecto dejará de tener Git.')) {
            showToast('Eliminando Git...');
            try {
              const res = await window.nubo.development.gitRemoveRepo(devCodePath);
              showToast(res.message);
            } catch (err: any) {
              console.error('[Git] Error removing repo:', err);
              showToast('Error al eliminar Git: ' + (err.message || err));
            }
            DevelopmentPage.cachedGitStatus = null;
            DevelopmentPage.render(container);
          }
        });
      });

      // Refresh Git
      container.querySelectorAll('#btn-refresh-git').forEach(btn => {
        btn.addEventListener('click', async () => {
          DevelopmentPage.cachedGitStatus = await window.nubo.development.getGitStatus(devCodePath);
          showToast('Estado de Git actualizado.');
          DevelopmentPage.render(container);
        });
      });

      // Git Dropdown Menu toggle
      const gitMenuBtn = container.querySelector('#btn-git-menu');
      const gitDropdown = container.querySelector('#git-dropdown-menu') as HTMLElement | null;
      if (gitMenuBtn && gitDropdown) {
        gitMenuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHidden = gitDropdown.style.display === 'none';
          gitDropdown.style.display = isHidden ? 'flex' : 'none';
        });
        document.addEventListener('click', () => {
          if (gitDropdown) gitDropdown.style.display = 'none';
        });
      }

      // Link Open Repo
      container.querySelector('#link-open-repo')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const git = DevelopmentPage.cachedGitStatus;
        if (git?.remoteUrl) {
          await window.nubo.development.openGitHub(git.remoteUrl);
        }
      });

      // Click commit hash to view commit on GitHub
      container.querySelectorAll('.dev-commit-hash-link').forEach(link => {
        link.addEventListener('click', async (e) => {
          e.preventDefault();
          const hash = link.getAttribute('data-hash');
          const git = DevelopmentPage.cachedGitStatus;
          if (git?.cleanRemoteUrl && hash) {
            await window.nubo.development.openGitHub(`${git.cleanRemoteUrl}/commit/${hash}`);
          }
        });
      });

      // View full commits history on GitHub
      container.querySelector('#link-view-all-commits')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const git = DevelopmentPage.cachedGitStatus;
        if (git?.cleanRemoteUrl) {
          const branch = git.currentBranch || 'main';
          await window.nubo.development.openGitHub(`${git.cleanRemoteUrl}/commits/${branch}`);
        }
      });

      // Link Jump to Specs
      container.querySelector('#link-jump-specs')?.addEventListener('click', (e) => {
        e.preventDefault();
        DevelopmentPage.activeTab = 'specs';
        DevelopmentPage.render(container);
      });

      // Quick New Task in Overview
      container.querySelector('#btn-quick-new-task')?.addEventListener('click', () => {
        modalManager.openNewTaskModal(project.id, () => {
          DevelopmentPage.render(container);
        });
      });

      // Interactive Filter Pills in Overview
      container.querySelector('#pill-filter-todo')?.addEventListener('click', () => {
        DevelopmentPage.activeTab = 'kanban';
        DevelopmentPage.filterStatus = 'todo';
        DevelopmentPage.render(container);
      });
      container.querySelector('#pill-filter-in-progress')?.addEventListener('click', () => {
        DevelopmentPage.activeTab = 'kanban';
        DevelopmentPage.filterStatus = 'in_progress';
        DevelopmentPage.render(container);
      });
      container.querySelector('#pill-filter-done')?.addEventListener('click', () => {
        DevelopmentPage.activeTab = 'kanban';
        DevelopmentPage.filterStatus = 'done';
        DevelopmentPage.render(container);
      });
    }

    // --- SPECS TAB ACTIONS ---
    if (DevelopmentPage.activeTab === 'specs') {
      const getFormSpecValues = () => ({
        what_is_it: (container.querySelector('#spec-what-is-it') as HTMLTextAreaElement)?.value || '',
        problem_solved: (container.querySelector('#spec-problem-solved') as HTMLTextAreaElement)?.value || '',
        target_audience: (container.querySelector('#spec-target-audience') as HTMLTextAreaElement)?.value || '',
        goals: (container.querySelector('#spec-goals') as HTMLTextAreaElement)?.value || ''
      });

      const syncCachedFields = () => {
        const vals = getFormSpecValues();
        if (DevelopmentPage.cachedSpecs) {
          DevelopmentPage.cachedSpecs.what_is_it = vals.what_is_it;
          DevelopmentPage.cachedSpecs.problem_solved = vals.problem_solved;
          DevelopmentPage.cachedSpecs.target_audience = vals.target_audience;
          DevelopmentPage.cachedSpecs.goals = vals.goals;
        }
        return vals;
      };

      // Live track user input so typed content is never wiped out
      container.querySelectorAll('.specs-textarea').forEach(ta => {
        ta.addEventListener('input', () => {
          syncCachedFields();
        });
        // Auto-save on blur / change
        ta.addEventListener('change', async () => {
          const vals = syncCachedFields();
          try {
            const updated = await window.nubo.development.updateSpecs(project.id, vals);
            DevelopmentPage.cachedSpecs = updated;
          } catch (e) {
            console.warn('[Specs] Auto-save error:', e);
          }
        });
      });

      // Save Specs Button
      const saveBtn = container.querySelector('#btn-save-specs') as HTMLButtonElement | null;
      saveBtn?.addEventListener('click', async () => {
        const vals = syncCachedFields();
        const originalHtml = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span>${t('common.save')}...</span>`;

        try {
          const updated = await window.nubo.development.updateSpecs(project.id, {
            what_is_it: vals.what_is_it,
            problem_solved: vals.problem_solved,
            target_audience: vals.target_audience,
            goals: vals.goals
          });

          DevelopmentPage.cachedSpecs = updated;
          showToast(t('dev.specsSavedToast'));

          saveBtn.innerHTML = `${icons.check(14)} <span>¡Guardado!</span>`;
          saveBtn.classList.add('btn-success');
          setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalHtml;
            saveBtn.classList.remove('btn-success');
          }, 1800);
        } catch (err) {
          console.error('[Specs] Error saving specs:', err);
          showToast('Error al guardar especificaciones.');
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalHtml;
        }
      });
    }

    // --- BUILD TAB ACTIONS ---
    if (DevelopmentPage.activeTab === 'build') {
      // 1. Launch Main Executable
      container.querySelector('#btn-launch-main-exe')?.addEventListener('click', async () => {
        if (specs.build_info?.executablePath) {
          try {
            showToast(`Iniciando ${specs.build_info.executableName || 'programa'}...`);
            await window.nubo.files.openFile(specs.build_info.executablePath);
          } catch (err: any) {
            alert('Error al lanzar el ejecutable: ' + (err.message || err));
          }
        }
      });

      // 2. Open Main Executable Folder
      container.querySelector('#btn-open-main-exe-folder')?.addEventListener('click', async () => {
        if (specs.build_info?.executablePath) {
          await window.nubo.files.openContainingFolder(specs.build_info.executablePath);
        }
      });

      // 3. Browse / Link Main Executable
      container.querySelectorAll('#btn-browse-main-exe').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const files = await window.nubo.dialog.openFiles({
              title: 'Seleccionar archivo ejecutable o instalador',
              filters: [
                { name: 'Ejecutables e Instaladores (*.exe, *.msi)', extensions: ['exe', 'msi'] },
                { name: 'Todos los archivos (*.*)', extensions: ['*'] }
              ]
            });
            if (files && files.length > 0) {
              const selectedPath = files[0];
              const fileName = selectedPath.split('\\').pop() || selectedPath.split('/').pop() || 'App.exe';
              const updatedBuildInfo = {
                ...(specs.build_info || {}),
                executablePath: selectedPath,
                executableName: fileName
              };
              const updated = await window.nubo.development.updateSpecs(project.id, { build_info: updatedBuildInfo });
              DevelopmentPage.cachedSpecs = updated;
              showToast(`Ejecutable "${fileName}" vinculado con éxito.`);
              DevelopmentPage.render(container);
            }
          } catch (err: any) {
            console.error('Error seleccionando ejecutable:', err);
          }
        });
      });

      // 4. Unlink Main Executable
      container.querySelector('#btn-unlink-main-exe')?.addEventListener('click', async () => {
        if (confirm('¿Desvincular este archivo ejecutable del proyecto?')) {
          const updatedBuildInfo = {
            ...(specs.build_info || {}),
            executablePath: undefined,
            executableName: undefined
          };
          const updated = await window.nubo.development.updateSpecs(project.id, { build_info: updatedBuildInfo });
          DevelopmentPage.cachedSpecs = updated;
          showToast('Ejecutable desvinculado.');
          DevelopmentPage.render(container);
        }
      });

      // 5. Open Development/Build Folder
      const openDevBuildFolder = async () => {
        const buildPath = `${project.folder_path}\\Development\\Build`;
        try {
          if (window.nubo?.development?.ensureFolders) {
            await window.nubo.development.ensureFolders(project.folder_path);
          }
          await window.nubo.development.openFolder(buildPath);
        } catch {
          await window.nubo.development.openFolder(project.folder_path);
        }
      };
      container.querySelector('#btn-open-dev-build-folder')?.addEventListener('click', openDevBuildFolder);
      container.querySelector('#btn-open-dev-build-folder-2')?.addEventListener('click', openDevBuildFolder);

      // 6. Save Build Configuration
      const saveBuildConfig = async () => {
        const cmdInput = container.querySelector('#build-cmd-input') as HTMLInputElement | null;
        const verInput = container.querySelector('#build-version-input') as HTMLInputElement | null;
        const typeSelect = container.querySelector('#build-installer-type-select') as HTMLSelectElement | null;
        const outInput = container.querySelector('#build-output-dir-input') as HTMLInputElement | null;
        const notesText = container.querySelector('#build-release-notes') as HTMLTextAreaElement | null;

        const updatedBuildInfo = {
          ...(specs.build_info || {}),
          buildCommand: cmdInput?.value.trim() || 'npm run build',
          version: verInput?.value.trim() || '1.0.0',
          installerType: typeSelect?.value || 'Instalador NSIS / Setup.exe',
          outputDir: outInput?.value.trim() || 'dist',
          releaseNotes: notesText?.value || '',
          lastBuiltAt: new Date().toISOString()
        };

        const updated = await window.nubo.development.updateSpecs(project.id, { build_info: updatedBuildInfo });
        DevelopmentPage.cachedSpecs = updated;
        showToast('Configuración de compilación guardada.');
      };

      container.querySelector('#btn-save-build-config')?.addEventListener('click', saveBuildConfig);
      container.querySelector('#btn-save-build-config-bottom')?.addEventListener('click', saveBuildConfig);

      // 7. Preset Command Buttons
      container.querySelectorAll('.btn-preset-cmd').forEach(btn => {
        btn.addEventListener('click', () => {
          const cmd = btn.getAttribute('data-cmd');
          const input = container.querySelector('#build-cmd-input') as HTMLInputElement | null;
          if (cmd && input) {
            input.value = cmd;
            showToast(`Comando seleccionado: ${cmd}`);
          }
        });
      });

      // 8. Open Terminal for Building
      container.querySelector('#btn-open-build-terminal')?.addEventListener('click', async () => {
        const cmd = (container.querySelector('#build-cmd-input') as HTMLInputElement | null)?.value || specs.build_info?.buildCommand || 'npm run build';
        const res = await window.nubo.development.openTerminal(devCodePath);
        if (res.success) {
          showToast(`Terminal abierto en Proyecto. Ejecuta: "${cmd}"`, 'info');
        } else {
          alert(res.error || 'Error al abrir terminal.');
        }
      });

      // 9. Open Output Folder (dist / release / build)
      container.querySelector('#btn-open-dist-folder')?.addEventListener('click', async () => {
        const outDir = (container.querySelector('#build-output-dir-input') as HTMLInputElement | null)?.value || specs.build_info?.outputDir || 'dist';
        let targetFolder = `${devCodePath}\\${outDir}`;
        const check = await window.nubo.development.checkFolder(targetFolder);
        if (!check.exists) {
          targetFolder = `${project.folder_path}\\Development\\Build`;
        }
        await window.nubo.development.openFolder(targetFolder);
      });

      // 10. Refresh Builds List
      const refreshBuilds = async () => {
        showToast('Escaneando ejecutables e instaladores en disco...');
        try {
          if (window.nubo?.development?.scanBuildExecutables) {
            DevelopmentPage.cachedDetectedBuilds = await window.nubo.development.scanBuildExecutables(project.folder_path);
          }
          DevelopmentPage.render(container);
        } catch (err: any) {
          console.error('Error scanning builds:', err);
        }
      };
      container.querySelector('#btn-scan-builds')?.addEventListener('click', refreshBuilds);
      container.querySelector('#btn-refresh-builds-list')?.addEventListener('click', refreshBuilds);

      // 11. Detected Build Item Actions
      container.querySelectorAll('.btn-launch-detected-exe').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const exePath = btn.getAttribute('data-path');
          if (exePath) {
            try {
              const name = exePath.split('\\').pop() || 'programa';
              showToast(`Lanzando ${name}...`);
              await window.nubo.files.openFile(exePath);
            } catch (err: any) {
              alert('Error al lanzar archivo: ' + (err.message || err));
            }
          }
        });
      });

      container.querySelectorAll('.btn-open-detected-folder').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const exePath = btn.getAttribute('data-path');
          if (exePath) {
            await window.nubo.files.openContainingFolder(exePath);
          }
        });
      });

      container.querySelectorAll('.btn-set-main-exe').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const exePath = btn.getAttribute('data-path');
          const exeName = btn.getAttribute('data-name');
          if (exePath && exeName) {
            const updatedBuildInfo = {
              ...(specs.build_info || {}),
              executablePath: exePath,
              executableName: exeName
            };
            const updated = await window.nubo.development.updateSpecs(project.id, { build_info: updatedBuildInfo });
            DevelopmentPage.cachedSpecs = updated;
            showToast(`"${exeName}" fijado como ejecutable principal.`);
            DevelopmentPage.render(container);
          }
        });
      });
    }

    // --- KANBAN TAB ACTIONS ---
    // Global Add Task
    container.querySelector('#btn-add-dev-task')?.addEventListener('click', () => {
      modalManager.openNewTaskModal(project.id, 'todo', async () => {
        const all = await window.nubo.projects.getAll();
        appStore.setProjects(all);
        DevelopmentPage.render(container);
      });
    });

    if (DevelopmentPage.activeTab === 'all' || DevelopmentPage.activeTab === 'overview' || DevelopmentPage.activeTab === 'kanban') {
      // View toggle
      container.querySelector('#view-toggle-kanban')?.addEventListener('click', () => {
        DevelopmentPage.viewMode = 'kanban';
        DevelopmentPage.render(container);
      });

      container.querySelector('#view-toggle-list')?.addEventListener('click', () => {
        DevelopmentPage.viewMode = 'list';
        DevelopmentPage.render(container);
      });

      // Search input
      const searchInput = container.querySelector('#dev-search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          DevelopmentPage.searchQuery = searchInput.value;
          DevelopmentPage.render(container);
        });
        if (DevelopmentPage.searchQuery) {
          searchInput.focus();
          searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        }
      }

      container.querySelector('#dev-search-clear')?.addEventListener('click', () => {
        DevelopmentPage.searchQuery = '';
        DevelopmentPage.render(container);
      });

      // Priority and Type filters
      container.querySelector('#dev-filter-priority')?.addEventListener('change', (e) => {
        DevelopmentPage.filterPriority = (e.target as HTMLSelectElement).value;
        DevelopmentPage.render(container);
      });

      container.querySelector('#dev-filter-type')?.addEventListener('change', (e) => {
        DevelopmentPage.filterType = (e.target as HTMLSelectElement).value;
        DevelopmentPage.render(container);
      });

      container.querySelector('#dev-btn-reset')?.addEventListener('click', () => {
        DevelopmentPage.filterPriority = 'all';
        DevelopmentPage.filterType = 'all';
        DevelopmentPage.searchQuery = '';
        DevelopmentPage.filterStatus = 'all';
        DevelopmentPage.render(container);
      });

      // List tabs
      container.querySelectorAll('.tab-btn[data-status-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          DevelopmentPage.filterStatus = btn.getAttribute('data-status-tab') as any;
          DevelopmentPage.render(container);
        });
      });

      // Column header "+" buttons
      container.querySelectorAll('.btn-add-task-col').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const col = btn.getAttribute('data-col') as 'todo' | 'in_progress' | 'done' || 'todo';
          modalManager.openNewTaskModal(project.id, col, async () => {
            const all = await window.nubo.projects.getAll();
            appStore.setProjects(all);
            DevelopmentPage.render(container);
          });
        });
      });

      // Quick inline add buttons
      container.querySelectorAll('.btn-quick-add-col').forEach(btn => {
        btn.addEventListener('click', () => {
          const col = btn.getAttribute('data-col') as any;
          DevelopmentPage.activeQuickAddCol = col;
          DevelopmentPage.render(container);
        });
      });

      container.querySelectorAll('.btn-cancel-quick-add').forEach(btn => {
        btn.addEventListener('click', () => {
          DevelopmentPage.activeQuickAddCol = null;
          DevelopmentPage.render(container);
        });
      });

      const handleSaveQuickAdd = async (col: 'todo' | 'in_progress' | 'done', inputEl: HTMLInputElement) => {
        const title = inputEl.value.trim();
        if (!title) return;

        await window.nubo.tasks.create({
          projectId: project.id,
          title,
          status: col,
          priority: 'medium',
          type: 'task'
        });

        showToast(t('dev.toastCreated'));
        DevelopmentPage.activeQuickAddCol = null;
        const all = await window.nubo.projects.getAll();
        appStore.setProjects(all);
        DevelopmentPage.render(container);
      };

      container.querySelectorAll('.btn-save-quick-add').forEach(btn => {
        btn.addEventListener('click', () => {
          const col = btn.getAttribute('data-col') as any;
          const input = container.querySelector(`.kanban-quick-add-input[data-col="${col}"]`) as HTMLInputElement;
          if (input) handleSaveQuickAdd(col, input);
        });
      });

      container.querySelectorAll('.kanban-quick-add-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
          if ((e as KeyboardEvent).key === 'Enter') {
            const col = input.getAttribute('data-col') as any;
            handleSaveQuickAdd(col, input as HTMLInputElement);
          } else if ((e as KeyboardEvent).key === 'Escape') {
            DevelopmentPage.activeQuickAddCol = null;
            DevelopmentPage.render(container);
          }
        });
      });

      // Edit task
      container.querySelectorAll('.btn-edit-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-task-id');
          const task = tasks.find(t => t.id === id);
          if (task) {
            modalManager.openEditTaskModal(task, async () => {
              const all = await window.nubo.projects.getAll();
              appStore.setProjects(all);
              DevelopmentPage.render(container);
            });
          }
        });
      });

      container.querySelectorAll('.card-title').forEach(titleEl => {
        titleEl.addEventListener('click', () => {
          const card = (titleEl as HTMLElement).closest('.kanban-task-card');
          const id = card?.getAttribute('data-task-id');
          const task = tasks.find(t => t.id === id);
          if (task) {
            modalManager.openEditTaskModal(task, async () => {
              const all = await window.nubo.projects.getAll();
              appStore.setProjects(all);
              DevelopmentPage.render(container);
            });
          }
        });
      });

      // Checkbox toggle
      container.querySelectorAll('.task-row-checkbox').forEach(chk => {
        chk.addEventListener('change', async (e) => {
          e.stopPropagation();
          const input = e.target as HTMLInputElement;
          const id = input.getAttribute('data-task-id');
          if (id) {
            const newStatus = input.checked ? 'done' : 'todo';
            await window.nubo.tasks.update(id, { status: newStatus });
            const all = await window.nubo.projects.getAll();
            appStore.setProjects(all);
            DevelopmentPage.render(container);
          }
        });
      });

      // Status dropdown select
      container.querySelectorAll('.task-status-select').forEach(sel => {
        sel.addEventListener('change', async (e) => {
          e.stopPropagation();
          const select = e.target as HTMLSelectElement;
          const id = select.getAttribute('data-task-id');
          if (id) {
            await window.nubo.tasks.update(id, { status: select.value });
            const all = await window.nubo.projects.getAll();
            appStore.setProjects(all);
            DevelopmentPage.render(container);
          }
        });
      });

      // Delete task
      container.querySelectorAll('.btn-del-task').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-task-id');
          if (id && confirm(t('dev.deleteTaskConfirm'))) {
            await window.nubo.tasks.delete(id);
            showToast(t('dev.toastDeleted'));
            const all = await window.nubo.projects.getAll();
            appStore.setProjects(all);
            DevelopmentPage.render(container);
          }
        });
      });

      // Drag and drop mechanics
      DevelopmentPage.setupDragAndDrop(container, project);
    }
  }

  // ==========================================
  // 5. DRAG AND DROP HANDLERS (KANBAN)
  // ==========================================
  private static setupDragAndDrop(container: HTMLElement, project: any): void {
    const cards = container.querySelectorAll<HTMLElement>('.kanban-task-card');
    const columns = container.querySelectorAll<HTMLElement>('.kanban-column');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e: DragEvent) => {
        const taskId = card.getAttribute('data-task-id');
        if (!taskId) return;

        DevelopmentPage.draggedTaskId = taskId;
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', taskId);
          e.dataTransfer.effectAllowed = 'move';
        }

        setTimeout(() => {
          card.classList.add('is-dragging');
        }, 0);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        DevelopmentPage.draggedTaskId = null;
        columns.forEach(col => col.classList.remove('drag-over'));
      });
    });

    columns.forEach(col => {
      col.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });

      col.addEventListener('dragenter', (e: DragEvent) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', (e: DragEvent) => {
        const related = e.relatedTarget as Node | null;
        if (!col.contains(related)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', async (e: DragEvent) => {
        e.preventDefault();
        col.classList.remove('drag-over');

        const targetStatus = col.getAttribute('data-status') as 'todo' | 'in_progress' | 'done';
        const taskId = e.dataTransfer?.getData('text/plain') || DevelopmentPage.draggedTaskId;

        if (!taskId || !targetStatus) return;

        try {
          await window.nubo.tasks.update(taskId, { status: targetStatus });

          const all = await window.nubo.projects.getAll();
          appStore.setProjects(all);

          let colTitle = targetStatus;
          if (targetStatus === 'todo') colTitle = (t as any)('dev.colTodo') || 'Por hacer';
          else if (targetStatus === 'in_progress') colTitle = (t as any)('dev.colInProgress') || 'En progreso';
          else if (targetStatus === 'done') colTitle = (t as any)('dev.colDone') || 'Completadas';

          showToast(t('dev.toastMoved').replace('{status}', colTitle));
          DevelopmentPage.render(container);
        } catch (err: any) {
          console.error('[Kanban] Error dropping task:', err);
        }
      });
    });
  }
}
