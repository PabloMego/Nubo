import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { showToast } from '../components/toast';
import { Note } from '../scripts/types';
import { t } from '../scripts/i18n';

export class NotesPage {
  private static selectedNoteId: string | null = null;
  private static autoSaveTimeout: any = null;
  private static searchQuery: string = '';

  public static async render(container: HTMLElement): Promise<void> {
    const project = appStore.getState().currentProject;
    if (!project) return;

    const notes: Note[] = await window.nubo.notes.getByProject(project.id);

    if (notes.length > 0 && !NotesPage.selectedNoteId) {
      NotesPage.selectedNoteId = notes[0].id;
    }

    const filteredNotes = NotesPage.searchQuery
      ? notes.filter(n => (n.title || '').toLowerCase().includes(NotesPage.searchQuery.toLowerCase()) || (n.content || '').toLowerCase().includes(NotesPage.searchQuery.toLowerCase()))
      : notes;

    const activeNote = notes.find(n => n.id === NotesPage.selectedNoteId) || (filteredNotes.length > 0 ? filteredNotes[0] : null);

    container.innerHTML = `
      <div class="app-page-hero">
        <div class="page-hero-left">
          <div class="page-title-row">
            <h1>${t('notes.title') || 'Notas del Proyecto'}</h1>
            <div class="page-stats-badge" title="Total de notas registradas">
              ${icons.fileText(13)}
              <span><strong>${notes.length}</strong> notas</span>
            </div>
            ${activeNote ? `
              <div class="page-stats-badge" title="Nota activa actual">
                <span class="pulse-dot" style="background: #10B981;"></span>
                <span>${activeNote.title || t('notes.untitled')}</span>
              </div>
            ` : ''}
          </div>
          <p class="page-subtitle">${t('notes.subtitle') || 'Apunta ideas rápidas, requerimientos y borradores del proyecto.'}</p>
        </div>
        <div class="page-hero-actions">
          <button class="btn btn-primary btn-sm" id="btn-create-note-hero">
            ${icons.plus(14)}
            <span>${t('notes.newNote')}</span>
          </button>
        </div>
      </div>

      <div class="notes-container">
        <!-- Sidebar List -->
        <div class="notes-sidebar">
          <div class="notes-sidebar-header">
            <div class="notes-sidebar-top-row">
              <span style="font-weight: 600; font-size: 13px; color: var(--text-primary);">${t('notes.count', { count: notes.length })}</span>
              <button class="btn btn-ghost btn-sm btn-icon" id="btn-create-note" title="${t('notes.newNote')}">
                ${icons.plus(14)}
              </button>
            </div>
            <div class="nubo-search-box" style="width: 100%;">
              ${icons.search(13)}
              <input 
                type="text" 
                id="notes-search-input" 
                placeholder="Filtrar notas..." 
                value="${NotesPage.searchQuery}" 
                style="width: 100%;"
              />
            </div>
          </div>
          <div class="notes-list">
            ${filteredNotes.length === 0 ? `
              <div style="padding: 24px 16px; font-size: 12px; color: var(--text-muted); text-align: center;">
                ${notes.length === 0 ? t('notes.noNotes') : 'No se encontraron notas'}
              </div>
            ` : filteredNotes.map(n => `
              <div class="note-item ${activeNote?.id === n.id ? 'active' : ''}" data-note-id="${n.id}">
                <div class="note-item-title">${n.title || t('notes.untitled')}</div>
                <div class="note-item-preview">${(n.content || t('notes.emptyPreview')).substring(0, 50)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Note Editor -->
        <div class="note-editor-panel">
          ${activeNote ? `
            <div class="note-editor-header">
              <input type="text" class="note-title-input" id="note-title" value="${activeNote.title}" placeholder="${t('notes.titlePlaceholder')}" />
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="note-save-status" style="font-size: 11.5px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;">
                  <span class="pulse-dot" style="background: #10B981;"></span>
                  Guardado
                </span>
                <button class="btn btn-secondary btn-sm" id="btn-save-note">${t('notes.save')}</button>
                <button class="btn btn-ghost btn-sm btn-icon btn-danger" id="btn-delete-note" title="${t('notes.delete')}">
                  ${icons.trash(14)}
                </button>
              </div>
            </div>
            <textarea 
              class="note-body-textarea" 
              id="note-content" 
              placeholder="${t('notes.bodyPlaceholder')}"
            >${activeNote.content || ''}</textarea>
          ` : `
            <div class="empty-state" style="margin: auto;">
              ${icons.fileText(36)}
              <h3>${t('notes.selectNote')}</h3>
              <p>Elige una nota de la barra lateral o crea una nueva pulsando el botón superior.</p>
              <button class="btn btn-primary btn-sm" id="btn-empty-create-note" style="margin-top: 10px;">
                ${icons.plus(13)}
                <span>${t('notes.newNote')}</span>
              </button>
            </div>
          `}
        </div>
      </div>
    `;

    NotesPage.bindEvents(container, project, activeNote);
  }

  private static bindEvents(container: HTMLElement, project: any, activeNote?: Note | null): void {
    // Select note from list
    container.querySelectorAll('.note-item[data-note-id]').forEach(item => {
      item.addEventListener('click', () => {
        NotesPage.selectedNoteId = item.getAttribute('data-note-id');
        NotesPage.render(container);
      });
    });

    // Create note
    const createNewNote = async () => {
      const newNote = await window.nubo.notes.create({
        projectId: project.id,
        title: t('notes.untitled'),
        content: ''
      });
      NotesPage.selectedNoteId = newNote.id;
      showToast(t('notes.created'));
      NotesPage.render(container);
    };

    container.querySelector('#btn-create-note')?.addEventListener('click', createNewNote);
    container.querySelector('#btn-create-note-hero')?.addEventListener('click', createNewNote);
    container.querySelector('#btn-empty-create-note')?.addEventListener('click', createNewNote);

    // Filter notes search
    const searchInput = container.querySelector('#notes-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        NotesPage.searchQuery = (e.target as HTMLInputElement).value;
        const q = NotesPage.searchQuery.toLowerCase();
        container.querySelectorAll('.note-item').forEach((item: any) => {
          const title = item.querySelector('.note-item-title')?.textContent?.toLowerCase() || '';
          const preview = item.querySelector('.note-item-preview')?.textContent?.toLowerCase() || '';
          item.style.display = (!q || title.includes(q) || preview.includes(q)) ? 'flex' : 'none';
        });
      });
    }

    if (activeNote) {
      const titleInput = container.querySelector('#note-title') as HTMLInputElement;
      const contentInput = container.querySelector('#note-content') as HTMLTextAreaElement;
      const statusIndicator = container.querySelector('#note-save-status') as HTMLElement;

      const save = async () => {
        if (statusIndicator) statusIndicator.textContent = 'Guardando...';
        await window.nubo.notes.update(activeNote.id, {
          title: titleInput.value.trim() || t('notes.untitled'),
          content: contentInput.value
        });
        if (statusIndicator) {
          statusIndicator.innerHTML = '<span class="pulse-dot" style="background: #10B981;"></span> Guardado';
        }
      };

      // Debounced Auto-save
      const scheduleAutoSave = () => {
        if (statusIndicator) statusIndicator.textContent = 'Editando...';
        if (NotesPage.autoSaveTimeout) clearTimeout(NotesPage.autoSaveTimeout);
        NotesPage.autoSaveTimeout = setTimeout(async () => {
          await save();
        }, 600);
      };

      titleInput?.addEventListener('input', scheduleAutoSave);
      contentInput?.addEventListener('input', scheduleAutoSave);

      container.querySelector('#btn-save-note')?.addEventListener('click', async () => {
        await save();
        showToast(t('notes.toastSaved'));
      });

      // Delete note
      container.querySelector('#btn-delete-note')?.addEventListener('click', async () => {
        if (confirm(t('notes.deleteConfirm', { title: activeNote.title }))) {
          await window.nubo.notes.delete(activeNote.id);
          NotesPage.selectedNoteId = null;
          showToast(t('notes.toastDeleted'));
          NotesPage.render(container);
        }
      });
    }
  }
}
