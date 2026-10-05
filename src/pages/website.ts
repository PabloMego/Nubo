import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { modalManager } from '../components/modal';
import { showToast } from '../components/toast';
import { WebsiteInfo, WebsitePage, WebsiteReferenceImage, Task, GitStatusResult, MINIMAL_AI_TEMPLATE_BASE64 } from '../scripts/types';
import { t, getLanguage } from '../scripts/i18n';

export class WebsitePageView {
  // Navigation tab: 'all' (Todo) | 'code' (Código & Git) | 'pages' (Estructura de Páginas) | 'design' (Diseño & Referencias) | 'tasks' (Tareas) | 'seo' (Configuración & SEO)
  private static activeTab: 'all' | 'code' | 'pages' | 'design' | 'tasks' | 'seo' = 'all';

  // Pages view filter/search state
  private static pageSearchQuery: string = '';
  private static pageStatusFilter: string = 'all';

  // Tasks / Kanban view state
  private static viewMode: 'kanban' | 'list' = 'kanban';
  private static filterStatus: 'all' | 'todo' | 'in_progress' | 'done' = 'all';
  private static filterPriority: string = 'all';
  private static filterType: string = 'all';
  private static searchQuery: string = '';
  private static activeQuickAddCol: 'todo' | 'in_progress' | 'done' | null = null;
  private static draggedTaskId: string | null = null;
  private static onlyWebsiteTasks: boolean = false;

  // Cached git state
  private static cachedGitStatus: GitStatusResult | null = null;
  private static cachedWebsitePath: string = '';

  public static clearCache(): void {
    WebsitePageView.cachedGitStatus = null;
    WebsitePageView.cachedWebsitePath = '';
  }

  public static async render(container: HTMLElement): Promise<void> {
    const project = appStore.getState().currentProject;
    if (!project) return;

    // Define dedicated Website folder paths:
    // websiteBase: Project/Website (holds Proyecto, Design, Referencias)
    // websiteCodePath: Project/Website/Proyecto (the separate empty folder for code & Git)
    const websiteBase = project.folder_path 
      ? (project.folder_path.endsWith('Website') ? project.folder_path : `${project.folder_path}\\Website`)
      : '';
    const websiteCodePath = websiteBase ? `${websiteBase}\\Proyecto` : '';

    // Invalidate git status cache if switched to a different project or website path
    if (WebsitePageView.cachedWebsitePath !== websiteCodePath) {
      WebsitePageView.cachedGitStatus = null;
      WebsitePageView.cachedWebsitePath = websiteCodePath;
    }

    // Ensure dedicated website folders exist on disk (Website, Website/Proyecto, Website/Design, Website/Referencias)
    if (project.folder_path) {
      try {
        if (window.nubo?.website?.ensureFolders) {
          await window.nubo.website.ensureFolders(project.folder_path);
        }
      } catch (err) {
        console.warn('[WebsitePageView] Error ensuring website folders:', err);
      }
    }

    // Load website info, tasks, and settings in parallel
    const [web, allTasks, settings] = await Promise.all([
      window.nubo.website.getByProject(project.id) as Promise<WebsiteInfo>,
      window.nubo.tasks.getByProject(project.id) as Promise<Task[]>,
      window.nubo.settings.get()
    ]);

    // Automatically sync URL from project if website has none yet
    if (!web.url && project.website) {
      web.url = project.website;
      try {
        await window.nubo.website.update(project.id, { url: project.website });
      } catch (err) {
        console.warn('Could not auto-sync website URL:', err);
      }
    }

    const pages = web.pages || [];
    const referenceImages = web.reference_images || [];

    // Filter tasks: show tasks tagged with 'website' or 'web' or all tasks if none or toggled
    const websiteTaggedTasks = allTasks.filter(task => {
      if (!WebsitePageView.onlyWebsiteTasks) return true;
      const tags = Array.isArray(task.tags) ? task.tags.map(t => t.toLowerCase()) : [];
      return tags.includes('website') || tags.includes('web') || tags.includes('sitio web');
    });

    // Check if website code folder exists on disk
    let folderExists = true;
    try {
      if (window.nubo?.development?.checkFolder && websiteCodePath) {
        const check = await window.nubo.development.checkFolder(websiteCodePath);
        folderExists = check.exists;
      }
    } catch {
      folderExists = true;
    }

    // Fetch Git status for the Website/Proyecto folder
    let gitStatus = WebsitePageView.cachedGitStatus;
    if (!gitStatus && websiteCodePath) {
      try {
        if (window.nubo?.development?.getGitStatus) {
          gitStatus = await window.nubo.development.getGitStatus(websiteCodePath);
        }
      } catch (err) {
        console.warn('[WebsitePageView] Error loading git status for website:', err);
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
      WebsitePageView.cachedGitStatus = gitStatus;
    }

    // Calculate task metrics
    const counts = {
      all: websiteTaggedTasks.length,
      todo: websiteTaggedTasks.filter(item => item.status === 'todo').length,
      in_progress: websiteTaggedTasks.filter(item => item.status === 'in_progress').length,
      done: websiteTaggedTasks.filter(item => item.status === 'done').length
    };
    const completionRate = counts.all > 0 ? Math.round((counts.done / counts.all) * 100) : 0;

    container.innerHTML = `
      <div class="web-container">
        <!-- Main Hero Header -->
        <div class="web-header-hero">
          <div class="web-header-left">
            <div class="web-title-row">
              <h1>${t('website.title')}</h1>
              <div class="dev-header-stats-badge" title="Páginas registradas">
                ${icons.globe(13)}
                <span><strong>${pages.length}</strong> páginas</span>
              </div>
              ${referenceImages.length > 0 ? `
                <div class="dev-header-stats-badge" title="Referencias de diseño guardadas">
                  ${icons.image(13)}
                  <span><strong>${referenceImages.length}</strong> refs</span>
                </div>
              ` : ''}
              ${web.illustrator_file_path ? `
                <div class="dev-header-stats-badge" style="border-color: rgba(255, 154, 0, 0.4); color: #FF9A00;" title="Diseño en Illustrator vinculado">
                  <span style="font-weight: 700;">Ai</span>
                  <span>Diseño listo</span>
                </div>
              ` : ''}
            </div>
            <p class="web-subtitle">${t('website.subtitle')}</p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            ${web.url ? `
              <a href="${web.url}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                ${icons.external(13)}
                <span>${t('website.openWeb')}</span>
              </a>
            ` : ''}
            <button class="btn btn-primary btn-sm" id="btn-add-web-task" style="display: inline-flex; align-items: center; gap: 6px;">
              ${icons.plus(13)}
              <span>Nueva Tarea Web</span>
            </button>
          </div>
        </div>

        <!-- Subnav Navigation Tabs -->
        <div class="web-subnav-tabs">
          <button class="web-tab-item ${WebsitePageView.activeTab === 'all' ? 'active' : ''}" data-web-tab="all">
            ${icons.grid(14)}
            <span>Todo</span>
          </button>
          <button class="web-tab-item ${WebsitePageView.activeTab === 'code' ? 'active' : ''}" data-web-tab="code">
            ${icons.code(14)}
            <span>Código & Git</span>
          </button>
          <button class="web-tab-item ${WebsitePageView.activeTab === 'pages' ? 'active' : ''}" data-web-tab="pages">
            ${icons.globe(14)}
            <span>Estructura de Páginas (${pages.length})</span>
          </button>
          <button class="web-tab-item ${WebsitePageView.activeTab === 'design' ? 'active' : ''}" data-web-tab="design">
            ${icons.palette(14)}
            <span>Diseño & Referencias (${referenceImages.length})</span>
          </button>
          <button class="web-tab-item ${WebsitePageView.activeTab === 'tasks' ? 'active' : ''}" data-web-tab="tasks">
            ${icons.columns(14)}
            <span>Tareas (${counts.all})</span>
          </button>
          <button class="web-tab-item ${WebsitePageView.activeTab === 'seo' ? 'active' : ''}" data-web-tab="seo">
            ${icons.settings ? icons.settings(14) : icons.edit(14)}
            <span>Configuración & SEO</span>
          </button>
        </div>

        <!-- Tab Content Routing -->
        ${WebsitePageView.activeTab === 'all'
          ? WebsitePageView.renderAllView(project, settings, web, gitStatus, websiteCodePath, websiteBase, folderExists, counts, completionRate, websiteTaggedTasks)
          : WebsitePageView.activeTab === 'code'
          ? WebsitePageView.renderCodeView(project, settings, gitStatus, websiteCodePath, folderExists)
          : WebsitePageView.activeTab === 'pages'
          ? WebsitePageView.renderPagesView(web, project)
          : WebsitePageView.activeTab === 'design'
          ? WebsitePageView.renderDesignView(web, websiteBase)
          : WebsitePageView.activeTab === 'tasks'
          ? WebsitePageView.renderTasksView(websiteTaggedTasks, counts, completionRate)
          : WebsitePageView.renderSeoView(web, project)}
      </div>
    `;

    WebsitePageView.bindEvents(container, project, web, websiteTaggedTasks, settings, websiteCodePath, websiteBase);
    WebsitePageView.loadThumbnails(container, referenceImages);
  }

  // ==========================================
  // 1. VISTA "TODO" (PANEL COMPLETO)
  // ==========================================
  private static renderAllView(
    project: any,
    settings: any,
    web: WebsiteInfo,
    gitStatus: GitStatusResult | null,
    websiteCodePath: string,
    websiteBase: string,
    folderExists: boolean,
    counts: { all: number; todo: number; in_progress: number; done: number },
    completionRate: number,
    tasks: Task[]
  ): string {
    const editor = settings.configuredEditor || { id: 'code', name: 'Visual Studio Code', command: 'code' };
    const referenceImages = web.reference_images || [];

    // Git Status
    const isGit = gitStatus?.isGitRepo;
    const isConnectedToGitHub = gitStatus?.connectedToGitHub;
    const gitBranch = gitStatus?.currentBranch || 'main';
    const gitChanges = gitStatus?.statusText || (isGit ? 'Sin cambios pendientes' : 'No inicializado');

    return `
      <div class="web-overview-wrapper">
        <!-- 1. Barra de Entorno de Código de Website/Proyecto -->
        ${this.renderWorkspaceStripHtml(websiteCodePath, editor, folderExists)}

        <!-- 2. Grid Principal: Git & Illustrator -->
        <div class="web-dashboard-grid">
          ${this.renderGitCardHtml(isGit, isConnectedToGitHub, gitStatus, gitBranch, gitChanges)}
          ${this.renderIllustratorCardHtml(web, websiteBase)}
        </div>

        <!-- 3. Grid Secundario: Moodboard Referencias & Sprint Tareas -->
        <div class="web-dashboard-grid">
          ${this.renderMoodboardPreviewCardHtml(referenceImages)}
          ${this.renderSprintCardHtml(completionRate, counts, web)}
        </div>

        <!-- 4. Sección Tablero de Tareas -->
        <div class="web-section-card">
          <div class="web-section-header">
            <div class="web-section-title-group">
              <div class="dev-card-icon-bubble kanban" style="width: 32px; height: 32px;">
                ${icons.columns(16)}
              </div>
              <div>
                <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0;">
                  Tareas del Sitio Web (${counts.all})
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Organización del flujo de diseño, maquetación y contenido
                </span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-open-full-tasks">
              ${icons.columns(13)}
              <span>Ver solo Tareas</span>
            </button>
          </div>
          ${this.renderTasksBoard(tasks, counts, completionRate)}
        </div>

        <!-- 5. Sección Estructura de Páginas -->
        <div class="web-section-card">
          <div class="web-section-header">
            <div class="web-section-title-group">
              <div class="dev-card-icon-bubble" style="width: 32px; height: 32px; background: rgba(59, 130, 246, 0.08); color: #3B82F6; border: 1px solid rgba(59, 130, 246, 0.2);">
                ${icons.globe(16)}
              </div>
              <div>
                <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0;">
                  Estructura de Páginas (${web.pages?.length || 0})
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Mapa de rutas, vistas y estado de desarrollo del sitio web
                </span>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn btn-primary btn-sm" id="btn-add-page-overview" style="display: inline-flex; align-items: center; gap: 6px;">
                ${icons.plus(13)}
                <span>Añadir Página</span>
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-open-full-pages">
                ${icons.globe(13)}
                <span>Ver todas</span>
              </button>
            </div>
          </div>
          ${this.renderPagesOverviewContentHtml(web)}
        </div>

        <!-- 6. Sección Configuración Web & Metadatos SEO -->
        <div class="web-section-card">
          <div class="web-section-header">
            <div class="web-section-title-group">
              <div class="dev-card-icon-bubble" style="width: 32px; height: 32px; background: rgba(16, 185, 129, 0.08); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2);">
                ${icons.globe(16)}
              </div>
              <div>
                <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0;">
                  Configuración del Sitio Web & SEO
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  Dominio, hosting, repositorio de producción y posicionamiento en Google (autoguardado al escribir)
                </span>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn btn-secondary btn-sm" id="btn-open-full-seo" style="display: inline-flex; align-items: center; gap: 6px;">
                ${icons.external(12)}
                <span>Previsualización Google</span>
              </button>
            </div>
          </div>
          ${this.renderConfigAndSeoCardHtml(web, project)}
        </div>
      </div>
    `;
  }

  // ==========================================
  // 2. VISTA DEDICADA "CÓDIGO & GIT"
  // ==========================================
  private static renderCodeView(
    project: any,
    settings: any,
    gitStatus: GitStatusResult | null,
    websiteCodePath: string,
    folderExists: boolean
  ): string {
    const editor = settings.configuredEditor || { id: 'code', name: 'Visual Studio Code', command: 'code' };
    const isGit = gitStatus?.isGitRepo;
    const isConnectedToGitHub = gitStatus?.connectedToGitHub;
    const gitBranch = gitStatus?.currentBranch || 'main';
    const gitChanges = gitStatus?.statusText || (isGit ? 'Sin cambios pendientes' : 'No inicializado');

    return `
      <div class="web-overview-wrapper">
        <!-- 1. Barra de Entorno de Código -->
        ${this.renderWorkspaceStripHtml(websiteCodePath, editor, folderExists)}

        <!-- 2. Grid enfocado de Código & Git -->
        <div class="dev-code-grid">
          <!-- Tarjeta 1: GitHub & Control de Versiones -->
          ${this.renderGitCardHtml(isGit, isConnectedToGitHub, gitStatus, gitBranch, gitChanges)}

          <!-- Tarjeta 2: Herramientas del Entorno Local -->
          <div class="dev-card">
            <div class="dev-card-header">
              <div class="dev-card-title-group">
                <div class="dev-card-icon-bubble" style="background: rgba(99, 102, 241, 0.08); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2);">
                  ${icons.terminal(18)}
                </div>
                <div>
                  <h3 class="dev-card-title">Herramientas & Terminal</h3>
                  <span class="dev-card-subtitle">Espacio de trabajo local del sitio web</span>
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
                    <span>Powershell / Terminal en Website/Proyecto</span>
                  </div>
                  <button class="btn btn-secondary btn-sm" id="btn-open-terminal">
                    ${icons.terminal(13)}
                    <span>Abrir</span>
                  </button>
                </div>

                <div class="dev-tool-row">
                  <div class="dev-tool-info">
                    <strong>Explorador de archivos</strong>
                    <span>Carpeta Website/Proyecto en Windows Explorer</span>
                  </div>
                  <button class="btn btn-secondary btn-sm" id="btn-open-folder">
                    ${icons.folder(13)}
                    <span>Ver</span>
                  </button>
                </div>
              </div>

              <div class="dev-code-tip-box" style="margin-top: 14px;">
                <span class="dev-tip-title">🌐 Aislamiento de código del Sitio Web</span>
                <p class="dev-tip-desc">
                  La subcarpeta <code>Website/Proyecto</code> es una carpeta aparte completamente vacía para que inicialices tu web (con Vite, Astro, Next.js, HTML, etc.). Solo lo que guardes dentro de <code>Website/Proyecto</code> formará parte del repositorio Git y se subirá a GitHub. Los archivos de diseño (en <code>Website/Design</code>) y referencias visuales permanecen fuera del repositorio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 3. VISTA DEDICADA "DISEÑO & REFERENCIAS"
  // ==========================================
  private static renderDesignView(web: WebsiteInfo, websiteBase: string): string {
    const referenceImages = web.reference_images || [];

    return `
      <div class="web-overview-wrapper">
        <!-- Tarjeta Illustrator -->
        ${this.renderIllustratorCardHtml(web, websiteBase)}

        <!-- Galería de Referencias Visuales (Moodboard completo) -->
        <div class="web-section-card">
          <div class="web-moodboard-header">
            <div>
              <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px 0;">
                Referencias Visuales & Inspiración (${referenceImages.length})
              </h3>
              <p style="font-size: 12.5px; color: var(--text-secondary); margin: 0;">
                Añade capturas de pantalla, maquetas y estilos que vayas encontrando para definir la estética y diseño de tu sitio web.
              </p>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-add-ref-image" style="display: inline-flex; align-items: center; gap: 6px;">
              ${icons.upload(13)}
              <span>Añadir Imagen de Referencia</span>
            </button>
          </div>

          <div class="web-moodboard-grid">
            ${referenceImages.length > 0 ? referenceImages.map(ref => `
              <div class="web-ref-card" data-ref-id="${ref.id}">
                <div class="web-ref-thumb-wrap" data-thumb-path="${ref.path}" title="Clic para ver en tamaño completo">
                  <div class="ref-thumb-placeholder" style="color: var(--text-muted);">
                    ${icons.image(32)}
                  </div>
                  <div class="web-ref-overlay">
                    <button class="web-ref-overlay-btn btn-view-ref-full" data-path="${ref.path}" title="Ver imagen completa">
                      ${icons.maximize(14)}
                    </button>
                    <button class="web-ref-overlay-btn btn-edit-ref-notes" data-ref-id="${ref.id}" title="Editar notas">
                      ${icons.edit(14)}
                    </button>
                    <button class="web-ref-overlay-btn danger btn-delete-ref" data-ref-id="${ref.id}" title="Eliminar referencia">
                      ${icons.trash(14)}
                    </button>
                  </div>
                </div>

                <div class="web-ref-content">
                  <div class="web-ref-title-row">
                    <span class="web-ref-name" title="${ref.name}">${ref.name}</span>
                    <span class="web-ref-date">${new Date(ref.created_at).toLocaleDateString()}</span>
                  </div>

                  <div class="web-ref-notes-box">
                    <span class="web-ref-notes-text">
                      ${ref.notes ? ref.notes : `<span class="web-ref-notes-placeholder btn-edit-ref-notes" data-ref-id="${ref.id}">+ Añadir notas de lo que te gusta de este diseño...</span>`}
                    </span>
                    <button class="web-ref-notes-btn btn-edit-ref-notes" data-ref-id="${ref.id}" title="Editar nota">
                      ${icons.edit(11)}
                    </button>
                  </div>
                </div>
              </div>
            `).join('') : `
              <div class="web-ref-empty">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); margin-bottom: 4px;">
                  ${icons.image(24)}
                </div>
                <h4 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0;">Sin imágenes de referencia todavía</h4>
                <p>
                  Sube capturas de sitios web que te gusten, tipografías, componentes o paletas de colores para utilizarlos de guía al diseñar tu página.
                </p>
                <button class="btn btn-primary btn-sm" id="btn-add-ref-image-empty" style="margin-top: 6px; display: inline-flex; align-items: center; gap: 6px;">
                  ${icons.plus(13)}
                  <span>Añadir primera referencia</span>
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 4. VISTA DEDICADA "TAREAS"
  // ==========================================
  private static renderTasksView(
    tasks: Task[],
    counts: { all: number; todo: number; in_progress: number; done: number },
    completionRate: number
  ): string {
    return `
      <div class="web-overview-wrapper">
        <div class="web-section-card">
          ${this.renderTasksBoard(tasks, counts, completionRate)}
        </div>
      </div>
    `;
  }

  // ==========================================
  // 5. VISTA DEDICADA "ESTRUCTURA DE PÁGINAS"
  // ==========================================
  private static renderPagesView(web: WebsiteInfo, project: any): string {
    const pages = web.pages || [];
    const isEs = getLanguage() === 'es';
    const counts = {
      total: pages.length,
      live: pages.filter(p => p.status === 'Live').length,
      in_progress: pages.filter(p => p.status === 'In progress').length,
      draft: pages.filter(p => p.status === 'Draft').length
    };

    const query = WebsitePageView.pageSearchQuery.trim().toLowerCase();
    const filteredPages = pages.filter(p => {
      if (WebsitePageView.pageStatusFilter !== 'all' && p.status !== WebsitePageView.pageStatusFilter) return false;
      if (query) {
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesPath = p.path.toLowerCase().includes(query);
        const matchesNotes = p.notes ? p.notes.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesPath && !matchesNotes) return false;
      }
      return true;
    });

    return `
      <div class="web-overview-wrapper">
        <!-- Top Stats Banner -->
        <div class="web-pages-stats-row">
          <div class="web-page-stat-pill">
            <span>${icons.globe(15)}</span>
            <span>${isEs ? 'Total páginas' : 'Total pages'}: <strong>${counts.total}</strong></span>
          </div>
          <div class="web-page-stat-pill">
            <span class="web-page-status-pill live">Live</span>
            <span>${isEs ? 'Publicadas' : 'Live'}: <strong>${counts.live}</strong></span>
          </div>
          <div class="web-page-stat-pill">
            <span class="web-page-status-pill in-progress">In progress</span>
            <span>${isEs ? 'En desarrollo' : 'In progress'}: <strong>${counts.in_progress}</strong></span>
          </div>
          <div class="web-page-stat-pill">
            <span class="web-page-status-pill draft">Draft</span>
            <span>${isEs ? 'Borradores' : 'Draft'}: <strong>${counts.draft}</strong></span>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="dev-toolbar" style="margin-bottom: 14px;">
          <div class="dev-toolbar-left">
            <div class="dev-search-box">
              <span class="dev-search-icon">${icons.search(14)}</span>
              <input 
                type="text" 
                class="dev-search-input" 
                id="web-pages-search-input" 
                placeholder="${isEs ? 'Buscar página por título o ruta...' : 'Search page by title or route...'}" 
                value="${WebsitePageView.pageSearchQuery}"
              />
              ${WebsitePageView.pageSearchQuery ? `
                <button class="dev-search-clear" id="web-pages-search-clear" title="Clear">
                  ${icons.close ? icons.close(13) : '✕'}
                </button>
              ` : ''}
            </div>

            <div class="dev-filter-group">
              <select class="dev-filter-select ${WebsitePageView.pageStatusFilter !== 'all' ? 'active' : ''}" id="web-pages-filter-status">
                <option value="all">${isEs ? 'Todos los estados' : 'All statuses'}</option>
                <option value="Live" ${WebsitePageView.pageStatusFilter === 'Live' ? 'selected' : ''}>🟢 Live</option>
                <option value="In progress" ${WebsitePageView.pageStatusFilter === 'In progress' ? 'selected' : ''}>🟡 In progress</option>
                <option value="Draft" ${WebsitePageView.pageStatusFilter === 'Draft' ? 'selected' : ''}>⚪ Draft</option>
              </select>
            </div>
          </div>

          <button class="btn btn-primary btn-sm" id="btn-add-page" style="display: inline-flex; align-items: center; gap: 6px;">
            ${icons.plus(13)}
            <span>${t('website.addPage')}</span>
          </button>
        </div>

        <!-- Pages Grid -->
        ${filteredPages.length > 0 ? `
          <div class="web-pages-grid">
            ${filteredPages.map((p) => {
              const fullUrl = web.url ? `${web.url.replace(/\/+$/, '')}${p.path.startsWith('/') ? '' : '/'}${p.path}` : '';
              const origIdx = pages.indexOf(p);
              return `
                <div class="web-page-card">
                  <div class="web-page-card-top">
                    <span class="web-page-route-badge">
                      ${icons.link(11)}
                      <code>${p.path}</code>
                    </span>
                    <select class="page-status-select" data-idx="${origIdx}" style="padding: 2px 6px; font-size: 11px; border-radius: var(--radius-xs);">
                      <option value="Draft" ${p.status === 'Draft' ? 'selected' : ''}>Draft</option>
                      <option value="In progress" ${p.status === 'In progress' ? 'selected' : ''}>In progress</option>
                      <option value="Live" ${p.status === 'Live' ? 'selected' : ''}>Live</option>
                    </select>
                  </div>

                  <h4 class="web-page-card-title">${p.title}</h4>
                  <p class="web-page-card-notes">${p.notes || (isEs ? 'Sin notas añadidas' : 'No notes added')}</p>

                  <div class="web-page-card-footer">
                    <div style="font-size: 11px; color: var(--text-muted);">
                      ${fullUrl ? `<span title="${fullUrl}">URL activa</span>` : 'Ruta interna'}
                    </div>
                    <div class="web-page-card-actions">
                      ${fullUrl ? `
                        <a href="${fullUrl}" target="_blank" class="btn btn-ghost btn-sm btn-icon" title="Abrir enlace en navegador">
                          ${icons.external(13)}
                        </a>
                      ` : ''}
                      <button class="btn btn-ghost btn-sm btn-icon btn-edit-page" data-idx="${origIdx}" title="${t('common.edit')}">
                        ${icons.edit(13)}
                      </button>
                      <button class="btn btn-ghost btn-sm btn-icon btn-del-page" data-idx="${origIdx}" title="${t('common.delete')}">
                        ${icons.trash(13)}
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="web-ref-empty">
            ${icons.globe(36)}
            <p>
              ${query || WebsitePageView.pageStatusFilter !== 'all' 
                ? (isEs ? 'No se encontraron páginas con esos filtros.' : 'No pages match your filter.')
                : (isEs ? 'No hay páginas registradas todavía en la estructura de tu web.' : 'No pages registered in website structure yet.')}
            </p>
            <button class="btn btn-primary btn-sm" id="btn-add-page-empty">
              ${icons.plus(13)}
              <span>${t('website.addPage')}</span>
            </button>
          </div>
        `}
      </div>
    `;
  }

  // Reusable Website Configuration & SEO Grid Card
  private static renderConfigAndSeoCardHtml(web: WebsiteInfo, project: any): string {
    return `
      <div class="dev-dashboard-grid">
        <!-- Card 1: Configuración de Dominio & Hosting -->
        <div class="dev-card" style="border: 1px solid var(--border-subtle);">
          <div class="dev-card-header">
            <div class="dev-card-title-group">
              <div class="dev-card-icon-bubble" style="background: rgba(59, 130, 246, 0.08); color: #3B82F6; border: 1px solid rgba(59, 130, 246, 0.2);">
                ${icons.globe(18)}
              </div>
              <div>
                <h3 class="dev-card-title">${t('website.generalConfig')}</h3>
                <span class="dev-card-subtitle">Dominio, hosting y URLs de producción</span>
              </div>
            </div>
            ${web.url ? `
              <a href="${web.url}" target="_blank" class="dev-status-pill success" style="text-decoration: none;" title="Abrir URL en navegador">
                <span class="pulse-dot"></span>
                Publicado
              </a>
            ` : `
              <span class="dev-status-pill neutral">Sin publicar</span>
            `}
          </div>

          <div class="dev-card-body">
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label">${t('website.url')}</label>
              <div style="display: flex; gap: 8px;">
                <input type="url" id="web-url" value="${web.url || ''}" placeholder="https://miweb.com" style="flex: 1;" />
                ${web.url ? `
                  <a href="${web.url}" target="_blank" class="btn btn-secondary btn-icon btn-sm" title="Probar enlace" style="flex-shrink: 0;">
                    ${icons.external(13)}
                  </a>
                ` : ''}
              </div>
              <span class="form-hint" style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
                Guarda automáticamente al cambiar de campo o al pulsar Enter
              </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div class="form-group">
                <label class="form-label">${t('website.domain')}</label>
                <input type="text" id="web-domain" value="${web.domain || ''}" placeholder="miweb.com" />
              </div>
              <div class="form-group">
                <label class="form-label">${t('website.hosting')}</label>
                <input type="text" id="web-hosting" value="${web.hosting || ''}" placeholder="Vercel, Cloudflare, Netlify..." />
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">${t('website.repo')}</label>
              <input type="text" id="web-repo" value="${web.repository || ''}" placeholder="https://github.com/usuario/repo" />
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
              <button class="btn btn-primary btn-sm" id="btn-save-web-config">${t('website.saveConfig')}</button>
              <span id="web-config-save-status" style="font-size: 11px; color: var(--text-muted); transition: color 0.2s;">
                Autoguardado activado
              </span>
            </div>
          </div>
        </div>

        <!-- Card 2: Metadatos SEO -->
        <div class="dev-card" style="border: 1px solid var(--border-subtle);">
          <div class="dev-card-header">
            <div class="dev-card-title-group">
              <div class="dev-card-icon-bubble" style="background: rgba(16, 185, 129, 0.08); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2);">
                ${icons.search(18)}
              </div>
              <div>
                <h3 class="dev-card-title">${t('website.seoTitle')}</h3>
                <span class="dev-card-subtitle">Indexación y posicionamiento web</span>
              </div>
            </div>
            <span class="dev-status-pill neutral">Google SEO</span>
          </div>

          <div class="dev-card-body">
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label">${t('website.metaTitle')}</label>
              <input type="text" id="seo-title" value="${web.seo_title || ''}" placeholder="Título principal para Google" />
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label">${t('website.metaDesc')}</label>
              <textarea id="seo-desc" rows="3" placeholder="Descripción resumida para los resultados de búsqueda...">${web.seo_description || ''}</textarea>
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">${t('website.keywords')}</label>
              <input type="text" id="seo-keywords" value="${web.seo_keywords || ''}" placeholder="software, saas, productividad" />
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
              <button class="btn btn-secondary btn-sm" id="btn-save-seo">${t('website.saveSeo')}</button>
              <span id="seo-config-save-status" style="font-size: 11px; color: var(--text-muted); transition: color 0.2s;">
                Autoguardado activado
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 6. VISTA DEDICADA "CONFIGURACIÓN & SEO"
  // ==========================================
  private static renderSeoView(web: WebsiteInfo, project: any): string {
    const isEs = getLanguage() === 'es';
    const sampleTitle = web.seo_title || project.name || 'Mi Proyecto Web';
    const sampleDesc = web.seo_description || project.description || 'Descripción del sitio web optimizada para los motores de búsqueda.';
    const sampleUrl = web.url || `https://${web.domain || 'ejemplo.com'}`;

    return `
      <div class="web-overview-wrapper">
        ${this.renderConfigAndSeoCardHtml(web, project)}

        <!-- Google Search Snippet Live Preview -->
        <div class="web-section-card">
          <div class="web-section-header">
            <div class="web-section-title-group">
              <div class="dev-card-icon-bubble" style="background: rgba(234, 179, 8, 0.08); color: #EAB308; border: 1px solid rgba(234, 179, 8, 0.2);">
                ${icons.external(16)}
              </div>
              <div>
                <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0;">
                  ${isEs ? 'Previsualización en Google (SERP)' : 'Google Search Snippet Preview'}
                </h3>
                <span style="font-size: 12px; color: var(--text-secondary);">
                  ${isEs ? 'Así es como aparecerá tu sitio en los resultados de búsqueda (actualización en tiempo real)' : 'How your website looks in Google search results (live updates)'}
                </span>
              </div>
            </div>
          </div>

          <div style="background: var(--bg-surface-elevated, var(--bg-subtle)); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 16px; max-width: 620px;">
            <div style="font-size: 12px; color: #1a0dab; word-break: break-all; margin-bottom: 3px; font-family: sans-serif;">
              <span class="serp-preview-url" style="color: var(--text-muted); font-size: 11px;">${sampleUrl}</span>
            </div>
            <div class="serp-preview-title" style="font-size: 18px; color: #1a0dab; font-weight: 400; line-height: 1.3; margin-bottom: 4px; font-family: sans-serif; cursor: pointer; text-decoration: underline;">
              ${sampleTitle}
            </div>
            <div class="serp-preview-desc" style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; font-family: sans-serif;">
              ${sampleDesc}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // REUSABLE HTML FRAGMENTS
  // ==========================================

  // Workspace Strip
  private static renderWorkspaceStripHtml(websiteCodePath: string, editor: any, folderExists: boolean): string {
    return `
      <div class="dev-workspace-strip">
        <div class="dev-workspace-left">
          <div class="dev-workspace-icon-bubble">
            ${icons.folder(20)}
          </div>
          <div class="dev-workspace-details">
            <div class="dev-workspace-title-row">
              <span class="dev-workspace-name">Entorno de Código Web</span>
              ${folderExists ? `
                <span class="dev-status-pill success" title="Carpeta separada y vacía lista para tu código">
                  <span class="pulse-dot"></span>
                  Carpeta vacía lista
                </span>
              ` : `
                <span class="dev-status-pill warning" title="La carpeta no existe todavía">
                  <span class="pulse-dot warning"></span>
                  Carpeta no creada
                </span>
              `}
            </div>
            <div class="dev-workspace-path-row">
              <span class="dev-workspace-path" id="web-folder-path" title="${websiteCodePath}">
                ${websiteCodePath}
              </span>
              <button class="btn btn-ghost btn-icon btn-sm" id="btn-copy-web-path" title="Copiar ruta">
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
            <button class="btn btn-secondary btn-icon" id="btn-open-terminal" title="Abrir Terminal de comandos en Website/Proyecto">
              ${icons.terminal(14)}
            </button>
            <button class="btn btn-secondary btn-icon" id="btn-open-folder" title="Abrir carpeta Website/Proyecto en el Explorador">
              ${icons.folder(14)}
            </button>
          ` : `
            <button class="btn btn-primary btn-sm" id="btn-create-web-folder">
              ${icons.plus(13)}
              <span>Crear carpeta Website/Proyecto</span>
            </button>
          `}
        </div>
      </div>
    `;
  }

  // Git Card
  private static renderGitCardHtml(
    isGit: boolean | undefined,
    isConnectedToGitHub: boolean | undefined,
    gitStatus: GitStatusResult | null,
    gitBranch: string,
    gitChanges: string
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
              <span class="dev-card-subtitle">Sincronización de la carpeta Website/Proyecto</span>
            </div>
          </div>

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
                <span>${gitStatus?.hasChanges ? 'Pulsa "Push" para subir los cambios a GitHub.' : 'Tu sitio web local está sincronizado con la nube.'}</span>
              </div>
            </div>

            <!-- Archivos modificados -->
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

            <!-- Últimos cambios -->
            ${gitStatus?.recentCommits && gitStatus.recentCommits.length > 0 ? `
              <div class="dev-git-recent-box">
                <div class="dev-git-box-title-row">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${icons.clock(12)}
                    <span class="dev-git-box-title">Últimos cambios (${gitStatus.recentCommits.length})</span>
                  </div>
                  ${gitStatus.cleanRemoteUrl ? `
                    <a href="#" class="dev-git-view-all-commits" id="link-view-all-commits" title="Ver historial en GitHub">
                      <span>Ver en GitHub</span>
                      ${icons.external(10)}
                    </a>
                  ` : ''}
                </div>
                <div class="dev-git-commits-list">
                  ${gitStatus.recentCommits.map(commit => `
                    <div class="dev-git-commit-row">
                      <div class="dev-git-commit-left">
                        <span class="dev-commit-hash">${commit.hash}</span>
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
            ` : ''}
          ` : `
            <div class="dev-empty-git-state">
              <p style="margin: 0;">Inicializa Git en la carpeta vacía Website/Proyecto para llevar control de versiones y publicar tu sitio en GitHub Pages o Vercel.</p>
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
                      <span>Quitar Git del sitio</span>
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
              <span>Inicializar Git en Website/Proyecto</span>
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

  // Illustrator Card
  private static renderIllustratorCardHtml(web: WebsiteInfo, websiteBase: string): string {
    const aiPath = web.illustrator_file_path;
    const fileName = aiPath ? aiPath.split(/[/\\]/).pop() || 'web_design.ai' : '';

    return `
      <div class="dev-card ai-card-accent" id="website-ai-dropzone">
        <div class="dev-card-header">
          <div class="dev-card-title-group">
            <div class="ai-icon-badge">
              Ai
            </div>
            <div>
              <h3 class="dev-card-title">Diseño en Adobe Illustrator</h3>
              <span class="dev-card-subtitle">Maqueta y diseño vectorial de la web (Website/Design)</span>
            </div>
          </div>

          ${aiPath ? `
            <span class="dev-status-pill success">
              <span class="pulse-dot"></span>
              Guardado en Website/Design
            </span>
          ` : `
            <span class="dev-status-pill neutral">Sin archivo</span>
          `}
        </div>

        <div class="dev-card-body">
          ${aiPath ? `
            <div class="ai-file-display">
              <div class="ai-file-info">
                <span class="ai-file-name">
                  ${icons.file(16)}
                  ${fileName}
                </span>
                <span class="ai-file-path" title="${aiPath}">${aiPath}</span>
              </div>
              <button class="btn btn-secondary btn-sm btn-icon" id="btn-view-ai-folder" title="Ver en carpeta Website/Design/">
                ${icons.folder(13)}
              </button>
            </div>

            <div class="ai-actions-row">
              <button class="btn btn-primary btn-ai-open" id="btn-open-illustrator" style="display: inline-flex; align-items: center; gap: 8px;">
                ${icons.external(14)}
                <span>Abrir en Illustrator</span>
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-change-illustrator" title="Subir otro archivo .ai y reemplazar en Website/Design/">
                ${icons.upload(13)}
                <span>Subir / Cambiar .ai</span>
              </button>
              <button class="btn btn-ghost btn-sm" id="btn-unlink-illustrator" title="Desvincular archivo" style="color: var(--text-muted);">
                Desvincular
              </button>
            </div>
          ` : `
            <div class="ai-empty-box">
              <p class="ai-empty-title">¿Diseñas la web en Adobe Illustrator?</p>
              <p class="ai-empty-desc">
                Sube tu archivo <code>.ai</code> (se guardará automáticamente en la carpeta <code>Website/Design</code>) o genera una plantilla inicial lista para diseñar.
              </p>
              <div style="display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; justify-content: center;">
                <button class="btn btn-primary btn-sm btn-ai-open" id="btn-select-illustrator" style="display: inline-flex; align-items: center; gap: 6px;">
                  ${icons.upload(13)}
                  <span>Subir archivo .ai a Website/Design</span>
                </button>
                <button class="btn btn-secondary btn-sm" id="btn-create-template-ai" style="display: inline-flex; align-items: center; gap: 6px;">
                  ${icons.plus(13)}
                  <span>Crear plantilla en Website/Design/</span>
                </button>
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px;">
                O arrastra y suelta tu archivo <code>.ai</code> directamente en esta tarjeta
              </div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // Moodboard Preview Card
  private static renderMoodboardPreviewCardHtml(referenceImages: WebsiteReferenceImage[]): string {
    return `
      <div class="dev-card">
        <div class="dev-card-header">
          <div class="dev-card-title-group">
            <div class="dev-card-icon-bubble" style="background: rgba(236, 72, 153, 0.08); color: #ec4899; border: 1px solid rgba(236, 72, 153, 0.2);">
              ${icons.image(18)}
            </div>
            <div>
              <h3 class="dev-card-title">Referencias Visuales & Moodboard</h3>
              <span class="dev-card-subtitle">Inspiraciones y estilos para tu web</span>
            </div>
          </div>

          <span class="dev-status-pill neutral">
            <strong>${referenceImages.length}</strong> ${referenceImages.length === 1 ? 'imagen' : 'imágenes'}
          </span>
        </div>

        <div class="dev-card-body">
          ${referenceImages.length > 0 ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 12px;">
              ${referenceImages.slice(0, 4).map(ref => `
                <div class="web-ref-thumb-wrap" data-thumb-path="${ref.path}" style="height: 80px; border-radius: 6px;" title="${ref.name} - ${ref.notes || ''}">
                  <div class="ref-thumb-placeholder">${icons.image(20)}</div>
                </div>
              `).join('')}
            </div>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin: 0 0 12px 0;">
              ${referenceImages.length > 4 ? `+ ${referenceImages.length - 4} referencias adicionales guardadas.` : 'Colección de estilos visuales, capturas y notas de inspiración.'}
            </p>
          ` : `
            <div style="background: var(--bg-surface-elevated, var(--bg-subtle)); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 18px; text-align: center; margin-bottom: 12px;">
              <p style="font-size: 12.5px; color: var(--text-secondary); margin: 0;">
                No has añadido imágenes de referencia todavía. Guarda capturas de webs que te gusten para definir el estilo.
              </p>
            </div>
          `}

          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary btn-sm" id="btn-quick-add-ref-image" style="display: inline-flex; align-items: center; gap: 6px;">
              ${icons.upload(13)}
              <span>Añadir Imagen</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-jump-design-tab">
              <span>Ver todas (${referenceImages.length})</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Sprint Card
  private static renderSprintCardHtml(
    completionRate: number,
    counts: { all: number; todo: number; in_progress: number; done: number },
    web: WebsiteInfo
  ): string {
    return `
      <div class="dev-card">
        <div class="dev-card-header">
          <div class="dev-card-title-group">
            <div class="dev-card-icon-bubble kanban">
              ${icons.columns(18)}
            </div>
            <div>
              <h3 class="dev-card-title">Avance & Tareas Web</h3>
              <span class="dev-card-subtitle">Estado del diseño y desarrollo</span>
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
                <span class="dev-progress-label">del sitio completado</span>
              ` : `
                <span class="dev-progress-big" style="font-size: 16px; font-weight: 700; color: var(--text-muted);">No hay tareas</span>
                <span class="dev-progress-label">No hay tareas del sitio web</span>
              `}
            </div>
            <div class="dev-progress-bar-modern">
              <div class="dev-progress-fill-modern" style="width: ${counts.all > 0 ? completionRate : 0}%;"></div>
            </div>
          </div>

          <!-- Task count pills -->
          <div class="dev-task-pills-row">
            <div class="dev-task-pill" id="web-pill-filter-todo">
              <span class="task-dot todo"></span>
              <span class="task-pill-count">${counts.todo}</span>
              <span class="task-pill-name">Por hacer</span>
            </div>
            <div class="dev-task-pill" id="web-pill-filter-in-progress">
              <span class="task-dot in_progress"></span>
              <span class="task-pill-count">${counts.in_progress}</span>
              <span class="task-pill-name">En progreso</span>
            </div>
            <div class="dev-task-pill" id="web-pill-filter-done">
              <span class="task-dot done"></span>
              <span class="task-pill-count">${counts.done}</span>
              <span class="task-pill-name">Completadas</span>
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 14px;">
            <button class="btn btn-primary btn-sm" id="btn-quick-add-task-board" style="display: inline-flex; align-items: center; gap: 6px;">
              ${icons.plus(13)}
              <span>Añadir tarea</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-jump-tasks-tab">
              <span>Abrir Tablero</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Kanban Tasks Board
  private static renderTasksBoard(
    allTasks: Task[],
    counts: { all: number; todo: number; in_progress: number; done: number },
    completionRate: number
  ): string {
    const query = WebsitePageView.searchQuery.trim().toLowerCase();
    const filteredTasks = allTasks.filter(task => {
      if (WebsitePageView.filterStatus !== 'all' && task.status !== WebsitePageView.filterStatus) return false;
      if (WebsitePageView.filterPriority !== 'all' && task.priority !== WebsitePageView.filterPriority) return false;
      if (WebsitePageView.filterType !== 'all' && task.type !== WebsitePageView.filterType) return false;
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
      <!-- Toolbar -->
      <div class="dev-toolbar" style="margin-bottom: 14px;">
        <div class="dev-toolbar-left">
          <div class="dev-search-box">
            <span class="dev-search-icon">${icons.search(14)}</span>
            <input 
              type="text" 
              class="dev-search-input" 
              id="web-search-input" 
              placeholder="${t('dev.searchPlaceholder')}" 
              value="${WebsitePageView.searchQuery}"
            />
            ${WebsitePageView.searchQuery ? `
              <button class="dev-search-clear" id="web-search-clear" title="Clear">
                ${icons.close ? icons.close(13) : '✕'}
              </button>
            ` : ''}
          </div>

          <div class="dev-filter-group">
            <select class="dev-filter-select ${WebsitePageView.filterPriority !== 'all' ? 'active' : ''}" id="web-filter-priority">
              <option value="all">${t('dev.priorityFilter')}: ${t('common.all') || 'Todas'}</option>
              <option value="urgent" ${WebsitePageView.filterPriority === 'urgent' ? 'selected' : ''}>🔴 ${t('priority.urgent') || 'Urgente'}</option>
              <option value="high" ${WebsitePageView.filterPriority === 'high' ? 'selected' : ''}>🟠 ${t('priority.high') || 'Alta'}</option>
              <option value="medium" ${WebsitePageView.filterPriority === 'medium' ? 'selected' : ''}>🟡 ${t('priority.medium') || 'Media'}</option>
              <option value="low" ${WebsitePageView.filterPriority === 'low' ? 'selected' : ''}>⚪ ${t('priority.low') || 'Baja'}</option>
            </select>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-secondary btn-sm" id="btn-toggle-task-scope">
            ${WebsitePageView.onlyWebsiteTasks ? 'Mostrar todas' : 'Solo tareas web'}
          </button>
        </div>
      </div>

      <!-- Kanban Columns -->
      <div class="dev-kanban-board">
        ${columns.map(col => {
          const colTasks = filteredTasks.filter(item => item.status === col.id);
          const isQuickAddActive = WebsitePageView.activeQuickAddCol === col.id;

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
                ` : colTasks.map(task => WebsitePageView.renderKanbanCard(task)).join('')}
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
                      <button class="btn btn-primary btn-sm btn-submit-quick-add" data-col="${col.id}">
                        ${icons.plus(12)}
                        <span>${(t as any)('common.add') || 'Añadir'}</span>
                      </button>
                      <button class="btn btn-ghost btn-sm btn-cancel-quick-add" data-col="${col.id}">
                        ${t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ` : `
                  <button class="kanban-btn-quick-add btn-quick-add-col" data-col="${col.id}">
                    ${icons.plus(13)}
                    <span>${(t as any)('dev.quickAdd') || 'Añadir'}</span>
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Kanban Card
  private static renderKanbanCard(task: Task): string {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
    const checklistTotal = task.checklist ? task.checklist.length : 0;
    const checklistDone = task.checklist ? task.checklist.filter(i => i.done).length : 0;

    return `
      <div 
        class="kanban-card" 
        data-task-id="${task.id}" 
        draggable="true"
      >
        <div class="kanban-card-top">
          <div class="kanban-card-type-tag ${task.type || 'task'}">
            <span>${task.type || 'task'}</span>
          </div>
          <span class="kanban-priority-dot ${task.priority || 'medium'}" title="${(t as any)('priority.' + (task.priority || 'medium'))}"></span>
        </div>

        <div class="kanban-card-title">${task.title}</div>

        ${task.description ? `
          <div class="kanban-card-desc">${task.description}</div>
        ` : ''}

        <div class="kanban-card-meta">
          ${checklistTotal > 0 ? `
            <div class="kanban-meta-item ${checklistDone === checklistTotal ? 'complete' : ''}">
              ${icons.check(12)}
              <span>${checklistDone}/${checklistTotal}</span>
            </div>
          ` : ''}

          ${task.due_date ? `
            <div class="kanban-meta-item ${isOverdue ? 'overdue' : ''}">
              ${icons.clock(12)}
              <span>${new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          ` : ''}

          ${task.tags && task.tags.length > 0 ? `
            <div class="kanban-card-tags">
              ${task.tags.slice(0, 2).map(tag => `
                <span class="kanban-tag">${tag}</span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Pages Overview Card Content
  private static renderPagesOverviewContentHtml(web: WebsiteInfo): string {
    const pages = web.pages || [];
    const isEs = getLanguage() === 'es';

    if (pages.length === 0) {
      return `
        <div style="background: var(--bg-surface-elevated, var(--bg-subtle)); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 24px; text-align: center;">
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 12px 0;">
            ${isEs ? 'No has registrado ninguna página en la estructura todavía.' : 'No pages registered yet.'}
          </p>
          <button class="btn btn-primary btn-sm" id="btn-add-page" style="display: inline-flex; align-items: center; gap: 6px;">
            ${icons.plus(13)}
            <span>${t('website.addPage')}</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="web-pages-grid" style="margin-bottom: 12px;">
        ${pages.slice(0, 6).map((p, idx) => {
          const fullUrl = web.url ? `${web.url.replace(/\/+$/, '')}${p.path.startsWith('/') ? '' : '/'}${p.path}` : '';
          return `
            <div class="web-page-card">
              <div class="web-page-card-top">
                <span class="web-page-route-badge">
                  ${icons.link(11)}
                  <code>${p.path}</code>
                </span>
                <select class="page-status-select" data-idx="${idx}" style="padding: 2px 6px; font-size: 11px; border-radius: var(--radius-xs); cursor: pointer;">
                  <option value="Draft" ${p.status === 'Draft' ? 'selected' : ''}>Draft</option>
                  <option value="In progress" ${p.status === 'In progress' ? 'selected' : ''}>In progress</option>
                  <option value="Live" ${p.status === 'Live' ? 'selected' : ''}>Live</option>
                </select>
              </div>
              <h4 class="web-page-card-title">${p.title}</h4>
              ${p.notes ? `<p class="web-page-card-notes">${p.notes}</p>` : ''}
              <div class="web-page-card-footer">
                <span style="font-size: 11px; color: var(--text-muted);">${p.path === '/' ? 'Inicio' : 'Ruta'}</span>
                <div class="web-page-card-actions">
                  ${fullUrl ? `
                    <a href="${fullUrl}" target="_blank" class="btn btn-ghost btn-sm btn-icon" title="Abrir enlace">
                      ${icons.external(12)}
                    </a>
                  ` : ''}
                  <button class="btn btn-ghost btn-sm btn-icon btn-edit-page" data-idx="${idx}" title="${t('common.edit')}">
                    ${icons.edit(12)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-del-page" data-idx="${idx}" title="${t('common.delete')}">
                    ${icons.trash(12)}
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${pages.length > 6 ? `
        <div style="text-align: center; margin-top: 8px;">
          <button class="btn btn-secondary btn-sm" id="btn-jump-pages-tab" style="display: inline-flex; align-items: center; gap: 6px;">
            <span>Ver las ${pages.length} páginas registradas</span>
            ${icons.chevronRight ? icons.chevronRight(12) : '→'}
          </button>
        </div>
      ` : ''}
    `;
  }

  // Pages Table (fallback / legacy)
  private static renderPagesTableHtml(web: WebsiteInfo): string {
    return this.renderPagesOverviewContentHtml(web);
  }

  // ==========================================
  // THUMBNAILS LOADER (BASE64 SAFE)
  // ==========================================
  private static async loadThumbnails(container: HTMLElement, referenceImages: WebsiteReferenceImage[]): Promise<void> {
    const thumbWrappers = container.querySelectorAll<HTMLElement>('.web-ref-thumb-wrap[data-thumb-path]');
    thumbWrappers.forEach(async (wrap) => {
      const filePath = wrap.getAttribute('data-thumb-path');
      if (!filePath) return;

      try {
        if (window.nubo?.files?.readFileBase64) {
          const res = await window.nubo.files.readFileBase64(filePath);
          if (res && res.base64) {
            const placeholder = wrap.querySelector('.ref-thumb-placeholder');
            if (placeholder) placeholder.remove();

            const img = document.createElement('img');
            img.src = `data:${res.mimeType};base64,${res.base64}`;
            img.className = 'web-ref-img';
            img.alt = 'Reference';
            wrap.prepend(img);
          }
        }
      } catch (err) {
        console.warn('[WebsitePageView] Could not load image preview for', filePath, err);
      }
    });
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  private static bindEvents(
    container: HTMLElement,
    project: any,
    web: WebsiteInfo,
    allTasks: Task[],
    settings: any,
    websiteCodePath: string,
    websiteBase: string
  ): void {
    const isEs = getLanguage() === 'es';
    const pages = web.pages || [];
    let referenceImages = web.reference_images || [];

    // --- Subnav tabs ---
    container.querySelectorAll('[data-web-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-web-tab') as any;
        if (tab) {
          WebsitePageView.activeTab = tab;
          WebsitePageView.render(container);
        }
      });
    });

    // Jump to tabs from overview
    container.querySelector('#btn-open-full-pages')?.addEventListener('click', () => {
      WebsitePageView.activeTab = 'pages';
      WebsitePageView.render(container);
    });
    container.querySelector('#btn-jump-pages-tab')?.addEventListener('click', () => {
      WebsitePageView.activeTab = 'pages';
      WebsitePageView.render(container);
    });
    container.querySelector('#btn-open-full-tasks')?.addEventListener('click', () => {
      WebsitePageView.activeTab = 'tasks';
      WebsitePageView.render(container);
    });
    container.querySelector('#btn-open-full-seo')?.addEventListener('click', () => {
      WebsitePageView.activeTab = 'seo';
      WebsitePageView.render(container);
    });
    container.querySelector('#btn-jump-tasks-tab')?.addEventListener('click', () => {
      WebsitePageView.activeTab = 'tasks';
      WebsitePageView.render(container);
    });
    container.querySelector('#btn-jump-design-tab')?.addEventListener('click', () => {
      WebsitePageView.activeTab = 'design';
      WebsitePageView.render(container);
    });

    // Page search & filters in dedicated pages view (In-place DOM filtering: NO focus loss!)
    const pagesSearchInput = container.querySelector('#web-pages-search-input') as HTMLInputElement | null;
    const pagesFilterSelect = container.querySelector('#web-pages-filter-status') as HTMLSelectElement | null;
    const pagesClearBtn = container.querySelector('#web-pages-search-clear') as HTMLButtonElement | null;

    const filterPagesDom = () => {
      const query = (pagesSearchInput?.value || '').trim().toLowerCase();
      const status = pagesFilterSelect?.value || 'all';
      WebsitePageView.pageSearchQuery = pagesSearchInput?.value || '';
      WebsitePageView.pageStatusFilter = status;

      const cards = container.querySelectorAll<HTMLElement>('.web-pages-grid .web-page-card');
      cards.forEach(card => {
        const title = card.querySelector('.web-page-card-title')?.textContent?.toLowerCase() || '';
        const path = card.querySelector('code')?.textContent?.toLowerCase() || '';
        const notes = card.querySelector('.web-page-card-notes')?.textContent?.toLowerCase() || '';
        const select = card.querySelector('.page-status-select') as HTMLSelectElement | null;
        const cardStatus = select ? select.value : (card.querySelector('.web-page-status-pill')?.textContent?.trim() || '');

        const matchesQuery = !query || title.includes(query) || path.includes(query) || notes.includes(query);
        const matchesStatus = status === 'all' || cardStatus.toLowerCase() === status.toLowerCase();

        card.style.display = (matchesQuery && matchesStatus) ? '' : 'none';
      });

      if (pagesClearBtn) {
        pagesClearBtn.style.display = query ? 'inline-flex' : 'none';
      }
    };

    pagesSearchInput?.addEventListener('input', filterPagesDom);
    pagesFilterSelect?.addEventListener('change', filterPagesDom);
    pagesClearBtn?.addEventListener('click', () => {
      if (pagesSearchInput) pagesSearchInput.value = '';
      filterPagesDom();
      pagesSearchInput?.focus();
    });

    // Task scope toggle
    container.querySelector('#btn-toggle-task-scope')?.addEventListener('click', () => {
      WebsitePageView.onlyWebsiteTasks = !WebsitePageView.onlyWebsiteTasks;
      WebsitePageView.render(container);
    });

    // Copy path (copies websiteCodePath: Website/Proyecto)
    container.querySelector('#btn-copy-web-path')?.addEventListener('click', () => {
      if (websiteCodePath) {
        navigator.clipboard.writeText(websiteCodePath);
        showToast('Ruta de la carpeta Website/Proyecto copiada al portapapeles.');
      }
    });

    // Create Website folder
    container.querySelector('#btn-create-web-folder')?.addEventListener('click', async () => {
      if (project.folder_path) {
        await window.nubo.website.ensureFolders(project.folder_path);
        showToast('Carpetas de Website/Proyecto creadas.');
        WebsitePageView.render(container);
      }
    });

    // Open in Editor, Terminal, Folder (targets websiteCodePath)
    container.querySelectorAll('#btn-open-in-editor').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!websiteCodePath) return;
        const res = await window.nubo.development.openInEditor(websiteCodePath);
        if (res.success) {
          showToast(`Abierto en ${res.commandUsed}`);
        } else {
          alert(res.error || 'No se pudo abrir el editor.');
        }
      });
    });

    container.querySelectorAll('#btn-open-terminal').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!websiteCodePath) return;
        const res = await window.nubo.development.openTerminal(websiteCodePath);
        if (!res.success) alert(res.error || 'No se pudo abrir la terminal.');
      });
    });

    container.querySelectorAll('#btn-open-folder').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!websiteCodePath) return;
        await window.nubo.development.openFolder(websiteCodePath);
      });
    });

    // --- Git Operations for Website/Proyecto ---
    container.querySelector('#btn-init-git')?.addEventListener('click', async () => {
      if (!websiteCodePath) return;
      const res = await window.nubo.development.gitInit(websiteCodePath);
      if (res.success) {
        showToast('Repositorio Git para Website/Proyecto inicializado.');
        WebsitePageView.cachedGitStatus = await window.nubo.development.getGitStatus(websiteCodePath);
        WebsitePageView.render(container);
      } else {
        alert(res.message);
      }
    });

    container.querySelector('#btn-connect-repo')?.addEventListener('click', () => {
      if (!websiteCodePath) return;
      modalManager.openConnectGitModal(websiteCodePath, WebsitePageView.cachedGitStatus?.remoteUrl || '', async () => {
        WebsitePageView.cachedGitStatus = await window.nubo.development.getGitStatus(websiteCodePath);
        WebsitePageView.render(container);
      });
    });

    container.querySelector('#btn-git-push')?.addEventListener('click', () => {
      if (!websiteCodePath) return;
      const currentGit = WebsitePageView.cachedGitStatus;
      modalManager.openGitPushModal({
        folderPath: websiteCodePath,
        branch: currentGit?.currentBranch || 'main',
        hasChanges: currentGit?.hasChanges,
        statusText: currentGit?.statusText,
        onPush: async (commitMsg) => {
          showToast('Enviando cambios de Website/Proyecto a GitHub (push)...', 'info');
          try {
            const res = await window.nubo.development.gitPush(websiteCodePath, commitMsg);
            showToast(res.message, res.success ? 'success' : 'error');
            WebsitePageView.cachedGitStatus = await window.nubo.development.getGitStatus(websiteCodePath);
            WebsitePageView.render(container);
          } catch (err: any) {
            showToast(err.message || 'Error en push', 'error');
          }
        }
      });
    });

    container.querySelector('#btn-git-pull')?.addEventListener('click', async () => {
      if (!websiteCodePath) return;
      showToast('Descargando cambios desde GitHub (pull)...', 'info');
      try {
        const res = await window.nubo.development.gitPull(websiteCodePath);
        showToast(res.message, res.success ? 'success' : 'error');
        WebsitePageView.cachedGitStatus = await window.nubo.development.getGitStatus(websiteCodePath);
        WebsitePageView.render(container);
      } catch (err: any) {
        showToast(err.message || 'Error en pull', 'error');
      }
    });

    container.querySelector('#btn-open-github')?.addEventListener('click', async () => {
      const git = WebsitePageView.cachedGitStatus;
      if (git?.remoteUrl) {
        await window.nubo.development.openGitHub(git.remoteUrl);
      }
    });

    container.querySelector('#btn-refresh-git')?.addEventListener('click', async () => {
      if (!websiteCodePath) return;
      WebsitePageView.cachedGitStatus = await window.nubo.development.getGitStatus(websiteCodePath);
      showToast('Estado de Git de Website/Proyecto actualizado.');
      WebsitePageView.render(container);
    });

    // Git Dropdown Menu
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

    container.querySelector('#btn-disconnect-remote')?.addEventListener('click', async () => {
      if (confirm('¿Desconectar el repositorio remoto de GitHub para Website/Proyecto?')) {
        await window.nubo.development.gitDisconnectRemote(websiteCodePath);
        WebsitePageView.cachedGitStatus = null;
        showToast('Repositorio desconectado.');
        WebsitePageView.render(container);
      }
    });

    container.querySelector('#btn-remove-git')?.addEventListener('click', async () => {
      if (confirm('¿Eliminar el control de versiones Git (.git) de la carpeta Website/Proyecto?')) {
        await window.nubo.development.gitRemoveRepo(websiteCodePath);
        WebsitePageView.cachedGitStatus = null;
        showToast('Git eliminado de Website/Proyecto.');
        WebsitePageView.render(container);
      }
    });

    container.querySelector('#link-open-repo')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const git = WebsitePageView.cachedGitStatus;
      if (git?.remoteUrl) {
        await window.nubo.development.openGitHub(git.remoteUrl);
      }
    });

    container.querySelector('#link-view-all-commits')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const git = WebsitePageView.cachedGitStatus;
      if (git?.cleanRemoteUrl) {
        const branch = git.currentBranch || 'main';
        await window.nubo.development.openGitHub(`${git.cleanRemoteUrl}/commits/${branch}`);
      }
    });

    // --- Adobe Illustrator Integration ---
    const designDir = `${websiteBase}\\Design`;

    container.querySelector('#btn-open-illustrator')?.addEventListener('click', async () => {
      if (web.illustrator_file_path) {
        showToast('Abriendo archivo en Adobe Illustrator...');
        try {
          const err = await window.nubo.files.openFile(web.illustrator_file_path);
          if (err) {
            showToast('Aviso al abrir Illustrator: ' + err, 'info');
          }
        } catch (err: any) {
          showToast('Error al abrir Illustrator: ' + (err.message || err), 'error');
        }
      }
    });

    container.querySelector('#btn-view-ai-folder')?.addEventListener('click', async () => {
      if (web.illustrator_file_path) {
        await window.nubo.files.openContainingFolder(web.illustrator_file_path);
      }
    });

    const selectIllustratorFile = async () => {
      try {
        if (!websiteBase) {
          showToast('El proyecto no tiene una ruta configurada.', 'error');
          return;
        }

        const files = await window.nubo.dialog.openFiles({
          title: 'Seleccionar archivo de Adobe Illustrator para el Sitio Web',
          filters: [
            { name: 'Adobe Illustrator (*.ai)', extensions: ['ai'] },
            { name: 'Todos los archivos', extensions: ['*'] }
          ]
        });

        if (files && files.length > 0) {
          const selectedAi = files[0];
          let finalPath = selectedAi;

          // Copy the file into the dedicated Website/Design/ directory
          if (window.nubo?.files?.uploadFiles) {
            try {
              const copied = await window.nubo.files.uploadFiles(designDir, [selectedAi]);
              if (copied && copied.length > 0) {
                finalPath = copied[0];
              }
            } catch (copyErr: any) {
              console.warn('[WebsitePageView] Error copying file to Design folder:', copyErr);
            }
          }

          await window.nubo.website.update(project.id, { illustrator_file_path: finalPath });
          web.illustrator_file_path = finalPath;
          showToast('Archivo .ai subido y guardado en Website/Design/ con éxito.');
          WebsitePageView.render(container);
        }
      } catch (err: any) {
        console.error('[WebsitePageView] Error selecting Illustrator file:', err);
        showToast('Error al subir archivo .ai: ' + (err.message || err), 'error');
      }
    };

    container.querySelector('#btn-select-illustrator')?.addEventListener('click', selectIllustratorFile);
    container.querySelector('#btn-change-illustrator')?.addEventListener('click', selectIllustratorFile);

    container.querySelector('#btn-unlink-illustrator')?.addEventListener('click', async () => {
      if (confirm('¿Desvincular el archivo de Illustrator del proyecto? (El archivo permanecerá en tu carpeta Website/Design/)')) {
        await window.nubo.website.update(project.id, { illustrator_file_path: '' });
        web.illustrator_file_path = '';
        showToast('Archivo desvinculado.');
        WebsitePageView.render(container);
      }
    });

    container.querySelector('#btn-create-template-ai')?.addEventListener('click', async () => {
      try {
        if (!websiteBase) {
          showToast('El proyecto no tiene una ruta configurada.', 'error');
          return;
        }
        // Create an initial valid artboard file in Website/Design/web_design.ai
        const createdPath = await window.nubo.files.saveBuffer(designDir, 'web_design.ai', MINIMAL_AI_TEMPLATE_BASE64);
        await window.nubo.website.update(project.id, { illustrator_file_path: createdPath });
        web.illustrator_file_path = createdPath;
        showToast('Plantilla creada con éxito en Website/Design/web_design.ai');
        WebsitePageView.render(container);
      } catch (err: any) {
        showToast('Error creando archivo: ' + err.message, 'error');
      }
    });

    // Drag & Drop support directly onto the Website Illustrator card
    const websiteAiDropzone = container.querySelector('#website-ai-dropzone') as HTMLElement;
    if (websiteAiDropzone) {
      let dragCounter = 0;
      websiteAiDropzone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        websiteAiDropzone.classList.add('ai-dropzone-active');
      });
      websiteAiDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      websiteAiDropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter <= 0) {
          websiteAiDropzone.classList.remove('ai-dropzone-active');
          dragCounter = 0;
        }
      });
      websiteAiDropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        websiteAiDropzone.classList.remove('ai-dropzone-active');

        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          const nativePath = (e.dataTransfer.files[0] as any).path;
          if (nativePath) {
            let finalPath = nativePath;
            if (window.nubo?.files?.uploadFiles) {
              try {
                const copied = await window.nubo.files.uploadFiles(designDir, [nativePath]);
                if (copied && copied.length > 0) finalPath = copied[0];
              } catch (copyErr) {
                console.warn(copyErr);
              }
            }
            await window.nubo.website.update(project.id, { illustrator_file_path: finalPath });
            web.illustrator_file_path = finalPath;
            showToast('Archivo .ai subido y guardado en Website/Design/');
            WebsitePageView.render(container);
          }
        }
      });
    }

    // --- Visual Reference Images / Moodboard ---
    const addReferenceImage = async () => {
      try {
        const files = await window.nubo.dialog.openFiles({
          filters: [
            { name: 'Imágenes (*.png, *.jpg, *.jpeg, *.webp, *.svg)', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'] },
            { name: 'Todos los archivos', extensions: ['*'] }
          ]
        });

        if (files && files.length > 0) {
          const referenciasDir = `${websiteBase}\\Referencias`;
          // Copy image into Website/Referencias (outside the code repo)
          const savedPaths = await window.nubo.files.uploadFiles(referenciasDir, files);
          const finalPath = savedPaths && savedPaths.length > 0 ? savedPaths[0] : files[0];
          const fileName = finalPath.split(/[/\\]/).pop() || 'referencia.png';

          modalManager.openPrompt(
            isEs ? 'Notas de la Referencia Visual' : 'Reference Image Notes',
            isEs ? '¿Qué detalles o aspectos te gustan de esta imagen de referencia? (Opcional):\nEj: Paleta de colores, tipografía, composición, estilo de botones...' : 'What do you like about this reference design? (Optional):',
            '',
            async (userNotes) => {
              const newRef: WebsiteReferenceImage = {
                id: 'ref_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
                name: fileName,
                path: finalPath,
                notes: (userNotes || '').trim(),
                created_at: new Date().toISOString()
              };

              referenceImages = [newRef, ...referenceImages];
              await window.nubo.website.update(project.id, { reference_images: referenceImages });
              showToast(isEs ? 'Imagen de referencia guardada en la galería.' : 'Reference image saved.');
              WebsitePageView.render(container);
            }
          );
        }
      } catch (err) {
        console.error('[WebsitePageView] Error uploading reference image:', err);
      }
    };

    container.querySelector('#btn-add-ref-image')?.addEventListener('click', addReferenceImage);
    container.querySelector('#btn-add-ref-image-empty')?.addEventListener('click', addReferenceImage);
    container.querySelector('#btn-quick-add-ref-image')?.addEventListener('click', addReferenceImage);

    // View reference full size
    container.querySelectorAll('.btn-view-ref-full').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const p = btn.getAttribute('data-path');
        if (p) await window.nubo.files.openFile(p);
      });
    });

    // Edit reference notes
    container.querySelectorAll('.btn-edit-ref-notes').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const refId = btn.getAttribute('data-ref-id');
        const refItem = referenceImages.find(r => r.id === refId);
        if (refItem) {
          modalManager.openPrompt(
            isEs ? 'Editar notas de referencia' : 'Edit reference notes',
            isEs ? '¿Qué detalles o aspectos te gustan de esta imagen de referencia?' : 'What do you like about this reference image?',
            refItem.notes || '',
            async (newNotes) => {
              refItem.notes = newNotes.trim();
              await window.nubo.website.update(project.id, { reference_images: referenceImages });
              showToast(isEs ? 'Notas de la referencia actualizadas.' : 'Reference notes updated.');
              WebsitePageView.render(container);
            }
          );
        }
      });
    });

    // Delete reference image
    container.querySelectorAll('.btn-delete-ref').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const refId = btn.getAttribute('data-ref-id');
        if (confirm('¿Eliminar esta imagen de referencia de la galería?')) {
          referenceImages = referenceImages.filter(r => r.id !== refId);
          await window.nubo.website.update(project.id, { reference_images: referenceImages });
          showToast('Referencia eliminada.');
          WebsitePageView.render(container);
        }
      });
    });

    // --- Tasks & Kanban Events ---
    const openNewWebTask = (initialCol?: 'todo' | 'in_progress' | 'done') => {
      modalManager.openNewTaskModal(project.id, initialCol || 'todo', () => {
        WebsitePageView.render(container);
      });
    };

    container.querySelector('#btn-add-web-task')?.addEventListener('click', () => openNewWebTask());
    container.querySelector('#btn-quick-add-task-board')?.addEventListener('click', () => openNewWebTask());

    // Task search & filter in tasks board (In-place DOM filtering: NO focus loss!)
    const taskSearchInput = container.querySelector('#web-search-input') as HTMLInputElement | null;
    const taskPrioritySelect = container.querySelector('#web-filter-priority') as HTMLSelectElement | null;
    const taskClearBtn = container.querySelector('#web-search-clear') as HTMLButtonElement | null;

    const filterTasksDom = () => {
      const query = (taskSearchInput?.value || '').trim().toLowerCase();
      const priority = taskPrioritySelect?.value || 'all';
      WebsitePageView.searchQuery = taskSearchInput?.value || '';
      WebsitePageView.filterPriority = priority;

      const cards = container.querySelectorAll<HTMLElement>('.kanban-card');
      cards.forEach(card => {
        const title = card.querySelector('.kanban-card-title')?.textContent?.toLowerCase() || '';
        const desc = card.querySelector('.kanban-card-desc')?.textContent?.toLowerCase() || '';
        const tags = Array.from(card.querySelectorAll('.kanban-tag')).map(t => t.textContent?.toLowerCase() || '');
        const priorityDot = card.querySelector('.kanban-priority-dot');
        const cardPriority = priorityDot ? Array.from(priorityDot.classList).find(c => ['urgent', 'high', 'medium', 'low'].includes(c)) : '';

        const matchesQuery = !query || title.includes(query) || desc.includes(query) || tags.some(t => t.includes(query));
        const matchesPriority = priority === 'all' || cardPriority === priority;

        card.style.display = (matchesQuery && matchesPriority) ? '' : 'none';
      });

      if (taskClearBtn) {
        taskClearBtn.style.display = query ? 'inline-flex' : 'none';
      }
    };

    taskSearchInput?.addEventListener('input', filterTasksDom);
    taskPrioritySelect?.addEventListener('change', filterTasksDom);
    taskClearBtn?.addEventListener('click', () => {
      if (taskSearchInput) taskSearchInput.value = '';
      filterTasksDom();
      taskSearchInput?.focus();
    });

    // Quick add columns
    const submitQuickAdd = async (col: string) => {
      const input = container.querySelector(`.kanban-quick-add-input[data-col="${col}"]`) as HTMLInputElement | null;
      const title = input?.value.trim();
      if (title) {
        await window.nubo.tasks.create({
          projectId: project.id,
          title,
          status: col as any,
          priority: 'medium',
          type: 'task',
          tags: ['website']
        });
        showToast(t('dev.toastCreated'));
        WebsitePageView.activeQuickAddCol = null;
        WebsitePageView.render(container);
      }
    };

    container.querySelectorAll('.btn-add-task-col, .btn-quick-add-col').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const col = (e.currentTarget as HTMLElement).getAttribute('data-col') as any;
        WebsitePageView.activeQuickAddCol = col;
        WebsitePageView.render(container).then(() => {
          const quickInput = container.querySelector(`.kanban-quick-add-input[data-col="${col}"]`) as HTMLInputElement | null;
          quickInput?.focus();
        });
      });
    });

    container.querySelectorAll('.btn-cancel-quick-add').forEach(btn => {
      btn.addEventListener('click', () => {
        WebsitePageView.activeQuickAddCol = null;
        WebsitePageView.render(container);
      });
    });

    container.querySelectorAll('.btn-submit-quick-add').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const col = (e.currentTarget as HTMLElement).getAttribute('data-col') || 'todo';
        await submitQuickAdd(col);
      });
    });

    container.querySelectorAll('.kanban-quick-add-input').forEach(inputEl => {
      const col = (inputEl as HTMLElement).getAttribute('data-col') || 'todo';
      inputEl.addEventListener('keydown', async (e) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter') {
          ke.preventDefault();
          await submitQuickAdd(col);
        } else if (ke.key === 'Escape') {
          WebsitePageView.activeQuickAddCol = null;
          WebsitePageView.render(container);
        }
      });
    });

    // Drag and drop for tasks
    container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const dt = (e as DragEvent).dataTransfer;
        const id = card.getAttribute('data-task-id');
        if (id && dt) {
          WebsitePageView.draggedTaskId = id;
          dt.setData('text/plain', id);
        }
      });

      card.addEventListener('click', () => {
        const id = card.getAttribute('data-task-id');
        const task = allTasks.find(t => t.id === id);
        if (task) {
          modalManager.openEditTaskModal(task, () => {
            WebsitePageView.render(container);
          });
        }
      });
    });

    container.querySelectorAll('.kanban-column-body').forEach(colBody => {
      colBody.addEventListener('dragover', (e) => {
        e.preventDefault();
        colBody.classList.add('drag-over');
      });

      colBody.addEventListener('dragleave', () => {
        colBody.classList.remove('drag-over');
      });

      colBody.addEventListener('drop', async (e) => {
        e.preventDefault();
        colBody.classList.remove('drag-over');
        const taskId = WebsitePageView.draggedTaskId || (e as DragEvent).dataTransfer?.getData('text/plain');
        const targetStatus = colBody.getAttribute('data-status') as any;

        if (taskId && targetStatus) {
          const task = allTasks.find(t => t.id === taskId);
          if (task && task.status !== targetStatus) {
            task.status = targetStatus;
            await window.nubo.tasks.update(taskId, { status: targetStatus });
            showToast(`Tarea movida a ${targetStatus}.`);
            WebsitePageView.draggedTaskId = null;
            WebsitePageView.render(container);
          }
        }
      });
    });

    // --- General Config & SEO ---
    const saveWebConfig = async (silent: boolean = false) => {
      const urlInput = container.querySelector('#web-url') as HTMLInputElement | null;
      const domainInput = container.querySelector('#web-domain') as HTMLInputElement | null;
      const hostingInput = container.querySelector('#web-hosting') as HTMLInputElement | null;
      const repoInput = container.querySelector('#web-repo') as HTMLInputElement | null;

      if (!urlInput && !domainInput && !hostingInput && !repoInput) return;

      const url = urlInput?.value.trim() || '';
      const domain = domainInput?.value.trim() || '';
      const hosting = hostingInput?.value.trim() || '';
      const repo = repoInput?.value.trim() || '';

      await window.nubo.website.update(project.id, {
        url,
        domain,
        hosting,
        repository: repo
      });

      if (url && url !== project.website) {
        project.website = url;
        const updatedProj = await window.nubo.projects.update(project.id, { website: url });
        if (updatedProj) {
          appStore.setCurrentProject(updatedProj);
        }
        const all = await window.nubo.projects.getAll();
        appStore.setProjects(all);
      }

      const statusIndicator = container.querySelector('#web-config-save-status');
      if (statusIndicator) {
        statusIndicator.textContent = 'Guardado ✓';
        (statusIndicator as HTMLElement).style.color = '#10B981';
        setTimeout(() => {
          if (statusIndicator) {
            statusIndicator.textContent = 'Autoguardado activado';
            (statusIndicator as HTMLElement).style.color = 'var(--text-muted)';
          }
        }, 2000);
      }

      if (!silent) {
        showToast(t('website.toastSaved'));
      }
    };

    const saveSeoConfig = async (silent: boolean = false) => {
      const titleInput = container.querySelector('#seo-title') as HTMLInputElement | null;
      const descInput = container.querySelector('#seo-desc') as HTMLTextAreaElement | null;
      const kwInput = container.querySelector('#seo-keywords') as HTMLInputElement | null;

      if (!titleInput && !descInput && !kwInput) return;

      const seo_title = titleInput?.value.trim() || '';
      const seo_description = descInput?.value.trim() || '';
      const seo_keywords = kwInput?.value.trim() || '';

      await window.nubo.website.update(project.id, {
        seo_title,
        seo_description,
        seo_keywords
      });

      const statusIndicator = container.querySelector('#seo-config-save-status');
      if (statusIndicator) {
        statusIndicator.textContent = 'Guardado ✓';
        (statusIndicator as HTMLElement).style.color = '#10B981';
        setTimeout(() => {
          if (statusIndicator) {
            statusIndicator.textContent = 'Autoguardado activado';
            (statusIndicator as HTMLElement).style.color = 'var(--text-muted)';
          }
        }, 2000);
      }

      if (!silent) {
        showToast(t('website.toastSeoSaved'));
      }
    };

    container.querySelector('#btn-save-web-config')?.addEventListener('click', () => saveWebConfig(false));
    container.querySelector('#btn-save-seo')?.addEventListener('click', () => saveSeoConfig(false));

    // Auto-save on blur and Enter for config & SEO inputs
    ['#web-url', '#web-domain', '#web-hosting', '#web-repo'].forEach(sel => {
      const el = container.querySelector(sel);
      el?.addEventListener('blur', () => saveWebConfig(true));
      el?.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          (e.target as HTMLElement).blur();
          saveWebConfig(false);
        }
      });
    });

    ['#seo-title', '#seo-keywords'].forEach(sel => {
      const el = container.querySelector(sel);
      el?.addEventListener('blur', () => saveSeoConfig(true));
      el?.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          (e.target as HTMLElement).blur();
          saveSeoConfig(false);
        }
      });
    });

    container.querySelector('#seo-desc')?.addEventListener('blur', () => saveSeoConfig(true));

    // Real-time update for Google SERP preview
    const serpUrl = container.querySelector('.serp-preview-url');
    const serpTitle = container.querySelector('.serp-preview-title');
    const serpDesc = container.querySelector('.serp-preview-desc');

    container.querySelector('#seo-title')?.addEventListener('input', (e) => {
      if (serpTitle) serpTitle.textContent = (e.target as HTMLInputElement).value || project.name || 'Mi Sitio Web';
    });
    container.querySelector('#seo-desc')?.addEventListener('input', (e) => {
      if (serpDesc) serpDesc.textContent = (e.target as HTMLTextAreaElement).value || 'Descripción del sitio web optimizada...';
    });
    container.querySelector('#web-url')?.addEventListener('input', (e) => {
      if (serpUrl) serpUrl.textContent = (e.target as HTMLInputElement).value || 'https://ejemplo.com';
    });

    // Add page
    container.querySelectorAll('#btn-add-page, #btn-add-page-overview, #btn-add-page-empty').forEach(btn => {
      btn.addEventListener('click', () => {
        modalManager.openWebsitePageModal(undefined, async (newPage) => {
          const newPages = [...pages, newPage];
          await window.nubo.website.update(project.id, { pages: newPages });
          showToast(isEs ? `Página "${newPage.title}" agregada.` : `Page "${newPage.title}" added.`);
          WebsitePageView.render(container);
        });
      });
    });

    // Edit page
    container.querySelectorAll('.btn-edit-page').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-idx'));
        const pageItem = pages[idx];
        if (pageItem) {
          modalManager.openWebsitePageModal(pageItem, async (updatedPage) => {
            pages[idx] = updatedPage;
            await window.nubo.website.update(project.id, { pages });
            showToast(isEs ? `Página "${updatedPage.title}" actualizada.` : `Page "${updatedPage.title}" updated.`);
            WebsitePageView.render(container);
          });
        }
      });
    });

    // Page status
    container.querySelectorAll('.page-status-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const select = e.target as HTMLSelectElement;
        const idx = Number(select.getAttribute('data-idx'));
        if (pages[idx]) {
          pages[idx].status = select.value;
          await window.nubo.website.update(project.id, { pages });
          showToast(isEs ? `Estado cambiado a ${select.value}.` : `Status changed to ${select.value}.`);
          WebsitePageView.render(container);
        }
      });
    });

    // Delete page
    container.querySelectorAll('.btn-del-page').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-idx'));
        const p = pages[idx];
        if (p && confirm(isEs ? `¿Eliminar la página "${p.title}"?` : `Delete page "${p.title}"?`)) {
          pages.splice(idx, 1);
          await window.nubo.website.update(project.id, { pages });
          showToast(isEs ? `Página "${p.title}" eliminada.` : `Page "${p.title}" deleted.`);
          WebsitePageView.render(container);
        }
      });
    });
  }
}
