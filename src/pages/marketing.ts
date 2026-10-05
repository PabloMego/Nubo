import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { modalManager } from '../components/modal';
import { showToast } from '../components/toast';
import { 
  MarketingCampaign, 
  MarketingAccount, 
  MarketingEmail, 
  ContentItem, 
  Task 
} from '../scripts/types';
import { t, getLanguage } from '../scripts/i18n';

export class MarketingPage {
  private static topTab: 'campaigns' | 'tasks' | 'accounts' = 'campaigns';
  private static selectedCampaignId: string | null = null;
  private static viewMode: 'list' | 'detail' = 'list';
  private static contentSubView: 'kanban' | 'calendar' = 'kanban';
  private static calendarMonthOffset: number = 0;
  private static platformFilter: string = 'all';
  private static draggedContentId: string | null = null;

  // Task-specific state
  private static onlyMarketingTasks: boolean = false;
  private static taskSearchQuery: string = '';
  private static taskFilterPriority: string = 'all';
  private static taskFilterCampaign: string = 'all';
  private static activeQuickAddCol: 'todo' | 'in_progress' | 'done' | null = null;
  private static draggedTaskId: string | null = null;

  public static setActiveTab(tab: 'content' | 'overview' | 'campaigns' | 'launch' | 'accounts' | 'tasks'): void {
    if (tab === 'content') {
      MarketingPage.topTab = 'campaigns';
      MarketingPage.viewMode = 'detail';
    } else if (tab === 'accounts') {
      MarketingPage.topTab = 'accounts';
    } else if (tab === 'tasks') {
      MarketingPage.topTab = 'tasks';
    } else {
      MarketingPage.topTab = 'campaigns';
      MarketingPage.viewMode = 'list';
    }
  }

  public static async render(container: HTMLElement): Promise<void> {
    const project = appStore.getState().currentProject;
    if (!project) {
      container.innerHTML = `
        <div class="empty-state">
          <p>${t('overview.noProjectSelected')}</p>
        </div>
      `;
      return;
    }

    // Ensure physical folders exist on disk
    if (project.folder_path && window.nubo.marketing?.ensureFolders) {
      try {
        await window.nubo.marketing.ensureFolders(project.folder_path);
      } catch (err) {
        console.warn('[Marketing] Error ensuring folders:', err);
      }
    }

    // Fetch all project data in parallel (without metrics)
    const [
      campaigns,
      accounts,
      emails,
      allContent,
      allTasks
    ] = await Promise.all([
      window.nubo.marketing.getCampaigns(project.id).catch(() => []),
      window.nubo.marketing.getAccounts(project.id).catch(() => []),
      window.nubo.marketing.getEmails(project.id).catch(() => []),
      window.nubo.content.getByProject(project.id).catch(() => []),
      window.nubo.tasks.getByProject(project.id).catch(() => [])
    ]);

    const isEs = getLanguage() === 'es';

    // Auto-select active or first campaign if none selected or invalid
    if (!MarketingPage.selectedCampaignId && campaigns.length > 0) {
      const active = campaigns.find(c => c.status === 'Active');
      MarketingPage.selectedCampaignId = active ? active.id : campaigns[0].id;
    } else if (MarketingPage.selectedCampaignId && !campaigns.some(c => c.id === MarketingPage.selectedCampaignId)) {
      MarketingPage.selectedCampaignId = campaigns.length > 0 ? campaigns[0].id : null;
    }

    const currentCampaign = campaigns.find(c => c.id === MarketingPage.selectedCampaignId);
    const readyAccountsCount = accounts.filter(a => ['Active', 'Created'].includes(a.status)).length;

    // Filter marketing / campaign tasks
    const mktTasks = allTasks.filter(task => {
      if (!MarketingPage.onlyMarketingTasks) return true;
      if (task.campaign_id) return true;
      if (task.type === 'launch') return true;
      const tags = Array.isArray(task.tags) ? task.tags.map(t => t.toLowerCase()) : [];
      const title = (task.title || '').toLowerCase();
      const desc = (task.description || '').toLowerCase();
      const mktKeywords = [
        'marketing', 'campaña', 'campaign', 'video', 'redes', 'social', 
        'tiktok', 'youtube', 'instagram', 'twitter', 'x', 'post', 
        'contenido', 'content', 'lanzamiento', 'launch', 'ads', 'anuncio', 
        'promo', 'email', 'newsletter', 'audiencia', 'guion', 'script'
      ];
      return mktKeywords.some(kw => tags.includes(kw) || title.includes(kw) || desc.includes(kw));
    });

    const mktTaskCounts = {
      all: mktTasks.length,
      todo: mktTasks.filter(t => t.status === 'todo').length,
      in_progress: mktTasks.filter(t => t.status === 'in_progress').length,
      done: mktTasks.filter(t => t.status === 'done').length
    };
    const mktTaskCompletionRate = mktTasks.length > 0 ? Math.round((mktTaskCounts.done / mktTasks.length) * 100) : 0;

    // Safety guard: if user navigated away while fetching async data, abort
    if (appStore.getState().activeSection !== 'marketing' && appStore.getState().activeSection !== 'content') {
      return;
    }

    // Top Header & Outer Shell
    container.innerHTML = `
      <div class="mkt-container">
        <!-- Main Section Hero Bar -->
        <div class="app-page-hero">
          <div class="page-hero-left">
            <div class="page-title-row">
              <h1>${isEs ? 'Campañas' : 'Campaigns'}</h1>
              <div class="page-stats-badge" title="Proyecto actual">
                <span class="pulse-dot" style="background: ${project.color || 'var(--accent-primary)'};"></span>
                <span><strong>${project.name}</strong></span>
              </div>
            </div>
            <p class="page-subtitle">
              ${isEs 
                ? 'Gestiona todas las campañas de tu proyecto y planifica tus vídeos en el calendario y tablero Kanban, con tus cuentas oficiales siempre a mano.' 
                : 'Manage all campaigns for your project and plan your videos with calendar and Kanban board, keeping official accounts centralized.'}
            </p>
          </div>
          <div class="page-hero-actions">
            ${MarketingPage.topTab === 'campaigns' && MarketingPage.viewMode === 'detail' ? `
              <button class="btn btn-secondary" id="btn-hero-all-campaigns">
                ${icons.arrowLeft(14)}
                <span>${isEs ? 'Ver Todas las Campañas' : 'All Campaigns'}</span>
              </button>
            ` : ''}
            <button class="btn btn-secondary" id="btn-mkt-open-folders" title="${isEs ? 'Abrir carpetas de marketing en el Explorador' : 'Open marketing folders in Explorer'}">
              ${icons.folder(15)}
              <span>${isEs ? 'Abrir Carpeta' : 'Open Folder'}</span>
            </button>
            ${MarketingPage.topTab === 'campaigns' ? `
              <button class="btn btn-primary" id="btn-mkt-create-campaign">
                ${icons.plus(15)}
                <span>${isEs ? 'Nueva Campaña' : 'New Campaign'}</span>
              </button>
            ` : (MarketingPage.topTab === 'tasks' ? `
              <button class="btn btn-primary" id="btn-hero-add-task">
                ${icons.plus(15)}
                <span>${isEs ? 'Nueva Tarea' : 'New Task'}</span>
              </button>
            ` : `
              <button class="btn btn-primary" id="btn-hero-add-account">
                ${icons.plus(15)}
                <span>${isEs ? 'Añadir Cuenta / Red' : 'Add Account'}</span>
              </button>
            `)}
          </div>
        </div>

        <!-- Section Navigation Tabs: Campañas vs Tareas vs Cuentas y Redes Oficiales -->
        <div class="mkt-subnav-bar">
          <button class="mkt-subnav-tab ${MarketingPage.topTab === 'campaigns' ? 'active' : ''}" data-mkt-tab="campaigns">
            ${icons.target(15)}
            <span>${isEs ? 'Campañas' : 'Campaigns'}</span>
            <span class="mkt-tab-count-badge">${campaigns.length}</span>
          </button>
          <button class="mkt-subnav-tab ${MarketingPage.topTab === 'tasks' ? 'active' : ''}" data-mkt-tab="tasks">
            ${icons.columns(15)}
            <span>${isEs ? 'Tareas' : 'Tasks'}</span>
            <span class="mkt-tab-count-badge">${mktTasks.length}</span>
          </button>
          <button class="mkt-subnav-tab ${MarketingPage.topTab === 'accounts' ? 'active' : ''}" data-mkt-tab="accounts">
            ${icons.users(15)}
            <span>${isEs ? 'Cuentas y Redes Oficiales' : 'Official Accounts & Contacts'}</span>
            <span class="mkt-tab-count-badge">${readyAccountsCount} / ${accounts.length || 8}</span>
          </button>
        </div>

        <!-- Main View Container -->
        <div id="mkt-main-view"></div>
      </div>
    `;

    const mainViewContainer = container.querySelector('#mkt-main-view') as HTMLElement;
    if (mainViewContainer) {
      if (MarketingPage.topTab === 'accounts') {
        MarketingPage.renderProjectAccountsView(mainViewContainer, project.id, accounts, emails, isEs);
      } else if (MarketingPage.topTab === 'tasks') {
        MarketingPage.renderTasksView(mainViewContainer, project.id, campaigns, mktTasks, mktTaskCounts, mktTaskCompletionRate, isEs);
      } else {
        if (campaigns.length === 0 || MarketingPage.viewMode === 'list') {
          MarketingPage.renderCampaignsListView(mainViewContainer, project.id, campaigns, allContent, allTasks, isEs);
        } else if (currentCampaign) {
          MarketingPage.renderCampaignDetailWorkspace(mainViewContainer, project.id, currentCampaign, campaigns, allContent, allTasks, isEs);
        } else {
          MarketingPage.renderCampaignsListView(mainViewContainer, project.id, campaigns, allContent, allTasks, isEs);
        }
      }
    }

    MarketingPage.attachGlobalListeners(container, project, campaigns, mktTasks);
  }

  // ==========================================================================
  // CAMPAIGN WORKSPACE — INSIDE A SPECIFIC CAMPAIGN
  // ==========================================================================
  private static renderCampaignDetailWorkspace(
    container: HTMLElement,
    projectId: string,
    campaign: MarketingCampaign,
    allCampaigns: MarketingCampaign[],
    allContent: ContentItem[],
    allTasks: Task[],
    isEs: boolean
  ): void {
    // Filter items belonging to this campaign
    const cmpContent = allContent.filter(c => c.campaign_id === campaign.id);
    const cmpTasks = allTasks.filter(t => t.campaign_id === campaign.id || (t.type === 'launch' && allCampaigns.length <= 1));

    const publishedCount = cmpContent.filter(c => c.status === 'Published').length;
    const tasksDoneCount = cmpTasks.filter(t => t.status === 'done').length;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        <!-- Campaign Header Workspace Card -->
        <div class="cmp-workspace-card">
          <div class="cmp-top-bar">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" id="btn-back-to-campaigns-list">
                ${icons.arrowLeft(13)}
                <span>${isEs ? 'Volver a Todas las Campañas' : 'Back to All Campaigns'}</span>
              </button>

              <div style="display: flex; align-items: center; gap: 8px;">
                <h2 style="margin: 0; font-size: 19px; font-weight: 700; color: var(--text-primary);">${campaign.name}</h2>
                <span class="status-pill status-${campaign.status.toLowerCase()}">${MarketingPage.formatCampaignStatus(campaign.status, isEs)}</span>
              </div>
            </div>

            <!-- Campaign Switcher Dropdown & Actions -->
            <div style="display: flex; align-items: center; gap: 8px;">
              ${allCampaigns.length > 1 ? `
                <select id="select-campaign-switcher" class="mkt-status-select" style="font-weight: 600;">
                  ${allCampaigns.map(c => `
                    <option value="${c.id}" ${c.id === campaign.id ? 'selected' : ''}>
                      ${c.name} (${MarketingPage.formatCampaignStatus(c.status, isEs)})
                    </option>
                  `).join('')}
                </select>
              ` : ''}

              <button class="btn btn-secondary btn-sm" id="btn-edit-current-campaign">
                ${icons.edit(13)}
                <span>${isEs ? 'Editar Campaña' : 'Edit'}</span>
              </button>
            </div>
          </div>

          <!-- Campaign Goal & Meta Info Banner -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px; padding-top: 10px; border-top: 1px solid var(--border-subtle); flex-wrap: wrap;">
            <div>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">${isEs ? 'Objetivo de la campaña' : 'Campaign Goal'}:</span>
              <span style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin-left: 6px;">${campaign.goal || (isEs ? 'Sin objetivo definido' : 'No goal defined')}</span>
              ${campaign.description ? `<p style="font-size: 12.5px; color: var(--text-secondary); margin: 4px 0 0 0;">${campaign.description}</p>` : ''}
            </div>

            <div style="display: flex; align-items: center; gap: 16px; font-size: 12.5px; color: var(--text-secondary); flex-wrap: wrap;">
              <div>🎬 <strong>${publishedCount} / ${cmpContent.length}</strong> ${isEs ? 'vídeos' : 'videos'}</div>
              <div>✓ <strong>${tasksDoneCount} / ${cmpTasks.length}</strong> ${isEs ? 'tareas' : 'tasks'}</div>
              <button class="btn btn-secondary btn-sm" id="btn-view-campaign-tasks" style="padding: 2px 8px; font-size: 11px;">
                ${icons.columns(12)}
                <span>${isEs ? 'Ver Tareas' : 'View Tasks'}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Video Planner View Container -->
        <div id="cmp-step-content-view"></div>
      </div>
    `;

    // Render the video planner directly
    const stepView = container.querySelector('#cmp-step-content-view') as HTMLElement;
    if (stepView) {
      MarketingPage.renderCampaignContentStep(stepView, projectId, campaign, cmpContent, cmpTasks, isEs);
    }

    // Handlers
    container.querySelector('#btn-back-to-campaigns-list')?.addEventListener('click', () => {
      MarketingPage.viewMode = 'list';
      MarketingPage.render(document.querySelector('.view-container')!);
    });

    container.querySelector('#btn-view-campaign-tasks')?.addEventListener('click', () => {
      MarketingPage.topTab = 'tasks';
      MarketingPage.taskFilterCampaign = campaign.id;
      MarketingPage.render(document.querySelector('.view-container')!);
    });

    container.querySelector('#select-campaign-switcher')?.addEventListener('change', (e) => {
      MarketingPage.selectedCampaignId = (e.target as HTMLSelectElement).value;
      MarketingPage.render(document.querySelector('.view-container')!);
    });

    container.querySelector('#btn-edit-current-campaign')?.addEventListener('click', () => {
      MarketingPage.openNewCampaignModal(projectId, campaign, () => {
        MarketingPage.render(document.querySelector('.view-container')!);
      });
    });
  }

  // ==========================================================================
  // PROJECT ACCOUNTS & CHANNELS VIEW (Outside individual campaigns)
  // ==========================================================================
  private static renderProjectAccountsView(
    container: HTMLElement,
    projectId: string,
    accounts: MarketingAccount[],
    emails: MarketingEmail[],
    isEs: boolean
  ): void {
    const platforms = ['TikTok', 'YouTube', 'Instagram', 'X', 'Reddit', 'Discord', 'LinkedIn', 'Product Hunt'];
    const customPlatforms = accounts
      .filter(a => !platforms.includes(a.platform))
      .map(a => a.platform);
    const allDisplayPlatforms = [...platforms, ...customPlatforms];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-lg);">
        <div>
          <div class="mkt-view-header">
            <div class="mkt-view-title-group">
              <h2>${isEs ? 'Cuentas y Redes Oficiales del Proyecto' : 'Official Project Accounts & Social Channels'}</h2>
              <p>${isEs ? 'Perfiles oficiales de redes y canales para distribuir el proyecto, y correos de contacto.' : 'Official social profiles and contact emails for this project.'}</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" id="btn-add-email-from-accounts">
                ${icons.mail(14)}
                <span>${isEs ? 'Registrar Email' : 'Add Email'}</span>
              </button>
              <button class="btn btn-primary btn-sm" id="btn-add-account-from-accounts">
                ${icons.plus(14)}
                <span>${isEs ? 'Añadir Cuenta / Red' : 'Add Account'}</span>
              </button>
            </div>
          </div>

          <div class="mkt-accounts-grid">
            ${allDisplayPlatforms.map(p => {
              const acc = accounts.find(a => a.platform === p);
              const isReady = acc && ['Active', 'Created'].includes(acc.status);

              return `
                <div class="mkt-account-card">
                  <div>
                    <div class="mkt-account-header">
                      <span class="platform-badge" data-platform="${p}">${MarketingPage.getPlatformIcon(p)} <span>${p}</span></span>
                      <span class="status-pill ${isReady ? 'status-active' : 'status-not_created'}">
                        ${isReady ? (isEs ? 'Lista y Activa' : 'Ready') : (isEs ? 'Por configurar' : 'Not configured')}
                      </span>
                    </div>

                    <div class="mkt-account-body" style="margin-top: 10px;">
                      ${acc?.username ? `<div class="mkt-account-handle">${acc.username}</div>` : `<div style="font-size: 12px; color: var(--text-muted);">${isEs ? 'Falta registrar usuario' : 'No handle registered'}</div>`}
                      ${acc?.url ? `
                        <div class="mkt-account-url">
                          <a href="${acc.url}" target="_blank" style="color: var(--status-info); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                            <span>${acc.url}</span>
                            ${icons.external(12)}
                          </a>
                        </div>
                      ` : ''}
                      ${acc?.email ? `<div class="mkt-account-email" style="font-size: 11.5px; color: var(--text-muted);">${icons.mail(11)} <span>${acc.email}</span></div>` : ''}
                    </div>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
                    <div>
                      ${acc && !platforms.includes(p) ? `
                        <button class="btn btn-ghost btn-sm btn-icon btn-delete-custom-account" data-acc-id="${acc.id}" title="${isEs ? 'Eliminar cuenta' : 'Delete'}">
                          ${icons.trash(13)}
                        </button>
                      ` : ''}
                    </div>
                    <button class="btn btn-secondary btn-sm btn-setup-channel" data-platform="${p}">
                      ${icons.edit(12)}
                      <span>${acc ? (isEs ? 'Editar' : 'Edit') : (isEs ? 'Configurar' : 'Set up')}</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Official Emails Section -->
        <div class="mkt-emails-card" style="margin-top: 0;">
          <div class="mkt-view-header">
            <div class="mkt-view-title-group">
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0;">${isEs ? 'Correos y Contactos Oficiales del Proyecto' : 'Official Project Emails & Contacts'}</h3>
              <p style="font-size: 12.5px; color: var(--text-secondary); margin: 2px 0 0 0;">${isEs ? 'Emails para contacto, soporte o registro de cuentas en plataformas.' : 'Contact and registration emails for this project.'}</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-add-email-from-accounts-secondary">
              ${icons.plus(13)}
              <span>${isEs ? 'Nuevo Email' : 'New Email'}</span>
            </button>
          </div>

          ${emails.length > 0 ? `
            <div class="mkt-emails-grid">
              ${emails.map(em => `
                <div class="mkt-email-box">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="mkt-email-tag">${em.type}</span>
                    <button class="btn btn-ghost btn-sm btn-icon btn-delete-account-email" data-email-id="${em.id}" style="padding: 2px;" title="${isEs ? 'Eliminar email' : 'Delete email'}">
                      ${icons.trash(12)}
                    </button>
                  </div>
                  <div class="mkt-email-address">${em.email}</div>
                  ${em.usage ? `<div style="font-size: 12px; color: var(--text-secondary);">${em.usage}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="font-size: 12.5px; color: var(--text-muted); padding: 12px; background: var(--bg-app); border-radius: var(--radius-md); text-align: center;">
              ${isEs ? 'No hay correos registrados todavía. Añade correos de soporte o contacto del proyecto si los necesitas.' : 'No official emails registered yet.'}
            </div>
          `}
        </div>
      </div>
    `;

    container.querySelector('#btn-add-account-from-accounts')?.addEventListener('click', () => {
      MarketingPage.openNewAccountModal(projectId, undefined, () => {
        MarketingPage.render(document.querySelector('.view-container')!);
      });
    });

    const openEmailModal = () => {
      MarketingPage.openNewEmailModal(projectId, undefined, () => {
        MarketingPage.render(document.querySelector('.view-container')!);
      });
    };
    container.querySelector('#btn-add-email-from-accounts')?.addEventListener('click', openEmailModal);
    container.querySelector('#btn-add-email-from-accounts-secondary')?.addEventListener('click', openEmailModal);

    container.querySelectorAll('.btn-setup-channel').forEach(btn => {
      btn.addEventListener('click', () => {
        const plat = btn.getAttribute('data-platform') as any;
        const existing = accounts.find(a => a.platform === plat);
        MarketingPage.openNewAccountModal(projectId, existing || { platform: plat } as any, () => {
          MarketingPage.render(document.querySelector('.view-container')!);
        });
      });
    });

    container.querySelectorAll('.btn-delete-custom-account').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-acc-id');
        if (id) {
          await window.nubo.marketing.deleteAccount(id);
          showToast(isEs ? 'Cuenta eliminada.' : 'Account deleted.');
          MarketingPage.render(document.querySelector('.view-container')!);
        }
      });
    });

    container.querySelectorAll('.btn-delete-account-email').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-email-id');
        if (id) {
          await window.nubo.marketing.deleteEmail(id);
          showToast(isEs ? 'Email eliminado.' : 'Email deleted.');
          MarketingPage.render(document.querySelector('.view-container')!);
        }
      });
    });
  }




  // --- Step 3: Planificador de Vídeos con Tareas & Checklist Integrado ---
  private static renderCampaignContentStep(
    container: HTMLElement,
    projectId: string,
    campaign: MarketingCampaign,
    content: ContentItem[],
    tasks: Task[],
    isEs: boolean
  ): void {
    const isKanban = MarketingPage.contentSubView === 'kanban';

    const filteredContent = MarketingPage.platformFilter === 'all'
      ? content
      : content.filter(c => {
          const plats = (c.platform || '').split(',').map(p => p.trim().toLowerCase());
          return plats.includes(MarketingPage.platformFilter.toLowerCase());
        });

    const columns: Array<{ id: ContentItem['status']; label: string }> = [
      { id: 'Idea', label: '1. IDEAS' },
      { id: 'Script', label: isEs ? '2. GUION' : '2. SCRIPT' },
      { id: 'Recording', label: isEs ? '3. GRABACIÓN' : '3. RECORDING' },
      { id: 'Editing', label: isEs ? '4. EDICIÓN' : '4. EDITING' },
      { id: 'Scheduled', label: isEs ? '5. PROGRAMADO' : '5. SCHEDULED' },
      { id: 'Published', label: isEs ? '6. PUBLICADO' : '6. PUBLISHED' }
    ];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        <!-- Action Header -->
        <div class="mkt-view-header">
          <div class="mkt-view-title-group">
            <h2>${isEs ? 'Planificador de Vídeos' : 'Video Planner'}</h2>
            <p>${isEs ? 'Arrastra tus vídeos de una columna a otra a medida que avanzas en su producción, redacta sus guiones y programa sus fechas de publicación.' : 'Drag video cards across production stages, write scripts and schedule publication dates.'}</p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <div class="mkt-view-toggle">
              <button class="mkt-view-toggle-btn ${isKanban ? 'active' : ''}" id="btn-toggle-cmp-kanban">
                ${icons.layers(13)}
                <span>${isEs ? 'Tablero Kanban' : 'Kanban Board'}</span>
              </button>
              <button class="mkt-view-toggle-btn ${!isKanban ? 'active' : ''}" id="btn-toggle-cmp-cal">
                ${icons.calendar(13)}
                <span>${isEs ? 'Calendario' : 'Calendar'}</span>
              </button>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-add-campaign-video">
              ${icons.plus(14)}
              <span>${isEs ? 'Crear Vídeo' : 'Create Video'}</span>
            </button>
          </div>
        </div>

        ${isKanban ? `
          <!-- Platform Filter Bar -->
          <div class="mkt-platform-filter-bar">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-right: 4px;">
              ${isEs ? 'Filtrar por red:' : 'Filter:'}
            </span>
            <button class="mkt-filter-chip ${MarketingPage.platformFilter === 'all' ? 'active' : ''}" data-platform="all">
              ${isEs ? 'Todas las Redes' : 'All'} (${content.length})
            </button>
            ${['YouTube', 'TikTok', 'Instagram', 'X', 'Reddit'].map(p => {
              const count = content.filter(c => (c.platform || '').split(',').map(x => x.trim().toLowerCase()).includes(p.toLowerCase())).length;
              if (count === 0) return '';
              return `
                <button class="mkt-filter-chip ${MarketingPage.platformFilter.toLowerCase() === p.toLowerCase() ? 'active' : ''}" data-platform="${p}">
                  ${p} (${count})
                </button>
              `;
            }).join('')}
          </div>

          <!-- 6-Column Draggable Kanban Production Board -->
          <div class="mkt-content-kanban">
            ${columns.map((col, colIdx) => {
              const colItems = filteredContent.filter(c => c.status === col.id);
              return `
                <div class="mkt-content-col" data-col-status="${col.id}">
                  <div class="mkt-content-col-header">
                    <div class="mkt-content-col-title">
                      <span>${col.label}</span>
                      <span class="mkt-tab-count-badge">${colItems.length}</span>
                    </div>
                    <button class="btn btn-ghost btn-sm btn-icon btn-add-in-kanban-col" data-col-status="${col.id}" title="${isEs ? 'Añadir vídeo en ' + col.label : 'Add in ' + col.label}">
                      ${icons.plus(13)}
                    </button>
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 10px; flex: 1;">
                    ${colItems.map(item => {
                      const wordCount = item.script ? item.script.trim().split(/\s+/).filter(Boolean).length : 0;
                      const estSeconds = wordCount > 0 ? Math.max(1, Math.round(wordCount / 2.3)) : 0;

                      return `
                        <div class="mkt-content-card" draggable="true" data-content-id="${item.id}">
                          <!-- Top Row: Drag Handle, Platform Badge & Delete -->
                          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                              <span class="mkt-card-drag-grip" title="${isEs ? 'Arrastra para mover a otra columna' : 'Drag to move'}">
                                ${icons.grip(12)}
                              </span>
                              ${(item.platform || '').split(',').map(p => p.trim()).filter(Boolean).map(p => `
                                <span class="platform-badge" data-platform="${p}">${MarketingPage.getPlatformIcon(p)} <span>${p}</span></span>
                              `).join('')}
                              ${item.format ? `<span class="page-stats-badge" style="font-size: 9.5px; padding: 1px 5px;">${item.format}</span>` : ''}
                            </div>
                            <button class="btn btn-ghost btn-sm btn-icon btn-delete-content-card" data-content-id="${item.id}" title="${isEs ? 'Eliminar vídeo' : 'Delete'}" style="padding: 2px; opacity: 0.5;">
                              ${icons.trash(12)}
                            </button>
                          </div>

                          <!-- Title -->
                          <div class="mkt-content-card-title">${item.title}</div>

                          <!-- Hook Quote Box & 1-Click Copy -->
                          ${item.hook ? `
                            <div class="mkt-card-hook-box">
                              <div class="mkt-card-hook-header">
                                <span class="mkt-card-hook-title">⚡ ${isEs ? 'Gancho / Hook' : 'Hook'}</span>
                                <button class="mkt-card-copy-btn btn-copy-hook" data-hook="${encodeURIComponent(item.hook)}" title="${isEs ? 'Copiar gancho al portapapeles' : 'Copy hook'}">
                                  ${icons.copy(10)} <span>${isEs ? 'Copiar' : 'Copy'}</span>
                                </button>
                              </div>
                              <div style="font-size: 11px; font-style: italic; color: var(--text-secondary); line-height: 1.35;">"${item.hook}"</div>
                            </div>
                          ` : ''}

                          <!-- Script Pill with Word Count & Copy -->
                          ${item.script ? `
                            <div class="mkt-card-script-pill">
                              <span>📝 ${wordCount} ${isEs ? 'palabras' : 'words'} (~${estSeconds}s)</span>
                              <button class="mkt-card-copy-btn btn-copy-script" data-script="${encodeURIComponent(item.script)}" title="${isEs ? 'Copiar guion al portapapeles' : 'Copy script'}">
                                ${icons.copy(10)} <span>${isEs ? 'Copiar Guion' : 'Copy'}</span>
                              </button>
                            </div>
                          ` : ''}

                          <!-- Readiness Chips Indicator Row -->
                          <div class="mkt-card-readiness-row">
                            <span class="mkt-readiness-chip ${item.hook ? 'active' : ''}">✓ ${isEs ? 'Gancho' : 'Hook'}</span>
                            <span class="mkt-readiness-chip ${item.script ? 'active' : ''}">✓ ${isEs ? 'Guion' : 'Script'}</span>
                            <span class="mkt-readiness-chip ${item.scheduled_date ? 'active' : ''}">📅 ${item.scheduled_date && item.scheduled_date.includes('T') ? item.scheduled_date.split('T')[1].substring(0, 5) + ' h' : (isEs ? 'Fecha' : 'Date')}</span>
                          </div>

                          <!-- Card Footer: Date & Quick Shift Buttons -->
                          <div class="mkt-content-card-meta">
                            <span style="font-weight: 500;">
                              ${item.scheduled_date ? MarketingPage.formatScheduledDateTime(item.scheduled_date, isEs) : (item.published_url ? '🔗 Publicado' : `<span style="color: var(--text-muted);">${isEs ? 'Sin fecha' : 'No date'}</span>`)}
                            </span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                              ${colIdx > 0 ? `
                                <button class="btn btn-ghost btn-sm btn-icon btn-shift-status" data-content-id="${item.id}" data-target-status="${columns[colIdx - 1].id}" title="${isEs ? 'Retroceder a ' + columns[colIdx - 1].label : 'Move back'}" style="padding: 2px;">
                                  ${icons.chevronLeft(12)}
                                </button>
                              ` : ''}
                              ${colIdx < columns.length - 1 ? `
                                <button class="btn btn-ghost btn-sm btn-icon btn-shift-status" data-content-id="${item.id}" data-target-status="${columns[colIdx + 1].id}" title="${isEs ? 'Avanzar a ' + columns[colIdx + 1].label : 'Advance'}" style="padding: 2px;">
                                  ${icons.chevronRight(12)}
                                </button>
                              ` : ''}
                            </div>
                          </div>
                        </div>
                      `;
                    }).join('')}

                    ${colItems.length === 0 ? `
                      <div class="mkt-col-empty-placeholder">
                        <span>${isEs ? 'Arrastra un vídeo aquí' : 'Drag a video here'}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <!-- Calendar View for this Campaign's Videos -->
          <div id="campaign-calendar-subview"></div>
        `}
      </div>
    `;

    // Calendar rendering if subview is calendar
    if (!isKanban) {
      const calContainer = container.querySelector('#campaign-calendar-subview') as HTMLElement;
      if (calContainer) {
        MarketingPage.renderCampaignCalendarView(calContainer, projectId, campaign, content, isEs);
      }
    }

    // Toggle Kanban / Calendar
    container.querySelector('#btn-toggle-cmp-kanban')?.addEventListener('click', () => {
      MarketingPage.contentSubView = 'kanban';
      MarketingPage.render(document.querySelector('.view-container')!);
    });

    container.querySelector('#btn-toggle-cmp-cal')?.addEventListener('click', () => {
      MarketingPage.contentSubView = 'calendar';
      MarketingPage.render(document.querySelector('.view-container')!);
    });

    // Create Video Modal
    container.querySelector('#btn-add-campaign-video')?.addEventListener('click', () => {
      MarketingPage.openContentModal(projectId, { campaign_id: campaign.id }, () => {
        MarketingPage.render(document.querySelector('.view-container')!);
      });
    });

    // Filter Chips
    container.querySelectorAll('.mkt-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        MarketingPage.platformFilter = chip.getAttribute('data-platform') || 'all';
        MarketingPage.render(document.querySelector('.view-container')!);
      });
    });



    // Add Video inside specific column
    container.querySelectorAll('.btn-add-in-kanban-col').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const status = btn.getAttribute('data-col-status') as any;
        MarketingPage.openContentModal(projectId, { campaign_id: campaign.id, status }, () => {
          MarketingPage.render(document.querySelector('.view-container')!);
        });
      });
    });

    // 1-Click Status Shift (Chevron buttons)
    container.querySelectorAll('.btn-shift-status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-content-id');
        const targetStatus = btn.getAttribute('data-target-status');
        if (id && targetStatus) {
          await window.nubo.content.update(id, { status: targetStatus });
          MarketingPage.render(document.querySelector('.view-container')!);
        }
      });
    });

    // Delete Video Card
    container.querySelectorAll('.btn-delete-content-card').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-content-id');
        if (id) {
          await window.nubo.content.delete(id);
          showToast(isEs ? 'Vídeo eliminado.' : 'Video deleted.');
          MarketingPage.render(document.querySelector('.view-container')!);
        }
      });
    });

    // 1-Click Copy Hook
    container.querySelectorAll('.btn-copy-hook').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const hookText = decodeURIComponent(btn.getAttribute('data-hook') || '');
        if (hookText) {
          navigator.clipboard.writeText(hookText);
          showToast(isEs ? 'Gancho copiado al portapapeles.' : 'Hook copied.');
        }
      });
    });

    // 1-Click Copy Script
    container.querySelectorAll('.btn-copy-script').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scriptText = decodeURIComponent(btn.getAttribute('data-script') || '');
        if (scriptText) {
          navigator.clipboard.writeText(scriptText);
          showToast(isEs ? 'Guion copiado al portapapeles.' : 'Script copied.');
        }
      });
    });

    // Open Video Modal on Card Click (Guarded against drag-and-drop release)
    let isDragging = false;
    container.querySelectorAll('.mkt-content-card').forEach(card => {
      card.addEventListener('click', () => {
        if (isDragging) return;
        const id = card.getAttribute('data-content-id');
        const item = content.find(c => c.id === id);
        if (item) {
          MarketingPage.openContentModal(projectId, item, () => {
            MarketingPage.render(document.querySelector('.view-container')!);
          });
        }
      });
    });

    // ==========================================================================
    // HTML5 DRAG AND DROP FUNCTIONALITY (Smooth draggable board)
    // ==========================================================================
    container.querySelectorAll('.mkt-content-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        isDragging = true;
        const id = card.getAttribute('data-content-id');
        if (id) {
          MarketingPage.draggedContentId = id;
          (e as DragEvent).dataTransfer?.setData('text/plain', id);
          card.classList.add('is-dragging');
          if ((e as DragEvent).dataTransfer) {
            (e as DragEvent).dataTransfer!.effectAllowed = 'move';
          }
        }
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        MarketingPage.draggedContentId = null;
        container.querySelectorAll('.mkt-content-col').forEach(col => col.classList.remove('drag-over'));
        setTimeout(() => {
          isDragging = false;
        }, 120);
      });
    });

    container.querySelectorAll('.mkt-content-col').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        if ((e as DragEvent).dataTransfer) {
          (e as DragEvent).dataTransfer!.dropEffect = 'move';
        }
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', (e) => {
        if (!col.contains((e as MouseEvent).relatedTarget as Node)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const contentId = MarketingPage.draggedContentId || (e as DragEvent).dataTransfer?.getData('text/plain');
        const targetStatus = col.getAttribute('data-col-status') as any;

        if (contentId && targetStatus) {
          const item = content.find(c => c.id === contentId);
          if (item && item.status !== targetStatus) {
            await window.nubo.content.update(contentId, { status: targetStatus });
            MarketingPage.draggedContentId = null;
            showToast(isEs ? `Vídeo movido a ${targetStatus}.` : `Video moved to ${targetStatus}.`);
            MarketingPage.render(document.querySelector('.view-container')!);
          }
        }
      });
    });
  }

  // --- Step 3 Subview: Calendar View for the Campaign Videos ---
  private static renderCampaignCalendarView(
    container: HTMLElement,
    projectId: string,
    campaign: MarketingCampaign,
    content: ContentItem[],
    isEs: boolean
  ): void {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + MarketingPage.calendarMonthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    const monthNamesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = isEs ? monthNamesEs[month] : monthNamesEn[month];

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const dayHeaders = isEs 
      ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary);">${monthName} ${year}</h3>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm btn-icon" id="btn-cmp-cal-prev">${icons.chevronLeft(14)}</button>
              <button class="btn btn-secondary btn-sm" id="btn-cmp-cal-today"><span>${isEs ? 'Hoy' : 'Today'}</span></button>
              <button class="btn btn-secondary btn-sm btn-icon" id="btn-cmp-cal-next">${icons.chevronRight(14)}</button>
            </div>
          </div>
          <span style="font-size: 12px; color: var(--text-secondary);">
            📅 ${content.filter(c => !!c.scheduled_date).length} ${isEs ? 'vídeos con fecha programada' : 'scheduled videos'}
          </span>
        </div>

        <div class="mkt-calendar-grid">
          ${dayHeaders.map(d => `<div class="mkt-calendar-day-header">${d}</div>`).join('')}
          ${Array.from({ length: firstDayIndex }).map(() => `<div class="mkt-calendar-cell other-month"></div>`).join('')}
          ${Array.from({ length: totalDays }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === dayNum;
            const dayItems = content.filter(c => c.scheduled_date && c.scheduled_date.startsWith(dateStr));

            return `
              <div class="mkt-calendar-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">
                <div class="mkt-calendar-day-num">${dayNum}</div>
                <div style="display: flex; flex-direction: column; gap: 4px; overflow-y: auto; max-height: 100px;">
                  ${dayItems.map(item => {
                    const hasTime = item.scheduled_date && (item.scheduled_date.includes('T') || item.scheduled_date.includes(' '));
                    let timeBadge = '';
                    if (hasTime) {
                      const t = item.scheduled_date!.includes('T') ? item.scheduled_date!.split('T')[1].substring(0, 5) : item.scheduled_date!.split(' ')[1].substring(0, 5);
                      timeBadge = `<span style="font-size: 10px; font-weight: 700; color: var(--color-primary); background: rgba(99, 102, 241, 0.12); padding: 1px 5px; border-radius: 3px; flex-shrink: 0;">${t}</span>`;
                    }
                    const tooltip = item.title + (item.platform ? ` (${item.platform})` : '');
                    return `
                      <div class="mkt-calendar-item-pill" data-content-id="${item.id}" title="${tooltip}">
                        ${timeBadge}
                        <span class="mkt-cal-item-title">${item.title}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelector('#btn-cmp-cal-prev')?.addEventListener('click', () => {
      MarketingPage.calendarMonthOffset--;
      MarketingPage.render(document.querySelector('.view-container')!);
    });
    container.querySelector('#btn-cmp-cal-next')?.addEventListener('click', () => {
      MarketingPage.calendarMonthOffset++;
      MarketingPage.render(document.querySelector('.view-container')!);
    });
    container.querySelector('#btn-cmp-cal-today')?.addEventListener('click', () => {
      MarketingPage.calendarMonthOffset = 0;
      MarketingPage.render(document.querySelector('.view-container')!);
    });

    container.querySelectorAll('.mkt-calendar-item-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = pill.getAttribute('data-content-id');
        const item = content.find(c => c.id === id);
        if (item) {
          MarketingPage.openContentModal(projectId, item, () => {
            MarketingPage.render(document.querySelector('.view-container')!);
          });
        }
      });
    });

    container.querySelectorAll('.mkt-calendar-cell:not(.other-month)').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        if (dateStr) {
          MarketingPage.openContentModal(projectId, { campaign_id: campaign.id, scheduled_date: dateStr }, () => {
            MarketingPage.render(document.querySelector('.view-container')!);
          });
        }
      });
    });
  }

  // ==========================================================================
  // CAMPAIGNS LIST VIEW (When no campaign opened or viewing all)
  // ==========================================================================
  private static renderCampaignsListView(
    container: HTMLElement,
    projectId: string,
    campaigns: MarketingCampaign[],
    allContent: ContentItem[],
    allTasks: Task[],
    isEs: boolean
  ): void {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="mkt-view-header">
          <div class="mkt-view-title-group">
            <h2>${isEs ? 'Todas las Campañas' : 'All Campaigns'}</h2>
            <p>${isEs ? 'Explora tus campañas, entra a planear sus vídeos o crea una nueva campaña para este proyecto.' : 'Explore your campaigns, open one to plan videos, or create a new campaign.'}</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-create-first-campaign">
            ${icons.plus(14)}
            <span>${isEs ? 'Nueva Campaña' : 'New Campaign'}</span>
          </button>
        </div>

        ${campaigns.length > 0 ? `
          <div class="cmp-overview-card-grid">
            ${campaigns.map(cmp => {
              const cmpContent = allContent.filter(c => c.campaign_id === cmp.id);
              const published = cmpContent.filter(c => c.status === 'Published').length;

              return `
                <div class="cmp-card-interactive btn-open-campaign-card" data-cmp-id="${cmp.id}">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                      <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">${cmp.name}</h3>
                      <span class="status-pill status-${cmp.status.toLowerCase()}">${MarketingPage.formatCampaignStatus(cmp.status, isEs)}</span>
                    </div>

                    <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 8px;">
                      🎯 <strong>${isEs ? 'Objetivo:' : 'Goal:'}</strong> ${cmp.goal || (isEs ? 'Sin objetivo definido' : 'No goal')}
                    </div>
                    ${cmp.description ? `<p style="font-size: 12px; color: var(--text-muted); margin: 6px 0 0 0; line-height: 1.4;">${cmp.description}</p>` : ''}

                    <div style="display: flex; gap: 12px; margin-top: 14px; font-size: 12px; color: var(--text-secondary); flex-wrap: wrap;">
                      <span title="${isEs ? 'Vídeos planificados' : 'Videos'}">🎬 <strong>${published} / ${cmpContent.length}</strong> ${isEs ? 'vídeos' : 'videos'}</span>
                      <span title="${isEs ? 'Tareas vinculadas' : 'Tasks'}">✓ <strong>${allTasks.filter(t => t.campaign_id === cmp.id && t.status === 'done').length} / ${allTasks.filter(t => t.campaign_id === cmp.id).length}</strong> ${isEs ? 'tareas' : 'tasks'}</span>
                    </div>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-subtle); gap: 8px; margin-top: 8px;">
                    <div style="display: flex; gap: 4px;">
                      <button class="btn btn-ghost btn-sm btn-icon btn-edit-campaign-card" data-cmp-id="${cmp.id}" title="${isEs ? 'Editar campaña' : 'Edit campaign'}">
                        ${icons.edit(13)}
                      </button>
                      <button class="btn btn-ghost btn-sm btn-icon btn-delete-campaign-card" data-cmp-id="${cmp.id}" title="${isEs ? 'Eliminar campaña' : 'Delete campaign'}" style="color: var(--status-error);">
                        ${icons.trash(13)}
                      </button>
                    </div>
                    <button class="btn btn-primary btn-sm btn-open-campaign-action" data-cmp-id="${cmp.id}">
                      <span>${isEs ? 'Entrar a la Campaña' : 'Open Campaign'}</span>
                      ${icons.arrowRight(12)}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div style="font-size: 32px; margin-bottom: 8px;">🎯</div>
            <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 6px 0;">${isEs ? 'No tienes ninguna campaña creada todavía' : 'No campaigns created yet'}</h3>
            <p style="font-size: 13px; color: var(--text-secondary); max-width: 460px; margin: 0 auto 16px auto;">
              ${isEs 
                ? 'Crea tu primera campaña para planificar vídeos, redactar guiones y programar publicaciones en redes.' 
                : 'Create your first campaign to plan videos, write scripts and schedule publications.'}
            </p>
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-primary" id="btn-create-first-campaign-empty">
                ${icons.plus(15)}
                <span>${isEs ? '+ Crear Primera Campaña' : '+ Create First Campaign'}</span>
              </button>
            </div>
          </div>
        `}
      </div>
    `;

    const openCreator = () => {
      MarketingPage.openNewCampaignModal(projectId, undefined, () => {
        MarketingPage.render(document.querySelector('.view-container')!);
      });
    };

    container.querySelector('#btn-create-first-campaign')?.addEventListener('click', openCreator);
    container.querySelector('#btn-create-first-campaign-empty')?.addEventListener('click', openCreator);

    container.querySelectorAll('.btn-open-campaign-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-edit-campaign-card') || target.closest('.btn-delete-campaign-card')) {
          return;
        }
        const id = card.getAttribute('data-cmp-id');
        if (id) {
          MarketingPage.selectedCampaignId = id;
          MarketingPage.viewMode = 'detail';
          MarketingPage.render(document.querySelector('.view-container')!);
        }
      });
    });

    container.querySelectorAll('.btn-edit-campaign-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-cmp-id');
        const cmp = campaigns.find(c => c.id === id);
        if (cmp) {
          MarketingPage.openNewCampaignModal(projectId, cmp, () => {
            MarketingPage.render(document.querySelector('.view-container')!);
          });
        }
      });
    });

    container.querySelectorAll('.btn-delete-campaign-card').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-cmp-id');
        if (id) {
          const confirmMsg = isEs 
            ? '¿Estás seguro de que deseas eliminar esta campaña? Esta acción no se puede deshacer.' 
            : 'Are you sure you want to delete this campaign?';
          if (confirm(confirmMsg)) {
            await window.nubo.marketing.deleteCampaign(id);
            if (MarketingPage.selectedCampaignId === id) {
              MarketingPage.selectedCampaignId = null;
            }
            showToast(isEs ? 'Campaña eliminada correctamente.' : 'Campaign deleted.');
            MarketingPage.render(document.querySelector('.view-container')!);
          }
        }
      });
    });
  }

  // ==========================================================================
  // ATTACH LISTENERS
  // ==========================================================================
  private static attachGlobalListeners(
    container: HTMLElement, 
    project: any, 
    allCampaigns: MarketingCampaign[],
    tasks: Task[]
  ): void {
    container.querySelectorAll('.mkt-subnav-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const tab = tabBtn.getAttribute('data-mkt-tab') as 'campaigns' | 'tasks' | 'accounts';
        if (tab) {
          MarketingPage.topTab = tab;
          if (tab === 'campaigns') {
            MarketingPage.viewMode = 'list';
          }
          MarketingPage.render(container);
        }
      });
    });

    container.querySelector('#btn-hero-all-campaigns')?.addEventListener('click', () => {
      MarketingPage.topTab = 'campaigns';
      MarketingPage.viewMode = 'list';
      MarketingPage.render(container);
    });

    container.querySelector('#btn-hero-add-task')?.addEventListener('click', () => {
      modalManager.openNewTaskModal(project.id, 'todo', () => {
        MarketingPage.render(container);
      });
    });

    container.querySelector('#btn-hero-add-account')?.addEventListener('click', () => {
      MarketingPage.openNewAccountModal(project.id, undefined, () => {
        MarketingPage.render(container);
      });
    });

    container.querySelector('#btn-mkt-open-folders')?.addEventListener('click', async () => {
      if (project.folder_path) {
        if (window.nubo.development?.openFolder) {
          await window.nubo.development.openFolder(`${project.folder_path}/marketing`);
        } else if (window.nubo.files?.openContainingFolder) {
          await window.nubo.files.openContainingFolder(`${project.folder_path}/marketing`);
        }
      }
    });

    container.querySelector('#btn-mkt-create-campaign')?.addEventListener('click', () => {
      MarketingPage.openNewCampaignModal(project.id, undefined, () => {
        MarketingPage.render(container);
      });
    });
  }

  // ==========================================================================
  // MODALS (ACCOUNT, EMAIL, IDEA, CONTENT, CAMPAIGN, METRIC)
  // ==========================================================================

  public static openNewAccountModal(projectId: string, existing?: Partial<MarketingAccount>, onSaved?: () => void): void {
    const isEs = getLanguage() === 'es';
    const platforms = ['YouTube', 'TikTok', 'Instagram', 'X', 'Reddit', 'Discord', 'LinkedIn', 'Product Hunt', 'GitHub', 'Email', 'Website', 'Custom'];
    const statuses = ['Not Created', 'Pending', 'Created', 'Active', 'Inactive'];

    const bodyHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">${isEs ? 'Plataforma' : 'Platform'}</label>
          <select id="acc-modal-platform">
            ${platforms.map(p => `<option value="${p}" ${existing?.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${isEs ? 'Estado' : 'Status'}</label>
          <select id="acc-modal-status">
            ${statuses.map(st => `<option value="${st}" ${existing?.status === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Username / Handle</label>
        <input type="text" id="acc-modal-username" value="${existing?.username || ''}" placeholder="@nombreproyecto" />
      </div>
      <div class="form-group">
        <label class="form-label">URL del perfil</label>
        <input type="url" id="acc-modal-url" value="${existing?.url || ''}" placeholder="https://..." />
      </div>
      <div class="form-group">
        <label class="form-label">Email asociado</label>
        <input type="email" id="acc-modal-email" value="${existing?.email || ''}" placeholder="social@proyecto.com" />
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Notas' : 'Notes'}</label>
        <textarea id="acc-modal-notes" rows="2">${existing?.notes || ''}</textarea>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-acc">${t('common.save')}</button>
    `;

    modalManager.open(existing?.id ? (isEs ? 'Editar Cuenta' : 'Edit Account') : (isEs ? 'Nueva Cuenta' : 'New Account'), bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => modalManager.close());
    document.getElementById('modal-submit-acc')?.addEventListener('click', async () => {
      const platform = (document.getElementById('acc-modal-platform') as HTMLSelectElement).value;
      const status = (document.getElementById('acc-modal-status') as HTMLSelectElement).value;
      const username = (document.getElementById('acc-modal-username') as HTMLInputElement).value.trim();
      const url = (document.getElementById('acc-modal-url') as HTMLInputElement).value.trim();
      const email = (document.getElementById('acc-modal-email') as HTMLInputElement).value.trim();
      const notes = (document.getElementById('acc-modal-notes') as HTMLTextAreaElement).value.trim();

      if (existing?.id) {
        await window.nubo.marketing.updateAccount(existing.id, { platform, status, username, url, email, notes });
      } else {
        await window.nubo.marketing.createAccount({ projectId, platform, status, username, url, email, notes });
      }
      modalManager.close();
      showToast(isEs ? 'Cuenta guardada.' : 'Account saved.');
      if (onSaved) onSaved();
    });
  }

  public static openNewEmailModal(projectId: string, existing?: MarketingEmail, onSaved?: () => void): void {
    const isEs = getLanguage() === 'es';
    const types = ['Main', 'Support', 'Contact', 'Marketing', 'Newsletter', 'Personal'];

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="email-modal-addr" value="${existing?.email || ''}" placeholder="hello@proyecto.com" autofocus />
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Tipo de correo' : 'Email Type'}</label>
        <select id="email-modal-type">
          ${types.map(tp => `<option value="${tp}" ${existing?.type === tp ? 'selected' : ''}>${tp}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Uso' : 'Usage'}</label>
        <input type="text" id="email-modal-usage" value="${existing?.usage || ''}" placeholder="${isEs ? 'Ej: Correo principal de contacto y cuentas de registro' : 'E.g., Primary contact'}" />
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Notas' : 'Notes'}</label>
        <textarea id="email-modal-notes" rows="2">${existing?.notes || ''}</textarea>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-email">${t('common.save')}</button>
    `;

    modalManager.open(existing ? (isEs ? 'Editar Email' : 'Edit Email') : (isEs ? 'Registrar Email del Proyecto' : 'Register Project Email'), bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => modalManager.close());
    document.getElementById('modal-submit-email')?.addEventListener('click', async () => {
      const email = (document.getElementById('email-modal-addr') as HTMLInputElement).value.trim();
      const type = (document.getElementById('email-modal-type') as HTMLSelectElement).value;
      const usage = (document.getElementById('email-modal-usage') as HTMLInputElement).value.trim();
      const notes = (document.getElementById('email-modal-notes') as HTMLTextAreaElement).value.trim();
      if (!email) return;

      if (existing) {
        await window.nubo.marketing.updateEmail(existing.id, { email, type, usage, notes });
      } else {
        await window.nubo.marketing.createEmail({ projectId, email, type, usage, notes });
      }
      modalManager.close();
      showToast(isEs ? 'Email guardado.' : 'Email saved.');
      if (onSaved) onSaved();
    });
  }

  public static formatGoal(goal: string | undefined, isEs: boolean): string {
    if (!goal) return isEs ? 'Sin objetivo' : 'No goal';
    if (!isEs) return goal;
    const map: Record<string, string> = {
      'Get users': 'Conseguir usuarios',
      'Get followers': 'Conseguir seguidores',
      'Generate traffic': 'Generar tráfico',
      'Get registrations': 'Conseguir registros',
      'Get sales': 'Conseguir ventas',
      'Build community': 'Crear comunidad',
      'Validate product': 'Validar producto',
      'Brand awareness': 'Reconocimiento de marca'
    };
    return map[goal] || goal;
  }



  public static formatCampaignStatus(status: string | undefined, isEs: boolean): string {
    if (!status) return isEs ? 'Planificada' : 'Planned';
    if (!isEs) return status;
    const map: Record<string, string> = {
      'Planned': 'Planificada',
      'Active': 'Activa',
      'Completed': 'Completada',
      'Cancelled': 'Cancelada'
    };
    return map[status] || status;
  }

  public static formatScheduledDateTime(dateStr: string | undefined, isEs: boolean): string {
    if (!dateStr) return isEs ? 'Sin fecha' : 'No date';
    try {
      const hasTime = dateStr.includes('T') || (dateStr.includes(':') && dateStr.length > 10);
      const datePart = dateStr.substring(0, 10);
      const parts = datePart.split('-').map(Number);
      if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
        return `📅 ${dateStr}`;
      }
      const [y, m, d] = parts;
      const monthsEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = isEs ? monthsEs[m - 1] : monthsEn[m - 1];

      let formatted = `${d} ${monthName}`;
      if (hasTime) {
        let timePart = '';
        if (dateStr.includes('T')) {
          timePart = dateStr.split('T')[1].substring(0, 5);
        } else if (dateStr.includes(' ')) {
          timePart = dateStr.split(' ')[1].substring(0, 5);
        }
        if (timePart) {
          formatted += ` · ${timePart} h`;
        }
      }
      return `📅 ${formatted}`;
    } catch {
      return `📅 ${dateStr.substring(0, 10)}`;
    }
  }



  public static getPlatformIcon(platform: string): string {
    const map: Record<string, string> = {
      YouTube: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#EF4444" style="flex-shrink:0;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
      TikTok: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46 6.28 6.28 0 0 0 1.87-4.46V8.71a8.28 8.28 0 0 0 4.9 1.58V6.84a4.84 4.84 0 0 1-1-.15z"/></svg>`,
      Instagram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E1306C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>`,
      X: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
      Twitter: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
      LinkedIn: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2" style="flex-shrink:0;"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.45 1.45 0 1 0 0-2.9 1.45 1.45 0 0 0 0 2.9M7.88 18.5V10.1h-2.8v8.4h2.8z"/></svg>`,
      Reddit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4500" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="11" r="1" fill="#fff"/><circle cx="15" cy="11" r="1" fill="#fff"/><path d="M9 15c1 1 5 1 6 0" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      Discord: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#5865F2" style="flex-shrink:0;"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`
    };
    return map[platform] || `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>`;
  }

  public static async openContentModal(projectId: string, existing?: Partial<ContentItem>, onSaved?: () => void): Promise<void> {
    const isEs = getLanguage() === 'es';
    const statusDefs: Array<{ id: ContentItem['status']; labelEn: string; labelEs: string }> = [
      { id: 'Idea', labelEn: '1. Idea', labelEs: '1. Idea' },
      { id: 'Script', labelEn: '2. Script', labelEs: '2. Guion' },
      { id: 'Recording', labelEn: '3. Recording', labelEs: '3. Grabación' },
      { id: 'Editing', labelEn: '4. Editing', labelEs: '4. Edición' },
      { id: 'Scheduled', labelEn: '5. Scheduled', labelEs: '5. Programado' },
      { id: 'Published', labelEn: '6. Published', labelEs: '6. Publicado' }
    ];

    const platformDefs = [
      { id: 'TikTok', name: 'TikTok', defaultFormat: 'TikTok', formats: ['TikTok', 'Other'] },
      { id: 'YouTube', name: 'YouTube', defaultFormat: 'YouTube Short', formats: ['YouTube Short', 'YouTube Video', 'Tutorial', 'Other'] },
      { id: 'Instagram', name: 'Instagram', defaultFormat: 'Instagram Reel', formats: ['Instagram Reel', 'Instagram Post', 'Other'] },
      { id: 'X', name: 'X / Twitter', defaultFormat: 'X Post', formats: ['X Post', 'X Thread', 'Other'] },
      { id: 'LinkedIn', name: 'LinkedIn', defaultFormat: 'LinkedIn Post', formats: ['LinkedIn Post', 'Other'] },
      { id: 'Reddit', name: 'Reddit', defaultFormat: 'Reddit Post', formats: ['Reddit Post', 'Other'] },
      { id: 'Discord', name: 'Discord', defaultFormat: 'Announcement', formats: ['Announcement', 'Other'] },
      { id: 'Other', name: isEs ? 'Otra red' : 'Other', defaultFormat: 'Other', formats: ['Other', 'Image', 'Announcement'] }
    ];

    const campaigns = await window.nubo.marketing.getCampaigns(projectId).catch(() => []);
    const preselectedCampaignId = existing?.campaign_id || MarketingPage.selectedCampaignId || '';

    let selectedDateStr = '';
    let selectedTimeStr = '18:00';
    if (existing?.scheduled_date) {
      if (existing.scheduled_date.includes('T')) {
        const parts = existing.scheduled_date.split('T');
        selectedDateStr = parts[0] || '';
        selectedTimeStr = parts[1]?.substring(0, 5) || '18:00';
      } else if (existing.scheduled_date.includes(' ')) {
        const parts = existing.scheduled_date.split(' ');
        selectedDateStr = parts[0] || '';
        selectedTimeStr = parts[1]?.substring(0, 5) || '18:00';
      } else if (existing.scheduled_date.length >= 10) {
        selectedDateStr = existing.scheduled_date.substring(0, 10);
        selectedTimeStr = '18:00';
      }
    }

    const todayDate = new Date();
    let calViewYear = selectedDateStr ? parseInt(selectedDateStr.split('-')[0]) : todayDate.getFullYear();
    let calViewMonth = selectedDateStr ? parseInt(selectedDateStr.split('-')[1]) - 1 : todayDate.getMonth();

    const initialPlatforms = existing?.platform 
      ? existing.platform.split(',').map(p => p.trim()).filter(Boolean)
      : ['TikTok'];
    let selectedPlatformSet = new Set<string>(initialPlatforms);

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${isEs ? 'Título del vídeo / contenido' : 'Content Title'}</label>
        <input type="text" id="cnt-modal-title" value="${existing?.title || ''}" placeholder="${isEs ? 'Ej: Cómo automatizar este proceso en 3 minutos' : 'E.g., How to automate this workflow'}" autofocus />
      </div>

      <!-- Interactive Multi-Platform Picker with Clickable Checkable Cards -->
      <div class="form-group" style="margin-bottom: 16px;">
        <label class="form-label" style="margin-bottom: 6px; font-weight: 600;">
          ${isEs ? 'Plataforma(s) del Vídeo (puedes escoger varias)' : 'Video Platform(s) (select multiple)'}
        </label>

        <div class="cnt-platform-selector-grid" id="cnt-platform-selector">
          ${platformDefs.map(p => {
            const isChecked = selectedPlatformSet.has(p.id);
            return `
              <div class="cnt-platform-chip ${isChecked ? 'active' : ''}" data-platform="${p.id}" title="${p.name}">
                <span class="cnt-platform-icon">${MarketingPage.getPlatformIcon(p.id)}</span>
                <span class="cnt-platform-name">${p.name}</span>
                <input type="checkbox" class="cnt-chip-checkbox" value="${p.id}" ${isChecked ? 'checked' : ''} />
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
          <span style="font-size: 11.5px; color: var(--text-secondary);" id="cnt-selected-platforms-label"></span>
          ${!existing?.id ? `
            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-secondary); cursor: pointer; user-select: none;">
              <input type="checkbox" id="cnt-split-cards-toggle" style="cursor: pointer; accent-color: var(--color-primary, #6366F1);" />
              <span>${isEs ? 'Crear 1 tarjeta individual por red' : 'Create 1 card per platform'}</span>
            </label>
          ` : ''}
        </div>
      </div>

      <!-- Format and Status Row (Formats adapt dynamically to selected platforms) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">${isEs ? 'Formato del Vídeo' : 'Video Format'}</label>
          <select id="cnt-modal-format">
            <!-- Dynamically populated according to active platform(s) -->
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${isEs ? 'Estado de Producción' : 'Production Status'}</label>
          <select id="cnt-modal-status">
            ${statusDefs.map(st => `<option value="${st.id}" ${existing?.status === st.id ? 'selected' : ''}>${isEs ? st.labelEs : st.labelEn}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">${isEs ? 'Campaña vinculada' : 'Linked Campaign'}</label>
        <select id="cnt-modal-campaign">
          <option value="">${isEs ? '(Ninguna campaña)' : '(None)'}</option>
          ${campaigns.map(c => `<option value="${c.id}" ${preselectedCampaignId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>

      <!-- Visual Publishing Date & Time Section (Interactive Mini-Calendar + Time Picker + Quick Presets) -->
      <div class="cnt-datetime-section">
        <div class="cnt-datetime-header">
          <div class="cnt-datetime-label-group">
            <span class="form-label" style="margin: 0; font-weight: 700; font-size: 12px; color: var(--text-primary); display: inline-flex; align-items: center; gap: 6px;">
              ${icons.calendar(13)}
              <span>${isEs ? 'Fecha y Hora de Publicación' : 'Publishing Date & Time'}</span>
            </span>
            <span class="cnt-datetime-badge" id="cnt-datetime-summary-badge"></span>
          </div>
          <button type="button" class="btn btn-ghost btn-xs" id="btn-clear-datetime" style="font-size: 11px; color: var(--text-muted); padding: 2px 6px;">
            ${icons.trash(11)} <span>${isEs ? 'Sin fecha' : 'Clear'}</span>
          </button>
        </div>

        <!-- Quick Date Preset Chips -->
        <div class="cnt-date-presets-row">
          <button type="button" class="cnt-preset-chip" data-preset="today">${isEs ? 'Hoy' : 'Today'}</button>
          <button type="button" class="cnt-preset-chip" data-preset="tomorrow">${isEs ? 'Mañana' : 'Tomorrow'}</button>
          <button type="button" class="cnt-preset-chip" data-preset="friday">${isEs ? 'Este Viernes' : 'This Friday'}</button>
          <button type="button" class="cnt-preset-chip" data-preset="monday">${isEs ? 'Próx. Lunes' : 'Next Mon'}</button>
          <button type="button" class="cnt-preset-chip" data-preset="week">${isEs ? '+1 semana' : '+1 week'}</button>
        </div>

        <!-- Interactive Calendar & Time Card -->
        <div class="cnt-datetime-card">
          <!-- Left: Mini Calendar with Month Navigation -->
          <div class="cnt-mini-calendar">
            <div class="cnt-mini-cal-nav">
              <button type="button" class="btn btn-ghost btn-sm btn-icon" id="btn-cal-prev-month" title="${isEs ? 'Mes anterior' : 'Previous month'}" style="padding: 2px 5px;">
                ${icons.chevronLeft(12)}
              </button>
              <span class="cnt-mini-cal-title" id="cnt-mini-cal-month-title"></span>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" id="btn-cal-next-month" title="${isEs ? 'Mes siguiente' : 'Next month'}" style="padding: 2px 5px;">
                ${icons.chevronRight(12)}
              </button>
            </div>

            <div class="cnt-mini-cal-days-header">
              <span>${isEs ? 'L' : 'M'}</span>
              <span>${isEs ? 'M' : 'T'}</span>
              <span>${isEs ? 'X' : 'W'}</span>
              <span>${isEs ? 'J' : 'T'}</span>
              <span>${isEs ? 'V' : 'F'}</span>
              <span>${isEs ? 'S' : 'S'}</span>
              <span>${isEs ? 'D' : 'S'}</span>
            </div>

            <div class="cnt-mini-cal-grid" id="cnt-mini-cal-grid"></div>
          </div>

          <!-- Right: Time Picker with Peak Social Posting Hours -->
          <div class="cnt-time-panel">
            <label class="form-label" style="font-size: 11px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 4px;">
              <span>⏰ ${isEs ? 'Hora de publicación' : 'Publishing Time'}</span>
            </label>

            <input type="time" id="cnt-time-input" class="cnt-time-input" value="${selectedTimeStr}" />

            <div style="margin-top: 4px;">
              <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.3px;">
                ${isEs ? 'Horas recomendadas:' : 'Best times:'}
              </span>
              <div class="cnt-time-chips-grid">
                <button type="button" class="cnt-time-chip" data-time="12:00">
                  <span>12:00</span>
                  <small>${isEs ? 'Mediodía' : 'Noon'}</small>
                </button>
                <button type="button" class="cnt-time-chip" data-time="15:30">
                  <span>15:30</span>
                  <small>${isEs ? 'Tarde' : 'Afternoon'}</small>
                </button>
                <button type="button" class="cnt-time-chip" data-time="18:00">
                  <span>18:00</span>
                  <small>⭐ ${isEs ? 'Pico' : 'Peak'}</small>
                </button>
                <button type="button" class="cnt-time-chip" data-time="20:30">
                  <span>20:30</span>
                  <small>${isEs ? 'Prime' : 'Prime'}</small>
                </button>
                <button type="button" class="cnt-time-chip" data-time="22:00">
                  <span>22:00</span>
                  <small>${isEs ? 'Noche' : 'Night'}</small>
                </button>
              </div>
            </div>
          </div>
        </div>

        <input type="hidden" id="cnt-modal-date" value="${existing?.scheduled_date || ''}" />
      </div>

      <div class="form-group">
        <label class="form-label">${isEs ? 'Gancho Inicial / Hook (primeros 3 segundos)' : 'Hook (First 3s)'}</label>
        <input type="text" id="cnt-modal-hook" value="${existing?.hook || ''}" placeholder="${isEs ? 'Ej: ¿Sabías que puedes hacer esto sin programar?' : 'E.g., Did you know this?'}" />
      </div>

      <div class="form-group">
        <label class="form-label">${isEs ? 'Guion Completo / Script' : 'Script'}</label>
        <textarea id="cnt-modal-script" rows="4" placeholder="${isEs ? 'Escribe aquí tu guion paso a paso o bullet points...' : 'Write your full script here...'}">${existing?.script || ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Hashtags</label>
        <input type="text" id="cnt-modal-hashtags" value="${existing?.hashtags || ''}" placeholder="#buildinpublic #indiedev" />
      </div>

      <div class="form-group">
        <label class="form-label">${isEs ? 'Enlace Publicado (opcional)' : 'Published URL'}</label>
        <input type="url" id="cnt-modal-url" value="${existing?.published_url || ''}" placeholder="https://..." />
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-cnt">${t('common.save')}</button>
    `;

    modalManager.open(existing?.id ? (isEs ? 'Ficha del Vídeo' : 'Video Details') : (isEs ? 'Planificar Nuevo Vídeo' : 'Plan New Video'), bodyHtml, footerHtml);

    // Helpers to manage platform selection & dynamic formats
    const updateFormatOptions = () => {
      const formatSelect = document.getElementById('cnt-modal-format') as HTMLSelectElement;
      if (!formatSelect) return;
      const currentVal = formatSelect.value || existing?.format;

      if (selectedPlatformSet.size > 1) {
        const multiFormats = [
          isEs ? 'Vídeo Vertical (TikTok / Reels / Shorts)' : 'Vertical Video (TikTok / Reels / Shorts)',
          isEs ? 'Vídeo Horizontal (YouTube / Web / X)' : 'Horizontal Video (YouTube / Web / X)',
          isEs ? 'Tutorial / Paso a paso' : 'Tutorial / Walkthrough',
          isEs ? 'Clip de Producto / Teaser' : 'Product Clip / Teaser',
          isEs ? 'Post con Clip de Vídeo' : 'Post with Video Clip',
          isEs ? 'Otro' : 'Other'
        ];
        formatSelect.innerHTML = multiFormats.map(f => `
          <option value="${f}" ${currentVal === f || (!currentVal && f === multiFormats[0]) ? 'selected' : ''}>${f}</option>
        `).join('');
      } else {
        const singlePlat = Array.from(selectedPlatformSet)[0] || 'TikTok';
        const def = platformDefs.find(p => p.id === singlePlat) || platformDefs[0];
        formatSelect.innerHTML = def.formats.map(f => `
          <option value="${f}" ${currentVal === f || (!currentVal && f === def.defaultFormat) ? 'selected' : ''}>${f}</option>
        `).join('');
      }
    };

    const refreshChips = () => {
      document.querySelectorAll('#cnt-platform-selector .cnt-platform-chip').forEach(chip => {
        const pId = chip.getAttribute('data-platform') || '';
        const chk = chip.querySelector('.cnt-chip-checkbox') as HTMLInputElement;
        const isSel = selectedPlatformSet.has(pId);
        if (isSel) {
          chip.classList.add('active');
          if (chk) chk.checked = true;
        } else {
          chip.classList.remove('active');
          if (chk) chk.checked = false;
        }
      });

      const labelEl = document.getElementById('cnt-selected-platforms-label');
      if (labelEl) {
        const count = selectedPlatformSet.size;
        const names = Array.from(selectedPlatformSet).join(', ');
        if (count === 1) {
          labelEl.textContent = isEs ? `1 plataforma seleccionada: ${names}` : `1 platform selected: ${names}`;
        } else {
          labelEl.innerHTML = isEs ? `✓ <strong>${count} plataformas seleccionadas:</strong> ${names}` : `✓ <strong>${count} platforms selected:</strong> ${names}`;
        }
      }
    };

    // Chip click handler - directly toggles the platform
    document.querySelectorAll('#cnt-platform-selector .cnt-platform-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const pId = chip.getAttribute('data-platform') || '';
        if (selectedPlatformSet.has(pId)) {
          if (selectedPlatformSet.size > 1) {
            selectedPlatformSet.delete(pId);
          } else {
            showToast(isEs ? 'Debes seleccionar al menos una plataforma.' : 'At least one platform must be selected.');
          }
        } else {
          selectedPlatformSet.add(pId);
        }
        refreshChips();
        updateFormatOptions();
      });
    });

    // Initialize formats & label
    refreshChips();
    updateFormatOptions();

    // Date & Time Picker logic
    const monthNamesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const getPresetDateStr = (preset: string | null): string => {
      const d = new Date();
      if (preset === 'today') {
        // today
      } else if (preset === 'tomorrow') {
        d.setDate(d.getDate() + 1);
      } else if (preset === 'friday') {
        const dayOfWeek = d.getDay();
        let diff = 5 - dayOfWeek;
        if (diff <= 0) diff += 7;
        d.setDate(d.getDate() + diff);
      } else if (preset === 'monday') {
        const dayOfWeek = d.getDay();
        let diff = (1 + 7 - dayOfWeek) % 7;
        if (diff === 0) diff = 7;
        d.setDate(d.getDate() + diff);
      } else if (preset === 'week') {
        d.setDate(d.getDate() + 7);
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const updateDatetimeDisplay = () => {
      const summaryBadge = document.getElementById('cnt-datetime-summary-badge');
      const hiddenDateInput = document.getElementById('cnt-modal-date') as HTMLInputElement;
      if (!summaryBadge || !hiddenDateInput) return;

      if (selectedDateStr) {
        const combined = `${selectedDateStr}T${selectedTimeStr || '18:00'}`;
        hiddenDateInput.value = combined;
        summaryBadge.innerHTML = MarketingPage.formatScheduledDateTime(combined, isEs);
        summaryBadge.classList.add('active');
      } else {
        hiddenDateInput.value = '';
        summaryBadge.innerHTML = isEs ? 'Sin programar' : 'Unscheduled';
        summaryBadge.classList.remove('active');
      }

      document.querySelectorAll('.cnt-preset-chip').forEach(btn => {
        const p = btn.getAttribute('data-preset');
        const targetStr = getPresetDateStr(p);
        btn.classList.toggle('active', selectedDateStr === targetStr);
      });

      document.querySelectorAll('.cnt-time-chip').forEach(btn => {
        const tVal = btn.getAttribute('data-time');
        btn.classList.toggle('active', selectedTimeStr === tVal);
      });
    };

    const renderMiniCalendar = () => {
      const titleEl = document.getElementById('cnt-mini-cal-month-title');
      const gridEl = document.getElementById('cnt-mini-cal-grid');
      if (!titleEl || !gridEl) return;

      titleEl.textContent = `${isEs ? monthNamesEs[calViewMonth] : monthNamesEn[calViewMonth]} ${calViewYear}`;

      const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
      const firstDayIndex = firstDay === 0 ? 6 : firstDay - 1;
      const totalDays = new Date(calViewYear, calViewMonth + 1, 0).getDate();
      const prevMonthTotalDays = new Date(calViewYear, calViewMonth, 0).getDate();

      let daysHtml = '';
      for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevMonthTotalDays - i;
        daysHtml += `<button type="button" class="cnt-mini-cal-day other-month" disabled>${dayNum}</button>`;
      }

      for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const dStr = `${calViewYear}-${String(calViewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const isSelected = selectedDateStr === dStr;
        const isToday = todayDate.getFullYear() === calViewYear && todayDate.getMonth() === calViewMonth && todayDate.getDate() === dayNum;

        daysHtml += `
          <button type="button" class="cnt-mini-cal-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-date="${dStr}">
            ${dayNum}
          </button>
        `;
      }

      const totalCells = firstDayIndex + totalDays;
      const remaining = (7 - (totalCells % 7)) % 7;
      for (let i = 1; i <= remaining; i++) {
        daysHtml += `<button type="button" class="cnt-mini-cal-day other-month" disabled>${i}</button>`;
      }

      gridEl.innerHTML = daysHtml;

      gridEl.querySelectorAll('.cnt-mini-cal-day[data-date]').forEach(btn => {
        btn.addEventListener('click', () => {
          const d = btn.getAttribute('data-date');
          if (d) {
            selectedDateStr = d;
            updateDatetimeDisplay();
            renderMiniCalendar();
          }
        });
      });
    };

    document.getElementById('btn-cal-prev-month')?.addEventListener('click', () => {
      calViewMonth--;
      if (calViewMonth < 0) {
        calViewMonth = 11;
        calViewYear--;
      }
      renderMiniCalendar();
    });

    document.getElementById('btn-cal-next-month')?.addEventListener('click', () => {
      calViewMonth++;
      if (calViewMonth > 11) {
        calViewMonth = 0;
        calViewYear++;
      }
      renderMiniCalendar();
    });

    document.querySelectorAll('.cnt-preset-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-preset');
        const targetStr = getPresetDateStr(p);
        selectedDateStr = targetStr;
        const [y, m] = targetStr.split('-').map(Number);
        calViewYear = y;
        calViewMonth = m - 1;
        renderMiniCalendar();
        updateDatetimeDisplay();
      });
    });

    const timeInput = document.getElementById('cnt-time-input') as HTMLInputElement;
    timeInput?.addEventListener('input', () => {
      selectedTimeStr = timeInput.value || '18:00';
      updateDatetimeDisplay();
    });

    document.querySelectorAll('.cnt-time-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-time') || '18:00';
        selectedTimeStr = t;
        if (timeInput) timeInput.value = t;
        updateDatetimeDisplay();
      });
    });

    document.getElementById('btn-clear-datetime')?.addEventListener('click', () => {
      selectedDateStr = '';
      updateDatetimeDisplay();
      renderMiniCalendar();
    });

    // Render calendar & date display on open
    renderMiniCalendar();
    updateDatetimeDisplay();

    document.getElementById('modal-cancel')?.addEventListener('click', () => modalManager.close());
    document.getElementById('modal-submit-cnt')?.addEventListener('click', async () => {
      const title = (document.getElementById('cnt-modal-title') as HTMLInputElement).value.trim();
      const format = (document.getElementById('cnt-modal-format') as HTMLSelectElement).value as any;
      const status = (document.getElementById('cnt-modal-status') as HTMLSelectElement).value as any;
      const campaign_id = (document.getElementById('cnt-modal-campaign') as HTMLSelectElement).value || undefined;
      const scheduled_date = (document.getElementById('cnt-modal-date') as HTMLInputElement).value || undefined;
      const hook = (document.getElementById('cnt-modal-hook') as HTMLInputElement).value.trim();
      const script = (document.getElementById('cnt-modal-script') as HTMLTextAreaElement).value.trim();
      const cta = existing?.cta || '';
      const hashtags = (document.getElementById('cnt-modal-hashtags') as HTMLInputElement).value.trim();
      const published_url = (document.getElementById('cnt-modal-url') as HTMLInputElement).value.trim();

      if (!title) return;

      const platformsList = Array.from(selectedPlatformSet);
      const platformString = platformsList.join(', ');
      const shouldSplit = (document.getElementById('cnt-split-cards-toggle') as HTMLInputElement)?.checked;

      if (existing?.id) {
        // Editing existing piece
        await window.nubo.content.update(existing.id, {
          title,
          platform: platformString,
          format,
          status,
          campaign_id,
          campaignId: campaign_id,
          scheduled_date,
          scheduledDate: scheduled_date,
          hook,
          script,
          cta,
          hashtags,
          published_url,
          publishedUrl: published_url
        });
        showToast(isEs ? 'Vídeo actualizado.' : 'Video updated.');
      } else {
        // Creating new piece(s)
        if (shouldSplit && platformsList.length > 1) {
          for (const plat of platformsList) {
            const def = platformDefs.find(p => p.id === plat);
            const itemFormat = def?.defaultFormat || format || 'Other';
            const itemTitle = !title.includes(`[${plat}]`) ? `[${plat}] ${title}` : title;

            await window.nubo.content.create({
              projectId,
              title: itemTitle,
              platform: plat,
              format: itemFormat as any,
              status,
              campaign_id,
              campaignId: campaign_id,
              scheduled_date,
              scheduledDate: scheduled_date,
              hook,
              script,
              cta,
              hashtags,
              published_url,
              publishedUrl: published_url,
              parent_idea_id: existing?.parent_idea_id,
              parentIdeaId: existing?.parent_idea_id
            });
          }
          if (existing?.parent_idea_id) {
            await window.nubo.marketing.updateIdea(existing.parent_idea_id, { status: 'Planned' });
          }
          showToast(isEs ? `¡${platformsList.length} vídeos creados en el planificador!` : `Created ${platformsList.length} videos in planner!`);
        } else {
          // Unified card with all selected platforms
          await window.nubo.content.create({
            projectId,
            title,
            platform: platformString,
            format,
            status,
            campaign_id,
            campaignId: campaign_id,
            scheduled_date,
            scheduledDate: scheduled_date,
            hook,
            script,
            cta,
            hashtags,
            published_url,
            publishedUrl: published_url,
            parent_idea_id: existing?.parent_idea_id,
            parentIdeaId: existing?.parent_idea_id
          });
          if (existing?.parent_idea_id) {
            await window.nubo.marketing.updateIdea(existing.parent_idea_id, { status: 'Planned' });
          }
          showToast(isEs ? `Vídeo planificado para: ${platformString}.` : `Video planned for: ${platformString}.`);
        }
      }

      modalManager.close();
      if (onSaved) onSaved();
    });
  }



  public static openNewCampaignModal(projectId: string, existing?: MarketingCampaign, onSaved?: () => void): void {
    const isEs = getLanguage() === 'es';
    const campaignStatusDefs = [
      { id: 'Planned', labelEn: 'Planned', labelEs: 'Planificada' },
      { id: 'Active', labelEn: 'Active', labelEs: 'Activa' },
      { id: 'Completed', labelEn: 'Completed', labelEs: 'Completada' },
      { id: 'Cancelled', labelEn: 'Cancelled', labelEs: 'Cancelada' }
    ];

    const bodyHtml = `
      <div class="form-group">
        <label class="form-label">${isEs ? 'Nombre de la campaña' : 'Campaign Name'}</label>
        <input type="text" id="cmp-modal-name" value="${existing?.name || ''}" placeholder="${isEs ? 'Ej: Campaña 1 — Lanzamiento Inicial' : 'E.g., Campaign 1 — Initial Launch'}" autofocus />
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Objetivo concreto' : 'Campaign Goal'}</label>
        <input type="text" id="cmp-modal-goal" value="${existing?.goal || ''}" placeholder="${isEs ? 'Ej: Conseguir los primeros 100 usuarios activos' : 'E.g., Get first 100 users'}" />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #FFFFFF; display: inline-flex; align-items: center;">${icons.calendar(14)}</span>
            <span>${isEs ? 'Fecha de inicio' : 'Start Date'}</span>
          </label>
          <input type="date" id="cmp-modal-start" value="${existing?.start_date || ''}" class="mkt-date-input-white" />
        </div>
        <div class="form-group">
          <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #FFFFFF; display: inline-flex; align-items: center;">${icons.calendar(14)}</span>
            <span>${isEs ? 'Fecha de fin' : 'End Date'}</span>
          </label>
          <input type="date" id="cmp-modal-end" value="${existing?.end_date || ''}" class="mkt-date-input-white" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Estado' : 'Status'}</label>
        <select id="cmp-modal-status">
          ${campaignStatusDefs.map(st => `<option value="${st.id}" ${existing?.status === st.id ? 'selected' : ''}>${isEs ? st.labelEs : st.labelEn}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${isEs ? 'Descripción / Estrategia' : 'Description / Strategy'}</label>
        <textarea id="cmp-modal-desc" rows="3">${existing?.description || ''}</textarea>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" id="modal-cancel">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="modal-submit-cmp">${t('common.save')}</button>
    `;

    modalManager.open(existing ? (isEs ? 'Editar Campaña' : 'Edit Campaign') : (isEs ? 'Nueva Campaña de Marketing' : 'New Marketing Campaign'), bodyHtml, footerHtml);

    document.getElementById('modal-cancel')?.addEventListener('click', () => modalManager.close());
    document.getElementById('modal-submit-cmp')?.addEventListener('click', async () => {
      const name = (document.getElementById('cmp-modal-name') as HTMLInputElement).value.trim();
      const goal = (document.getElementById('cmp-modal-goal') as HTMLInputElement).value.trim();
      const start_date = (document.getElementById('cmp-modal-start') as HTMLInputElement).value;
      const end_date = (document.getElementById('cmp-modal-end') as HTMLInputElement).value;
      const status = (document.getElementById('cmp-modal-status') as HTMLSelectElement).value;
      const desc = (document.getElementById('cmp-modal-desc') as HTMLTextAreaElement).value.trim();
      if (!name) return;

      if (existing) {
        await window.nubo.marketing.updateCampaign(existing.id, { name, goal, start_date, end_date, status, description: desc });
      } else {
        const created = await window.nubo.marketing.createCampaign({ 
          projectId, 
          name, 
          goal, 
          start_date, 
          startDate: start_date,
          end_date, 
          endDate: end_date,
          status, 
          description: desc 
        });
        if (created?.id) {
          MarketingPage.selectedCampaignId = created.id;
          MarketingPage.viewMode = 'detail';
        }
      }
      modalManager.close();
      showToast(isEs ? 'Campaña guardada.' : 'Campaign saved.');
      if (onSaved) onSaved();
    });
  }

  // ==========================================================================
  // MARKETING & CAMPAIGNS TASKS KANBAN VIEW
  // ==========================================================================
  private static renderTasksView(
    container: HTMLElement,
    projectId: string,
    campaigns: MarketingCampaign[],
    tasks: Task[],
    counts: { all: number; todo: number; in_progress: number; done: number },
    completionRate: number,
    isEs: boolean
  ): void {
    const query = (MarketingPage.taskSearchQuery || '').trim().toLowerCase();
    const priority = MarketingPage.taskFilterPriority;
    const cmpFilter = MarketingPage.taskFilterCampaign;

    const filteredTasks = tasks.filter(task => {
      if (priority !== 'all' && task.priority !== priority) return false;
      if (cmpFilter !== 'all' && task.campaign_id !== cmpFilter) return false;
      if (query) {
        const matchesTitle = (task.title || '').toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        const matchesTags = Array.isArray(task.tags) && task.tags.some(t => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }
      return true;
    });

    const columns: Array<{ id: 'todo' | 'in_progress' | 'done'; title: string; color: string }> = [
      { id: 'todo', title: isEs ? 'Por hacer' : 'To Do', color: '#64748B' },
      { id: 'in_progress', title: isEs ? 'En progreso' : 'In Progress', color: '#F59E0B' },
      { id: 'done', title: isEs ? 'Completadas' : 'Done', color: '#10B981' }
    ];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: var(--space-md);">
        <!-- Tasks Header & Quick Stats -->
        <div class="mkt-view-header">
          <div class="mkt-view-title-group">
            <h2>${isEs ? 'Tareas de Campañas y Marketing' : 'Marketing & Campaign Tasks'}</h2>
            <p>${isEs ? 'Organiza y haz seguimiento a las tareas operativas, lanzamientos y acciones de difusión de tus campañas.' : 'Track operational tasks, launches, and promotional actions for your campaigns.'}</p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-primary btn-sm" id="btn-mkt-add-task">
              ${icons.plus(13)}
              <span>${isEs ? 'Añadir Tarea' : 'Add Task'}</span>
            </button>
          </div>
        </div>

        <!-- Task Count Pills & Progress Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div class="dev-task-pills-row" style="margin-bottom: 0;">
            <div class="dev-task-pill" id="mkt-pill-todo" style="cursor: pointer;" title="${isEs ? 'Filtrar por hacer' : 'Filter todo'}">
              <span class="task-dot todo"></span>
              <span class="task-pill-count">${counts.todo}</span>
              <span class="task-pill-name">${isEs ? 'Por hacer' : 'To do'}</span>
            </div>
            <div class="dev-task-pill" id="mkt-pill-in-progress" style="cursor: pointer;" title="${isEs ? 'Filtrar en progreso' : 'Filter in progress'}">
              <span class="task-dot in_progress"></span>
              <span class="task-pill-count">${counts.in_progress}</span>
              <span class="task-pill-name">${isEs ? 'En progreso' : 'In progress'}</span>
            </div>
            <div class="dev-task-pill" id="mkt-pill-done" style="cursor: pointer;" title="${isEs ? 'Filtrar completadas' : 'Filter done'}">
              <span class="task-dot done"></span>
              <span class="task-pill-count">${counts.done}</span>
              <span class="task-pill-name">${isEs ? 'Completadas' : 'Done'}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--text-secondary);">
            <span>${isEs ? 'Progreso:' : 'Progress:'} <strong>${completionRate}%</strong></span>
            <div style="width: 90px; height: 6px; background: var(--bg-surface-elevated); border-radius: 999px; overflow: hidden; border: 1px solid var(--border-subtle);">
              <div style="width: ${completionRate}%; height: 100%; background: var(--status-success); border-radius: 999px;"></div>
            </div>
          </div>
        </div>

        <!-- Toolbar: Search, Priority, Campaign & Scope -->
        <div class="dev-toolbar">
          <div class="dev-toolbar-left" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div class="dev-search-box">
              <span class="dev-search-icon">${icons.search(14)}</span>
              <input 
                type="text" 
                class="dev-search-input" 
                id="mkt-task-search-input" 
                placeholder="${isEs ? 'Buscar tareas de campañas...' : 'Search campaign tasks...'}" 
                value="${MarketingPage.taskSearchQuery}"
              />
              ${MarketingPage.taskSearchQuery ? `
                <button class="dev-search-clear" id="mkt-task-search-clear" title="Clear">
                  ${icons.close ? icons.close(13) : '✕'}
                </button>
              ` : ''}
            </div>

            <div class="dev-filter-group">
              <select class="dev-filter-select ${MarketingPage.taskFilterPriority !== 'all' ? 'active' : ''}" id="mkt-task-filter-priority">
                <option value="all">${isEs ? 'Prioridad: Todas' : 'Priority: All'}</option>
                <option value="urgent" ${MarketingPage.taskFilterPriority === 'urgent' ? 'selected' : ''}>🔴 ${isEs ? 'Urgente' : 'Urgent'}</option>
                <option value="high" ${MarketingPage.taskFilterPriority === 'high' ? 'selected' : ''}>🟠 ${isEs ? 'Alta' : 'High'}</option>
                <option value="medium" ${MarketingPage.taskFilterPriority === 'medium' ? 'selected' : ''}>🟡 ${isEs ? 'Media' : 'Medium'}</option>
                <option value="low" ${MarketingPage.taskFilterPriority === 'low' ? 'selected' : ''}>⚪ ${isEs ? 'Baja' : 'Low'}</option>
              </select>
            </div>

            ${campaigns.length > 0 ? `
              <div class="dev-filter-group">
                <select class="dev-filter-select ${MarketingPage.taskFilterCampaign !== 'all' ? 'active' : ''}" id="mkt-task-filter-campaign">
                  <option value="all">${isEs ? 'Todas las campañas' : 'All campaigns'}</option>
                  ${campaigns.map(c => `
                    <option value="${c.id}" ${MarketingPage.taskFilterCampaign === c.id ? 'selected' : ''}>🎯 ${c.name}</option>
                  `).join('')}
                </select>
              </div>
            ` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-secondary btn-sm" id="btn-toggle-mkt-task-scope">
              ${MarketingPage.onlyMarketingTasks ? (isEs ? 'Mostrar todas las tareas' : 'Show all tasks') : (isEs ? 'Solo tareas de marketing' : 'Marketing tasks only')}
            </button>
          </div>
        </div>

        <!-- Kanban Board -->
        <div class="dev-kanban-board">
          ${columns.map(col => {
            const colTasks = filteredTasks.filter(item => item.status === col.id);
            const isQuickAddActive = MarketingPage.activeQuickAddCol === col.id;

            return `
              <div class="kanban-column" data-status="${col.id}">
                <div class="kanban-column-header">
                  <div class="kanban-column-title-group">
                    <span class="kanban-column-indicator"></span>
                    <span class="kanban-column-title">${col.title}</span>
                    <span class="kanban-column-count">${colTasks.length}</span>
                  </div>
                  <button class="kanban-btn-add-column btn-mkt-add-task-col" data-col="${col.id}" title="${isEs ? 'Añadir tarea aquí' : 'Add task here'}">
                    ${icons.plus(14)}
                  </button>
                </div>

                <div class="kanban-column-body" data-status="${col.id}">
                  ${colTasks.length === 0 ? `
                    <div class="kanban-empty-state">
                      ${icons.columns ? icons.columns(28) : icons.target(28)}
                      <p>${isEs ? 'No hay tareas en esta columna' : 'No tasks in this column'}</p>
                      <button class="btn-add-inline-task btn-mkt-quick-add-col" data-col="${col.id}">
                        ${isEs ? 'Añadir tarea' : 'Add task'}
                      </button>
                    </div>
                  ` : colTasks.map(task => MarketingPage.renderMarketingKanbanCard(task, campaigns, isEs)).join('')}
                </div>

                <div class="kanban-column-footer">
                  ${isQuickAddActive ? `
                    <div class="kanban-quick-add-form" data-col="${col.id}">
                      <input 
                        type="text" 
                        class="kanban-quick-add-input" 
                        placeholder="${isEs ? '¿Qué hay que hacer?...' : 'What needs to be done?...'}" 
                        data-col="${col.id}"
                        autofocus
                      />
                      <div class="kanban-quick-add-actions">
                        <button class="btn btn-primary btn-sm btn-mkt-submit-quick-add" data-col="${col.id}">
                          ${icons.plus(12)}
                          <span>${isEs ? 'Añadir' : 'Add'}</span>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-mkt-cancel-quick-add" data-col="${col.id}">
                          ${isEs ? 'Cancelar' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ` : `
                    <button class="kanban-btn-quick-add btn-mkt-quick-add-col" data-col="${col.id}">
                      ${icons.plus(12)}
                      <span>${isEs ? 'Añadir tarea' : 'Add task'}</span>
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    MarketingPage.attachTaskEvents(container, projectId, campaigns, tasks, isEs);
  }

  // Render Kanban Card for Marketing
  private static renderMarketingKanbanCard(task: Task, campaigns: MarketingCampaign[], isEs: boolean): string {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
    const checklistTotal = task.checklist ? task.checklist.length : 0;
    const checklistDone = task.checklist ? task.checklist.filter(i => i.done).length : 0;
    const linkedCampaign = task.campaign_id ? campaigns.find(c => c.id === task.campaign_id) : null;

    return `
      <div 
        class="kanban-card" 
        data-task-id="${task.id}" 
        draggable="true"
      >
        <div class="kanban-card-top">
          <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
            <div class="kanban-card-type-tag ${task.type || 'task'}">
              <span>${task.type || 'task'}</span>
            </div>
            ${linkedCampaign ? `
              <span class="page-stats-badge" style="font-size: 9.5px; padding: 1px 5px; color: var(--accent-primary);" title="${isEs ? 'Campaña vinculada' : 'Linked campaign'}">
                🎯 ${linkedCampaign.name}
              </span>
            ` : ''}
          </div>
          <span class="kanban-priority-dot ${task.priority || 'medium'}" title="${task.priority || 'medium'}"></span>
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

  // Attach event handlers for Marketing Kanban Board
  private static attachTaskEvents(
    container: HTMLElement,
    projectId: string,
    campaigns: MarketingCampaign[],
    tasks: Task[],
    isEs: boolean
  ): void {
    const openNewTask = (initialCol?: 'todo' | 'in_progress' | 'done') => {
      modalManager.openNewTaskModal(projectId, initialCol || 'todo', () => {
        MarketingPage.render(container);
      });
    };

    container.querySelector('#btn-mkt-add-task')?.addEventListener('click', () => openNewTask());

    // Task scope toggle
    container.querySelector('#btn-toggle-mkt-task-scope')?.addEventListener('click', () => {
      MarketingPage.onlyMarketingTasks = !MarketingPage.onlyMarketingTasks;
      MarketingPage.render(container);
    });

    // Task count pills as quick filters
    container.querySelector('#mkt-pill-todo')?.addEventListener('click', () => {
      const colEl = container.querySelector('.kanban-column[data-status="todo"]');
      colEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    container.querySelector('#mkt-pill-in-progress')?.addEventListener('click', () => {
      const colEl = container.querySelector('.kanban-column[data-status="in_progress"]');
      colEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    container.querySelector('#mkt-pill-done')?.addEventListener('click', () => {
      const colEl = container.querySelector('.kanban-column[data-status="done"]');
      colEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Search and filters
    const searchInput = container.querySelector('#mkt-task-search-input') as HTMLInputElement | null;
    const prioritySelect = container.querySelector('#mkt-task-filter-priority') as HTMLSelectElement | null;
    const campaignSelect = container.querySelector('#mkt-task-filter-campaign') as HTMLSelectElement | null;
    const clearBtn = container.querySelector('#mkt-task-search-clear') as HTMLButtonElement | null;

    searchInput?.addEventListener('input', () => {
      MarketingPage.taskSearchQuery = searchInput.value;
      const q = searchInput.value.trim().toLowerCase();
      const p = prioritySelect?.value || 'all';
      const c = campaignSelect?.value || 'all';

      container.querySelectorAll<HTMLElement>('.kanban-card').forEach(card => {
        const taskId = card.getAttribute('data-task-id');
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        let visible = true;
        if (p !== 'all' && task.priority !== p) visible = false;
        if (c !== 'all' && task.campaign_id !== c) visible = false;
        if (q) {
          const mTitle = (task.title || '').toLowerCase().includes(q);
          const mDesc = (task.description || '').toLowerCase().includes(q);
          const mTags = Array.isArray(task.tags) && task.tags.some(t => t.toLowerCase().includes(q));
          if (!mTitle && !mDesc && !mTags) visible = false;
        }
        card.style.display = visible ? '' : 'none';
      });
    });

    clearBtn?.addEventListener('click', () => {
      MarketingPage.taskSearchQuery = '';
      MarketingPage.render(container);
    });

    prioritySelect?.addEventListener('change', () => {
      MarketingPage.taskFilterPriority = prioritySelect.value;
      MarketingPage.render(container);
    });

    campaignSelect?.addEventListener('change', () => {
      MarketingPage.taskFilterCampaign = campaignSelect.value;
      MarketingPage.render(container);
    });

    // Quick Add
    const submitQuickAdd = async (col: 'todo' | 'in_progress' | 'done') => {
      const input = container.querySelector(`.kanban-quick-add-input[data-col="${col}"]`) as HTMLInputElement | null;
      const title = input?.value.trim();
      if (title) {
        await window.nubo.tasks.create({
          project_id: projectId,
          campaign_id: MarketingPage.taskFilterCampaign !== 'all' ? MarketingPage.taskFilterCampaign : (MarketingPage.selectedCampaignId || undefined),
          title,
          status: col,
          priority: 'medium',
          type: 'task',
          tags: ['marketing', 'campaña']
        });
        showToast(isEs ? 'Tarea creada con éxito' : 'Task created successfully');
        MarketingPage.activeQuickAddCol = null;
        MarketingPage.render(container);
      }
    };

    container.querySelectorAll('.btn-mkt-add-task-col, .btn-mkt-quick-add-col').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const col = (e.currentTarget as HTMLElement).getAttribute('data-col') as any;
        MarketingPage.activeQuickAddCol = col;
        MarketingPage.render(container).then(() => {
          const quickInput = container.querySelector(`.kanban-quick-add-input[data-col="${col}"]`) as HTMLInputElement | null;
          quickInput?.focus();
        });
      });
    });

    container.querySelectorAll('.btn-mkt-cancel-quick-add').forEach(btn => {
      btn.addEventListener('click', () => {
        MarketingPage.activeQuickAddCol = null;
        MarketingPage.render(container);
      });
    });

    container.querySelectorAll('.btn-mkt-submit-quick-add').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const col = ((e.currentTarget as HTMLElement).getAttribute('data-col') || 'todo') as any;
        await submitQuickAdd(col);
      });
    });

    container.querySelectorAll('.kanban-quick-add-input').forEach(inputEl => {
      const col = ((inputEl as HTMLElement).getAttribute('data-col') || 'todo') as any;
      inputEl.addEventListener('keydown', async (e) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter') {
          ke.preventDefault();
          await submitQuickAdd(col);
        } else if (ke.key === 'Escape') {
          MarketingPage.activeQuickAddCol = null;
          MarketingPage.render(container);
        }
      });
    });

    // Drag and drop for tasks
    container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const dt = (e as DragEvent).dataTransfer;
        const id = card.getAttribute('data-task-id');
        if (id && dt) {
          MarketingPage.draggedTaskId = id;
          dt.setData('text/plain', id);
        }
      });

      card.addEventListener('click', () => {
        const id = card.getAttribute('data-task-id');
        const task = tasks.find(t => t.id === id);
        if (task) {
          modalManager.openEditTaskModal(task, () => {
            MarketingPage.render(container);
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
        const taskId = MarketingPage.draggedTaskId || (e as DragEvent).dataTransfer?.getData('text/plain');
        const targetStatus = colBody.getAttribute('data-status') as any;

        if (taskId && targetStatus) {
          const task = tasks.find(t => t.id === taskId);
          if (task && task.status !== targetStatus) {
            await window.nubo.tasks.update(taskId, { status: targetStatus });
            showToast(isEs ? 'Estado de tarea actualizado' : 'Task status updated');
            MarketingPage.render(container);
          }
        }
      });
    });
  }
}

