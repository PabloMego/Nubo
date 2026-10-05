import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { modalManager } from '../components/modal';
import { showToast } from '../components/toast';
import { BrandAsset, BrandColorItem, BrandGraphicItem, FileItem, Task, MINIMAL_AI_TEMPLATE_BASE64 } from '../scripts/types';
import { t, getLanguage } from '../scripts/i18n';
import { PdfViewerComponent, base64ToPdfBlobUrl } from '../components/pdf-viewer';

export class BrandPage {
  public static activeTab: 'all' | 'master' | 'identity' | 'colors' | 'typography' | 'logos' | 'graphics' | 'manual' | 'files' | 'tasks' = 'all';
  private static activeFileFilter: string = 'all';
  private static searchQuery: string = '';
  private static filterPriority: string = 'all';
  private static onlyBrandTasks: boolean = false;
  private static activeQuickAddCol: 'todo' | 'in_progress' | 'done' | null = null;
  private static draggedTaskId: string | null = null;

  private static renderMasterIllustratorCardHtml(brand: BrandAsset, brandDir: string, project: any): string {
    const aiPath = brand.illustrator_file_path || '';
    const fileName = aiPath ? aiPath.split(/[/\\]/).pop() || 'brand_master.ai' : '';

    return `
      <div class="brand-ai-card" id="brand-ai-dropzone">
        <div class="brand-ai-header">
          <div class="brand-ai-title-group">
            <div class="brand-ai-badge">Ai</div>
            <div>
              <h3 class="brand-ai-title">Archivo Maestro de Adobe Illustrator (.ai)</h3>
              <div class="brand-ai-subtitle">Centraliza la identidad visual completa: logotipos vectoriales, paletas, variantes y assets de exportación. Guardado en <code>Brand/</code>.</div>
            </div>
          </div>

          ${aiPath ? `
            <span class="dev-status-pill success" style="font-size: 11px;">
              <span class="pulse-dot"></span>
              Guardado en Brand/
            </span>
          ` : `
            <span class="dev-status-pill neutral" style="font-size: 11px;">Sin archivo maestro</span>
          `}
        </div>

        ${aiPath ? `
          <div class="brand-ai-file-box">
            <div class="brand-ai-file-info">
              <span class="brand-ai-file-name">
                ${icons.file(16)}
                <strong>${fileName}</strong>
              </span>
              <span class="brand-ai-file-path" title="${aiPath}">${aiPath}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm brand-ai-btn-open" id="btn-open-brand-illustrator" style="display: inline-flex; align-items: center; gap: 6px;">
                ${icons.external(14)}
                <span>Abrir en Illustrator</span>
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-view-brand-ai-folder" title="Ver archivo en carpeta Brand/">
                ${icons.folder(13)}
                <span>Carpeta</span>
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-change-brand-illustrator" title="Subir otro archivo .ai a Brand/">
                ${icons.upload(13)}
                <span>Subir / Cambiar .ai</span>
              </button>
              <button class="btn btn-ghost btn-sm btn-icon btn-danger" id="btn-unlink-brand-illustrator" title="Desvincular archivo maestro">
                ${icons.trash(13)}
              </button>
            </div>
          </div>
        ` : `
          <div style="background: var(--bg-surface-elevated, var(--bg-subtle)); border: 1px dashed rgba(255, 154, 0, 0.35); border-radius: var(--radius-sm); padding: 20px; text-align: center; margin-bottom: 12px;">
            <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 12px 0; max-width: 580px; margin-inline: auto; line-height: 1.5;">
              Centraliza en un solo archivo <code>.ai</code> todas las mesas de trabajo de tu marca: logo principal, isotipos, favicon y vectores. Sube tu archivo para guardarlo en la carpeta <code>Brand/</code> o genera una plantilla inicial.
            </p>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm brand-ai-btn-open" id="btn-select-brand-illustrator" style="display: inline-flex; align-items: center; gap: 6px;">
                ${icons.upload(13)}
                <span>Subir archivo .ai a Brand/</span>
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-create-brand-template-ai" style="display: inline-flex; align-items: center; gap: 6px;">
                ${icons.plus(13)}
                <span>Crear plantilla Brand/brand_master.ai</span>
              </button>
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 8px;">
              O arrastra y suelta tu archivo <code>.ai</code> directamente en esta tarjeta
            </div>
          </div>
        `}

        <div style="font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
          ${icons.info(12)}
          <span>Consejo: Al diseñar en Illustrator, mantén artboards separados para Logo Horizontal, Isotipo (1:1) y Favicon (32x32) para exportar directamente a Nubo.</span>
        </div>
      </div>
    `;
  }

  private static renderQuickSwatchesHtml(colors: BrandColorItem[]): string {
    if (!colors || colors.length === 0) return '';

    return `
      <div class="brand-quick-swatches-strip">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-right: 4px;">
          ${icons.palette(14)}
          <span>Paleta rápida (clic para copiar):</span>
        </div>
        ${colors.map(c => `
          <div class="brand-quick-swatch" data-hex="${c.hex}" title="Haz clic para copiar ${c.hex} (${c.name})">
            <span class="brand-swatch-circle" style="background-color: ${c.hex};"></span>
            <span class="brand-swatch-hex">${c.hex}</span>
            <span class="brand-swatch-name">${c.name}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  private static getFileCategory(f: FileItem): 'Logos' | 'Banners' | 'Manual' | 'Graphics' | 'Fonts' | 'Asset' {
    const normP = (f.path || '').replace(/\\/g, '/');
    if (normP.includes('/Brand/Logos/') || normP.endsWith('/Brand/Logos') || normP.includes('/Logos/')) return 'Logos';
    if (normP.includes('/Brand/Banners/') || normP.endsWith('/Brand/Banners') || normP.includes('/Banners/')) return 'Banners';
    if (normP.includes('/Brand/Manual/') || normP.endsWith('/Brand/Manual') || normP.includes('/Manual/')) return 'Manual';
    if (normP.includes('/Brand/Graphics/') || normP.endsWith('/Brand/Graphics') || normP.includes('/Graphics/')) return 'Graphics';
    if (normP.includes('/Brand/Fonts/') || normP.endsWith('/Brand/Fonts') || normP.includes('/Fonts/')) return 'Fonts';
    const lower = f.name.toLowerCase();
    if (lower.includes('logo') || lower.includes('favicon') || lower.includes('icon')) return 'Logos';
    if (lower.includes('banner')) return 'Banners';
    if (f.isPdf || lower.includes('manual') || lower.includes('guide')) return 'Manual';
    if (lower.endsWith('.ttf') || lower.endsWith('.otf') || lower.endsWith('.woff') || lower.endsWith('.woff2')) return 'Fonts';
    if (f.isImage) return 'Graphics';
    return 'Asset';
  }

  public static async render(container: HTMLElement): Promise<void> {
    const project = appStore.getState().currentProject;
    if (!project) return;

    // Fetch brand and project tasks in parallel
    let brand: BrandAsset;
    let allTasks: Task[] = [];
    try {
      const [loadedBrand, loadedTasks] = await Promise.all([
        window.nubo.brand.getByProject(project.id) as Promise<BrandAsset>,
        (window.nubo?.tasks?.getByProject ? window.nubo.tasks.getByProject(project.id) : []) as Promise<Task[]>
      ]);
      brand = loadedBrand;
      allTasks = Array.isArray(loadedTasks) ? loadedTasks : [];
    } catch (err) {
      console.warn('Error loading brand or tasks:', err);
      brand = await window.nubo.brand.getByProject(project.id);
    }

    const brandTasks = allTasks.filter(task => {
      if (!BrandPage.onlyBrandTasks) return true;
      const tags = Array.isArray(task.tags) ? task.tags.map(t => t.toLowerCase()) : [];
      const title = (task.title || '').toLowerCase();
      const desc = (task.description || '').toLowerCase();
      return (
        tags.includes('brand') ||
        tags.includes('marca') ||
        tags.includes('logo') ||
        tags.includes('diseño') ||
        tags.includes('design') ||
        tags.includes('color') ||
        tags.includes('colors') ||
        tags.includes('tipografia') ||
        tags.includes('typography') ||
        tags.includes('assets') ||
        title.includes('logo') ||
        title.includes('marca') ||
        title.includes('brand') ||
        title.includes('color') ||
        title.includes('fuente') ||
        title.includes('font') ||
        title.includes('paleta') ||
        title.includes('manual') ||
        title.includes('asset') ||
        desc.includes('logo') ||
        desc.includes('marca') ||
        desc.includes('brand')
      );
    });

    const taskCounts = {
      all: brandTasks.length,
      todo: brandTasks.filter(t => t.status === 'todo').length,
      in_progress: brandTasks.filter(t => t.status === 'in_progress').length,
      done: brandTasks.filter(t => t.status === 'done').length
    };
    const taskCompletionRate = taskCounts.all > 0 ? Math.round((taskCounts.done / taskCounts.all) * 100) : 0;

    // Physical subfolders for brand assets
    const projectRoot = project.folder_path ? project.folder_path.replace(/[/\\]+$/, '') : '';
    const brandDir = projectRoot ? `${projectRoot}/Brand` : '';
    const logosDir = brandDir ? `${brandDir}/Logos` : '';
    const bannersDir = brandDir ? `${brandDir}/Banners` : '';
    const manualDir = brandDir ? `${brandDir}/Manual` : '';
    const graphicsDir = brandDir ? `${brandDir}/Graphics` : '';
    const fontsDir = brandDir ? `${brandDir}/Fonts` : '';

    // Fetch physical files in project's Brand/ directory recursively so nested files are listed
    let brandFiles: FileItem[] = [];
    if (brandDir && window.nubo?.files?.listFiles) {
      try {
        brandFiles = await window.nubo.files.listFiles(brandDir, project.folder_path, true);
      } catch (err) {
        console.warn('Could not read brand folder:', err);
      }
    }

    // Parse categorized colors
    let colors: BrandColorItem[] = [];
    if (brand.colors_json) {
      try {
        colors = JSON.parse(brand.colors_json);
      } catch {
        colors = [];
      }
    }

    // If colors array is empty, populate from default values
    if (!colors || colors.length === 0) {
      colors = [
        { id: 'c_pri_1', name: t('brand.colorsPrimaryCat') + ' 1', hex: brand.primary_color || '#111111', category: 'primary' },
        { id: 'c_sec_1', name: t('brand.colorsSecondaryCat') + ' 1', hex: brand.secondary_color || '#F5F5F5', category: 'secondary' },
        { id: 'c_acc_1', name: t('brand.colorsAccentCat'), hex: brand.accent_color || '#111111', category: 'accent' }
      ];
    }

    // Parse additional graphics
    let graphics: BrandGraphicItem[] = [];
    if (brand.graphics_json) {
      try {
        graphics = JSON.parse(brand.graphics_json);
      } catch {
        graphics = [];
      }
    }

    const primaryColors = colors.filter(c => c.category === 'primary');
    const secondaryColors = colors.filter(c => c.category === 'secondary');
    const accentColors = colors.filter(c => c.category === 'accent');

    // Auto-sync favicon or primary logo to project logo if project has no logo yet
    if (!project.logo && (brand.favicon || brand.primary_logo)) {
      const synchedLogo = brand.favicon || brand.primary_logo;
      try {
        await window.nubo.projects.update(project.id, { logo: synchedLogo });
        project.logo = synchedLogo;
        const allProjs = await window.nubo.projects.getAll();
        appStore.setProjects(allProjs);
        const currP = appStore.getState().currentProject;
        if (currP && currP.id === project.id) {
          currP.logo = synchedLogo;
        }
      } catch (err) {
        console.warn('Failed auto-syncing project logo:', err);
      }
    }

    // Auto-clean orphaned project logo and disk files if brand has no logos left
    if (project.logo && !brand.favicon && !brand.primary_logo && !brand.alternative_logo) {
      try {
        await window.nubo.projects.update(project.id, { logo: null });
        project.logo = null;
        const allProjs = await window.nubo.projects.getAll();
        appStore.setProjects(allProjs);
        const currP = appStore.getState().currentProject;
        if (currP && currP.id === project.id) {
          currP.logo = null;
        }
      } catch (err) {
        console.warn('Failed auto-cleaning orphaned project logo:', err);
      }

      // Also clean up any leftover files in Brand/Logos if no logos are defined
      if (logosDir && window.nubo?.files?.listFiles && window.nubo?.files?.deleteItem) {
        try {
          const logoFiles = await window.nubo.files.listFiles(logosDir, project.folder_path, false);
          for (const f of logoFiles) {
            if (!f.isDirectory) {
              await window.nubo.files.deleteItem(f.path);
            }
          }
        } catch (err) {
          console.warn('Failed cleaning orphaned files in Brand/Logos:', err);
        }
      }
    }

    const curTab = BrandPage.activeTab;

    // Safety guard: if user navigated away while fetching async data, abort
    if (appStore.getState().activeSection !== 'brand') {
      return;
    }

    const isEs = getLanguage() === 'es';

    container.innerHTML = `
      <div class="web-header-hero" style="margin-bottom: var(--space-md);">
        <div class="web-header-left">
          <div class="web-title-row">
            <h1>${t('brand.title')}</h1>
            <div class="dev-header-stats-badge" title="Progreso de tareas de marca">
              ${icons.check(13)}
              <span><strong>${taskCounts.done}/${taskCounts.all}</strong> ${isEs ? 'tareas' : 'tasks'} (${taskCompletionRate}%)</span>
            </div>
            <div class="dev-header-stats-badge" title="Paleta de colores">
              ${icons.palette(13)}
              <span><strong>${colors.length}</strong> colores</span>
            </div>
            <div class="dev-header-stats-badge" title="Recursos gráficos y logos">
              ${icons.image(13)}
              <span><strong>${graphics.length + (brand.primary_logo ? 1 : 0) + (brand.favicon ? 1 : 0)}</strong> logos</span>
            </div>
            ${brand.illustrator_file_path ? `
              <div class="dev-header-stats-badge" style="border-color: rgba(255, 154, 0, 0.4); color: #FF9A00;" title="Archivo Maestro de Illustrator listo">
                <span style="font-weight: 800;">Ai</span>
                <span>Maestro listo</span>
              </div>
            ` : ''}
            ${(brand.brand_manual_pdf || brand.brand_manual_path) ? `
              <div class="dev-header-stats-badge" style="border-color: rgba(239, 68, 68, 0.4); color: #EF4444;" title="Manual de marca PDF disponible">
                <span>PDF</span>
                <span>Manual listo</span>
              </div>
            ` : ''}
          </div>
          <p class="web-subtitle">${t('brand.subtitle')}</p>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-primary btn-sm" id="btn-hero-add-brand-task" style="display: inline-flex; align-items: center; gap: 6px;">
            ${icons.plus(13)}
            <span>${isEs ? 'Nueva tarea' : 'New task'}</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-hero-open-brand-folder" style="display: inline-flex; align-items: center; gap: 6px;">
            ${icons.folder(13)}
            <span>Carpeta Brand/</span>
          </button>
        </div>
      </div>

      <!-- Modern Subnav Navigation Tabs -->
      <div class="brand-nav-tabs">
        <button class="brand-tab-btn ${curTab === 'all' ? 'active' : ''}" data-tab="all">
          ${icons.grid(14)}
          <span>Todo</span>
        </button>
        <button class="brand-tab-btn ${curTab === 'tasks' ? 'active' : ''}" data-tab="tasks">
          ${icons.columns(14)}
          <span>${t('brand.tabTasks')} (${taskCounts.all})</span>
        </button>
        <button class="brand-tab-btn ${curTab === 'master' ? 'active' : ''}" data-tab="master">
          <span style="font-weight: 800; font-size: 11px; color: #FF9A00; background: #261300; padding: 1px 4px; border-radius: 3px; border: 1px solid #FF9A00;">Ai</span>
          <span>Illustrator & Master</span>
        </button>
        <button class="brand-tab-btn ${curTab === 'identity' ? 'active' : ''}" data-tab="identity">
          ${icons.fileText(14)}
          <span>Identidad</span>
        </button>
        <button class="brand-tab-btn ${curTab === 'colors' ? 'active' : ''}" data-tab="colors">
          ${icons.palette(14)}
          <span>Colores (${colors.length})</span>
        </button>
        <button class="brand-tab-btn ${curTab === 'typography' ? 'active' : ''}" data-tab="typography">
          ${icons.code(14)}
          <span>Tipografía</span>
        </button>
        <button class="brand-tab-btn ${curTab === 'logos' ? 'active' : ''}" data-tab="logos">
          ${icons.image(14)}
          <span>Logos & Banners</span>
        </button>
        <button class="brand-tab-btn ${curTab === 'graphics' ? 'active' : ''}" data-tab="graphics">
          ${icons.grid(14)}
          <span>Iconos & Gráficos (${graphics.length})</span>
        </button>
        <button class="brand-tab-btn ${curTab === 'manual' ? 'active' : ''}" data-tab="manual">
          ${icons.filePdf(14)}
          <span>Manual de Marca</span>
        </button>
        <button class="brand-tab-btn ${curTab === 'files' ? 'active' : ''}" data-tab="files">
          ${icons.folder(14)}
          <span>Archivos (${brandFiles.length})</span>
        </button>
      </div>

      <!-- Top Overview Elements (Illustrator Card & Quick Swatches) -->
      ${curTab === 'all' || curTab === 'master' ? BrandPage.renderMasterIllustratorCardHtml(brand, brandDir, project) : ''}
      ${curTab === 'all' ? BrandPage.renderQuickSwatchesHtml(colors) : ''}

      <!-- 1: IDENTITY & PURPOSE -->
      <div class="brand-section-block" id="sec-identity" style="${curTab !== 'all' && curTab !== 'identity' ? 'display:none;' : ''}">
        <div class="brand-card">
          <div class="brand-card-header">
            <div>
              <div class="brand-card-title" style="margin: 0 0 2px 0;">${icons.fileText(16)} ${t('brand.identityTitle')}</div>
              <div class="brand-card-desc">${t('brand.identityDesc')}</div>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-save-identity">${t('brand.saveIdentity')}</button>
          </div>

          <div class="identity-grid">
            <div class="form-group">
              <label class="form-label">${t('brand.whatIsIt')}</label>
              <textarea id="brand-what-is-it" rows="2" placeholder="${t('brand.whatIsItPlaceholder')}">${brand.what_is_it || ''}</textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
              <div class="form-group">
                <label class="form-label">${t('brand.mission')}</label>
                <textarea id="brand-mission" rows="3" placeholder="${t('brand.missionPlaceholder')}">${brand.mission || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">${t('brand.tone')}</label>
                <textarea id="brand-guidelines" rows="3" placeholder="${t('brand.tonePlaceholder')}">${brand.guidelines || ''}</textarea>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2: COLOR PALETTE -->
      <div class="brand-section-block" id="sec-colors" style="${curTab !== 'all' && curTab !== 'colors' ? 'display:none;' : ''}">
        <div class="brand-card">
          <div class="brand-card-header">
            <div>
              <div class="brand-card-title" style="margin: 0 0 2px 0;">${icons.palette(16)} ${t('brand.colorsTitle')}</div>
              <div class="brand-card-desc">${t('brand.colorsDesc')}</div>
            </div>
          </div>

          <div class="color-categories-layout">
            <!-- Primary Colors Category -->
            <div class="color-category-card" data-cat="primary">
              <div class="color-category-header">
                <span class="color-category-title">${t('brand.colorsPrimaryCat')}</span>
                <button class="btn btn-ghost btn-sm btn-add-cat-color" data-cat="primary" title="${t('brand.addColor')}">
                  ${icons.plus(12)}
                </button>
              </div>
              <div class="colors-list" id="list-primary-colors">
                ${primaryColors.map((c) => BrandPage.renderColorRow(c)).join('')}
              </div>
              <button class="btn-add-color btn-add-cat-color" data-cat="primary">
                ${icons.plus(13)} <span>${t('brand.addColor')}</span>
              </button>
            </div>

            <!-- Secondary Colors Category -->
            <div class="color-category-card" data-cat="secondary">
              <div class="color-category-header">
                <span class="color-category-title">${t('brand.colorsSecondaryCat')}</span>
                <button class="btn btn-ghost btn-sm btn-add-cat-color" data-cat="secondary" title="${t('brand.addColor')}">
                  ${icons.plus(12)}
                </button>
              </div>
              <div class="colors-list" id="list-secondary-colors">
                ${secondaryColors.map((c) => BrandPage.renderColorRow(c)).join('')}
              </div>
              <button class="btn-add-color btn-add-cat-color" data-cat="secondary">
                ${icons.plus(13)} <span>${t('brand.addColor')}</span>
              </button>
            </div>

            <!-- Accent Color Category -->
            <div class="color-category-card" data-cat="accent">
              <div class="color-category-header">
                <span class="color-category-title">${t('brand.colorsAccentCat')}</span>
                <button class="btn btn-ghost btn-sm btn-add-cat-color" data-cat="accent" title="${t('brand.addColor')}">
                  ${icons.plus(12)}
                </button>
              </div>
              <div class="colors-list" id="list-accent-colors">
                ${accentColors.map((c) => BrandPage.renderColorRow(c)).join('')}
              </div>
              <button class="btn-add-color btn-add-cat-color" data-cat="accent">
                ${icons.plus(13)} <span>${t('brand.addColor')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3: TYPOGRAPHY -->
      <div class="brand-section-block" id="sec-typography" style="${curTab !== 'all' && curTab !== 'typography' ? 'display:none;' : ''}">
        <div class="brand-card">
          <div class="brand-card-header">
            <div>
              <div class="brand-card-title" style="margin: 0 0 2px 0;">${icons.code(16)} ${t('brand.typographyTitle')}</div>
              <div class="brand-card-desc">${t('brand.typographyDesc')}</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" id="btn-open-fonts-folder" title="${t('brand.openFolder')}">
                ${icons.folder(13)}
                <span>${getLanguage() === 'es' ? 'Carpeta Fonts' : 'Fonts folder'}</span>
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-upload-font" title="${t('brand.upload')}">
                ${icons.upload(13)}
                <span>${getLanguage() === 'es' ? 'Subir fuente (.ttf, .otf)' : 'Upload font'}</span>
              </button>
              <button class="btn btn-primary btn-sm" id="btn-save-typography">${t('brand.saveTypography')}</button>
            </div>
          </div>

          <div class="typography-grid">
            <!-- Primary Typography -->
            <div class="type-specimen-card">
              <div class="form-group" style="margin-bottom: 8px;">
                <label class="form-label">${t('brand.primaryFont')}</label>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <input type="text" id="type-primary-font" style="flex: 1;" value="${brand.typography || 'Inter, -apple-system, sans-serif'}" placeholder="${t('brand.fontPlaceholder')}" />
                  <button class="btn btn-secondary btn-sm btn-open-system-fonts" data-target="type-primary-font" title="${t('brand.selectPcFont')}">
                    ${icons.sidebar(13)}
                    <span>${t('brand.selectPcFont')}</span>
                  </button>
                </div>
              </div>
              <div class="type-font-chips" data-target="type-primary-font">
                <span class="type-chip" data-font="Inter, sans-serif">Inter</span>
                <span class="type-chip" data-font="Outfit, sans-serif">Outfit</span>
                <span class="type-chip" data-font="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</span>
                <span class="type-chip" data-font="'Space Grotesk', sans-serif">Space Grotesk</span>
                <span class="type-chip" data-font="Syne, sans-serif">Syne</span>
                <span class="type-chip" data-font="Poppins, sans-serif">Poppins</span>
              </div>
              <div class="type-live-preview" id="preview-primary-type" style="font-family: ${brand.typography || 'inherit'};">
                <div class="type-alphabet">Aa Bb Gg 123 @#%&</div>
                <div class="type-sample-phrase" style="font-size: 15px; font-weight: 600;">
                  ${t('brand.sampleHeading')}
                </div>
              </div>
            </div>

            <!-- Secondary Typography -->
            <div class="type-specimen-card">
              <div class="form-group" style="margin-bottom: 8px;">
                <label class="form-label">${t('brand.secondaryFont')}</label>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <input type="text" id="type-secondary-font" style="flex: 1;" value="${brand.secondary_typography || 'Roboto, system-ui, sans-serif'}" placeholder="${t('brand.fontPlaceholder')}" />
                  <button class="btn btn-secondary btn-sm btn-open-system-fonts" data-target="type-secondary-font" title="${t('brand.selectPcFont')}">
                    ${icons.sidebar(13)}
                    <span>${t('brand.selectPcFont')}</span>
                  </button>
                </div>
              </div>
              <div class="type-font-chips" data-target="type-secondary-font">
                <span class="type-chip" data-font="Roboto, sans-serif">Roboto</span>
                <span class="type-chip" data-font="'Open Sans', sans-serif">Open Sans</span>
                <span class="type-chip" data-font="'JetBrains Mono', monospace">JetBrains Mono</span>
                <span class="type-chip" data-font="system-ui, -apple-system, sans-serif">System UI</span>
                <span class="type-chip" data-font="'Fira Code', monospace">Fira Code</span>
              </div>
              <div class="type-live-preview" id="preview-secondary-type" style="font-family: ${brand.secondary_typography || 'inherit'};">
                <div class="type-alphabet" style="font-size: 15px; font-weight: 400;">Aa Bb Gg 123 @#%&</div>
                <div class="type-sample-phrase">
                  ${t('brand.sampleBody')}
                </div>
              </div>
            </div>
          </div>

          <!-- Uploaded Custom Font Files Specimen Grid -->
          <div class="uploaded-fonts-section">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm); flex-wrap: wrap; gap: 8px;">
              <div>
                <div style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                  ${icons.upload(15)}
                  <span>${t('brand.uploadedFontsTitle')}</span>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">${t('brand.uploadedFontsDesc')}</div>
              </div>
              <button class="btn btn-secondary btn-sm" id="btn-upload-font-secondary">
                ${icons.plus(13)}
                <span>${t('brand.upload')} (.ttf, .otf, .woff)</span>
              </button>
            </div>

            ${(() => {
              const fontFiles = brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Fonts');
              if (fontFiles.length === 0) {
                return `
                  <div style="border: 2px dashed var(--border-subtle); border-radius: var(--radius-sm); padding: 24px; text-align: center; color: var(--text-muted);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                      ${icons.code(24)}
                      <span style="font-size: 13px;">${t('brand.noUploadedFonts')}</span>
                    </div>
                  </div>
                `;
              }

              return `
                <div class="uploaded-fonts-grid">
                  ${fontFiles.map(f => {
                    const fontFam = `NuboCustom_${f.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    const sizeStr = f.size ? `${(f.size / 1024).toFixed(1)} KB` : '—';
                    const extUpper = f.extension.toUpperCase();

                    return `
                      <div class="uploaded-font-card" data-font-file="${f.name}" data-font-family="${fontFam}" data-font-path="${f.path}">
                        <div class="uploaded-font-header">
                          <div class="uploaded-font-meta">
                            ${icons.code(16)}
                            <div>
                              <div class="uploaded-font-title">${f.name}</div>
                              <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">Brand/Fonts/${f.name} • ${sizeStr}</div>
                            </div>
                          </div>
                          <span class="badge" style="font-size: 10px; font-weight: 600;">${extUpper}</span>
                        </div>

                        <div class="uploaded-font-specimen">
                          <div class="uploaded-font-preview" data-font-name="${f.name}" data-font-family="${fontFam}" style="font-family: '${fontFam}', inherit;">
                            <div style="font-size: 20px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.01em;">Aa Bb Gg 123 @#%&</div>
                            <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin-top: 4px;">
                              ${getLanguage() === 'es' ? 'El veloz murciélago hindú comía feliz cardillo y kiwi. 0123456789' : 'The quick brown fox jumps over the lazy dog. 0123456789'}
                            </div>
                          </div>
                        </div>

                        <div class="uploaded-font-actions">
                          <div style="display: flex; gap: 6px;">
                            <button class="btn btn-secondary btn-xs btn-set-primary-font" data-family="${fontFam}" title="${t('brand.useAsPrimary')}">
                              ${icons.check(12)} <span>${t('brand.useAsPrimary')}</span>
                            </button>
                            <button class="btn btn-secondary btn-xs btn-set-secondary-font" data-family="${fontFam}" title="${t('brand.useAsSecondary')}">
                              <span>${t('brand.useAsSecondary')}</span>
                            </button>
                          </div>
                          <div style="display: flex; gap: 4px;">
                            <button class="btn btn-ghost btn-xs btn-icon btn-font-download" data-name="${f.name}" data-path="${f.path}" title="${t('brand.download')}">
                              ${icons.download(13)}
                            </button>
                            <button class="btn btn-ghost btn-xs btn-icon btn-font-folder" data-path="${f.path}" title="${t('brand.openFolder')}">
                              ${icons.folder(13)}
                            </button>
                            <button class="btn btn-ghost btn-xs btn-icon btn-danger btn-font-delete" data-path="${f.path}" title="${t('brand.remove')}">
                              ${icons.trash(13)}
                            </button>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `;
            })()}
          </div>

        </div>
      </div>

      <!-- 4: LOGOS & BANNER -->
      <div class="brand-section-block" id="sec-logos" style="${curTab !== 'all' && curTab !== 'logos' ? 'display:none;' : ''}">
        <div class="brand-card">
          <div class="brand-card-header">
            <div>
              <div class="brand-card-title" style="margin: 0 0 2px 0;">${icons.image(16)} ${t('brand.logosTitle')}</div>
              <div class="brand-card-desc">${t('brand.logosDesc')}</div>
            </div>
          </div>

          <!-- Main Logos Grid -->
          <div class="logos-grid">
            <!-- Primary Logo -->
            <div class="logo-item-card" data-key="primary_logo">
              <div class="logo-preview-box checker-pattern" id="view-primary-logo" title="${t('brand.viewLarge')}">
                ${brand.primary_logo ? `<img src="${brand.primary_logo}" alt="Primary Logo" />` : icons.image(36)}
                <div class="logo-hover-overlay">
                  <span class="btn btn-sm btn-secondary" style="background: rgba(0,0,0,0.7); color: #fff; border: none;">
                    ${icons.maximize(13)} ${t('brand.viewLarge')}
                  </span>
                </div>
              </div>
              <div class="logo-card-info">
                <span class="logo-card-title">${t('brand.primaryLogo')}</span>
                <span class="logo-card-desc">${t('brand.primaryLogoDesc')}</span>
              </div>
              <div class="logo-card-actions">
                <button class="btn btn-secondary btn-sm btn-logo-upload" data-key="primary_logo" title="${t('brand.upload')}">
                  ${icons.upload(13)} <span>${brand.primary_logo ? t('brand.change') : t('brand.upload')}</span>
                </button>
                ${brand.primary_logo ? `
                  <button class="btn btn-ghost btn-sm btn-icon btn-logo-view" data-title="${t('brand.primaryLogo')}" data-src="${brand.primary_logo}" data-path="${brand.primary_logo_path || ''}" title="${t('brand.viewLarge')}">
                    ${icons.maximize(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-logo-folder" data-path="${brand.primary_logo_path || logosDir || brandDir}" title="${t('brand.openFolder')}">
                    ${icons.folder(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-logo-download" data-name="${project.name}_logo_primary.png" data-src="${brand.primary_logo}" data-path="${brand.primary_logo_path || ''}" title="${t('brand.download')}">
                    ${icons.download(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-danger btn-logo-remove" data-key="primary_logo" title="${t('brand.remove')}">
                    ${icons.trash(14)}
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Alternative Logo -->
            <div class="logo-item-card" data-key="alternative_logo">
              <div class="logo-preview-box checker-pattern" id="view-alt-logo" title="${t('brand.viewLarge')}">
                ${brand.alternative_logo ? `<img src="${brand.alternative_logo}" alt="Alt Logo" />` : icons.image(36)}
                <div class="logo-hover-overlay">
                  <span class="btn btn-sm btn-secondary" style="background: rgba(0,0,0,0.7); color: #fff; border: none;">
                    ${icons.maximize(13)} ${t('brand.viewLarge')}
                  </span>
                </div>
              </div>
              <div class="logo-card-info">
                <span class="logo-card-title">${t('brand.altLogo')}</span>
                <span class="logo-card-desc">${t('brand.altLogoDesc')}</span>
              </div>
              <div class="logo-card-actions">
                <button class="btn btn-secondary btn-sm btn-logo-upload" data-key="alternative_logo" title="${t('brand.upload')}">
                  ${icons.upload(13)} <span>${brand.alternative_logo ? t('brand.change') : t('brand.upload')}</span>
                </button>
                ${brand.alternative_logo ? `
                  <button class="btn btn-ghost btn-sm btn-icon btn-logo-view" data-title="${t('brand.altLogo')}" data-src="${brand.alternative_logo}" data-path="${brand.alternative_logo_path || ''}" title="${t('brand.viewLarge')}">
                    ${icons.maximize(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-logo-folder" data-path="${brand.alternative_logo_path || logosDir || brandDir}" title="${t('brand.openFolder')}">
                    ${icons.folder(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-logo-download" data-name="${project.name}_logo_alt.png" data-src="${brand.alternative_logo}" data-path="${brand.alternative_logo_path || ''}" title="${t('brand.download')}">
                    ${icons.download(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-danger btn-logo-remove" data-key="alternative_logo" title="${t('brand.remove')}">
                    ${icons.trash(14)}
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Favicon / App Icon -->
            <div class="logo-item-card" data-key="favicon">
              <div class="logo-preview-box checker-pattern" id="view-favicon" title="${t('brand.viewLarge')}">
                ${brand.favicon ? `<img src="${brand.favicon}" alt="Favicon" style="width: 54px; height: 54px; border-radius: 8px; box-shadow: var(--shadow-sm);" />` : icons.image(36)}
                <div class="logo-hover-overlay">
                  <span class="btn btn-sm btn-secondary" style="background: rgba(0,0,0,0.7); color: #fff; border: none;">
                    ${icons.maximize(13)} ${t('brand.viewLarge')}
                  </span>
                </div>
              </div>
              <div class="logo-card-info">
                <span class="logo-card-title">${t('brand.favicon')}</span>
                <span class="logo-card-desc">${t('brand.faviconDesc')}</span>
              </div>
              <div class="logo-card-actions">
                <button class="btn btn-secondary btn-sm btn-logo-upload" data-key="favicon" title="${t('brand.upload')}">
                  ${icons.upload(13)} <span>${brand.favicon ? t('brand.change') : t('brand.upload')}</span>
                </button>
                ${brand.favicon ? `
                  <button class="btn btn-ghost btn-sm btn-icon btn-logo-view" data-title="${t('brand.favicon')}" data-src="${brand.favicon}" data-path="${brand.favicon_path || ''}" title="${t('brand.viewLarge')}">
                    ${icons.maximize(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-logo-folder" data-path="${brand.favicon_path || logosDir || brandDir}" title="${t('brand.openFolder')}">
                    ${icons.folder(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-logo-download" data-name="${project.name}_favicon.png" data-src="${brand.favicon}" data-path="${brand.favicon_path || ''}" title="${t('brand.download')}">
                    ${icons.download(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-danger btn-logo-remove" data-key="favicon" title="${t('brand.remove')}">
                    ${icons.trash(14)}
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Brand Banner (Social & Web 3:1) -->
          <div class="banner-container">
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
              ${t('brand.banner')}
            </div>
            <div class="banner-preview-card">
              <div class="banner-viewport" id="view-banner" title="${t('brand.viewLarge')}">
                ${brand.banner ? `<img src="${brand.banner}" alt="Brand Banner" />` : `
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--text-muted);">
                    ${icons.image(32)}
                    <span style="font-size: 12px;">${t('brand.bannerDesc')}</span>
                  </div>
                `}
                <div class="logo-hover-overlay">
                  <span class="btn btn-sm btn-secondary" style="background: rgba(0,0,0,0.7); color: #fff; border: none;">
                    ${icons.maximize(13)} ${t('brand.viewLarge')}
                  </span>
                </div>
              </div>
              <div class="banner-info-bar">
                <span style="font-size: 12px; color: var(--text-secondary);">${t('brand.bannerDesc')}</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <button class="btn btn-secondary btn-sm btn-logo-upload" data-key="banner">
                    ${icons.upload(13)}
                    <span>${brand.banner ? t('brand.change') : t('brand.upload')}</span>
                  </button>
                  ${brand.banner ? `
                    <button class="btn btn-ghost btn-sm btn-icon btn-logo-view" data-title="${t('brand.banner')}" data-src="${brand.banner}" data-path="${brand.banner_path || ''}" title="${t('brand.viewLarge')}">
                      ${icons.maximize(14)}
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon btn-logo-folder" data-path="${brand.banner_path || bannersDir || brandDir}" title="${t('brand.openFolder')}">
                      ${icons.folder(14)}
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon btn-logo-download" data-name="${project.name}_banner.png" data-src="${brand.banner}" data-path="${brand.banner_path || ''}" title="${t('brand.download')}">
                      ${icons.download(14)}
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon btn-danger btn-logo-remove" data-key="banner" title="${t('brand.remove')}">
                      ${icons.trash(14)}
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 5: ICONOGRAPHY & GRAPHICS -->
      <div class="brand-section-block" id="sec-graphics" style="${curTab !== 'all' && curTab !== 'graphics' ? 'display:none;' : ''}">
        <div class="brand-card">
          <div class="brand-card-header">
            <div>
              <div class="brand-card-title" style="margin: 0 0 2px 0;">${icons.grid(16)} ${t('brand.graphicsTitle')}</div>
              <div class="brand-card-desc">${t('brand.graphicsDesc')}</div>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-add-graphic">
              ${icons.plus(13)}
              <span>${t('brand.addGraphic')}</span>
            </button>
          </div>

          <div class="logos-grid" id="graphics-items-grid">
            ${graphics.length > 0 ? graphics.map((g, idx) => `
              <div class="logo-item-card">
                <div class="logo-preview-box checker-pattern btn-graphic-view" data-idx="${idx}" title="${t('brand.viewLarge')}">
                  <img src="${g.previewUrl}" alt="${g.title}" />
                  <div class="logo-hover-overlay">
                    <span class="btn btn-sm btn-secondary" style="background: rgba(0,0,0,0.7); color: #fff; border: none;">
                      ${icons.maximize(13)} ${t('brand.viewLarge')}
                    </span>
                  </div>
                </div>
                <div class="logo-card-info">
                  <span class="logo-card-title">${g.title}</span>
                  <span class="logo-card-desc">${g.format || 'Asset'}</span>
                </div>
                <div class="logo-card-actions">
                  <button class="btn btn-ghost btn-sm btn-icon btn-graphic-view" data-idx="${idx}" title="${t('brand.viewLarge')}">
                    ${icons.maximize(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-graphic-folder" data-path="${g.path || graphicsDir || brandDir}" title="${t('brand.openFolder')}">
                    ${icons.folder(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-graphic-download" data-name="${g.title.replace(/\s+/g, '_')}.png" data-src="${g.previewUrl}" data-path="${g.path || ''}" title="${t('brand.download')}">
                    ${icons.download(14)}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-icon btn-danger btn-graphic-delete" data-idx="${idx}" title="${t('brand.remove')}">
                    ${icons.trash(14)}
                  </button>
                </div>
              </div>
            `).join('') : `
              <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm);">
                ${t('brand.noGraphics')}
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- 6: BRAND MANUAL PDF -->
      <div class="brand-section-block" id="sec-manual" style="${curTab !== 'all' && curTab !== 'manual' ? 'display:none;' : ''}">
        <div class="brand-card">
          <div class="brand-card-header">
            <div>
              <div class="brand-card-title" style="margin: 0 0 2px 0;">${icons.filePdf(16)} ${t('brand.manualTitle')}</div>
              <div class="brand-card-desc">${t('brand.manualDesc')}</div>
            </div>
            ${(brand.brand_manual_pdf || brand.brand_manual_path) ? `
              <div style="display: flex; gap: 8px; align-items: center;">
                <button class="btn btn-secondary btn-sm" id="btn-pdf-replace">
                  ${icons.upload(13)}
                  <span>${t('brand.change')}</span>
                </button>
                <button class="btn btn-ghost btn-sm btn-danger btn-icon" id="btn-pdf-remove" title="${t('brand.remove')}">
                  ${icons.trash(14)}
                </button>
              </div>
            ` : ''}
          </div>

          <div class="brand-pdf-container" id="brand-pdf-mount-point">
            ${(brand.brand_manual_pdf || brand.brand_manual_path) ? `
              <div class="pdf-loading-state">
                <div class="spinner" style="width: 20px; height: 20px; border: 2px solid var(--border-subtle); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <span>Cargando visor interactivo de PDF...</span>
              </div>
            ` : `
              <div class="pdf-dropzone" id="btn-upload-manual-dropzone">
                <div style="width: 48px; height: 48px; border-radius: var(--radius-sm); background: var(--bg-surface); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; color: var(--color-primary);">
                  ${icons.filePdf(26)}
                </div>
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${t('brand.manualUpload')}</div>
                <div style="font-size: 12.5px; color: var(--text-secondary); max-width: 420px;">${t('brand.manualUploadDesc')}</div>
                <button class="btn btn-primary btn-sm" style="margin-top: 8px;">
                  ${icons.upload(13)}
                  <span>${t('brand.manualSelectBtn')}</span>
                </button>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- 7: BRAND FILES & ASSETS REPOSITORY -->
      <div class="brand-section-block" id="sec-files" style="${curTab !== 'all' && curTab !== 'files' ? 'display:none;' : ''}">
        <div class="brand-card brand-files-card" id="brand-files-dropzone">
          <div class="brand-card-header">
            <div>
              <div class="brand-card-title" style="margin: 0 0 2px 0;">${icons.folder(16)} ${t('brand.filesTitle')}</div>
              <div class="brand-card-desc">${t('brand.filesDesc')}</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" id="btn-open-brand-folder">
                ${icons.folder(13)}
                <span>${t('brand.openFolder')}</span>
              </button>
              <button class="btn btn-primary btn-sm" id="btn-upload-brand-file">
                ${icons.plus(13)}
                <span>${BrandPage.activeFileFilter !== 'all' ? `${t('brand.addAssetFile')} (${BrandPage.activeFileFilter})` : t('brand.addAssetFile')}</span>
              </button>
            </div>
          </div>

          <!-- Subfolders Quick Hub Grid -->
          <div class="brand-subfolders-grid">
            <div class="brand-subfolder-card ${BrandPage.activeFileFilter === 'Logos' ? 'active' : ''}" data-cat="Logos" title="Filtrar por Logos / Abrir carpeta">
              <div class="brand-subfolder-info">
                ${icons.image(18)}
                <div>
                  <div class="brand-subfolder-name">${t('brand.folderLogos')}</div>
                  <div class="brand-subfolder-path">Brand/Logos</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="brand-subfolder-badge">${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Logos').length}</span>
                <button class="btn btn-ghost btn-xs btn-icon btn-subfolder-open" data-path="${logosDir}" title="${t('brand.openFolderCategory', { name: 'Logos' })}">
                  ${icons.folder(13)}
                </button>
              </div>
            </div>

            <div class="brand-subfolder-card ${BrandPage.activeFileFilter === 'Banners' ? 'active' : ''}" data-cat="Banners" title="Filtrar por Banners / Abrir carpeta">
              <div class="brand-subfolder-info">
                ${icons.image(18)}
                <div>
                  <div class="brand-subfolder-name">${t('brand.folderBanners')}</div>
                  <div class="brand-subfolder-path">Brand/Banners</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="brand-subfolder-badge">${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Banners').length}</span>
                <button class="btn btn-ghost btn-xs btn-icon btn-subfolder-open" data-path="${bannersDir}" title="${t('brand.openFolderCategory', { name: 'Banners' })}">
                  ${icons.folder(13)}
                </button>
              </div>
            </div>

            <div class="brand-subfolder-card ${BrandPage.activeFileFilter === 'Manual' ? 'active' : ''}" data-cat="Manual" title="Filtrar por Manual / Abrir carpeta">
              <div class="brand-subfolder-info">
                ${icons.filePdf(18)}
                <div>
                  <div class="brand-subfolder-name">${t('brand.folderManual')}</div>
                  <div class="brand-subfolder-path">Brand/Manual</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="brand-subfolder-badge">${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Manual').length}</span>
                <button class="btn btn-ghost btn-xs btn-icon btn-subfolder-open" data-path="${manualDir}" title="${t('brand.openFolderCategory', { name: 'Manual' })}">
                  ${icons.folder(13)}
                </button>
              </div>
            </div>

            <div class="brand-subfolder-card ${BrandPage.activeFileFilter === 'Graphics' ? 'active' : ''}" data-cat="Graphics" title="Filtrar por Gráficos / Abrir carpeta">
              <div class="brand-subfolder-info">
                ${icons.grid(18)}
                <div>
                  <div class="brand-subfolder-name">${t('brand.folderGraphics')}</div>
                  <div class="brand-subfolder-path">Brand/Graphics</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="brand-subfolder-badge">${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Graphics').length}</span>
                <button class="btn btn-ghost btn-xs btn-icon btn-subfolder-open" data-path="${graphicsDir}" title="${t('brand.openFolderCategory', { name: 'Graphics' })}">
                  ${icons.folder(13)}
                </button>
              </div>
            </div>

            <div class="brand-subfolder-card ${BrandPage.activeFileFilter === 'Fonts' ? 'active' : ''}" data-cat="Fonts" title="Filtrar por Fuentes / Abrir carpeta">
              <div class="brand-subfolder-info">
                ${icons.code(18)}
                <div>
                  <div class="brand-subfolder-name">${t('brand.folderFonts')}</div>
                  <div class="brand-subfolder-path">Brand/Fonts</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="brand-subfolder-badge">${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Fonts').length}</span>
                <button class="btn btn-ghost btn-xs btn-icon btn-subfolder-open" data-path="${fontsDir}" title="${t('brand.openFolderCategory', { name: 'Fonts' })}">
                  ${icons.folder(13)}
                </button>
              </div>
            </div>
          </div>

          <!-- Category Filter Pills Bar -->
          <div class="brand-files-filter-bar">
            <div class="brand-pills-group">
              <button class="brand-file-pill ${BrandPage.activeFileFilter === 'all' ? 'active' : ''}" data-filter="all">
                <span>${t('brand.filterAll')}</span>
                <span class="brand-file-pill-count">(${brandFiles.length})</span>
              </button>
              <button class="brand-file-pill ${BrandPage.activeFileFilter === 'Logos' ? 'active' : ''}" data-filter="Logos">
                <span>${t('brand.filterLogos')}</span>
                <span class="brand-file-pill-count">(${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Logos').length})</span>
              </button>
              <button class="brand-file-pill ${BrandPage.activeFileFilter === 'Banners' ? 'active' : ''}" data-filter="Banners">
                <span>${t('brand.filterBanners')}</span>
                <span class="brand-file-pill-count">(${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Banners').length})</span>
              </button>
              <button class="brand-file-pill ${BrandPage.activeFileFilter === 'Manual' ? 'active' : ''}" data-filter="Manual">
                <span>${t('brand.filterManual')}</span>
                <span class="brand-file-pill-count">(${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Manual').length})</span>
              </button>
              <button class="brand-file-pill ${BrandPage.activeFileFilter === 'Graphics' ? 'active' : ''}" data-filter="Graphics">
                <span>${t('brand.filterGraphics')}</span>
                <span class="brand-file-pill-count">(${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Graphics').length})</span>
              </button>
              <button class="brand-file-pill ${BrandPage.activeFileFilter === 'Fonts' ? 'active' : ''}" data-filter="Fonts">
                <span>${t('brand.filterFonts')}</span>
                <span class="brand-file-pill-count">(${brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Fonts').length})</span>
              </button>
            </div>
            <div style="font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
              ${icons.info(12)}
              <span>${t('brand.subfolderHelp')}</span>
            </div>
          </div>

          <table class="brand-files-table">
            <thead>
              <tr>
                <th>${t('brand.fileName')}</th>
                <th>${t('brand.fileCategory')}</th>
                <th>${t('brand.fileSize')}</th>
                <th style="text-align: right;">${t('brand.fileActions')}</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                const filtered = brandFiles.filter(f => {
                  if (BrandPage.activeFileFilter === 'all') return true;
                  return BrandPage.getFileCategory(f) === BrandPage.activeFileFilter;
                });

                if (filtered.length === 0) {
                  return `
                    <tr>
                      <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                          ${icons.folder(32)}
                          <span style="font-size: 13.5px; font-weight: 500;">
                            ${BrandPage.activeFileFilter === 'all' ? t('brand.noFiles') : t('brand.noFilteredFiles', { category: BrandPage.activeFileFilter })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  `;
                }

                return filtered.map(f => {
                  const catLabel = BrandPage.getFileCategory(f);
                  const subfolderDisplay = `Brand/${catLabel}`;
                  const sizeStr = f.size ? (f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${(f.size / 1024).toFixed(1)} KB`) : '—';

                  return `
                    <tr class="brand-file-row-clickable ${f.isPdf ? 'pdf-row' : (f.isImage ? 'img-row' : '')}" data-file-path="${f.path}" data-file-name="${f.name}" data-is-pdf="${f.isPdf}" data-is-img="${f.isImage}">
                      <td>
                        <div class="brand-file-cell">
                          <div class="brand-file-thumb" data-thumb-path="${f.path}" data-is-img="${f.isImage}" data-is-pdf="${f.isPdf}">
                            ${f.isImage ? icons.image(18) : (f.isPdf ? icons.filePdf(18) : (f.name.toLowerCase().endsWith('.ai') ? '<span style="font-weight: 800; font-size: 11.5px; color: #FF9A00; background: #261300; padding: 2px 4px; border-radius: 4px; border: 1px solid rgba(255,154,0,0.4);">Ai</span>' : icons.file(18)))}
                          </div>
                          <div>
                            <span style="font-weight: 500; color: var(--text-primary); display: block;">${f.name}</span>
                            <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${subfolderDisplay}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge" style="font-size: 11px; font-weight: 500;">${catLabel}</span>
                      </td>
                      <td>
                        <span style="color: var(--text-muted); font-size: 12px;">${sizeStr}</span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 4px;">
                          ${f.isImage ? `
                            <button class="btn btn-ghost btn-sm btn-icon btn-file-view" data-name="${f.name}" data-path="${f.path}" title="${t('brand.viewLarge')}">
                              ${icons.maximize(14)}
                            </button>
                          ` : (f.isPdf ? `
                            <button class="btn btn-ghost btn-sm btn-icon btn-file-view-pdf" data-name="${f.name}" data-path="${f.path}" title="${t('brand.viewLarge')}">
                              ${icons.maximize(14)}
                            </button>
                          ` : '')}
                          <button class="btn btn-ghost btn-sm btn-icon btn-file-download" data-name="${f.name}" data-path="${f.path}" title="${t('brand.download')}">
                            ${icons.download(14)}
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon btn-file-folder" data-path="${f.path}" title="${t('brand.openFolder')}">
                            ${icons.folder(14)}
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon btn-file-open" data-path="${f.path}" title="Open with Windows">
                            ${icons.external(14)}
                          </button>
                          <button class="btn btn-ghost btn-sm btn-icon btn-danger btn-file-delete" data-path="${f.path}" title="${t('brand.remove')}">
                            ${icons.trash(14)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('');
              })()}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 8: BRAND TASKS & KANBAN -->
      <div class="brand-section-block" id="sec-tasks" style="${curTab !== 'all' && curTab !== 'tasks' ? 'display:none;' : ''}">
        <div class="brand-card">
          <div class="brand-card-header">
            <div>
              <div class="brand-card-title" style="margin: 0 0 2px 0;">${icons.columns ? icons.columns(16) : icons.check(16)} ${t('brand.tasksTitle')}</div>
              <div class="brand-card-desc">${t('brand.tasksDesc')}</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn btn-primary btn-sm" id="btn-brand-add-task" style="display: inline-flex; align-items: center; gap: 6px;">
                ${icons.plus(13)}
                <span>${isEs ? 'Añadir tarea' : 'Add task'}</span>
              </button>
            </div>
          </div>

          <!-- Task count pills -->
          <div class="dev-task-pills-row" style="margin-bottom: 16px;">
            <div class="dev-task-pill" id="brand-pill-todo" title="${isEs ? 'Ver tareas por hacer' : 'Filter todo'}">
              <span class="task-dot todo"></span>
              <span class="task-pill-count">${taskCounts.todo}</span>
              <span class="task-pill-name">${isEs ? 'Por hacer' : 'To do'}</span>
            </div>
            <div class="dev-task-pill" id="brand-pill-in-progress" title="${isEs ? 'Ver tareas en progreso' : 'Filter in progress'}">
              <span class="task-dot in_progress"></span>
              <span class="task-pill-count">${taskCounts.in_progress}</span>
              <span class="task-pill-name">${isEs ? 'En progreso' : 'In progress'}</span>
            </div>
            <div class="dev-task-pill" id="brand-pill-done" title="${isEs ? 'Ver tareas completadas' : 'Filter done'}">
              <span class="task-dot done"></span>
              <span class="task-pill-count">${taskCounts.done}</span>
              <span class="task-pill-name">${isEs ? 'Completadas' : 'Done'}</span>
            </div>
          </div>

          ${BrandPage.renderTasksBoard(brandTasks, taskCounts, taskCompletionRate)}
        </div>
      </div>
    `;

    BrandPage.bindEvents(container, project, brand, colors, graphics, brandFiles, brandTasks);
  }

  private static bindEvents(
    container: HTMLElement,
    project: any,
    brand: BrandAsset,
    colors: BrandColorItem[],
    graphics: BrandGraphicItem[],
    brandFiles: FileItem[],
    brandTasks: Task[]
  ) {
    const projectRoot = project.folder_path ? project.folder_path.replace(/[/\\]+$/, '') : '';
    const brandDir = projectRoot ? `${projectRoot}/Brand` : '';
    const logosDir = brandDir ? `${brandDir}/Logos` : '';
    const bannersDir = brandDir ? `${brandDir}/Banners` : '';
    const manualDir = brandDir ? `${brandDir}/Manual` : '';
    const graphicsDir = brandDir ? `${brandDir}/Graphics` : '';
    const fontsDir = brandDir ? `${brandDir}/Fonts` : '';

    // Hero Open Brand Folder
    container.querySelector('#btn-hero-open-brand-folder')?.addEventListener('click', async () => {
      if (brandDir) {
        await window.nubo.development.openFolder(brandDir);
      }
    });

    // Adobe Illustrator Master File Events
    container.querySelector('#btn-open-brand-illustrator')?.addEventListener('click', async () => {
      if (brand.illustrator_file_path) {
        showToast('Abriendo archivo maestro en Adobe Illustrator...');
        try {
          const err = await window.nubo.files.openFile(brand.illustrator_file_path);
          if (err) {
            showToast('Aviso al abrir Illustrator: ' + err, 'info');
          }
        } catch (err: any) {
          showToast('Error al abrir Illustrator: ' + (err.message || err), 'error');
        }
      }
    });

    container.querySelector('#btn-view-brand-ai-folder')?.addEventListener('click', async () => {
      if (brand.illustrator_file_path) {
        await window.nubo.files.openContainingFolder(brand.illustrator_file_path);
      }
    });

    const selectBrandIllustratorFile = async () => {
      try {
        if (!brandDir) {
          showToast('El proyecto no tiene una carpeta asignada en disco.', 'error');
          return;
        }

        const files = await window.nubo.dialog.openFiles({
          title: 'Seleccionar archivo maestro de Adobe Illustrator para la Marca',
          filters: [
            { name: 'Adobe Illustrator (*.ai)', extensions: ['ai'] },
            { name: 'Todos los archivos', extensions: ['*'] }
          ]
        });

        if (files && files.length > 0) {
          const selectedAi = files[0];
          let finalPath = selectedAi;

          // Copy the file into the project's Brand/ directory
          if (window.nubo?.files?.uploadFiles) {
            try {
              const copied = await window.nubo.files.uploadFiles(brandDir, [selectedAi]);
              if (copied && copied.length > 0) {
                finalPath = copied[0];
              }
            } catch (copyErr: any) {
              console.warn('[BrandPage] Error copying file to Brand folder:', copyErr);
            }
          }

          await window.nubo.brand.update(project.id, { illustrator_file_path: finalPath });
          brand.illustrator_file_path = finalPath;
          showToast('Archivo maestro .ai guardado en Brand/ y vinculado con éxito.');
          BrandPage.render(container);
        }
      } catch (err: any) {
        console.error('[BrandPage] Error selecting Illustrator file:', err);
        showToast('Error al subir archivo .ai: ' + (err.message || err), 'error');
      }
    };

    container.querySelector('#btn-select-brand-illustrator')?.addEventListener('click', selectBrandIllustratorFile);
    container.querySelector('#btn-change-brand-illustrator')?.addEventListener('click', selectBrandIllustratorFile);

    container.querySelector('#btn-unlink-brand-illustrator')?.addEventListener('click', async () => {
      if (confirm('¿Desvincular el archivo de Illustrator del proyecto? (El archivo permanecerá en tu carpeta Brand/)')) {
        await window.nubo.brand.update(project.id, { illustrator_file_path: '' });
        brand.illustrator_file_path = '';
        showToast('Archivo de Illustrator desvinculado.');
        BrandPage.render(container);
      }
    });

    container.querySelector('#btn-create-brand-template-ai')?.addEventListener('click', async () => {
      try {
        if (!brandDir) {
          showToast('El proyecto no tiene una carpeta asignada en disco.', 'error');
          return;
        }
        const createdPath = await window.nubo.files.saveBuffer(brandDir, 'brand_master.ai', MINIMAL_AI_TEMPLATE_BASE64);
        await window.nubo.brand.update(project.id, { illustrator_file_path: createdPath });
        brand.illustrator_file_path = createdPath;
        showToast('Plantilla maestra creada con éxito en Brand/brand_master.ai');
        BrandPage.render(container);
      } catch (err: any) {
        showToast('Error creando archivo: ' + err.message, 'error');
      }
    });

    // Drag & Drop support directly onto the Brand Illustrator card
    const brandAiDropzone = container.querySelector('#brand-ai-dropzone') as HTMLElement;
    if (brandAiDropzone) {
      let dragCounter = 0;
      brandAiDropzone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        brandAiDropzone.classList.add('ai-dropzone-active');
      });
      brandAiDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      brandAiDropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter <= 0) {
          brandAiDropzone.classList.remove('ai-dropzone-active');
          dragCounter = 0;
        }
      });
      brandAiDropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        brandAiDropzone.classList.remove('ai-dropzone-active');

        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          const nativePath = (e.dataTransfer.files[0] as any).path;
          if (nativePath && brandDir) {
            let finalPath = nativePath;
            if (window.nubo?.files?.uploadFiles) {
              try {
                const copied = await window.nubo.files.uploadFiles(brandDir, [nativePath]);
                if (copied && copied.length > 0) finalPath = copied[0];
              } catch (copyErr) {
                console.warn(copyErr);
              }
            }
            await window.nubo.brand.update(project.id, { illustrator_file_path: finalPath });
            brand.illustrator_file_path = finalPath;
            showToast('Archivo maestro .ai subido y guardado en Brand/');
            BrandPage.render(container);
          }
        }
      });
    }

    // Quick swatches click to copy HEX
    container.querySelectorAll('.brand-quick-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const hex = swatch.getAttribute('data-hex');
        if (hex) {
          navigator.clipboard.writeText(hex);
          showToast(`Color ${hex} copiado al portapapeles.`);
        }
      });
    });

    // Tab buttons click
    container.querySelectorAll('.brand-tab-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        // Save current identity before switching tab if textareas exist
        const whatEl = container.querySelector('#brand-what-is-it') as HTMLTextAreaElement;
        if (whatEl) {
          await saveIdentityData(false);
        }
        const tab = btn.getAttribute('data-tab') as any;
        BrandPage.activeTab = tab;
        BrandPage.render(container);
      });
    });

    // Horizontal wheel scrolling for brand navigation tabs
    const brandTabsContainer = container.querySelector('.brand-nav-tabs') as HTMLElement;
    if (brandTabsContainer) {
      brandTabsContainer.addEventListener('wheel', (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          brandTabsContainer.scrollLeft += e.deltaY;
        }
      }, { passive: false });

      // Scroll active tab into view
      const activeTabBtn = brandTabsContainer.querySelector('.brand-tab-btn.active') as HTMLElement;
      if (activeTabBtn) {
        activeTabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }

    // Step navigation buttons and dots click
    container.querySelectorAll('.btn-step-nav, .step-dot').forEach(el => {
      el.addEventListener('click', async () => {
        const target = el.getAttribute('data-target-tab');
        if (target) {
          const whatEl = container.querySelector('#brand-what-is-it') as HTMLTextAreaElement;
          if (whatEl) {
            await saveIdentityData(false);
          }
          BrandPage.activeTab = target as any;
          BrandPage.render(container);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });

    // Save Identity & Purpose (Auto-save on input/blur and on button click)
    let autoSaveIdentityTimer: any = null;
    const saveIdentityData = async (notify = false) => {
      const whatIsIt = (container.querySelector('#brand-what-is-it') as HTMLTextAreaElement)?.value ?? '';
      const mission = (container.querySelector('#brand-mission') as HTMLTextAreaElement)?.value ?? '';
      const tone = (container.querySelector('#brand-guidelines') as HTMLTextAreaElement)?.value ?? '';

      try {
        await window.nubo.brand.update(project.id, {
          what_is_it: whatIsIt,
          mission: mission,
          guidelines: tone
        });
        brand.what_is_it = whatIsIt;
        brand.mission = mission;
        brand.guidelines = tone;
        if (notify) showToast(t('brand.toastSaved'));
      } catch (err: any) {
        console.error('[BrandPage] Error saving identity:', err);
        showToast(err.message || 'Error saving identity', 'error');
      }
    };

    const debouncedAutoSaveIdentity = () => {
      if (autoSaveIdentityTimer) clearTimeout(autoSaveIdentityTimer);
      autoSaveIdentityTimer = setTimeout(() => {
        saveIdentityData(false);
      }, 400);
    };

    container.querySelector('#brand-what-is-it')?.addEventListener('input', debouncedAutoSaveIdentity);
    container.querySelector('#brand-mission')?.addEventListener('input', debouncedAutoSaveIdentity);
    container.querySelector('#brand-guidelines')?.addEventListener('input', debouncedAutoSaveIdentity);

    container.querySelector('#brand-what-is-it')?.addEventListener('blur', () => saveIdentityData(false));
    container.querySelector('#brand-mission')?.addEventListener('blur', () => saveIdentityData(false));
    container.querySelector('#brand-guidelines')?.addEventListener('blur', () => saveIdentityData(false));

    container.querySelector('#btn-save-identity')?.addEventListener('click', async () => {
      if (autoSaveIdentityTimer) clearTimeout(autoSaveIdentityTimer);
      await saveIdentityData(true);
    });

    // Upload Logo / Banner buttons
    container.querySelectorAll('.btn-logo-upload').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key') as 'primary_logo' | 'alternative_logo' | 'favicon' | 'banner';
        if (!key) return;

        const isBanner = key === 'banner';
        const targetUploadDir = isBanner ? bannersDir : logosDir;

        const paths = await window.nubo.dialog.openFiles({
          title: getLanguage() === 'es'
            ? (isBanner ? 'Seleccionar banner (se copiará a Brand/Banners)' : 'Seleccionar logo (se copiará a Brand/Logos)')
            : (isBanner ? 'Select brand banner (will copy to Brand/Banners)' : 'Select brand logo (will copy to Brand/Logos)'),
          filters: [{ name: 'Imágenes / Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'ico'] }]
        });

        if (paths && paths.length > 0) {
          const selectedPath = paths[0];
          let savedPath = selectedPath;

          // Copy into project's Brand/Logos or Brand/Banners folder
          if (targetUploadDir && window.nubo.files?.uploadFiles) {
            try {
              const copied = await window.nubo.files.uploadFiles(targetUploadDir, [selectedPath]);
              if (copied && copied.length > 0) savedPath = copied[0];
            } catch (err) {
              console.warn('Failed copying file to brand directory:', err);
            }
          }

          const oldPath = (brand as any)[`${key}_path`];
          if (oldPath && oldPath !== savedPath && window.nubo?.files?.deleteItem) {
            try {
              await window.nubo.files.deleteItem(oldPath);
            } catch (delErr) {
              console.warn('[BrandPage] Error deleting old asset file:', delErr);
            }
          }

          try {
            const base64Res = await window.nubo.files.readFileBase64(savedPath);
            if (base64Res && base64Res.base64) {
              const updateObj: any = {};
              updateObj[key] = base64Res.base64;
              updateObj[`${key}_path`] = savedPath;
              await window.nubo.brand.update(project.id, updateObj);
              (brand as any)[key] = base64Res.base64;
              (brand as any)[`${key}_path`] = savedPath;

              // When favicon or primary_logo is uploaded, sync to project logo so "Mis Proyectos" & sidebar display it!
              if (key === 'favicon' || key === 'primary_logo') {
                await window.nubo.projects.update(project.id, { logo: base64Res.base64 });
                project.logo = base64Res.base64;
                const allProjs = await window.nubo.projects.getAll();
                appStore.setProjects(allProjs);
                const currP = appStore.getState().currentProject;
                if (currP && currP.id === project.id) {
                  currP.logo = base64Res.base64;
                }
              }

              showToast(t('brand.toastSaved'));
              BrandPage.render(container);
            }
          } catch (err: any) {
            console.error('[BrandPage] Error saving uploaded image:', err);
            showToast(err.message || 'Error saving image', 'error');
          }
        }
      });
    });

    // Remove logo/banner button
    container.querySelectorAll('.btn-logo-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key') as 'primary_logo' | 'alternative_logo' | 'favicon' | 'banner';
        if (!key) return;
        try {
          const filePath = (brand as any)[`${key}_path`];
          if (filePath && window.nubo?.files?.deleteItem) {
            try {
              await window.nubo.files.deleteItem(filePath);
            } catch (fileErr) {
              console.warn('[BrandPage] Error deleting file from disk:', fileErr);
            }
          }

          const updateObj: any = {};
          updateObj[key] = null;
          updateObj[`${key}_path`] = null;
          await window.nubo.brand.update(project.id, updateObj);
          (brand as any)[key] = null;
          (brand as any)[`${key}_path`] = null;

          // CRITICAL: When any logo is removed, update project logo accordingly
          // If favicon or primary_logo remains, use that. Otherwise, clear project logo completely!
          const remainingLogo = brand.favicon || brand.primary_logo || null;
          await window.nubo.projects.update(project.id, { logo: remainingLogo });
          project.logo = remainingLogo;
          const allProjs = await window.nubo.projects.getAll();
          appStore.setProjects(allProjs);
          const currP = appStore.getState().currentProject;
          if (currP && currP.id === project.id) {
            currP.logo = remainingLogo;
          }

          showToast(t('brand.toastSaved'));
          BrandPage.render(container);
        } catch (err: any) {
          console.error('[BrandPage] Error removing image:', err);
          showToast(err.message || 'Error removing image', 'error');
        }
      });
    });

    // Lightbox / View Large for logos & banner
    container.querySelectorAll('.btn-logo-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const title = btn.getAttribute('data-title') || 'Logo';
        const src = btn.getAttribute('data-src') || '';
        const path = btn.getAttribute('data-path') || '';
        if (src) BrandPage.openLightbox(title, src, path);
      });
    });

    // Click on preview box opens lightbox if image exists, else triggers upload
    ['primary-logo', 'alt-logo', 'favicon', 'banner'].forEach(type => {
      const el = container.querySelector(`#view-${type}`);
      el?.addEventListener('click', () => {
        const key = type === 'primary-logo' ? 'primary_logo' : (type === 'alt-logo' ? 'alternative_logo' : type);
        const src = (brand as any)[key];
        const path = (brand as any)[`${key}_path`];
        if (src) {
          const titleKey = (key === 'primary_logo' ? 'brand.primaryLogo' : (key === 'alternative_logo' ? 'brand.altLogo' : (key === 'favicon' ? 'brand.favicon' : 'brand.banner'))) as any;
          BrandPage.openLightbox(t(titleKey), src, path);
        } else {
          // Trigger upload
          const uploadBtn = container.querySelector(`.btn-logo-upload[data-key="${key}"]`) as HTMLButtonElement;
          uploadBtn?.click();
        }
      });
    });

    // Download logo / banner
    container.querySelectorAll('.btn-logo-download').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = btn.getAttribute('data-name') || 'asset.png';
        const src = btn.getAttribute('data-src') || '';
        const path = btn.getAttribute('data-path') || '';
        await BrandPage.downloadFile(path || src, name);
      });
    });

    // Open location in explorer for logos & banner
    container.querySelectorAll('.btn-logo-folder').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = btn.getAttribute('data-path') || logosDir || brandDir;
        if (path && window.nubo?.files?.openContainingFolder) {
          window.nubo.files.openContainingFolder(path);
        }
      });
    });

    // Add Graphic / Variant button
    container.querySelector('#btn-add-graphic')?.addEventListener('click', async () => {
      const paths = await window.nubo.dialog.openFiles({
        title: getLanguage() === 'es' ? 'Seleccionar gráfico o variante (se copiará a Brand/Graphics)' : 'Select graphic or variant (will copy to Brand/Graphics)',
        filters: [{ name: 'Imágenes / Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }]
      });

      if (paths && paths.length > 0) {
        const selectedPath = paths[0];
        let savedPath = selectedPath;

        if (graphicsDir && window.nubo.files?.uploadFiles) {
          try {
            const copied = await window.nubo.files.uploadFiles(graphicsDir, [selectedPath]);
            if (copied && copied.length > 0) savedPath = copied[0];
          } catch (err) {
            console.warn(err);
          }
        }

        const base64Res = await window.nubo.files.readFileBase64(savedPath);
        if (base64Res && base64Res.base64) {
          const defaultName = savedPath.split(/[/\\]/).pop() || 'Graphic';
          modalManager.openPrompt(
            t('brand.addGraphic'),
            t('brand.graphicNamePrompt'),
            defaultName,
            async (enteredTitle) => {
              const title = enteredTitle?.trim() || defaultName;
              graphics.push({
                id: 'g_' + Date.now(),
                title,
                type: 'graphic',
                path: savedPath,
                previewUrl: base64Res.base64,
                format: savedPath.split('.').pop()?.toUpperCase() || 'PNG',
                created_at: new Date().toISOString()
              });

              await window.nubo.brand.update(project.id, {
                graphics_json: JSON.stringify(graphics)
              });

              showToast(t('brand.toastSaved'));
              BrandPage.render(container);
            }
          );
        }
      }
    });

    // Graphics actions (view, folder, download, delete)
    container.querySelectorAll('.btn-graphic-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-idx'));
        const g = graphics[idx];
        if (g) BrandPage.openLightbox(g.title, g.previewUrl, g.path);
      });
    });

    container.querySelectorAll('.btn-graphic-folder').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = btn.getAttribute('data-path') || graphicsDir || brandDir;
        if (path && window.nubo?.files?.openContainingFolder) {
          window.nubo.files.openContainingFolder(path);
        }
      });
    });

    container.querySelectorAll('.btn-graphic-download').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = btn.getAttribute('data-name') || 'graphic.png';
        const src = btn.getAttribute('data-src') || '';
        const path = btn.getAttribute('data-path') || '';
        await BrandPage.downloadFile(path || src, name);
      });
    });

    container.querySelectorAll('.btn-graphic-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-idx'));
        const g = graphics[idx];
        if (g && g.path && window.nubo?.files?.deleteItem) {
          try {
            await window.nubo.files.deleteItem(g.path);
          } catch (fileErr) {
            console.warn('[BrandPage] Error deleting graphic file from disk:', fileErr);
          }
        }
        graphics.splice(idx, 1);
        await window.nubo.brand.update(project.id, {
          graphics_json: JSON.stringify(graphics)
        });
        showToast(t('brand.toastSaved'));
        BrandPage.render(container);
      });
    });

    // Brand Manual PDF Upload / Replace
    const handlePdfUpload = async () => {
      const paths = await window.nubo.dialog.openFiles({
        title: getLanguage() === 'es' ? 'Seleccionar Manual de Identidad (PDF) (se copiará a Brand/Manual)' : 'Select Brand Manual (PDF) (will copy to Brand/Manual)',
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
      });

      if (paths && paths.length > 0) {
        const selectedPath = paths[0];
        let savedPath = selectedPath;

        if (manualDir && window.nubo.files?.uploadFiles) {
          try {
            const copied = await window.nubo.files.uploadFiles(manualDir, [selectedPath]);
            if (copied && copied.length > 0) savedPath = copied[0];
          } catch (err) {
            console.warn(err);
          }
        }

        const base64Res = await window.nubo.files.readFileBase64(savedPath);
        if (base64Res && base64Res.base64) {
          const pdfUri = base64Res.base64.startsWith('data:') ? base64Res.base64 : `data:application/pdf;base64,${base64Res.base64}`;
          await window.nubo.brand.update(project.id, {
            brand_manual_pdf: pdfUri,
            brand_manual_path: savedPath
          });
          showToast(t('brand.toastSaved'));
          BrandPage.render(container);
        }
      }
    };

    container.querySelector('#btn-upload-manual-dropzone')?.addEventListener('click', handlePdfUpload);
    container.querySelector('#btn-pdf-replace')?.addEventListener('click', handlePdfUpload);

    // Mount PDF Viewer for Brand Manual
    const pdfMount = container.querySelector('#brand-pdf-mount-point') as HTMLElement;
    if (pdfMount) {
      if (brand.brand_manual_pdf) {
        const title = brand.brand_manual_path ? brand.brand_manual_path.split(/[/\\]/).pop() : t('brand.manualTitle');
        const viewer = new PdfViewerComponent(pdfMount, title || t('brand.manualTitle'), brand.brand_manual_path);
        viewer.load(brand.brand_manual_pdf).catch(err => {
          console.error('[BrandPage] Error loading PDF into viewer:', err);
        });
      } else if (brand.brand_manual_path) {
        window.nubo?.files?.readFileBase64(brand.brand_manual_path).then(res => {
          if (res && res.base64) {
            const title = brand.brand_manual_path ? brand.brand_manual_path.split(/[/\\]/).pop() : t('brand.manualTitle');
            const viewer = new PdfViewerComponent(pdfMount, title || t('brand.manualTitle'), brand.brand_manual_path);
            viewer.load(res.base64).catch(err => {
              console.error('[BrandPage] Error loading PDF into viewer:', err);
            });
          }
        }).catch(err => {
          console.warn('Could not read brand manual from path:', err);
        });
      }
    }

    // Brand Manual actions
    container.querySelector('#btn-pdf-fullscreen')?.addEventListener('click', () => {
      if (brand.brand_manual_pdf) {
        BrandPage.openPdfFullscreen(t('brand.manualTitle'), brand.brand_manual_pdf, brand.brand_manual_path);
      }
    });

    container.querySelector('#btn-pdf-external')?.addEventListener('click', () => {
      if (brand.brand_manual_path && window.nubo?.files?.openFile) {
        window.nubo.files.openFile(brand.brand_manual_path);
      }
    });

    container.querySelector('#btn-pdf-download')?.addEventListener('click', async () => {
      if (brand.brand_manual_pdf) {
        const name = brand.brand_manual_path ? brand.brand_manual_path.split(/[/\\]/).pop() : 'Brand_Manual.pdf';
        await BrandPage.downloadFile(brand.brand_manual_path || brand.brand_manual_pdf, name || 'Brand_Manual.pdf');
      }
    });

    container.querySelector('#btn-pdf-folder')?.addEventListener('click', () => {
      const path = brand.brand_manual_path || manualDir || brandDir;
      if (path && window.nubo?.files?.openContainingFolder) {
        window.nubo.files.openContainingFolder(path);
      }
    });

    container.querySelector('#btn-pdf-remove')?.addEventListener('click', async () => {
      const pdfPath = brand.brand_manual_path;
      if (pdfPath && window.nubo?.files?.deleteItem) {
        try {
          await window.nubo.files.deleteItem(pdfPath);
        } catch (fileErr) {
          console.warn('[BrandPage] Error deleting manual PDF file from disk:', fileErr);
        }
      }
      await window.nubo.brand.update(project.id, {
        brand_manual_pdf: null,
        brand_manual_path: null
      });
      brand.brand_manual_pdf = undefined;
      brand.brand_manual_path = undefined;
      showToast(t('brand.toastSaved'));
      BrandPage.render(container);
    });

    // Color Management
    container.querySelectorAll('.color-hex-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.getAttribute('data-hex') || '';
        navigator.clipboard.writeText(hex);
        showToast(t('brand.toastCopied', { color: hex }));
      });
    });

    container.querySelectorAll('.color-hidden-picker').forEach(picker => {
      const handleColorUpdate = async (e: Event) => {
        const id = picker.getAttribute('data-id');
        const hex = (e.target as HTMLInputElement).value;
        const colorItem = colors.find(c => c.id === id);
        if (colorItem) {
          colorItem.hex = hex;
          const swatch = container.querySelector(`.color-preview-trigger[data-id="${id}"]`) as HTMLElement;
          if (swatch) swatch.style.backgroundColor = hex;

          const hexInput = container.querySelector(`.color-hex-input[data-id="${id}"]`) as HTMLInputElement;
          if (hexInput) hexInput.value = hex;

          const hexBtn = container.querySelector(`.color-hex-btn[data-id="${id}"]`) as HTMLElement;
          if (hexBtn) {
            hexBtn.setAttribute('data-hex', hex);
          }

          // Also update base project brand colors if this is the primary, secondary or accent color
          const updateData: any = { colors_json: JSON.stringify(colors) };
          if (colorItem.category === 'primary') updateData.primary_color = hex;
          if (colorItem.category === 'secondary') updateData.secondary_color = hex;
          if (colorItem.category === 'accent') updateData.accent_color = hex;

          await window.nubo.brand.update(project.id, updateData);
        }
      };

      picker.addEventListener('input', handleColorUpdate);
      picker.addEventListener('change', handleColorUpdate);
    });

    container.querySelectorAll('.color-hex-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const id = input.getAttribute('data-id');
        let hex = (e.target as HTMLInputElement).value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (hex.length === 4 && /^#[0-9A-Fa-f]{3}$/.test(hex)) {
          hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          showToast(getLanguage() === 'es' ? 'Código HEX no válido' : 'Invalid HEX code', 'error');
          return;
        }
        const colorItem = colors.find(c => c.id === id);
        if (colorItem) {
          colorItem.hex = hex;
          (e.target as HTMLInputElement).value = hex;
          const swatch = container.querySelector(`.color-preview-trigger[data-id="${id}"]`) as HTMLElement;
          if (swatch) swatch.style.backgroundColor = hex;
          const picker = container.querySelector(`.color-hidden-picker[data-id="${id}"]`) as HTMLInputElement;
          if (picker) picker.value = hex;
          const hexBtn = container.querySelector(`.color-hex-btn[data-id="${id}"]`) as HTMLElement;
          if (hexBtn) hexBtn.setAttribute('data-hex', hex);

          const updateData: any = { colors_json: JSON.stringify(colors) };
          if (colorItem.category === 'primary') updateData.primary_color = hex;
          if (colorItem.category === 'secondary') updateData.secondary_color = hex;
          if (colorItem.category === 'accent') updateData.accent_color = hex;

          await window.nubo.brand.update(project.id, updateData);
          showToast(t('brand.toastSaved'));
        }
      });
    });

    container.querySelectorAll('.color-name-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const id = input.getAttribute('data-id');
        const val = (e.target as HTMLInputElement).value;
        const colorItem = colors.find(c => c.id === id);
        if (colorItem) {
          colorItem.name = val;
          await window.nubo.brand.update(project.id, {
            colors_json: JSON.stringify(colors)
          });
        }
      });
    });

    container.querySelectorAll('.btn-color-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const idx = colors.findIndex(c => c.id === id);
        if (idx !== -1) {
          colors.splice(idx, 1);
          await window.nubo.brand.update(project.id, {
            colors_json: JSON.stringify(colors)
          });
          BrandPage.render(container);
        }
      });
    });

    container.querySelectorAll('.btn-add-cat-color').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat') as 'primary' | 'secondary' | 'accent';
        const defaultName = `${cat.charAt(0).toUpperCase() + cat.slice(1)} Color`;
        modalManager.openPrompt(
          t('brand.addColor'),
          t('brand.colorNamePrompt'),
          defaultName,
          async (name) => {
            if (!name || !name.trim()) return;
            const defaultHex = cat === 'primary' ? '#2563eb' : (cat === 'secondary' ? '#64748b' : '#f59e0b');
            colors.push({
              id: 'c_' + Date.now(),
              name: name.trim(),
              hex: defaultHex,
              category: cat
            });
            await window.nubo.brand.update(project.id, {
              colors_json: JSON.stringify(colors)
            });
            showToast(t('brand.toastSaved'));
            BrandPage.render(container);
          }
        );
      });
    });

    // Typography Management
    const primaryTypeInput = container.querySelector('#type-primary-font') as HTMLInputElement;
    const secondaryTypeInput = container.querySelector('#type-secondary-font') as HTMLInputElement;

    const saveTypographyData = async () => {
      const pri = primaryTypeInput?.value || 'Inter, sans-serif';
      const sec = secondaryTypeInput?.value || 'Inter, sans-serif';
      await window.nubo.brand.update(project.id, {
        typography: pri,
        secondary_typography: sec
      });
    };

    primaryTypeInput?.addEventListener('input', () => {
      const val = primaryTypeInput.value;
      const preview = container.querySelector('#preview-primary-type') as HTMLElement;
      if (preview) preview.style.fontFamily = val;
    });

    primaryTypeInput?.addEventListener('change', async () => {
      await saveTypographyData();
    });

    secondaryTypeInput?.addEventListener('input', () => {
      const val = secondaryTypeInput.value;
      const preview = container.querySelector('#preview-secondary-type') as HTMLElement;
      if (preview) preview.style.fontFamily = val;
    });

    secondaryTypeInput?.addEventListener('change', async () => {
      await saveTypographyData();
    });

    container.querySelectorAll('.type-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const font = chip.getAttribute('data-font');
        const targetId = chip.parentElement?.getAttribute('data-target');
        if (font && targetId) {
          const input = container.querySelector(`#${targetId}`) as HTMLInputElement;
          if (input) {
            input.value = font;
            input.dispatchEvent(new Event('input'));
            await saveTypographyData();
            showToast(t('brand.toastSaved'));
          }
        }
      });
    });

    container.querySelector('#btn-save-typography')?.addEventListener('click', async () => {
      await saveTypographyData();
      showToast(t('brand.toastSaved'));
    });

    // Open Fonts folder
    container.querySelector('#btn-open-fonts-folder')?.addEventListener('click', () => {
      if (fontsDir && window.nubo?.files?.openContainingFolder) {
        window.nubo.files.openContainingFolder(fontsDir);
      }
    });

    // Upload font file (.ttf, .otf, .woff, .woff2)
    const handleFontUpload = async () => {
      const paths = await window.nubo.dialog.openFiles({
        title: getLanguage() === 'es' ? 'Seleccionar archivo de fuente (.ttf, .otf, .woff) (se copiará a Brand/Fonts)' : 'Select font file (will copy to Brand/Fonts)',
        filters: [{ name: 'Fuentes / Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] }]
      });

      if (paths && paths.length > 0 && fontsDir && window.nubo.files?.uploadFiles) {
        try {
          await window.nubo.files.uploadFiles(fontsDir, paths);
          showToast(t('brand.toastSaved'));
          BrandPage.render(container);
        } catch (err) {
          console.warn('Failed uploading font file:', err);
        }
      }
    };

    container.querySelector('#btn-upload-font')?.addEventListener('click', handleFontUpload);
    container.querySelector('#btn-upload-font-secondary')?.addEventListener('click', handleFontUpload);

    // Open System Fonts from PC modal
    container.querySelectorAll('.btn-open-system-fonts').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target') || 'type-primary-font';
        BrandPage.openSystemFontsModal(targetId, project, brand, container);
      });
    });

    // Dynamically load uploaded custom fonts via FontFace API for live real-time preview
    const fontFiles = brandFiles.filter(f => BrandPage.getFileCategory(f) === 'Fonts');
    fontFiles.forEach(async (f) => {
      const fontFam = `NuboCustom_${f.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      try {
        const base64Res = await window.nubo.files.readFileBase64(f.path);
        if (base64Res && base64Res.base64) {
          const ext = f.extension.toLowerCase();
          const format = ext === 'ttf' ? 'truetype' : (ext === 'otf' ? 'opentype' : ext);
          const fontFace = new FontFace(fontFam, `url("${base64Res.base64}") format("${format}")`);
          await fontFace.load();
          document.fonts.add(fontFace);

          const specimen = container.querySelector(`.uploaded-font-preview[data-font-name="${f.name}"]`) as HTMLElement;
          if (specimen) {
            specimen.style.fontFamily = `"${fontFam}", sans-serif`;
          }
          if (brand.typography === fontFam || (primaryTypeInput && primaryTypeInput.value === fontFam)) {
            const preview = container.querySelector('#preview-primary-type') as HTMLElement;
            if (preview) preview.style.fontFamily = `"${fontFam}", sans-serif`;
          }
          if (brand.secondary_typography === fontFam || (secondaryTypeInput && secondaryTypeInput.value === fontFam)) {
            const preview = container.querySelector('#preview-secondary-type') as HTMLElement;
            if (preview) preview.style.fontFamily = `"${fontFam}", sans-serif`;
          }
        }
      } catch (err) {
        console.warn('[BrandPage] Error loading dynamic font:', f.name, err);
      }
    });

    // Set uploaded font as primary
    container.querySelectorAll('.btn-set-primary-font').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const family = btn.getAttribute('data-family');
        if (family && primaryTypeInput) {
          primaryTypeInput.value = family;
          primaryTypeInput.dispatchEvent(new Event('input'));
          await saveTypographyData();
          showToast(t('brand.toastFontApplied', { font: family }));
        }
      });
    });

    // Set uploaded font as secondary
    container.querySelectorAll('.btn-set-secondary-font').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const family = btn.getAttribute('data-family');
        if (family && secondaryTypeInput) {
          secondaryTypeInput.value = family;
          secondaryTypeInput.dispatchEvent(new Event('input'));
          await saveTypographyData();
          showToast(t('brand.toastFontApplied', { font: family }));
        }
      });
    });

    // Uploaded fonts actions: download, open folder, delete
    container.querySelectorAll('.btn-font-download').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = btn.getAttribute('data-name') || 'font.ttf';
        const path = btn.getAttribute('data-path') || '';
        await BrandPage.downloadFile(path, name);
      });
    });

    container.querySelectorAll('.btn-font-folder').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = btn.getAttribute('data-path') || fontsDir;
        if (path && window.nubo?.files?.openContainingFolder) {
          window.nubo.files.openContainingFolder(path);
        }
      });
    });

    container.querySelectorAll('.btn-font-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const path = btn.getAttribute('data-path');
        if (path && confirm(getLanguage() === 'es' ? '¿Eliminar este archivo de fuente?' : 'Delete this font file?')) {
          await window.nubo.files.deleteItem(path);
          BrandPage.render(container);
        }
      });
    });

    // Brand Files Repository actions
    container.querySelector('#btn-open-brand-folder')?.addEventListener('click', () => {
      if (brandDir && window.nubo?.files?.openContainingFolder) {
        window.nubo.files.openContainingFolder(brandDir);
      }
    });

    // Subfolder cards click to filter
    container.querySelectorAll('.brand-subfolder-card').forEach(card => {
      card.addEventListener('click', (e: any) => {
        if (e.target.closest('.btn-subfolder-open')) return;
        const cat = card.getAttribute('data-cat') || 'all';
        BrandPage.activeFileFilter = BrandPage.activeFileFilter === cat ? 'all' : cat;
        BrandPage.render(container);
      });
    });

    // Open specific subfolder in Windows Explorer
    container.querySelectorAll('.btn-subfolder-open').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.getAttribute('data-path');
        if (p && window.nubo?.files?.openContainingFolder) {
          window.nubo.files.openContainingFolder(p);
        }
      });
    });

    // Filter pill buttons
    container.querySelectorAll('.brand-file-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        BrandPage.activeFileFilter = pill.getAttribute('data-filter') || 'all';
        BrandPage.render(container);
      });
    });

    // Async load image thumbnails with base64 data URI
    container.querySelectorAll('.brand-file-thumb[data-is-img="true"]').forEach(async (el) => {
      const p = el.getAttribute('data-thumb-path');
      if (p) {
        const res = await window.nubo.files.readFileBase64(p);
        if (res && res.base64) {
          el.innerHTML = `<img src="${res.base64}" alt="thumb" />`;
        }
      }
    });

    // Drag & Drop onto Brand Files Dropzone
    const brandDropzone = container.querySelector('#brand-files-dropzone') as HTMLElement;
    if (brandDropzone) {
      let dragCounter = 0;
      brandDropzone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        brandDropzone.classList.add('brand-dropzone-active');
      });
      brandDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      brandDropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter <= 0) {
          brandDropzone.classList.remove('brand-dropzone-active');
          dragCounter = 0;
        }
      });
      brandDropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        brandDropzone.classList.remove('brand-dropzone-active');

        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          const files = Array.from(e.dataTransfer.files);
          let count = 0;
          for (const f of files) {
            const nativePath = (f as any).path;
            if (nativePath) {
              const lower = nativePath.toLowerCase();
              let targetDir = graphicsDir;
              if (lower.endsWith('.pdf') || lower.includes('manual') || lower.includes('guide')) {
                targetDir = manualDir;
              } else if (lower.includes('banner')) {
                targetDir = bannersDir;
              } else if (lower.includes('logo') || lower.includes('favicon') || lower.includes('icon')) {
                targetDir = logosDir;
              } else if (lower.endsWith('.ttf') || lower.endsWith('.otf') || lower.endsWith('.woff') || lower.endsWith('.woff2')) {
                targetDir = fontsDir;
              } else if (lower.endsWith('.ai')) {
                targetDir = brandDir;
              }
              const copied = await window.nubo.files.uploadFiles(targetDir, [nativePath]);
              if (lower.endsWith('.ai') && !brand.illustrator_file_path && copied && copied.length > 0) {
                await window.nubo.brand.update(project.id, { illustrator_file_path: copied[0] });
                brand.illustrator_file_path = copied[0];
              }
              count++;
            }
          }
          if (count > 0) {
            showToast(t('brand.toastSaved'));
            BrandPage.render(container);
          }
        }
      });
    }

    // Upload button (context-aware destination folder)
    container.querySelector('#btn-upload-brand-file')?.addEventListener('click', async () => {
      const activeCat = BrandPage.activeFileFilter;
      let targetDir = brandDir;
      if (activeCat === 'Logos') targetDir = logosDir;
      else if (activeCat === 'Banners') targetDir = bannersDir;
      else if (activeCat === 'Manual') targetDir = manualDir;
      else if (activeCat === 'Graphics') targetDir = graphicsDir;
      else if (activeCat === 'Fonts') targetDir = fontsDir;

      const title = getLanguage() === 'es'
        ? (activeCat !== 'all' ? `Subir archivo a Brand/${activeCat}` : 'Subir archivo a Marca & Assets')
        : (activeCat !== 'all' ? `Upload file to Brand/${activeCat}` : 'Upload file to Brand & Assets');

      const paths = await window.nubo.dialog.openFiles({ title });

      if (paths && paths.length > 0 && brandDir && window.nubo.files?.uploadFiles) {
        for (const src of paths) {
          let destDir = targetDir;
          if (activeCat === 'all') {
            const lower = src.toLowerCase();
            if (lower.endsWith('.pdf') || lower.includes('manual') || lower.includes('guide')) {
              destDir = manualDir;
            } else if (lower.includes('banner')) {
              destDir = bannersDir;
            } else if (lower.includes('logo') || lower.includes('favicon') || lower.includes('icon')) {
              destDir = logosDir;
            } else if (lower.endsWith('.ttf') || lower.endsWith('.otf') || lower.endsWith('.woff') || lower.endsWith('.woff2')) {
              destDir = fontsDir;
            } else if (lower.endsWith('.ai')) {
              destDir = brandDir;
            } else if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico', '.bmp'].some(ext => lower.endsWith(ext))) {
              destDir = graphicsDir;
            }
          }
          try {
            const copied = await window.nubo.files.uploadFiles(destDir, [src]);
            if (src.toLowerCase().endsWith('.ai') && !brand.illustrator_file_path && copied && copied.length > 0) {
              await window.nubo.brand.update(project.id, { illustrator_file_path: copied[0] });
              brand.illustrator_file_path = copied[0];
            }
          } catch (err) {
            console.warn('Error uploading brand file to', destDir, err);
          }
        }
        showToast(t('brand.toastSaved'));
        BrandPage.render(container);
      }
    });

    container.querySelectorAll('.btn-file-view').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = btn.getAttribute('data-name') || 'File';
        const path = btn.getAttribute('data-path') || '';
        if (path) {
          const base64Res = await window.nubo.files.readFileBase64(path);
          if (base64Res && base64Res.base64) {
            BrandPage.openLightbox(name, base64Res.base64, path);
          }
        }
      });
    });

    container.querySelectorAll('.btn-file-view-pdf').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = btn.getAttribute('data-name') || 'Manual';
        const path = btn.getAttribute('data-path') || '';
        if (path) {
          const base64Res = await window.nubo.files.readFileBase64(path);
          if (base64Res && base64Res.base64) {
            BrandPage.openPdfFullscreen(name, base64Res.base64, path);
          }
        }
      });
    });

    // Make entire row clickable to preview
    container.querySelectorAll('.brand-file-row-clickable').forEach(row => {
      row.addEventListener('click', async (e) => {
        if ((e.target as HTMLElement).closest('button, a, input')) return;

        const path = row.getAttribute('data-file-path') || '';
        const name = row.getAttribute('data-file-name') || 'Archivo';
        const isPdf = row.getAttribute('data-is-pdf') === 'true';
        const isImg = row.getAttribute('data-is-img') === 'true';

        if (!path) return;

        if (isPdf) {
          const base64Res = await window.nubo.files.readFileBase64(path);
          if (base64Res && base64Res.base64) {
            BrandPage.openPdfFullscreen(name, base64Res.base64, path);
          }
        } else if (isImg) {
          const base64Res = await window.nubo.files.readFileBase64(path);
          if (base64Res && base64Res.base64) {
            BrandPage.openLightbox(name, base64Res.base64, path);
          }
        } else if (window.nubo?.files?.openFile) {
          window.nubo.files.openFile(path);
        }
      });
    });

    // Asynchronously render image thumbnails in files table
    container.querySelectorAll('.brand-file-thumb[data-is-img="true"]').forEach(async (el) => {
      const p = el.getAttribute('data-thumb-path');
      if (!p) return;
      try {
        const res = await window.nubo.files.readFileBase64(p);
        if (res && res.base64) {
          const uri = res.base64.startsWith('data:') ? res.base64 : `data:image/png;base64,${res.base64}`;
          el.innerHTML = `<img src="${uri}" alt="thumb" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" />`;
        }
      } catch (err) {}
    });

    // Asynchronously render high-quality PDF page 1 thumbnails in files table
    container.querySelectorAll('.brand-file-thumb[data-is-pdf="true"]').forEach(async (el) => {
      const p = el.getAttribute('data-thumb-path');
      if (!p) return;
      try {
        const res = await window.nubo.files.readFileBase64(p);
        if (res && res.base64) {
          const thumbUrl = await PdfViewerComponent.generateThumbnail(res.base64, 120);
          if (thumbUrl) {
            el.innerHTML = `<img src="${thumbUrl}" alt="pdf thumb" style="width: 100%; height: 100%; object-fit: contain; background: #ffffff; border-radius: 2px;" />`;
          }
        }
      } catch (err) {}
    });

    container.querySelectorAll('.btn-file-download').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.getAttribute('data-name') || 'file';
        const path = btn.getAttribute('data-path') || '';
        await BrandPage.downloadFile(path, name);
      });
    });

    container.querySelectorAll('.btn-file-folder').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path');
        if (path && window.nubo?.files?.openContainingFolder) {
          window.nubo.files.openContainingFolder(path);
        }
      });
    });

    container.querySelectorAll('.btn-file-open').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path');
        if (path && window.nubo?.files?.openFile) {
          window.nubo.files.openFile(path);
        }
      });
    });

    container.querySelectorAll('.btn-file-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const path = btn.getAttribute('data-path');
        if (path && confirm(getLanguage() === 'es' ? '¿Eliminar este archivo?' : 'Delete this file?')) {
          await window.nubo.files.deleteItem(path);

          // Check if this file was linked to any brand asset
          const updateObj: any = {};
          let brandChanged = false;
          let logoChanged = false;

          if (brand.primary_logo_path === path) {
            brand.primary_logo = null;
            brand.primary_logo_path = null;
            updateObj.primary_logo = null;
            updateObj.primary_logo_path = null;
            brandChanged = true;
            logoChanged = true;
          }
          if (brand.alternative_logo_path === path) {
            brand.alternative_logo = null;
            brand.alternative_logo_path = null;
            updateObj.alternative_logo = null;
            updateObj.alternative_logo_path = null;
            brandChanged = true;
            logoChanged = true;
          }
          if (brand.favicon_path === path) {
            brand.favicon = null;
            brand.favicon_path = null;
            updateObj.favicon = null;
            updateObj.favicon_path = null;
            brandChanged = true;
            logoChanged = true;
          }
          if (brand.banner_path === path) {
            brand.banner = null;
            brand.banner_path = null;
            updateObj.banner = null;
            updateObj.banner_path = null;
            brandChanged = true;
          }
          if (brand.brand_manual_path === path) {
            brand.brand_manual_pdf = undefined;
            brand.brand_manual_path = undefined;
            updateObj.brand_manual_pdf = null;
            updateObj.brand_manual_path = null;
            brandChanged = true;
          }

          const gIdx = graphics.findIndex(g => g.path === path);
          if (gIdx >= 0) {
            graphics.splice(gIdx, 1);
            updateObj.graphics_json = JSON.stringify(graphics);
            brandChanged = true;
          }

          if (brandChanged) {
            await window.nubo.brand.update(project.id, updateObj);
          }

          if (logoChanged) {
            const remainingLogo = brand.favicon || brand.primary_logo || null;
            await window.nubo.projects.update(project.id, { logo: remainingLogo });
            project.logo = remainingLogo;
            const allProjs = await window.nubo.projects.getAll();
            appStore.setProjects(allProjs);
            const currP = appStore.getState().currentProject;
            if (currP && currP.id === project.id) {
              currP.logo = remainingLogo;
            }
          }

          BrandPage.render(container);
        }
      });
    });

    // --- Brand Tasks & Kanban Events ---
    const openNewBrandTask = (initialCol?: 'todo' | 'in_progress' | 'done') => {
      modalManager.openNewTaskModal(project.id, initialCol || 'todo', () => {
        BrandPage.render(container);
      });
    };

    container.querySelector('#btn-hero-add-brand-task')?.addEventListener('click', () => openNewBrandTask());
    container.querySelector('#btn-brand-add-task')?.addEventListener('click', () => openNewBrandTask());

    // Task scope toggle
    container.querySelector('#btn-toggle-brand-task-scope')?.addEventListener('click', () => {
      BrandPage.onlyBrandTasks = !BrandPage.onlyBrandTasks;
      BrandPage.render(container);
    });

    // Task search & filter in tasks board (In-place DOM filtering: NO focus loss!)
    const taskSearchInput = container.querySelector('#brand-search-input') as HTMLInputElement | null;
    const taskPrioritySelect = container.querySelector('#brand-filter-priority') as HTMLSelectElement | null;
    const taskClearBtn = container.querySelector('#brand-search-clear') as HTMLButtonElement | null;

    const filterTasksDom = () => {
      const query = (taskSearchInput?.value || '').trim().toLowerCase();
      const priority = taskPrioritySelect?.value || 'all';
      BrandPage.searchQuery = taskSearchInput?.value || '';
      BrandPage.filterPriority = priority;

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

    // Pills click to navigate to tasks tab
    container.querySelector('#brand-pill-todo')?.addEventListener('click', () => {
      BrandPage.activeTab = 'tasks';
      BrandPage.render(container);
    });
    container.querySelector('#brand-pill-in-progress')?.addEventListener('click', () => {
      BrandPage.activeTab = 'tasks';
      BrandPage.render(container);
    });
    container.querySelector('#brand-pill-done')?.addEventListener('click', () => {
      BrandPage.activeTab = 'tasks';
      BrandPage.render(container);
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
          tags: ['brand', 'marca']
        });
        showToast(t('dev.toastCreated') || (getLanguage() === 'es' ? 'Tarea creada con éxito' : 'Task created successfully'));
        BrandPage.activeQuickAddCol = null;
        BrandPage.render(container);
      }
    };

    container.querySelectorAll('.btn-brand-add-task-col, .btn-brand-quick-add-col').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const col = (e.currentTarget as HTMLElement).getAttribute('data-col') as any;
        BrandPage.activeQuickAddCol = col;
        BrandPage.render(container).then(() => {
          const quickInput = container.querySelector(`.kanban-quick-add-input[data-col="${col}"]`) as HTMLInputElement | null;
          quickInput?.focus();
        });
      });
    });

    container.querySelectorAll('.btn-brand-cancel-quick-add').forEach(btn => {
      btn.addEventListener('click', () => {
        BrandPage.activeQuickAddCol = null;
        BrandPage.render(container);
      });
    });

    container.querySelectorAll('.btn-brand-submit-quick-add').forEach(btn => {
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
          BrandPage.activeQuickAddCol = null;
          BrandPage.render(container);
        }
      });
    });

    // Drag and drop for tasks
    container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const dt = (e as DragEvent).dataTransfer;
        const id = card.getAttribute('data-task-id');
        if (id && dt) {
          BrandPage.draggedTaskId = id;
          dt.setData('text/plain', id);
        }
      });

      card.addEventListener('click', () => {
        const id = card.getAttribute('data-task-id');
        const task = brandTasks.find(t => t.id === id);
        if (task) {
          modalManager.openEditTaskModal(task, () => {
            BrandPage.render(container);
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
        const taskId = BrandPage.draggedTaskId || (e as DragEvent).dataTransfer?.getData('text/plain');
        const targetStatus = colBody.getAttribute('data-status') as any;

        if (taskId && targetStatus) {
          const task = brandTasks.find(t => t.id === taskId);
          if (task && task.status !== targetStatus) {
            await window.nubo.tasks.update(taskId, { status: targetStatus });
            showToast(t('dev.toastStatusUpdated') || (getLanguage() === 'es' ? 'Estado de tarea actualizado' : 'Task status updated'));
            BrandPage.render(container);
          }
        }
      });
    });
  }

  // Kanban Tasks Board for Brand
  private static renderTasksBoard(
    allTasks: Task[],
    counts: { all: number; todo: number; in_progress: number; done: number },
    completionRate: number
  ): string {
    const query = BrandPage.searchQuery.trim().toLowerCase();
    const filteredTasks = allTasks.filter(task => {
      if (BrandPage.filterPriority !== 'all' && task.priority !== BrandPage.filterPriority) return false;
      if (query) {
        const matchesTitle = (task.title || '').toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        const tags = Array.isArray(task.tags) && task.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTag) return false;
      }
      return true;
    });

    const isEs = getLanguage() === 'es';
    const columns: Array<{ id: 'todo' | 'in_progress' | 'done'; title: string; color: string }> = [
      { id: 'todo', title: t('dev.colTodo') || (isEs ? 'Por hacer' : 'To Do'), color: '#64748B' },
      { id: 'in_progress', title: t('dev.colInProgress') || (isEs ? 'En progreso' : 'In Progress'), color: '#F59E0B' },
      { id: 'done', title: t('dev.colDone') || (isEs ? 'Completadas' : 'Done'), color: '#10B981' }
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
              id="brand-search-input" 
              placeholder="${t('dev.searchPlaceholder') || (isEs ? 'Buscar tareas...' : 'Search tasks...')}" 
              value="${BrandPage.searchQuery}"
            />
            ${BrandPage.searchQuery ? `
              <button class="dev-search-clear" id="brand-search-clear" title="Clear">
                ${icons.close ? icons.close(13) : '✕'}
              </button>
            ` : ''}
          </div>

          <div class="dev-filter-group">
            <select class="dev-filter-select ${BrandPage.filterPriority !== 'all' ? 'active' : ''}" id="brand-filter-priority">
              <option value="all">${t('dev.priorityFilter') || (isEs ? 'Prioridad' : 'Priority')}: ${t('common.all') || (isEs ? 'Todas' : 'All')}</option>
              <option value="urgent" ${BrandPage.filterPriority === 'urgent' ? 'selected' : ''}>🔴 ${t('priority.urgent') || (isEs ? 'Urgente' : 'Urgent')}</option>
              <option value="high" ${BrandPage.filterPriority === 'high' ? 'selected' : ''}>🟠 ${t('priority.high') || (isEs ? 'Alta' : 'High')}</option>
              <option value="medium" ${BrandPage.filterPriority === 'medium' ? 'selected' : ''}>🟡 ${t('priority.medium') || (isEs ? 'Media' : 'Medium')}</option>
              <option value="low" ${BrandPage.filterPriority === 'low' ? 'selected' : ''}>⚪ ${t('priority.low') || (isEs ? 'Baja' : 'Low')}</option>
            </select>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-secondary btn-sm" id="btn-toggle-brand-task-scope">
            ${BrandPage.onlyBrandTasks ? (isEs ? 'Mostrar todas las tareas' : 'Show all tasks') : (isEs ? 'Solo tareas de marca' : 'Brand tasks only')}
          </button>
        </div>
      </div>

      <!-- Kanban Columns -->
      <div class="dev-kanban-board">
        ${columns.map(col => {
          const colTasks = filteredTasks.filter(item => item.status === col.id);
          const isQuickAddActive = BrandPage.activeQuickAddCol === col.id;

          return `
            <div class="kanban-column" data-status="${col.id}">
              <div class="kanban-column-header">
                <div class="kanban-column-title-group">
                  <span class="kanban-column-indicator"></span>
                  <span class="kanban-column-title">${col.title}</span>
                  <span class="kanban-column-count">${colTasks.length}</span>
                </div>
                <button class="kanban-btn-add-column btn-brand-add-task-col" data-col="${col.id}" title="${t('dev.addTaskInCol') || (isEs ? 'Añadir tarea aquí' : 'Add task here')}">
                  ${icons.plus(14)}
                </button>
              </div>

              <div class="kanban-column-body" data-status="${col.id}">
                ${colTasks.length === 0 ? `
                  <div class="kanban-empty-state">
                    ${icons.columns(28)}
                    <p>${t('dev.emptyTasks') || (isEs ? 'No hay tareas en esta columna' : 'No tasks in this column')}</p>
                    <button class="btn-add-inline-task btn-brand-quick-add-col" data-col="${col.id}">
                      ${t('dev.addTaskInCol') || (isEs ? 'Añadir tarea' : 'Add task')}
                    </button>
                  </div>
                ` : colTasks.map(task => BrandPage.renderKanbanCard(task)).join('')}
              </div>

              <div class="kanban-column-footer">
                ${isQuickAddActive ? `
                  <div class="kanban-quick-add-form" data-col="${col.id}">
                    <input 
                      type="text" 
                      class="kanban-quick-add-input" 
                      placeholder="${t('dev.quickAddPlaceholder') || (isEs ? '¿Qué hay que hacer?...' : 'What needs to be done?...')}" 
                      data-col="${col.id}"
                      autofocus
                    />
                    <div class="kanban-quick-add-actions">
                      <button class="btn btn-primary btn-sm btn-brand-submit-quick-add" data-col="${col.id}">
                        ${icons.plus(12)}
                        <span>${(t as any)('common.add') || (isEs ? 'Añadir' : 'Add')}</span>
                      </button>
                      <button class="btn btn-ghost btn-sm btn-brand-cancel-quick-add" data-col="${col.id}">
                        ${t('common.cancel') || (isEs ? 'Cancelar' : 'Cancel')}
                      </button>
                    </div>
                  </div>
                ` : `
                  <button class="kanban-btn-quick-add btn-brand-quick-add-col" data-col="${col.id}">
                    ${icons.plus(13)}
                    <span>${(t as any)('dev.quickAdd') || (isEs ? 'Añadir' : 'Add')}</span>
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Render Kanban Card for Brand
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
              <span>${task.due_date.slice(0, 10)}</span>
            </div>
          ` : ''}

          ${Array.isArray(task.tags) && task.tags.length > 0 ? `
            <div class="kanban-card-tags">
              ${task.tags.slice(0, 3).map(tag => `
                <span class="kanban-tag">${tag}</span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Render a single color item row with color circle, name input, editable hex input, copy button, and delete button
  private static renderColorRow(c: BrandColorItem): string {
    return `
      <div class="color-row-item">
        <label class="color-preview-trigger" data-id="${c.id}" style="background-color: ${c.hex};" title="Click para elegir color">
          <input type="color" class="color-hidden-picker" data-id="${c.id}" value="${c.hex}" />
        </label>
        <input type="text" class="color-name-input" data-id="${c.id}" value="${c.name}" spellcheck="false" title="Color name" />
        <input type="text" class="color-hex-input" data-id="${c.id}" value="${c.hex}" maxlength="7" spellcheck="false" title="Edit HEX code" />
        <button class="color-hex-btn" data-id="${c.id}" data-hex="${c.hex}" title="Click to copy HEX">
          ${icons.copy(12)}
        </button>
        <button class="btn btn-ghost btn-sm btn-icon btn-color-delete" data-id="${c.id}" title="${t('brand.remove')}" style="padding: 2px;">
          ${icons.close(12)}
        </button>
      </div>
    `;
  }

  // Lightbox modal: View high-resolution image in large overlay with full controls
  public static openLightbox(title: string, src: string, filePath?: string): void {
    document.getElementById('brand-lightbox-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'brand-lightbox-modal';
    overlay.className = 'brand-lightbox-overlay';

    overlay.innerHTML = `
      <div class="brand-lightbox-toolbar">
        <div class="brand-lightbox-title">
          ${icons.image(18)}
          <span>${title}</span>
        </div>
        <div class="brand-lightbox-actions">
          ${filePath ? `
            <button class="btn btn-secondary btn-sm" id="lightbox-open-folder" title="${t('brand.openFolder')}">
              ${icons.folder(14)}
              <span>${t('brand.openFolder')}</span>
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" id="lightbox-download" title="${t('brand.download')}">
            ${icons.download(14)}
            <span>${t('brand.download')}</span>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" id="lightbox-close" style="color: #ffffff; margin-left: 8px;" title="${t('brand.lightboxClose')}">
            ${icons.close(20)}
          </button>
        </div>
      </div>

      <div class="brand-lightbox-image-container">
        <img src="${src}" alt="${title}" class="brand-lightbox-image" />
      </div>
    `;

    document.body.appendChild(overlay);

    const closeLightbox = () => {
      overlay.remove();
      window.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };

    window.addEventListener('keydown', onKeyDown);

    overlay.querySelector('#lightbox-close')?.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLightbox();
    });

    overlay.querySelector('#lightbox-open-folder')?.addEventListener('click', () => {
      if (filePath && window.nubo?.files?.openContainingFolder) {
        window.nubo.files.openContainingFolder(filePath);
      }
    });

    overlay.querySelector('#lightbox-download')?.addEventListener('click', async () => {
      const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      await BrandPage.downloadFile(filePath || src, filename);
    });
  }

  // Fullscreen interactive PDF reader modal (powered by PdfViewerComponent)
  public static openPdfFullscreen(title: string, src: string, filePath?: string): void {
    PdfViewerComponent.openFullscreenModal(title, src, 1, filePath);
  }

  // Cross-platform download/export helper
  public static async downloadFile(srcPathOrBase64: string, defaultName: string): Promise<void> {
    if (window.nubo?.files?.exportFile) {
      const res = await window.nubo.files.exportFile(srcPathOrBase64, defaultName);
      if (res && res.success && res.filePath) {
        showToast(t('brand.toastDownloaded', { path: res.filePath.split(/[/\\]/).pop() || res.filePath }));
      }
    } else {
      // Browser fallback
      const a = document.createElement('a');
      a.href = srcPathOrBase64;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(t('brand.toastDownloaded', { path: defaultName }));
    }
  }

  // System Fonts Picker Modal (search and select installed fonts on the PC)
  public static async openSystemFontsModal(
    targetInputId: string,
    project: any,
    brand: BrandAsset,
    container: HTMLElement
  ): Promise<void> {
    document.getElementById('brand-system-fonts-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'brand-system-fonts-modal';
    overlay.className = 'system-fonts-modal-overlay';

    overlay.innerHTML = `
      <div class="system-fonts-modal">
        <div class="system-fonts-modal-header">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px;">
            ${icons.code(18)}
            <span>${t('brand.modalPcFontsTitle')}</span>
          </div>
          <button class="btn btn-ghost btn-sm btn-icon" id="btn-close-pc-fonts">
            ${icons.close(18)}
          </button>
        </div>

        <div class="system-fonts-modal-search">
          ${icons.search(16)}
          <input type="text" id="pc-fonts-search-input" placeholder="${t('brand.searchPcFonts')}" autofocus />
        </div>

        <div class="system-fonts-list-container" id="pc-fonts-list">
          <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted);">
            ${icons.cloud(24)}
            <div style="margin-top: 8px; font-size: 13px;">${getLanguage() === 'es' ? 'Cargando tipografías de tu PC...' : 'Loading fonts from your PC...'}</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => {
      overlay.remove();
      window.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };

    window.addEventListener('keydown', onKeyDown);
    overlay.querySelector('#btn-close-pc-fonts')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Fetch installed fonts
    let fonts: string[] = [];
    try {
      if (window.nubo?.system?.getInstalledFonts) {
        fonts = await window.nubo.system.getInstalledFonts();
      }
    } catch (err) {
      console.warn('Error getting system fonts:', err);
    }

    if (!fonts || fonts.length === 0) {
      fonts = [
        'Arial', 'Bahnschrift', 'Calibri', 'Cambria', 'Candara',
        'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New',
        'Georgia', 'Impact', 'Inter', 'Lucida Console', 'Palatino Linotype',
        'Roboto', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'
      ];
    }

    const listEl = overlay.querySelector('#pc-fonts-list') as HTMLElement;
    const searchInput = overlay.querySelector('#pc-fonts-search-input') as HTMLInputElement;

    const renderFontList = (filter = '') => {
      const q = filter.trim().toLowerCase();
      const filtered = q ? fonts.filter(f => f.toLowerCase().includes(q)) : fonts;

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted);">
            ${getLanguage() === 'es' ? `No se encontraron tipografías que coincidan con "${filter}".` : `No fonts found matching "${filter}".`}
          </div>
        `;
        return;
      }

      listEl.innerHTML = filtered.map(fontName => `
        <div class="system-font-item-card" data-font="${fontName}">
          <div class="system-font-item-name">
            <span>${fontName}</span>
            <span class="badge" style="font-size: 10px; font-weight: normal;">${getLanguage() === 'es' ? 'Sistema' : 'System'}</span>
          </div>
          <div class="system-font-item-preview" style="font-family: '${fontName}', sans-serif;">
            Aa Bb Gg 123 — ${fontName}
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.system-font-item-card').forEach(card => {
        card.addEventListener('click', async () => {
          const font = card.getAttribute('data-font');
          if (font) {
            const input = container.querySelector(`#${targetInputId}`) as HTMLInputElement;
            if (input) {
              input.value = font;
              input.dispatchEvent(new Event('input'));
              input.dispatchEvent(new Event('change'));
            }

            const updateData: any = {};
            if (targetInputId === 'type-primary-font') {
              updateData.typography = font;
              brand.typography = font;
            } else {
              updateData.secondary_typography = font;
              brand.secondary_typography = font;
            }
            await window.nubo.brand.update(project.id, updateData);
            showToast(t('brand.toastFontApplied', { font }));
            closeModal();
          }
        });
      });
    };

    renderFontList();

    searchInput?.addEventListener('input', (e) => {
      renderFontList((e.target as HTMLInputElement).value);
    });
  }
}
