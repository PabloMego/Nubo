import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';
import { modalManager } from '../components/modal';
import { showToast } from '../components/toast';
import { AppSettings, GitHubAccount, ConfiguredEditor } from '../scripts/types';
import { t, getLanguage } from '../scripts/i18n';

type SettingsTab = 'general' | 'github' | 'editor' | 'storage' | 'about';

export class SettingsPage {
  private static activeTab: SettingsTab = 'general';

  public static async render(container: HTMLElement): Promise<void> {
    const settings: AppSettings = await window.nubo.settings.get();
    let githubAccount: GitHubAccount | null = null;
    try {
      if (window.nubo?.github?.getAccount) {
        githubAccount = await window.nubo.github.getAccount();
      }
    } catch {
      githubAccount = settings.githubAccount || null;
    }

    const currentProj = appStore.getState().currentProject;
    const currentLang = getLanguage();
    const isEs = currentLang === 'es';
    const activeEditor = settings.configuredEditor || {
      id: 'antigravity',
      name: 'Antigravity IDE',
      command: 'antigravity-ide'
    };

    container.innerHTML = `
      <div class="settings-page-wrapper">
        <!-- Hero Header -->
        <div class="app-page-hero">
          <div class="page-hero-left">
            <div class="page-title-row">
              <h2>${t('settings.title')}</h2>
              <span class="page-stats-badge">v${settings.version || '1.0.0'}</span>
              <span class="page-stats-badge"><span class="pulse-dot"></span> Local First</span>
              ${githubAccount ? `
                <button class="page-stats-badge" id="btn-hero-gh-pill" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border-subtle); background: var(--bg-surface);">
                  <span class="pulse-dot" style="background: #10b981;"></span>
                  <span>🐙 @${githubAccount.username}</span>
                </button>
              ` : ''}
            </div>
            <p class="page-subtitle">${t('settings.subtitle')}</p>
          </div>
        </div>

        <!-- Navigation Tabs Bar -->
        <nav class="settings-nav-bar" role="tablist">
          <button class="settings-tab-btn ${this.activeTab === 'general' ? 'active' : ''}" data-tab="general" role="tab">
            ${icons.settings(15)}
            <span>${t('settings.tabGeneral')}</span>
          </button>

          <button class="settings-tab-btn ${this.activeTab === 'github' ? 'active' : ''}" data-tab="github" role="tab">
            ${icons.github(15)}
            <span>${t('settings.tabGithub')}</span>
            ${githubAccount ? `<span class="pulse-dot" style="background: #10b981; width: 6px; height: 6px; margin-left: 2px;" title="${isEs ? 'Cuenta conectada' : 'Connected'}"></span>` : ''}
          </button>

          <button class="settings-tab-btn ${this.activeTab === 'editor' ? 'active' : ''}" data-tab="editor" role="tab">
            ${icons.code(15)}
            <span>${t('settings.tabEditor')}</span>
          </button>

          <button class="settings-tab-btn ${this.activeTab === 'storage' ? 'active' : ''}" data-tab="storage" role="tab">
            ${icons.folder(15)}
            <span>${t('settings.tabStorage')}</span>
          </button>

          <button class="settings-tab-btn ${this.activeTab === 'about' ? 'active' : ''}" data-tab="about" role="tab">
            ${icons.info(15)}
            <span>${t('settings.tabAbout')}</span>
          </button>
        </nav>

        <!-- Tab Content Panes -->
        <div class="settings-sections-group">

          <!-- 1. TAB: GENERAL -->
          <div id="tab-pane-general" class="settings-tab-pane" style="${this.activeTab === 'general' ? 'display: flex; flex-direction: column; gap: var(--space-lg);' : 'display: none;'}">
            <!-- Language Card -->
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="settings-card-icon-bubble" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">
                  ${icons.globe(20)}
                </div>
                <div>
                  <h3 class="settings-card-title">${t('settings.language')}</h3>
                  <p class="settings-card-subtitle">${isEs ? 'Selecciona el idioma principal de la interfaz y las notificaciones' : 'Choose primary interface language and notifications'}</p>
                </div>
              </div>

              <div class="settings-choice-grid">
                <div class="settings-choice-card ${currentLang === 'es' ? 'active' : ''}" data-lang="es">
                  <div class="settings-choice-top">
                    <span class="settings-choice-icon">🇪🇸</span>
                    <span class="settings-choice-check">${icons.check(11)}</span>
                  </div>
                  <div class="settings-choice-title">${t('settings.langEs')}</div>
                  <div class="settings-choice-desc">Interfaz y textos completamente en español (Predeterminado).</div>
                </div>

                <div class="settings-choice-card ${currentLang === 'en' ? 'active' : ''}" data-lang="en">
                  <div class="settings-choice-top">
                    <span class="settings-choice-icon">🇬🇧</span>
                    <span class="settings-choice-check">${icons.check(11)}</span>
                  </div>
                  <div class="settings-choice-title">${t('settings.langEn')}</div>
                  <div class="settings-choice-desc">English international interface for global development teams.</div>
                </div>
              </div>
            </div>

            <!-- Appearance Theme Card -->
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="settings-card-icon-bubble" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
                  ${icons.palette(20)}
                </div>
                <div>
                  <h3 class="settings-card-title">${t('settings.appearance')}</h3>
                  <p class="settings-card-subtitle">${isEs ? 'Personaliza el tema visual y la estética de Nubo' : 'Customize interface theme and aesthetics'}</p>
                </div>
              </div>

              <div class="settings-choice-grid">
                <div class="settings-choice-card ${settings.theme !== 'dark' ? 'active' : ''}" data-theme-val="light">
                  <div class="settings-choice-top">
                    <span class="settings-choice-icon">☀️</span>
                    <span class="settings-choice-check">${icons.check(11)}</span>
                  </div>
                  <div class="settings-choice-title">${t('settings.themeLight')}</div>
                  <div class="settings-choice-desc">${isEs ? 'Fondo claro con alto contraste, bordes nítidos y lectura óptima.' : 'Crisp light background with high contrast and optimal legibility.'}</div>
                </div>

                <div class="settings-choice-card ${settings.theme === 'dark' ? 'active' : ''}" data-theme-val="dark">
                  <div class="settings-choice-top">
                    <span class="settings-choice-icon">🌙</span>
                    <span class="settings-choice-check">${icons.check(11)}</span>
                  </div>
                  <div class="settings-choice-title">${t('settings.themeDark')}</div>
                  <div class="settings-choice-desc">${isEs ? 'Tonos oscuros diseñados para sesiones de noche y descanso visual.' : 'Sleek dark tones designed for evening focus and reduced eye strain.'}</div>
                </div>
              </div>
            </div>

            <!-- Windows Startup Card -->
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="settings-card-icon-bubble" style="background: rgba(16, 185, 129, 0.1); color: #059669;">
                  ${icons.cloud(20)}
                </div>
                <div>
                  <h3 class="settings-card-title">${isEs ? 'Sistema & Comportamiento' : 'System & Behavior'}</h3>
                  <p class="settings-card-subtitle">${isEs ? 'Ajustes de inicio del sistema operativo y ventanas' : 'Operating system startup settings and window behavior'}</p>
                </div>
              </div>

              <div class="settings-toggle-row">
                <div class="settings-toggle-label">
                  <span class="settings-toggle-title">${t('settings.startWindows')}</span>
                  <span class="settings-toggle-sub">${isEs ? 'Nubo arrancará en segundo plano listo para abrirse al encender tu PC.' : 'Nubo starts in background ready to launch when your PC turns on.'}</span>
                </div>
                <input type="checkbox" id="setting-start-windows" ${settings.startWithWindows ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;" />
              </div>
            </div>
          </div>

          <!-- 2. TAB: GITHUB & CUENTAS -->
          <div id="tab-pane-github" class="settings-tab-pane" style="${this.activeTab === 'github' ? 'display: flex; flex-direction: column; gap: var(--space-lg);' : 'display: none;'}">
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="settings-card-icon-bubble" style="background: #24292f; color: #ffffff;">
                  ${icons.github(20)}
                </div>
                <div>
                  <h3 class="settings-card-title">${t('settings.githubTitle')}</h3>
                  <p class="settings-card-subtitle">${t('settings.githubDesc')}</p>
                </div>
              </div>

              ${githubAccount ? `
                <!-- Connected GitHub Profile -->
                <div class="github-profile-card">
                  <div class="github-profile-left">
                    <div class="github-profile-avatar">
                      <img 
                        src="${githubAccount.avatar_url || 'https://github.com/' + githubAccount.username + '.png'}" 
                        alt="${githubAccount.username}"
                        onerror="this.style.display='none'; this.parentElement.innerHTML='${icons.github(24)}';" 
                      />
                    </div>
                    <div class="github-profile-info">
                      <div class="github-profile-name-row">
                        <span class="github-profile-username">@${githubAccount.username}</span>
                        <span class="settings-tab-badge">✓ ${isEs ? 'Sesión activa' : 'Active session'}</span>
                      </div>
                      ${githubAccount.name ? `<div class="github-profile-name">${githubAccount.name}</div>` : ''}
                      ${githubAccount.email ? `<div class="github-profile-email">${githubAccount.email}</div>` : ''}
                    </div>
                  </div>

                  <div class="github-profile-actions">
                    <button class="btn btn-secondary btn-sm" id="btn-settings-open-gh-profile" title="Abrir perfil en GitHub.com">
                      ${icons.external(12)}
                      <span>${t('settings.githubOpenProfile')}</span>
                    </button>
                    <button class="btn btn-secondary btn-sm" id="btn-settings-switch-gh">
                      ${icons.github(13)}
                      <span>${t('settings.githubSwitchBtn')}</span>
                    </button>
                    <button class="btn btn-ghost btn-sm btn-icon danger" id="btn-settings-disconnect-gh" title="${t('settings.githubDisconnectBtn')}">
                      ${icons.trash(14)}
                    </button>
                  </div>
                </div>
              ` : `
                <!-- Empty State (No account connected) -->
                <div class="github-empty-card">
                  <div class="github-empty-icon">
                    ${icons.github(24)}
                  </div>
                  <h4 class="github-empty-title">${t('settings.githubNotConnected')}</h4>
                  <p class="github-empty-desc">
                    ${isEs
                      ? 'Conecta tu cuenta de GitHub mediante un Token de Acceso Personal (PAT) para sincronizar, subir (push) y descargar (pull) proyectos en cualquier equipo sin complicaciones.'
                      : 'Connect your GitHub account with a Personal Access Token (PAT) to push and pull repositories smoothly without Git credential issues.'}
                  </p>
                  <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center; margin-top: 4px;">
                    <button class="btn btn-primary" id="btn-settings-connect-gh" style="display: inline-flex; align-items: center; gap: 8px;">
                      ${icons.github(14)}
                      <span>${t('settings.githubConnectBtn')}</span>
                    </button>
                    <button class="btn btn-secondary" id="btn-settings-token-generator" style="display: inline-flex; align-items: center; gap: 6px;">
                      ${icons.external(13)}
                      <span>${t('settings.githubTokenHelper')} (1 Clic)</span>
                    </button>
                  </div>
                </div>
              `}

              <!-- Independence Note Box -->
              <div style="margin-top: var(--space-md); padding: 14px 16px; background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border: 1px solid var(--border-subtle); border-radius: var(--radius-md, 8px); font-size: 12.5px; line-height: 1.5; color: var(--text-secondary);">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
                  ${icons.info(15)}
                  <span>${isEs ? 'Aislamiento total por carpetas y proyectos' : 'Total folder & project isolation'}</span>
                </div>
                <span>
                  ${isEs
                    ? 'Cada proyecto o carpeta (Desarrollo y Sitio Web) cuenta con su propio repositorio Git aislado. Tu cuenta de GitHub autentica todas las operaciones de subida y descarga de forma segura sin interferir entre diferentes carpetas ni modificar tus credenciales globales del sistema operativo.'
                    : 'Each project and folder (Development and Website) maintains its own isolated Git repository. Your GitHub account authenticates pushes and pulls cleanly without interfering between folders or altering global OS credentials.'}
                </span>
              </div>
            </div>
          </div>

          <!-- 3. TAB: EDITOR DE CÓDIGO -->
          <div id="tab-pane-editor" class="settings-tab-pane" style="${this.activeTab === 'editor' ? 'display: flex; flex-direction: column; gap: var(--space-lg);' : 'display: none;'}">
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="settings-card-icon-bubble" style="background: rgba(14, 165, 233, 0.1); color: #0284c7;">
                  ${icons.code(20)}
                </div>
                <div>
                  <h3 class="settings-card-title">${t('settings.editorTitle')}</h3>
                  <p class="settings-card-subtitle">${t('settings.editorDesc')}</p>
                </div>
              </div>

              <!-- Choice Cards for Editors -->
              <div class="settings-choice-grid">
                <!-- Antigravity IDE -->
                <div class="settings-choice-card ${activeEditor.id === 'antigravity' ? 'active' : ''}" data-editor-id="antigravity" data-editor-name="Antigravity IDE" data-editor-cmd="antigravity-ide">
                  <div class="settings-choice-top">
                    <span class="settings-choice-icon">🚀</span>
                    <span class="settings-choice-check">${icons.check(11)}</span>
                  </div>
                  <div class="settings-choice-title">Antigravity IDE</div>
                  <div class="settings-choice-desc">${isEs ? 'Editor nativo con agentes de IA de última generación integrados.' : 'Native environment with next-gen AI coding agents.'}</div>
                </div>

                <!-- Visual Studio Code -->
                <div class="settings-choice-card ${activeEditor.id === 'vscode' ? 'active' : ''}" data-editor-id="vscode" data-editor-name="Visual Studio Code" data-editor-cmd="code">
                  <div class="settings-choice-top">
                    <span class="settings-choice-icon">💻</span>
                    <span class="settings-choice-check">${icons.check(11)}</span>
                  </div>
                  <div class="settings-choice-title">Visual Studio Code</div>
                  <div class="settings-choice-desc">${isEs ? 'El editor líder de Microsoft ejecutado mediante el comando code.' : 'Leading code editor by Microsoft launched via code command.'}</div>
                </div>

                <!-- Cursor -->
                <div class="settings-choice-card ${activeEditor.id === 'cursor' ? 'active' : ''}" data-editor-id="cursor" data-editor-name="Cursor IDE" data-editor-cmd="cursor">
                  <div class="settings-choice-top">
                    <span class="settings-choice-icon">⚡</span>
                    <span class="settings-choice-check">${icons.check(11)}</span>
                  </div>
                  <div class="settings-choice-title">Cursor IDE</div>
                  <div class="settings-choice-desc">${isEs ? 'Editor centrado en IA ejecutado mediante el comando cursor.' : 'AI-first code editor launched via cursor command.'}</div>
                </div>

                <!-- Custom -->
                <div class="settings-choice-card ${activeEditor.id === 'custom' ? 'active' : ''}" data-editor-id="custom" data-editor-name="Editor Personalizado" data-editor-cmd="${activeEditor.id === 'custom' ? activeEditor.command : 'subl'}">
                  <div class="settings-choice-top">
                    <span class="settings-choice-icon">⚙️</span>
                    <span class="settings-choice-check">${icons.check(11)}</span>
                  </div>
                  <div class="settings-choice-title">${isEs ? 'Editor Personalizado' : 'Custom Editor'}</div>
                  <div class="settings-choice-desc">${isEs ? 'Sublime Text, Zed, Neovim, WebStorm o cualquier ejecutable en PATH.' : 'Sublime Text, Zed, Neovim, WebStorm or any executable in PATH.'}</div>
                </div>
              </div>

              <!-- Custom Editor Input (visible when custom selected) -->
              <div id="custom-editor-box" style="${activeEditor.id === 'custom' ? 'display: block;' : 'display: none;'} margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--border-subtle);">
                <label class="form-label" style="font-weight: 600; margin-bottom: 6px;">
                  ${t('settings.editorCustomPrompt')}
                </label>
                <div style="display: flex; gap: 8px;">
                  <input 
                    type="text" 
                    id="input-custom-editor-cmd" 
                    value="${activeEditor.id === 'custom' ? activeEditor.command : 'subl'}" 
                    placeholder="subl, zed, nvim, idea..." 
                    style="flex: 1; font-family: monospace;" 
                  />
                  <button class="btn btn-primary" id="btn-save-custom-editor">
                    ${icons.check(13)}
                    <span>${t('common.save')}</span>
                  </button>
                </div>
                <span class="form-hint" style="margin-top: 4px;">
                  ${isEs ? 'Introduce el comando ejecutable registrado en tu variable de entorno PATH.' : 'Enter the executable command registered in your system PATH.'}
                </span>
              </div>
            </div>
          </div>

          <!-- 4. TAB: ALMACENAMIENTO & RESPALDOS -->
          <div id="tab-pane-storage" class="settings-tab-pane" style="${this.activeTab === 'storage' ? 'display: flex; flex-direction: column; gap: var(--space-lg);' : 'display: none;'}">
            <!-- Storage Directory Card -->
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="settings-card-icon-bubble" style="background: rgba(245, 158, 11, 0.1); color: #d97706;">
                  ${icons.folder(20)}
                </div>
                <div>
                  <h3 class="settings-card-title">${t('settings.storagePath')}</h3>
                  <p class="settings-card-subtitle">${t('settings.storageHint')}</p>
                </div>
              </div>

              <div class="settings-storage-row">
                <input type="text" id="setting-storage-path" value="${settings.storagePath}" class="settings-storage-input" readonly />
                <button class="btn btn-secondary" id="btn-browse-storage">
                  ${icons.folder(14)}
                  <span>${t('settings.browse')}</span>
                </button>
                <button class="btn btn-secondary" id="btn-open-storage-dir" title="Abrir carpeta en el Explorador de Windows">
                  ${icons.external(13)}
                  <span>${isEs ? 'Abrir' : 'Open'}</span>
                </button>
              </div>
            </div>

            <!-- Backups & Import/Export -->
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="settings-card-icon-bubble" style="background: rgba(16, 185, 129, 0.1); color: #059669;">
                  ${icons.upload(20)}
                </div>
                <div>
                  <h3 class="settings-card-title">${t('settings.backups')}</h3>
                  <p class="settings-card-subtitle">${t('settings.backupsDesc')}</p>
                </div>
              </div>

              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                ${currentProj ? `
                  <button class="btn btn-secondary" id="btn-export-project">
                    ${icons.upload(14)}
                    <span>${t('settings.exportProject', { name: currentProj.name })}</span>
                  </button>
                ` : ''}

                <button class="btn btn-secondary" id="btn-import-project">
                  ${icons.plus(14)}
                  <span>${t('settings.importProject')}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 5. TAB: ACERCA DE NUBO -->
          <div id="tab-pane-about" class="settings-tab-pane" style="${this.activeTab === 'about' ? 'display: flex; flex-direction: column; gap: var(--space-lg);' : 'display: none;'}">
            <div class="settings-card">
              <div class="settings-card-header">
                <div class="settings-card-icon-bubble" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">
                  ${icons.info(20)}
                </div>
                <div>
                  <h3 class="settings-card-title">${t('settings.about')}</h3>
                  <p class="settings-card-subtitle">Nubo Desktop v${settings.version || '1.0.0'} • Local First Architecture</p>
                </div>
              </div>

              <div class="settings-about-grid">
                <div class="settings-about-item">
                  <span class="settings-about-label">${t('settings.version')}</span>
                  <span class="settings-about-val">v${settings.version || '1.0.0'}</span>
                </div>
                <div class="settings-about-item">
                  <span class="settings-about-label">${t('settings.platform')}</span>
                  <span class="settings-about-val">Electron 34 + TypeScript + Vite</span>
                </div>
                <div class="settings-about-item">
                  <span class="settings-about-label">${t('settings.database')}</span>
                  <span class="settings-about-val">SQLite WASM (sql.js)</span>
                </div>
                <div class="settings-about-item">
                  <span class="settings-about-label">${isEs ? 'Privacidad' : 'Privacy'}</span>
                  <span class="settings-about-val">${isEs ? '100% Local en disco' : '100% Local on disk'}</span>
                </div>
              </div>

              <div style="margin-top: var(--space-md); padding: 14px; background: var(--bg-surface-elevated, rgba(255,255,255,0.03)); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">${t('settings.philosophy')}</strong>
                ${t('settings.philosophyDesc')}
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    SettingsPage.bindEvents(container, settings, githubAccount);
  }

  private static bindEvents(container: HTMLElement, settings: AppSettings, githubAccount: GitHubAccount | null): void {
    const isEs = getLanguage() === 'es';

    // 1. Tab Navigation switching
    container.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab as SettingsTab;
        if (!tab || tab === SettingsPage.activeTab) return;

        SettingsPage.activeTab = tab;

        // Update tab buttons active class
        container.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle pane visibility
        container.querySelectorAll('.settings-tab-pane').forEach(pane => {
          (pane as HTMLElement).style.display = 'none';
        });

        const activePane = container.querySelector(`#tab-pane-${tab}`) as HTMLElement;
        if (activePane) {
          activePane.style.display = 'flex';
          activePane.style.flexDirection = 'column';
          activePane.style.gap = 'var(--space-lg)';
        }
      });
    });

    // 2. Hero GH pill click jumps to github tab
    container.querySelector('#btn-hero-gh-pill')?.addEventListener('click', () => {
      const ghTabBtn = container.querySelector('.settings-tab-btn[data-tab="github"]') as HTMLElement;
      ghTabBtn?.click();
    });

    // 3. Language cards
    container.querySelectorAll('.settings-choice-card[data-lang]').forEach(card => {
      card.addEventListener('click', async () => {
        const lang = (card as HTMLElement).dataset.lang as 'es' | 'en';
        if (!lang) return;
        await appStore.setLanguage(lang);
        showToast(lang === 'es' ? 'Idioma cambiado a Español.' : 'Language changed to English.');
        // Re-render settings page to reflect strings
        SettingsPage.render(container);
      });
    });

    // 4. Appearance theme cards
    container.querySelectorAll('.settings-choice-card[data-theme-val]').forEach(card => {
      card.addEventListener('click', async () => {
        const theme = (card as HTMLElement).dataset.themeVal as 'light' | 'dark';
        if (!theme) return;
        await window.nubo.settings.update({ theme });
        if (theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }

        container.querySelectorAll('.settings-choice-card[data-theme-val]').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        showToast(theme === 'dark' ? (isEs ? 'Modo oscuro activado.' : 'Dark mode enabled.') : (isEs ? 'Modo claro activado.' : 'Light mode enabled.'));
      });
    });

    // 5. Windows Auto-start toggle
    container.querySelector('#setting-start-windows')?.addEventListener('change', async (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      await window.nubo.settings.update({ startWithWindows: checked });
      showToast(checked 
        ? (isEs ? 'Inicio automático con Windows activado.' : 'Auto-start with Windows enabled.') 
        : (isEs ? 'Inicio automático desactivado.' : 'Auto-start disabled.')
      );
    });

    // 6. GitHub Actions
    container.querySelector('#btn-settings-connect-gh')?.addEventListener('click', () => {
      modalManager.openGitHubAccountModal(async () => {
        await SettingsPage.render(container);
      });
    });

    container.querySelector('#btn-settings-switch-gh')?.addEventListener('click', () => {
      modalManager.openGitHubAccountModal(async () => {
        await SettingsPage.render(container);
      });
    });

    container.querySelector('#btn-settings-token-generator')?.addEventListener('click', async () => {
      if (window.nubo?.github?.openTokenGenerator) {
        await window.nubo.github.openTokenGenerator();
      } else {
        window.open('https://github.com/settings/tokens/new?description=Nubo%20Desktop&scopes=repo,read:user,user:email', '_blank');
      }
    });

    container.querySelector('#btn-settings-open-gh-profile')?.addEventListener('click', () => {
      if (githubAccount?.username) {
        window.open(`https://github.com/${githubAccount.username}`, '_blank');
      }
    });

    container.querySelector('#btn-settings-disconnect-gh')?.addEventListener('click', async () => {
      if (confirm(isEs ? '¿Cerrar sesión de GitHub en Nubo?' : 'Sign out of GitHub in Nubo?')) {
        if (window.nubo?.github?.disconnectAccount) {
          await window.nubo.github.disconnectAccount();
        }
        showToast(isEs ? 'Sesión de GitHub cerrada.' : 'Signed out of GitHub.');
        await SettingsPage.render(container);
      }
    });

    // 7. Code Editor Selector
    const customEditorBox = container.querySelector('#custom-editor-box') as HTMLElement;
    const customInput = container.querySelector('#input-custom-editor-cmd') as HTMLInputElement;

    container.querySelectorAll('.settings-choice-card[data-editor-id]').forEach(card => {
      card.addEventListener('click', async () => {
        const editorId = (card as HTMLElement).dataset.editorId;
        const editorName = (card as HTMLElement).dataset.editorName || 'Editor';
        const editorCmd = (card as HTMLElement).dataset.editorCmd || 'code';

        container.querySelectorAll('.settings-choice-card[data-editor-id]').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        if (editorId === 'custom') {
          if (customEditorBox) customEditorBox.style.display = 'block';
          customInput?.focus();
        } else {
          if (customEditorBox) customEditorBox.style.display = 'none';
          const newEditor: ConfiguredEditor = {
            id: editorId!,
            name: editorName,
            command: editorCmd
          };
          await window.nubo.settings.update({ configuredEditor: newEditor });
          showToast(isEs ? `Editor configurado: ${editorName}` : `Configured editor: ${editorName}`);
          
          // Update the tab badge in navigation
          const badge = container.querySelector('.settings-tab-btn[data-tab="editor"] .settings-tab-badge');
          if (badge) badge.textContent = editorName;
        }
      });
    });

    container.querySelector('#btn-save-custom-editor')?.addEventListener('click', async () => {
      const cmd = customInput ? customInput.value.trim() : '';
      if (!cmd) {
        showToast(isEs ? 'Por favor introduce un comando válido.' : 'Please enter a valid command.', 'error');
        return;
      }
      const newEditor: ConfiguredEditor = {
        id: 'custom',
        name: `Personalizado (${cmd})`,
        command: cmd
      };
      await window.nubo.settings.update({ configuredEditor: newEditor });
      showToast(isEs ? `Comando de editor guardado: ${cmd}` : `Custom editor command saved: ${cmd}`);
      
      const badge = container.querySelector('.settings-tab-btn[data-tab="editor"] .settings-tab-badge');
      if (badge) badge.textContent = newEditor.name;
    });

    // 8. Storage Actions
    container.querySelector('#btn-browse-storage')?.addEventListener('click', async () => {
      const selected = await window.nubo.settings.selectDirectory();
      if (selected) {
        await window.nubo.settings.update({ storagePath: selected });
        const input = container.querySelector('#setting-storage-path') as HTMLInputElement;
        if (input) input.value = selected;
        showToast(t('settings.toastStorage'));
      }
    });

    container.querySelector('#btn-open-storage-dir')?.addEventListener('click', async () => {
      const currentStorage = (container.querySelector('#setting-storage-path') as HTMLInputElement)?.value || settings.storagePath;
      if (currentStorage && window.nubo?.development?.openFolder) {
        await window.nubo.development.openFolder(currentStorage);
      }
    });

    // 9. Export & Import Project
    container.querySelector('#btn-export-project')?.addEventListener('click', async () => {
      const currentProj = appStore.getState().currentProject;
      if (!currentProj) return;

      const res = await window.nubo.backup.export(currentProj.id);
      if (res.success) {
        showToast(isEs ? `Proyecto exportado a ${res.filePath}` : `Project exported to ${res.filePath}`);
      }
    });

    container.querySelector('#btn-import-project')?.addEventListener('click', async () => {
      const res = await window.nubo.backup.import();
      if (res.success && res.project) {
        showToast(isEs ? `Proyecto "${res.project.name}" importado con éxito.` : `Project "${res.project.name}" imported successfully.`);
        const all = await window.nubo.projects.getAll();
        appStore.setProjects(all);
        appStore.setCurrentProject(res.project);
        appStore.setActiveSection('overview');
      }
    });
  }
}
