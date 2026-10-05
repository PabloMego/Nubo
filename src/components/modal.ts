import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { showToast } from './toast';
import { t, getLanguage } from '../scripts/i18n';
import { Project, Task, MarketingItem, ContentItem, WebsitePage } from '../scripts/types';

export class ModalManager {
  private static instance: ModalManager;
  private backdropEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private footerEl: HTMLElement | null = null;
  private closeBtn: HTMLElement | null = null;

  private constructor() {
    this.ensureElements();
  }

  public static getInstance(): ModalManager {
    if (!ModalManager.instance) {
      ModalManager.instance = new ModalManager();
    }
    return ModalManager.instance;
  }

  private ensureElements() {
    let backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'modal-backdrop';
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal-window">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-title"></h3>
            <button class="btn btn-icon btn-ghost" id="modal-close-btn">
              ${icons.close(16)}
            </button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer" id="modal-footer"></div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }

    this.backdropEl = backdrop;
    this.titleEl = backdrop.querySelector('#modal-title');
    this.bodyEl = backdrop.querySelector('#modal-body');
    this.footerEl = backdrop.querySelector('#modal-footer');
    this.closeBtn = backdrop.querySelector('#modal-close-btn');

    this.closeBtn?.addEventListener('click', () => this.close());
    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) this.close();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.backdropEl?.classList.contains('open')) {
        this.close();
      }
    });
  }

  public open(title: string, bodyHtml: string, footerHtml: string) {
    if (!this.titleEl || !this.bodyEl || !this.footerEl || !this.backdropEl) return;
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = bodyHtml;
    this.footerEl.innerHTML = footerHtml;
    this.backdropEl.classList.add('open');
  }

  public close() {
    this.backdropEl?.classList.remove('open');
  }

  public openNewProjectModal(onCreated?: () => void) {
    const isEs = getLanguage() === 'es';
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${t('newProj.name')}</label>
        <input type="text" id="new-proj-name" placeholder="${t('newProj.namePlaceholder')}" autofocus />
      </div>
      <div class="form-group">
        <label class="form-label">${t('newProj.description')}</label>
        <textarea id="new-proj-desc" rows="2" placeholder="${t('newProj.descPlaceholder')}"></textarea>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start;">
        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="form-label" style="margin: 0;">${t('newProj.website')}</label>
            <span style="font-size: 11px; color: var(--text-muted);">${t('newProj.optional')}</span>
          </div>
          <input type="url" id="new-proj-web" placeholder="https://..." />
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11.5px; color: var(--text-secondary); margin-top: 6px;">
            <input type="checkbox" id="check-no-website" style="cursor: pointer;" />
            <span>${t('newProj.noWebsiteYet')}</span>
          </label>
          <div id="website-hint" style="display: none; font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            ${t('newProj.noWebsiteHint')}
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="form-label" style="margin: 0;">${t('newProj.github')}</label>
            <span style="font-size: 11px; color: var(--text-muted);">${t('newProj.optional')}</span>
          </div>
          <input type="text" id="new-proj-github" placeholder="${t('newProj.githubPlaceholder')}" />
          <button type="button" class="btn btn-secondary btn-sm" id="btn-create-github-repo" style="margin-top: 6px; width: 100%; justify-content: center; gap: 6px;">
            ${icons.github(13)}
            <span>${t('newProj.createGhRepo')}</span>
            ${icons.external(12)}
          </button>
        </div>
      </div>
      <div class="form-group" style="margin-top: 4px;">
        <label class="form-label">${t('newProj.accentColor')}</label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="color" id="new-proj-color" value="#111111" style="width: 40px; height: 32px; padding: 2px; cursor: pointer;" />
          <span style="font-size: 12px; color: var(--text-secondary);">${t('newProj.accentDesc')}</span>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('newProj.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-proj">${t('newProj.create')}</button>
    `;

    this.open(t('newProj.modalTitle'), bodyHtml, footerHtml);

    const nameInput = document.getElementById('new-proj-name') as HTMLInputElement;
    const webInput = document.getElementById('new-proj-web') as HTMLInputElement;
    const noWebCheck = document.getElementById('check-no-website') as HTMLInputElement;
    const webHint = document.getElementById('website-hint') as HTMLElement;
    const btnCreateGh = document.getElementById('btn-create-github-repo');

    nameInput?.focus();

    // Toggle no website
    noWebCheck?.addEventListener('change', () => {
      if (noWebCheck.checked) {
        webInput.value = '';
        webInput.disabled = true;
        webInput.style.backgroundColor = 'var(--bg-subtle)';
        webInput.placeholder = t('newProj.noWebsitePlaceholder');
        if (webHint) webHint.style.display = 'block';
      } else {
        webInput.disabled = false;
        webInput.style.backgroundColor = 'var(--bg-surface)';
        webInput.placeholder = 'https://...';
        if (webHint) webHint.style.display = 'none';
        webInput.focus();
      }
    });

    // Button to open GitHub create repo page
    btnCreateGh?.addEventListener('click', () => {
      const projName = nameInput.value.trim();
      const sanitized = projName ? projName.toLowerCase().replace(/[^a-z0-9-_]/g, '-') : '';
      const url = sanitized ? `https://github.com/new?name=${encodeURIComponent(sanitized)}` : 'https://github.com/new';
      window.open(url, '_blank');
      showToast(isEs ? 'Abriendo GitHub en tu navegador...' : 'Opening GitHub in your browser...');
    });

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());

    document.getElementById('modal-submit-proj')?.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.style.borderColor = 'var(--status-danger)';
        return;
      }

      const desc = (document.getElementById('new-proj-desc') as HTMLTextAreaElement).value;
      const web = noWebCheck.checked ? '' : webInput.value.trim();
      const gh = (document.getElementById('new-proj-github') as HTMLInputElement).value.trim();
      const color = (document.getElementById('new-proj-color') as HTMLInputElement).value;

      try {
        const project = await window.nubo.projects.create({
          name,
          description: desc,
          website: web,
          github: gh,
          color
        });

        this.close();
        showToast(isEs ? `Proyecto "${project.name}" creado con éxito.` : `Project "${project.name}" created successfully.`);

        const all = await window.nubo.projects.getAll();
        appStore.setProjects(all);
        appStore.setCurrentProject(project);
        appStore.setActiveSection('overview');

        if (onCreated) onCreated();
      } catch (err: any) {
        alert((isEs ? 'Error al crear proyecto: ' : 'Error creating project: ') + err.message);
      }
    });
  }

  public openNewTaskModal(projectId: string, initialStatusOrOnCreated?: 'todo' | 'in_progress' | 'done' | (() => void), onCreated?: () => void) {
    let initialStatus: 'todo' | 'in_progress' | 'done' = 'todo';
    let callback = onCreated;
    if (typeof initialStatusOrOnCreated === 'function') {
      callback = initialStatusOrOnCreated;
    } else if (typeof initialStatusOrOnCreated === 'string') {
      initialStatus = initialStatusOrOnCreated;
    }

    const isEs = getLanguage() === 'es';
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${t('newTask.titleLabel')}</label>
        <input type="text" id="task-title" placeholder="${t('newTask.titlePlaceholder')}" autofocus />
      </div>
      <div class="form-group">
        <label class="form-label">${t('newTask.desc')}</label>
        <textarea id="task-desc" rows="2" placeholder="${t('newTask.desc')}..."></textarea>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
        <div class="form-group">
          <label class="form-label">${t('newTask.priority')}</label>
          <select id="task-priority">
            <option value="medium">${t('newTask.priorityMedium')}</option>
            <option value="high">${t('newTask.priorityHigh')}</option>
            <option value="urgent">${t('newTask.priorityUrgent')}</option>
            <option value="low">${t('newTask.priorityLow')}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('newTask.type')}</label>
          <select id="task-type">
            <option value="task">${t('newTask.typeTask')}</option>
            <option value="feature">${t('newTask.typeFeature')}</option>
            <option value="bug">${t('newTask.typeBug')}</option>
            <option value="milestone">${t('newTask.typeMilestone')}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${isEs ? 'Estado inicial' : 'Status'}</label>
          <select id="task-status">
            <option value="todo" ${initialStatus === 'todo' ? 'selected' : ''}>${t('taskStatus.todo')}</option>
            <option value="in_progress" ${initialStatus === 'in_progress' ? 'selected' : ''}>${t('taskStatus.in_progress')}</option>
            <option value="done" ${initialStatus === 'done' ? 'selected' : ''}>${t('taskStatus.done')}</option>
          </select>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('newTask.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-task">${t('newTask.save')}</button>
    `;

    this.open(t('newTask.title'), bodyHtml, footerHtml);

    const titleInput = document.getElementById('task-title') as HTMLInputElement;
    titleInput?.focus();

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());

    document.getElementById('modal-submit-task')?.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      if (!title) return;

      const desc = (document.getElementById('task-desc') as HTMLTextAreaElement).value;
      const priority = (document.getElementById('task-priority') as HTMLSelectElement).value as any;
      const type = (document.getElementById('task-type') as HTMLSelectElement).value as any;
      const status = (document.getElementById('task-status') as HTMLSelectElement).value as any;

      await window.nubo.tasks.create({
        projectId,
        title,
        description: desc,
        priority,
        type,
        status: status || initialStatus
      });

      this.close();
      showToast(t('dev.toastCreated'));
      if (callback) callback();
    });
  }

  public openEditProjectModal(project: Project, onSaved?: () => void) {
    const isEs = getLanguage() === 'es';
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${t('newProj.name')}</label>
        <input type="text" id="edit-proj-name" value="${project.name}" required />
      </div>
      <div class="form-group">
        <label class="form-label">${t('newProj.description')}</label>
        <textarea id="edit-proj-desc" rows="2">${project.description || ''}</textarea>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div class="form-group">
          <label class="form-label">${t('newProj.website')}</label>
          <input type="url" id="edit-proj-web" value="${project.website || ''}" placeholder="https://..." />
        </div>
        <div class="form-group">
          <label class="form-label">${t('newProj.github')}</label>
          <input type="text" id="edit-proj-github" value="${project.github || ''}" placeholder="username/repo" />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 4px;">
        <div class="form-group">
          <label class="form-label">${isEs ? 'Estado del proyecto' : 'Project status'}</label>
          <select id="edit-proj-status">
            <option value="active" ${project.status === 'active' ? 'selected' : ''}>${t('status.active')}</option>
            <option value="paused" ${project.status === 'paused' ? 'selected' : ''}>${t('status.paused')}</option>
            <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>${t('status.completed')}</option>
            <option value="idea" ${project.status === 'idea' ? 'selected' : ''}>${t('status.idea')}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('newProj.accentColor')}</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="color" id="edit-proj-color" value="${project.color || '#111111'}" style="width: 40px; height: 32px; padding: 2px; cursor: pointer;" />
            <span style="font-size: 12px; color: var(--text-secondary);">${isEs ? 'Color distintivo' : 'Accent color'}</span>
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-edit-proj">${t('common.save')}</button>
    `;

    this.open(isEs ? 'Configuración del Proyecto' : 'Project Settings', bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());
    document.getElementById('modal-submit-edit-proj')?.addEventListener('click', async () => {
      const name = (document.getElementById('edit-proj-name') as HTMLInputElement).value.trim();
      if (!name) return;

      const desc = (document.getElementById('edit-proj-desc') as HTMLTextAreaElement).value.trim();
      const web = (document.getElementById('edit-proj-web') as HTMLInputElement).value.trim();
      const gh = (document.getElementById('edit-proj-github') as HTMLInputElement).value.trim();
      const status = (document.getElementById('edit-proj-status') as HTMLSelectElement).value as any;
      const color = (document.getElementById('edit-proj-color') as HTMLInputElement).value;

      const updated = await window.nubo.projects.update(project.id, {
        name,
        description: desc,
        website: web,
        github: gh,
        status,
        color
      });

      if (updated) {
        appStore.setCurrentProject(updated);
        const all = await window.nubo.projects.getAll();
        appStore.setProjects(all);
      }

      this.close();
      showToast(isEs ? 'Proyecto actualizado.' : 'Project updated.');
      if (onSaved) onSaved();
    });
  }

  public openEditTaskModal(task: Task, onUpdated?: () => void) {
    const isEs = getLanguage() === 'es';
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${t('newTask.titleLabel')}</label>
        <input type="text" id="edit-task-title" value="${task.title}" autofocus />
      </div>
      <div class="form-group">
        <label class="form-label">${t('newTask.desc')}</label>
        <textarea id="edit-task-desc" rows="3">${task.description || ''}</textarea>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
        <div class="form-group">
          <label class="form-label">${t('newTask.priority')}</label>
          <select id="edit-task-priority">
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>${t('priority.low')}</option>
            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>${t('priority.medium')}</option>
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>${t('priority.high')}</option>
            <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>${t('priority.urgent')}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('newTask.type')}</label>
          <select id="edit-task-type">
            <option value="task" ${task.type === 'task' ? 'selected' : ''}>${t('type.task')}</option>
            <option value="feature" ${task.type === 'feature' ? 'selected' : ''}>${t('type.feature')}</option>
            <option value="bug" ${task.type === 'bug' ? 'selected' : ''}>${t('type.bug')}</option>
            <option value="milestone" ${task.type === 'milestone' ? 'selected' : ''}>${t('type.milestone')}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${isEs ? 'Estado' : 'Status'}</label>
          <select id="edit-task-status">
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>${t('taskStatus.todo')}</option>
            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>${t('taskStatus.in_progress')}</option>
            <option value="done" ${task.status === 'done' ? 'selected' : ''}>${t('taskStatus.done')}</option>
          </select>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-edit-task">${t('common.save')}</button>
    `;

    this.open(isEs ? 'Editar Tarea' : 'Edit Task', bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());
    document.getElementById('modal-submit-edit-task')?.addEventListener('click', async () => {
      const title = (document.getElementById('edit-task-title') as HTMLInputElement).value.trim();
      if (!title) return;

      const desc = (document.getElementById('edit-task-desc') as HTMLTextAreaElement).value.trim();
      const priority = (document.getElementById('edit-task-priority') as HTMLSelectElement).value as any;
      const type = (document.getElementById('edit-task-type') as HTMLSelectElement).value as any;
      const status = (document.getElementById('edit-task-status') as HTMLSelectElement).value as any;

      await window.nubo.tasks.update(task.id, {
        title,
        description: desc,
        priority,
        type,
        status
      });

      this.close();
      showToast(isEs ? 'Tarea actualizada.' : 'Task updated.');
      if (onUpdated) onUpdated();
    });
  }

  public openMarketingItemModal(projectId: string, existing?: MarketingItem, onSaved?: () => void) {
    const isEs = getLanguage() === 'es';
    const channels = ['TikTok', 'X', 'YouTube', 'Instagram', 'Reddit', 'Product Hunt', 'Newsletter'];
    const statuses = ['Idea', 'Draft', 'Scheduled', 'Published'];

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${isEs ? 'Título de la campaña / idea' : 'Campaign / idea title'}</label>
        <input type="text" id="mkt-modal-title" value="${existing?.title || ''}" placeholder="${isEs ? 'Ej: Lanzamiento en Product Hunt' : 'E.g., Launch on Product Hunt'}" autofocus />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">${isEs ? 'Canal' : 'Channel'}</label>
          <select id="mkt-modal-channel">
            ${channels.map(ch => `<option value="${ch}" ${existing?.channel === ch ? 'selected' : ''}>${ch}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${isEs ? 'Estado' : 'Status'}</label>
          <select id="mkt-modal-status">
            ${statuses.map(st => `<option value="${st}" ${existing?.status === st ? 'selected' : ''}>${t(('mkt.status' + st) as any) || st}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Descripción / Notas' : 'Description / Notes'}</label>
        <textarea id="mkt-modal-desc" rows="3" placeholder="${isEs ? 'Objetivos, gancho, copies, enlaces de referencia...' : 'Goals, hook, copy, reference links...'}">${existing?.description || ''}</textarea>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-mkt">${t('common.save')}</button>
    `;

    this.open(existing ? (isEs ? 'Editar Idea de Marketing' : 'Edit Marketing Idea') : t('mkt.newIdea'), bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());
    document.getElementById('modal-submit-mkt')?.addEventListener('click', async () => {
      const title = (document.getElementById('mkt-modal-title') as HTMLInputElement).value.trim();
      if (!title) return;

      const channel = (document.getElementById('mkt-modal-channel') as HTMLSelectElement).value;
      const status = (document.getElementById('mkt-modal-status') as HTMLSelectElement).value as any;
      const desc = (document.getElementById('mkt-modal-desc') as HTMLTextAreaElement).value.trim();

      if (existing) {
        await window.nubo.marketing.update(existing.id, {
          title,
          channel,
          status,
          description: desc
        });
        showToast(isEs ? 'Idea de marketing actualizada.' : 'Marketing idea updated.');
      } else {
        await window.nubo.marketing.create({
          projectId,
          title,
          channel,
          status,
          description: desc
        });
        showToast(t('mkt.toastCreated'));
      }

      this.close();
      if (onSaved) onSaved();
    });
  }

  public openContentItemModal(projectId: string, existing?: ContentItem, onSaved?: () => void) {
    const isEs = getLanguage() === 'es';
    const platforms = ['YouTube', 'TikTok', 'Instagram', 'X', 'LinkedIn'];
    const statuses = ['Idea', 'Draft', 'Scheduled', 'Published'];

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${isEs ? 'Título del contenido' : 'Content title'}</label>
        <input type="text" id="cnt-modal-title" value="${existing?.title || ''}" placeholder="${isEs ? 'Ej: Tutorial rápido de cómo usar la app' : 'E.g., Quick tutorial on using the app'}" autofocus />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">${isEs ? 'Plataforma' : 'Platform'}</label>
          <select id="cnt-modal-platform">
            ${platforms.map(p => `<option value="${p}" ${existing?.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${isEs ? 'Estado' : 'Status'}</label>
          <select id="cnt-modal-status">
            ${statuses.map(st => `<option value="${st}" ${existing?.status === st ? 'selected' : ''}>${t(('content.status' + st) as any) || st}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Fecha programada (opcional)' : 'Scheduled date (optional)'}</label>
        <input type="date" id="cnt-modal-date" value="${existing?.scheduled_date ? existing.scheduled_date.substring(0, 10) : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Descripción / Resumen' : 'Description / Summary'}</label>
        <textarea id="cnt-modal-desc" rows="2" placeholder="${isEs ? 'Idea principal, hashtags, gancho...' : 'Main idea, hashtags, hook...'}">${existing?.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Guión / Notas de producción (opcional)' : 'Script / Production notes (optional)'}</label>
        <textarea id="cnt-modal-script" rows="3" placeholder="${isEs ? 'Escribe aquí tu guión completo o bullet points...' : 'Write your full script or bullets here...'}">${existing?.script || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Enlace publicado (opcional)' : 'Published link (optional)'}</label>
        <input type="url" id="cnt-modal-url" value="${existing?.published_url || ''}" placeholder="https://..." />
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-cnt">${t('common.save')}</button>
    `;

    this.open(existing ? (isEs ? 'Editar Contenido' : 'Edit Content') : t('content.newContent'), bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());
    document.getElementById('modal-submit-cnt')?.addEventListener('click', async () => {
      const title = (document.getElementById('cnt-modal-title') as HTMLInputElement).value.trim();
      if (!title) return;

      const platform = (document.getElementById('cnt-modal-platform') as HTMLSelectElement).value as any;
      const status = (document.getElementById('cnt-modal-status') as HTMLSelectElement).value as any;
      const date = (document.getElementById('cnt-modal-date') as HTMLInputElement).value;
      const desc = (document.getElementById('cnt-modal-desc') as HTMLTextAreaElement).value.trim();
      const script = (document.getElementById('cnt-modal-script') as HTMLTextAreaElement).value.trim();
      const url = (document.getElementById('cnt-modal-url') as HTMLInputElement).value.trim();

      if (existing) {
        await window.nubo.content.update(existing.id, {
          title,
          platform,
          status,
          scheduled_date: date || undefined,
          description: desc,
          script,
          published_url: url
        });
        showToast(isEs ? 'Contenido actualizado.' : 'Content updated.');
      } else {
        await window.nubo.content.create({
          projectId,
          title,
          platform,
          status,
          scheduledDate: date || undefined,
          description: desc,
          script,
          publishedUrl: url
        });
        showToast(t('content.toastCreated'));
      }

      this.close();
      if (onSaved) onSaved();
    });
  }

  public openWebsitePageModal(existing?: WebsitePage, onSaved?: (page: WebsitePage) => void) {
    const isEs = getLanguage() === 'es';
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${isEs ? 'Título de la página' : 'Page title'}</label>
        <input type="text" id="page-modal-title" value="${existing?.title || ''}" placeholder="${isEs ? 'Ej: Precios, Documentación, Contacto' : 'E.g., Pricing, Docs, Contact'}" autofocus />
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Ruta / URL' : 'Route / Path'}</label>
        <input type="text" id="page-modal-path" value="${existing?.path || '/'}" placeholder="/features" />
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Estado' : 'Status'}</label>
        <select id="page-modal-status">
          <option value="Draft" ${existing?.status === 'Draft' ? 'selected' : ''}>Draft</option>
          <option value="In progress" ${existing?.status === 'In progress' ? 'selected' : ''}>In progress</option>
          <option value="Live" ${existing?.status === 'Live' ? 'selected' : ''}>Live</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Notas / Descripción (opcional)' : 'Notes / Description (optional)'}</label>
        <textarea id="page-modal-notes" rows="3" placeholder="${isEs ? 'Secciones necesarias, componentes...' : 'Required sections, components...'}">${existing?.notes || ''}</textarea>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-page">${t('common.save')}</button>
    `;

    this.open(existing ? (isEs ? 'Editar Página' : 'Edit Page') : (isEs ? 'Nueva Página' : 'New Page'), bodyHtml, footerHtml);

    const titleInput = document.getElementById('page-modal-title') as HTMLInputElement;
    const pathInput = document.getElementById('page-modal-path') as HTMLInputElement;
    const notesInput = document.getElementById('page-modal-notes') as HTMLTextAreaElement;

    setTimeout(() => {
      titleInput?.focus();
      titleInput?.select();
    }, 50);

    let pathManuallyEdited = Boolean(existing && existing.path && existing.path !== '/');
    pathInput?.addEventListener('input', () => {
      pathManuallyEdited = true;
    });

    if (!existing) {
      titleInput?.addEventListener('input', () => {
        titleInput.style.borderColor = '';
        if (!pathManuallyEdited) {
          const val = titleInput.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
          pathInput.value = val ? `/${val}` : '/';
        }
      });
    }

    const savePage = () => {
      const title = titleInput.value.trim();
      if (!title) {
        titleInput.style.borderColor = 'var(--accent-danger, #ef4444)';
        titleInput.focus();
        showToast(isEs ? 'El título de la página es obligatorio.' : 'Page title is required.', 'error');
        return;
      }

      const path = pathInput.value.trim() || '/';
      const status = (document.getElementById('page-modal-status') as HTMLSelectElement).value;
      const notes = (document.getElementById('page-modal-notes') as HTMLTextAreaElement).value.trim();

      this.close();
      if (onSaved) onSaved({ title, path, status, notes });
    };

    titleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        savePage();
      }
    });

    pathInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        savePage();
      }
    });

    notesInput?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        savePage();
      }
    });

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());
    document.getElementById('modal-submit-page')?.addEventListener('click', savePage);
  }

  public openPrompt(title: string, label: string, defaultValue: string = '', onConfirm: (val: string) => void) {
    const isEs = getLanguage() === 'es';
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${label}</label>
        <textarea id="prompt-input" rows="3" placeholder="${isEs ? 'Escribe aquí...' : 'Write here...'}" style="resize: vertical; min-height: 80px; width: 100%; box-sizing: border-box;">${defaultValue}</textarea>
      </div>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" id="prompt-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="prompt-confirm">${t('common.save')}</button>
    `;
    this.open(title, bodyHtml, footerHtml);

    const input = document.getElementById('prompt-input') as HTMLTextAreaElement;
    setTimeout(() => {
      input?.focus();
      input?.select();
    }, 50);

    const confirmPrompt = () => {
      const val = input.value.trim();
      this.close();
      onConfirm(val);
    };

    document.getElementById('prompt-cancel')?.addEventListener('click', () => this.close());
    document.getElementById('prompt-confirm')?.addEventListener('click', confirmPrompt);

    input?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        confirmPrompt();
      }
    });
  }

  public openConfigureEditorModal(
    currentEditor: { id: string; name: string; command: string },
    onSaved?: (editor: { id: string; name: string; command: string }) => void
  ) {
    const isEs = getLanguage() === 'es';
    const presets = [
      { id: 'code', name: 'Visual Studio Code', command: 'code' },
      { id: 'cursor', name: 'Cursor', command: 'cursor' },
      { id: 'antigravity', name: 'Antigravity', command: 'antigravity-ide' },
      { id: 'webstorm', name: 'WebStorm / JetBrains', command: 'webstorm' },
      { id: 'subl', name: 'Sublime Text', command: 'subl' },
      { id: 'custom', name: isEs ? 'Personalizado...' : 'Custom...', command: '' }
    ];

    const currentId = currentEditor?.id || 'code';
    const isCustom = !presets.slice(0, 5).some(p => p.id === currentId);

    const bodyHtml = `
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px;">
        ${t('dev.selectEditorPrompt')}
      </p>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
        ${presets.map(p => {
          const checked = (p.id === currentId) || (p.id === 'custom' && isCustom);
          return `
            <label style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; background: var(--bg-surface);">
              <input type="radio" name="editor_preset" value="${p.id}" data-name="${p.name}" data-cmd="${p.command}" ${checked ? 'checked' : ''} style="cursor: pointer;" />
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 13.5px; font-weight: 500; color: var(--text-primary);">${p.name}</span>
                ${p.command ? `<span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">${p.command}</span>` : ''}
              </div>
            </label>
          `;
        }).join('')}
      </div>

      <div class="form-group" id="custom-editor-group" style="${isCustom ? '' : 'display: none;'}">
        <label class="form-label">${t('dev.customEditorCommand')}</label>
        <input type="text" id="custom-editor-cmd" value="${currentEditor?.command || ''}" placeholder="code, cursor, agy, notepad++..." />
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-editor">${t('common.save')}</button>
    `;

    this.open(t('dev.selectEditorModalTitle'), bodyHtml, footerHtml);

    const radios = document.querySelectorAll('input[name="editor_preset"]');
    const customGroup = document.getElementById('custom-editor-group') as HTMLElement;
    const customInput = document.getElementById('custom-editor-cmd') as HTMLInputElement;

    radios.forEach(r => {
      r.addEventListener('change', () => {
        const val = (r as HTMLInputElement).value;
        if (val === 'custom') {
          customGroup.style.display = 'block';
          customInput.focus();
        } else {
          customGroup.style.display = 'none';
        }
      });
    });

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());

    document.getElementById('modal-submit-editor')?.addEventListener('click', async () => {
      const selectedRadio = document.querySelector('input[name="editor_preset"]:checked') as HTMLInputElement;
      if (!selectedRadio) return;

      const presetId = selectedRadio.value;
      let finalName = selectedRadio.getAttribute('data-name') || 'Editor';
      let finalCommand = selectedRadio.getAttribute('data-cmd') || 'code';

      if (presetId === 'custom') {
        finalCommand = customInput.value.trim() || 'code';
        finalName = finalCommand.charAt(0).toUpperCase() + finalCommand.slice(1);
      }

      const newEditor = {
        id: presetId,
        name: finalName,
        command: finalCommand
      };

      await window.nubo.settings.update({ configuredEditor: newEditor });
      showToast(isEs ? `Editor configurado: ${finalName}` : `Editor configured: ${finalName}`);
      this.close();

      if (onSaved) onSaved(newEditor);
    });
  }

  public async openConnectGitModal(folderPath: string, currentUrl: string = '', onConnected?: () => void) {
    const isEs = getLanguage() === 'es';
    let ghAccount = null;
    try {
      if (window.nubo?.github?.getAccount) {
        ghAccount = await window.nubo.github.getAccount();
      }
    } catch (e) {}

    const bodyHtml = `
      <!-- GitHub Active Account Banner -->
      <div style="margin-bottom: 14px; padding: 10px 12px; background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border: 1px solid var(--border-subtle); border-radius: var(--radius-md, 8px); display: flex; align-items: center; justify-content: space-between; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 9px; min-width: 0;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #24292f; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; overflow: hidden;">
            ${ghAccount?.avatar_url 
              ? `<img src="${ghAccount.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
              : icons.github(16)}
          </div>
          <div style="min-width: 0;">
            <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              <span>${ghAccount ? `@${ghAccount.username}` : (isEs ? 'Sin cuenta de GitHub activa' : 'No active GitHub account')}</span>
              ${ghAccount ? `<span class="dev-status-pill success" style="font-size: 9.5px; padding: 1px 5px;"><span class="pulse-dot"></span>${isEs ? 'Sesión iniciada' : 'Signed in'}</span>` : ''}
            </div>
            <span style="font-size: 11px; color: var(--text-muted); display: block;">
              ${ghAccount ? (isEs ? 'Los cambios se subirán con esta cuenta' : 'Changes will push with this account') : (isEs ? 'Inicia sesión para subir sin pedir credenciales' : 'Sign in to push seamlessly')}
            </span>
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-manage-gh-account" style="font-size: 11px; padding: 3px 8px; flex-shrink: 0;">
          ${ghAccount ? (isEs ? 'Cambiar cuenta' : 'Switch') : (isEs ? 'Iniciar sesión' : 'Sign in')}
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">${isEs ? 'URL del Repositorio de GitHub' : 'GitHub Repository URL'}</label>
        <input type="url" id="git-remote-url" value="${currentUrl}" placeholder="https://github.com/usuario/proyecto.git" autofocus />
        <span style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px; display: block;">
          ${isEs ? 'Pega la dirección HTTPS o SSH de tu repositorio en GitHub para vincular esta carpeta.' : 'Paste the HTTPS or SSH link to your GitHub repository.'}
        </span>
      </div>

      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; gap: 10px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-open-github-browser" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icons.github(13)}
          <span>${isEs ? 'Abrir GitHub en el navegador' : 'Open GitHub in browser'}</span>
          ${icons.external(12)}
        </button>
        <span style="font-size: 11px; color: var(--text-muted);">${isEs ? 'Crea o localiza tu repositorio' : 'Create or locate your repo'}</span>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div>
          ${currentUrl ? `
            <button type="button" class="btn btn-danger btn-sm" id="btn-modal-disconnect-git">
              ${isEs ? 'Desconectar repositorio' : 'Disconnect repository'}
            </button>
          ` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
          <button class="btn btn-primary" id="modal-submit-git">${isEs ? 'Conectar' : 'Connect'}</button>
        </div>
      </div>
    `;

    this.open(isEs ? 'Conectar con GitHub' : 'Connect to GitHub', bodyHtml, footerHtml);

    document.getElementById('btn-modal-manage-gh-account')?.addEventListener('click', () => {
      this.openGitHubAccountModal(() => {
        this.openConnectGitModal(folderPath, currentUrl, onConnected);
      });
    });

    document.getElementById('btn-modal-open-github-browser')?.addEventListener('click', async () => {
      await window.nubo.development.openGitHub('https://github.com/new');
    });

    document.getElementById('btn-modal-disconnect-git')?.addEventListener('click', async () => {
      await window.nubo.development.gitDisconnectRemote(folderPath);
      showToast(isEs ? 'Repositorio desconectado.' : 'Repository disconnected.');
      this.close();
      if (onConnected) onConnected();
    });

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());

    const input = document.getElementById('git-remote-url') as HTMLInputElement;
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('modal-submit-git')?.click();
      }
    });

    document.getElementById('modal-submit-git')?.addEventListener('click', async () => {
      const url = input.value.trim();
      if (!url) return;

      const res = await window.nubo.development.gitSetRemote(folderPath, url);
      if (res.success) {
        showToast(isEs ? 'Repositorio de GitHub conectado con éxito.' : 'GitHub repository connected.');
        this.close();
        if (onConnected) onConnected();
      } else {
        alert((isEs ? 'Error al conectar repositorio: ' : 'Error connecting repository: ') + res.message);
      }
    });
  }

  public async openGitHubAccountModal(onSuccess?: () => void) {
    const isEs = getLanguage() === 'es';
    let currentAccount = null;
    try {
      if (window.nubo?.github?.getAccount) {
        currentAccount = await window.nubo.github.getAccount();
      }
    } catch (e) {
      console.warn('Error fetching github account:', e);
    }

    const bodyHtml = `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border: 1px solid var(--border-subtle); border-radius: var(--radius-md, 8px);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #24292f; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; overflow: hidden; border: 2px solid var(--border-subtle);">
            ${currentAccount?.avatar_url 
              ? `<img src="${currentAccount.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
              : icons.github(24)}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 600; font-size: 14px; color: var(--text-primary);">
                ${currentAccount ? `@${currentAccount.username}` : (isEs ? 'Sin cuenta vinculada' : 'No account linked')}
              </span>
              ${currentAccount ? `
                <span class="dev-status-pill success" style="font-size: 10.5px; padding: 2px 7px;">
                  <span class="pulse-dot"></span>
                  ${isEs ? 'Conectado' : 'Connected'}
                </span>
              ` : `
                <span class="dev-status-pill neutral" style="font-size: 10.5px; padding: 2px 7px;">
                  ${isEs ? 'Desconectado' : 'Disconnected'}
                </span>
              `}
            </div>
            <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 3px;">
              ${currentAccount ? (currentAccount.name || currentAccount.email || (isEs ? 'Cuenta activa para sincronizar y hacer push' : 'Active account for push & pull')) : (isEs ? 'Inicia sesión con tu cuenta de GitHub para subir proyectos en cualquier ordenador' : 'Sign in to push repositories on any computer')}
            </span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label class="form-label" style="margin: 0; font-weight: 600;">${isEs ? 'Token de Acceso Personal (PAT)' : 'Personal Access Token (PAT)'}</label>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-open-pat-generator" style="display: inline-flex; align-items: center; gap: 5px; color: var(--primary); font-size: 11.5px; padding: 2px 6px;">
            ${icons.external(11)}
            <span>${isEs ? 'Generar Token en GitHub' : 'Generate Token on GitHub'}</span>
          </button>
        </div>
        <input 
          type="password" 
          id="github-pat-input" 
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
          style="font-family: monospace; font-size: 12.5px; letter-spacing: 0.5px;" 
          autofocus 
        />
        <span style="font-size: 11.5px; color: var(--text-muted); margin-top: 8px; display: block; line-height: 1.45;">
          ${isEs 
            ? '💡 Al pulsar <strong>"Generar Token en GitHub"</strong> se abrirá tu navegador con los permisos necesarios ya marcados (<code>repo</code>). Solo pulsa <em>Generate token</em> en la web, copia la clave y pégala aquí.' 
            : '💡 Clicking <strong>"Generate Token on GitHub"</strong> opens your browser with <code>repo</code> permissions preselected. Click <em>Generate token</em> on the website and paste it here.'}
        </span>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div>
          ${currentAccount ? `
            <button type="button" class="btn btn-danger btn-sm" id="btn-modal-logout-github">
              ${isEs ? 'Cerrar sesión' : 'Sign Out'}
            </button>
          ` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
          <button class="btn btn-primary" id="modal-submit-github-token" style="display: inline-flex; align-items: center; gap: 6px;">
            ${icons.github(13)}
            <span>${currentAccount ? (isEs ? 'Cambiar Cuenta' : 'Switch Account') : (isEs ? 'Conectar Cuenta' : 'Connect Account')}</span>
          </button>
        </div>
      </div>
    `;

    this.open(isEs ? 'Cuenta de GitHub' : 'GitHub Account', bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());

    document.getElementById('btn-open-pat-generator')?.addEventListener('click', async () => {
      if (window.nubo?.github?.openTokenGenerator) {
        await window.nubo.github.openTokenGenerator();
      } else {
        window.open('https://github.com/settings/tokens/new?description=Nubo%20Desktop&scopes=repo,read:user,user:email', '_blank');
      }
    });

    document.getElementById('btn-modal-logout-github')?.addEventListener('click', async () => {
      if (confirm(isEs ? '¿Cerrar sesión de GitHub en Nubo?' : 'Sign out of GitHub?')) {
        if (window.nubo?.github?.disconnectAccount) {
          await window.nubo.github.disconnectAccount();
        }
        showToast(isEs ? 'Sesión de GitHub cerrada.' : 'Signed out of GitHub.');
        this.close();
        if (onSuccess) onSuccess();
      }
    });

    const submitBtn = document.getElementById('modal-submit-github-token') as HTMLButtonElement;
    const tokenInput = document.getElementById('github-pat-input') as HTMLInputElement;

    tokenInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitBtn?.click();
      }
    });

    submitBtn?.addEventListener('click', async () => {
      const token = tokenInput?.value.trim();
      if (!token) {
        showToast(isEs ? 'Introduce un token válido de GitHub.' : 'Please enter a valid GitHub token.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>${isEs ? 'Verificando con GitHub...' : 'Verifying...'}</span>`;

      try {
        const res = await window.nubo.github.connectAccount(token);
        if (res.success && res.account) {
          showToast(isEs ? `Conectado como @${res.account.username}` : `Connected as @${res.account.username}`, 'success');
          this.close();
          if (onSuccess) onSuccess();
        } else {
          alert((isEs ? 'Error al verificar token: ' : 'Error verifying token: ') + (res.message || 'Token no válido'));
        }
      } catch (err: any) {
        alert((isEs ? 'Error de conexión: ' : 'Connection error: ') + (err.message || err));
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${icons.github(13)} <span>${currentAccount ? (isEs ? 'Cambiar Cuenta' : 'Switch Account') : (isEs ? 'Conectar Cuenta' : 'Connect Account')}</span>`;
      }
    });
  }

  public openNewFeatureModal(onCreated?: (feature: { title: string; description: string; status: 'planned' | 'in_progress' | 'completed' }) => void) {
    const isEs = getLanguage() === 'es';
    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${isEs ? 'Título de la funcionalidad' : 'Feature title'}</label>
        <input type="text" id="feat-title" placeholder="${isEs ? 'Ej: Sistema de autenticación con Google' : 'E.g. Authentication system'}" autofocus />
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Descripción del valor para el usuario' : 'Feature description'}</label>
        <textarea id="feat-desc" rows="3" placeholder="${isEs ? 'Qué hace y qué valor aporta al producto...' : 'What it does and what value it adds...' }"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Estado' : 'Status'}</label>
        <select id="feat-status">
          <option value="planned">${isEs ? 'Planificada' : 'Planned'}</option>
          <option value="in_progress">${isEs ? 'En progreso' : 'In progress'}</option>
          <option value="completed">${isEs ? 'Completada' : 'Completed'}</option>
        </select>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-feat">${isEs ? 'Añadir' : 'Add'}</button>
    `;

    this.open(isEs ? 'Nueva Funcionalidad de Producto' : 'New Product Feature', bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());
    document.getElementById('modal-submit-feat')?.addEventListener('click', () => {
      const title = (document.getElementById('feat-title') as HTMLInputElement).value.trim();
      if (!title) return;

      const desc = (document.getElementById('feat-desc') as HTMLTextAreaElement).value.trim();
      const status = (document.getElementById('feat-status') as HTMLSelectElement).value as any;

      this.close();
      if (onCreated) {
        onCreated({ title, description: desc, status });
      }
    });
  }

  public openGitPushModal(options: {
    folderPath: string;
    branch?: string;
    hasChanges?: boolean;
    statusText?: string;
    onPush: (commitMessage?: string) => void;
  }) {
    const isEs = getLanguage() === 'es';
    const bodyHtml = `
      <div style="margin-bottom: 14px; padding: 10px 12px; background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border: 1px solid var(--border-subtle); border-radius: var(--radius-md, 8px);">
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span style="color: var(--text-secondary);">${isEs ? 'Rama de destino:' : 'Target branch:'}</span>
          <span style="font-weight: 600; color: var(--text-primary); font-family: monospace; background: var(--bg-surface); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-subtle);">${options.branch || 'main'}</span>
        </div>
        ${options.statusText ? `
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
            <span style="color: var(--text-secondary);">${isEs ? 'Estado:' : 'Status:'}</span>
            <span style="color: var(--text-muted);">${options.statusText}</span>
          </div>
        ` : ''}
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label class="form-label" style="margin: 0;">${isEs ? 'Descripción de los cambios (Commit)' : 'Changes description (Commit)'}</label>
          <span style="font-size: 11px; color: var(--text-muted);">${isEs ? 'Opcional' : 'Optional'}</span>
        </div>
        <textarea id="git-commit-message" rows="3" placeholder="${isEs ? 'Ej: Nuevas funciones, corrección de errores, optimizaciones...' : 'E.g. New features, bug fixes, optimizations...'}" autofocus style="resize: vertical; font-family: inherit;"></textarea>
        <span style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px; display: block; line-height: 1.4;">
          ${isEs ? '💡 Puedes dejarlo en blanco si no quieres poner nada. En ese caso se asignará un mensaje automático con la fecha y hora.' : '💡 You can leave this blank if you don\'t want to specify anything. An automatic timestamped message will be used.'}
        </span>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-push" style="display: inline-flex; align-items: center; gap: 6px;">
        ${icons.arrowUp(13)}
        <span>${isEs ? 'Hacer Push' : 'Push'}</span>
      </button>
    `;

    this.open(isEs ? 'Enviar cambios a GitHub (Push)' : 'Push changes to GitHub', bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => this.close());

    const submitBtn = document.getElementById('modal-submit-push');
    const msgInput = document.getElementById('git-commit-message') as HTMLTextAreaElement;

    // Focus input
    setTimeout(() => {
      msgInput?.focus();
    }, 50);

    // Ctrl+Enter or Cmd+Enter to push directly
    msgInput?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        submitBtn?.click();
      }
    });

    submitBtn?.addEventListener('click', () => {
      const msg = msgInput ? msgInput.value.trim() : '';
      this.close();
      options.onPush(msg || undefined);
    });
  }
}

export const modalManager = ModalManager.getInstance();

