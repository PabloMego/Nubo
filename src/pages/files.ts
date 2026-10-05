import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { modalManager } from '../components/modal';
import { showToast } from '../components/toast';
import { FileItem } from '../scripts/types';
import { t, getLanguage } from '../scripts/i18n';

export class FilesPage {
  private static currentDirectory: string = '';
  private static viewMode: 'grid' | 'list' = 'grid';
  private static searchQuery: string = '';

  public static async render(container: HTMLElement, targetFolder?: string): Promise<void> {
    const state = appStore.getState();
    const project = state.currentProject;

    if (!project) {
      container.innerHTML = `
        <div class="empty-state">
          ${icons.folder(36)}
          <h3>${t('overview.noProjectSelected')}</h3>
          <p>${t('overview.selectProjectPrompt')}</p>
        </div>
      `;
      return;
    }

    if (!FilesPage.currentDirectory || targetFolder) {
      FilesPage.currentDirectory = targetFolder || project.folder_path;
    }

    const files = await window.nubo.files.listFiles(FilesPage.currentDirectory, project.folder_path);
    const filteredFiles = FilesPage.searchQuery 
      ? files.filter(f => f.name.toLowerCase().includes(FilesPage.searchQuery.toLowerCase()))
      : files;

    const relativePath = FilesPage.currentDirectory.replace(project.folder_path, '').replace(/^[\\/]/, '');
    const crumbs = relativePath ? relativePath.split(/[\\/]/) : [];

    // Safety guard: if user navigated away while fetching async data, abort
    if (appStore.getState().activeSection !== 'files') {
      return;
    }

    container.innerHTML = `
      <div class="app-page-hero">
        <div class="page-hero-left">
          <div class="page-title-row">
            <h1>${t('files.title') || 'Archivos del Proyecto'}</h1>
            <div class="page-stats-badge" title="Total de elementos en este directorio">
              ${icons.folder(13)}
              <span><strong>${files.length}</strong> elementos</span>
            </div>
            <div class="page-stats-badge" title="Ruta del directorio" style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <span>${relativePath ? `/${relativePath}` : 'Raíz'}</span>
            </div>
          </div>
          <p class="page-subtitle">${t('files.subtitle') || 'Explorador y gestor de activos locales y carpetas del proyecto.'}</p>
        </div>
        <div class="page-hero-actions">
          <button class="btn btn-secondary btn-sm" id="btn-open-in-explorer" title="${t('files.openInExplorer')}">
            ${icons.external(14)}
            <span>${t('files.openInExplorer')}</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-new-folder" title="${t('files.newFolder')}">
            ${icons.folder(14)}
            <span>${t('files.newFolder')}</span>
          </button>
          <button class="btn btn-primary btn-sm" id="btn-upload-file" title="${t('files.upload')}">
            ${icons.upload(14)}
            <span>${t('files.upload')}</span>
          </button>
        </div>
      </div>

      <div class="files-container">
        <!-- Toolbar -->
        <div class="files-toolbar">
          <div class="files-breadcrumb-bar">
            <span class="crumb-link" id="crumb-root">${project.name}</span>
            ${crumbs.map((c, i) => `
              <span class="separator">/</span>
              <span class="crumb-link" data-crumb-index="${i}">${c}</span>
            `).join('')}
          </div>

          <div class="files-actions">
            <div class="nubo-search-box">
              ${icons.search(13)}
              <input 
                type="text" 
                id="file-search-input" 
                placeholder="${t('files.searchPlaceholder')}" 
                value="${FilesPage.searchQuery}" 
              />
            </div>

            <button class="btn btn-secondary btn-sm" id="btn-toggle-view" title="${t('files.toggleView')}">
              ${FilesPage.viewMode === 'grid' ? icons.list(14) : icons.grid(14)}
              <span>${FilesPage.viewMode === 'grid' ? 'Lista' : 'Cuadrícula'}</span>
            </button>
          </div>
        </div>

        <!-- Dropzone Wrapper with Drag & Drop Overlay -->
        <div class="file-dropzone-wrapper" id="file-dropzone">
          <div class="file-dropzone-overlay">
            ${icons.upload(36)}
            <h3 style="font-size: 16px; font-weight: 600;">${t('files.dropTitle')}</h3>
            <p style="font-size: 13px; color: var(--text-secondary);">${t('files.dropSubtitle')}</p>
          </div>

          ${filteredFiles.length === 0 ? `
            <div class="empty-state" style="margin: auto;">
              ${icons.folder(40)}
              <h3>${t('files.emptyFolder')}</h3>
              <p>${t('files.emptyFolderDesc')}</p>
            </div>
          ` : (
            FilesPage.viewMode === 'grid' 
              ? FilesPage.renderGridView(filteredFiles)
              : FilesPage.renderListView(filteredFiles)
          )}
        </div>
      </div>
    `;

    FilesPage.bindEvents(container, project);
  }

  private static renderGridView(files: FileItem[]): string {
    return `
      <div class="file-grid">
        ${files.map(f => {
          let iconSvg = icons.file(32);
          if (f.isDirectory) iconSvg = icons.folder(32);
          else if (f.isImage) iconSvg = icons.image(32);
          else if (f.isPdf) iconSvg = icons.filePdf(32);

          const sizeStr = f.isDirectory ? t('files.folder') : FilesPage.formatSize(f.size);

          return `
            <div class="file-item-card" data-path="${f.path}" data-is-dir="${f.isDirectory}" data-is-img="${f.isImage}" title="${f.name}">
              <div class="file-thumbnail-container" data-thumb-path="${f.path}" data-is-img="${f.isImage}">
                ${iconSvg}
              </div>
              <div class="file-name-label">${f.name}</div>
              <div class="file-meta-label">${sizeStr}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private static renderListView(files: FileItem[]): string {
    return `
      <table class="file-list-table">
        <thead>
          <tr>
            <th>${t('files.name')}</th>
            <th>${t('files.type')}</th>
            <th>${t('files.size')}</th>
            <th>${t('files.modified')}</th>
            <th style="text-align: right;">${t('files.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${files.map(f => `
            <tr data-path="${f.path}" data-is-dir="${f.isDirectory}">
              <td>
                <div class="file-row-name">
                  ${f.isDirectory ? icons.folder(16) : (f.isImage ? icons.image(16) : (f.isPdf ? icons.filePdf(16) : icons.file(16)))}
                  <span>${f.name}</span>
                </div>
              </td>
              <td>${f.extension.toUpperCase()}</td>
              <td>${f.isDirectory ? '—' : FilesPage.formatSize(f.size)}</td>
              <td>${new Date(f.modifiedAt).toLocaleDateString()}</td>
              <td style="text-align: right;">
                <button class="btn btn-ghost btn-sm btn-icon btn-file-open" data-path="${f.path}" title="${t('files.open')}">
                  ${icons.external(12)}
                </button>
                <button class="btn btn-ghost btn-sm btn-icon btn-file-delete" data-path="${f.path}" title="${t('files.delete')}">
                  ${icons.trash(12)}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private static bindEvents(container: HTMLElement, project: any): void {
    // Breadcrumbs
    container.querySelector('#crumb-root')?.addEventListener('click', () => {
      FilesPage.currentDirectory = project.folder_path;
      FilesPage.render(container);
    });

    container.querySelectorAll('.crumb-link[data-crumb-index]').forEach(link => {
      link.addEventListener('click', () => {
        const idx = Number(link.getAttribute('data-crumb-index'));
        const relativePath = FilesPage.currentDirectory.replace(project.folder_path, '').replace(/^[\\/]/, '');
        const parts = relativePath.split(/[\\/]/);
        const sub = parts.slice(0, idx + 1).join('/');
        FilesPage.currentDirectory = `${project.folder_path}/${sub}`;
        FilesPage.render(container);
      });
    });

    // Search filter
    const searchInput = container.querySelector('#file-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      FilesPage.searchQuery = (e.target as HTMLInputElement).value;
      FilesPage.render(container);
    });

    // Toggle view mode
    container.querySelector('#btn-toggle-view')?.addEventListener('click', () => {
      FilesPage.viewMode = FilesPage.viewMode === 'grid' ? 'list' : 'grid';
      FilesPage.render(container);
    });

    // Open in Windows Explorer
    container.querySelector('#btn-open-in-explorer')?.addEventListener('click', () => {
      window.nubo.files.openContainingFolder(FilesPage.currentDirectory);
    });

    // New folder
    container.querySelector('#btn-new-folder')?.addEventListener('click', () => {
      modalManager.openPrompt(t('files.newFolderTitle'), t('files.newFolderName'), '', async (folderName) => {
        try {
          await window.nubo.files.createFolder(FilesPage.currentDirectory, folderName);
          showToast(getLanguage() === 'es' ? `Carpeta "${folderName}" creada.` : `Folder "${folderName}" created.`);
          FilesPage.render(container);
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      });
    });

    // Upload files via native dialog
    container.querySelector('#btn-upload-file')?.addEventListener('click', async () => {
      const paths = await window.nubo.dialog.openFiles({ title: getLanguage() === 'es' ? 'Seleccionar archivos para subir a Nubo' : 'Select files to upload to Nubo' });
      if (paths && paths.length > 0) {
        await window.nubo.files.uploadFiles(FilesPage.currentDirectory, paths);
        showToast(t('files.toastUploaded', { count: paths.length }));
        FilesPage.render(container);
      }
    });

    // File Cards & Rows interaction (single click select, double click open / navigate)
    const fileItems = container.querySelectorAll('[data-path]');
    fileItems.forEach(item => {
      item.addEventListener('dblclick', async () => {
        const p = item.getAttribute('data-path');
        const isDir = item.getAttribute('data-is-dir') === 'true';
        if (p) {
          if (isDir) {
            FilesPage.currentDirectory = p;
            FilesPage.render(container);
          } else {
            await window.nubo.files.openFile(p);
          }
        }
      });

      // Context menu on right click
      item.addEventListener('contextmenu', (e: any) => {
        e.preventDefault();
        const p = item.getAttribute('data-path');
        if (p) FilesPage.showContextMenu(e.clientX, e.clientY, p, container);
      });
    });

    // Async load image thumbnails
    const thumbContainers = container.querySelectorAll('.file-thumbnail-container[data-is-img="true"]');
    thumbContainers.forEach(async (tc) => {
      const p = tc.getAttribute('data-thumb-path');
      if (p) {
        const res = await window.nubo.files.readFileBase64(p);
        if (res && res.base64) {
          tc.innerHTML = `<img src="${res.base64}" alt="thumb" />`;
        }
      }
    });

    // Setup Drag & Drop from Windows Explorer
    const dropzone = container.querySelector('#file-dropzone') as HTMLElement;
    if (dropzone) {
      let dragCounter = 0;

      dropzone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter <= 0) {
          dropzone.classList.remove('dragover');
          dragCounter = 0;
        }
      });

      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        dropzone.classList.remove('dragover');

        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          const files = Array.from(e.dataTransfer.files);
          let uploadedCount = 0;

          for (const f of files) {
            // Electron file object has .path on native desktop
            const nativePath = (f as any).path;
            if (nativePath) {
              await window.nubo.files.uploadFiles(FilesPage.currentDirectory, [nativePath]);
              uploadedCount++;
            } else {
              // Read as base64 fallback
              const reader = new FileReader();
              reader.onload = async () => {
                const base64 = reader.result as string;
                await window.nubo.files.saveBuffer(FilesPage.currentDirectory, f.name, base64);
                FilesPage.render(container);
              };
              reader.readAsDataURL(f);
            }
          }

          if (uploadedCount > 0) {
            showToast(t('files.toastDropped', { count: uploadedCount }));
            FilesPage.render(container);
          }
        }
      });
    }
  }

  private static showContextMenu(x: number, y: number, filePath: string, container: HTMLElement) {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.innerHTML = `
      <div class="context-menu-item" id="ctx-open">
        ${icons.external(13)}
        <span>${t('files.open')}</span>
      </div>
      <div class="context-menu-item" id="ctx-rename">
        ${icons.edit(13)}
        <span>${t('files.rename')}</span>
      </div>
      <div class="context-menu-item" id="ctx-show-folder">
        ${icons.folder(13)}
        <span>${t('files.showInFolder')}</span>
      </div>
      <div class="context-menu-item danger" id="ctx-delete">
        ${icons.trash(13)}
        <span>${t('files.delete')}</span>
      </div>
    `;

    document.body.appendChild(menu);

    const closeMenu = () => menu.remove();
    setTimeout(() => window.addEventListener('click', closeMenu, { once: true }), 10);

    menu.querySelector('#ctx-open')?.addEventListener('click', () => {
      window.nubo.files.openFile(filePath);
    });

    menu.querySelector('#ctx-show-folder')?.addEventListener('click', () => {
      window.nubo.files.openContainingFolder(filePath);
    });

    menu.querySelector('#ctx-rename')?.addEventListener('click', () => {
      const oldName = filePath.split(/[\\/]/).pop() || '';
      modalManager.openPrompt(t('files.renameTitle'), t('files.renameName'), oldName, async (newName) => {
        try {
          await window.nubo.files.renameItem(filePath, newName);
          showToast(getLanguage() === 'es' ? `Renombrado a "${newName}".` : `Renamed to "${newName}".`);
          FilesPage.render(container);
        } catch (err: any) {
          alert(err.message);
        }
      });
    });

    menu.querySelector('#ctx-delete')?.addEventListener('click', async () => {
      const fileName = filePath.split(/[\\/]/).pop() || '';
      if (confirm(t('files.deleteConfirm', { name: fileName }))) {
        await window.nubo.files.deleteItem(filePath);
        showToast(getLanguage() === 'es' ? `"${fileName}" eliminado.` : `"${fileName}" deleted.`);
        FilesPage.render(container);
      }
    });
  }

  private static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
