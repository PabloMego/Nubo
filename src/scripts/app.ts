import '../styles/global.css';
import '../styles/sidebar.css';
import '../styles/dashboard.css';
import '../styles/projects.css';
import '../styles/files.css';
import '../styles/brand.css';
import '../styles/marketing.css';
import '../styles/content.css';
import '../styles/notes.css';
import '../styles/modal.css';
import '../styles/development.css';
import '../styles/website.css';
import '../styles/guide.css';
import '../styles/settings.css';

import { appStore } from './store';
import { Sidebar } from '../components/sidebar';
import { Header } from '../components/header';
import { CommandPalette } from '../components/command-palette';
import { NavigationRouter } from './navigation';

import { installBrowserFallback } from './mock-api';

async function initApp() {
  console.log('[Nubo] Initializing desktop app...');
  installBrowserFallback();

  // 1. Fetch settings & apply theme
  if (window.nubo?.settings) {
    const settings = await window.nubo.settings.get();
    appStore.setSettings(settings);

    if (settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  // 2. Fetch projects
  if (window.nubo?.projects) {
    let projects = await window.nubo.projects.getAll();

    // If first run and zero projects exist, create an initial demo project "Nubo"
    if (projects.length === 0) {
      console.log('[Nubo] Creating starter project...');
      const starter = await window.nubo.projects.create({
        name: 'Nubo',
        description: 'SaaS project management workspace para makers y desarrolladores.',
        website: 'https://nubo.app',
        github: 'nubo/workspace',
        color: '#111111'
      });

      // Add a couple starter marketing and content ideas as requested in spec
      await window.nubo.marketing.create({
        projectId: starter.id,
        channel: 'TikTok',
        title: 'I built a project manager for developers',
        status: 'Idea'
      });
      await window.nubo.marketing.create({
        projectId: starter.id,
        channel: 'TikTok',
        title: 'Why I stopped using Notion',
        status: 'Idea'
      });
      await window.nubo.marketing.create({
        projectId: starter.id,
        channel: 'YouTube',
        title: 'Building Nubo in public - Episode 1',
        status: 'Draft'
      });

      // Add starter note
      await window.nubo.notes.create({
        projectId: starter.id,
        title: 'Roadmap & Visión de Nubo',
        content: `# Nubo Workspace

El hogar de todo tu proyecto digital.

## Principios
- Minimalista y elegante
- Rápido y personal
- Control absoluto sobre archivos y tareas
`
      });

      projects = await window.nubo.projects.getAll();
    }

    appStore.setProjects(projects);
  }

  // 3. Initialize components
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) new Sidebar(sidebarEl);

  const headerEl = document.getElementById('header');
  if (headerEl) new Header(headerEl);

  new CommandPalette();

  const viewContainer = document.getElementById('view-container');
  if (viewContainer) {
    const router = new NavigationRouter(viewContainer);
    router.route('home');
  }

  // Ensure any tour overlay is cleared
  document.getElementById('onboarding-overlay')?.remove();

  // Support mouse wheel horizontal scrolling on any tab pill bar
  document.addEventListener('wheel', (e: WheelEvent) => {
    const target = (e.target as HTMLElement)?.closest(
      '.brand-nav-tabs, .nubo-nav-tabs, .web-subnav-tabs, .dev-subnav-tabs, .mkt-subnav-bar, .brand-files-filter-bar .brand-pills-group'
    ) as HTMLElement;
    if (target && target.scrollWidth > target.clientWidth) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        target.scrollLeft += e.deltaY;
      }
    }
  }, { passive: false });

  console.log('[Nubo] Application ready.');
}

window.addEventListener('DOMContentLoaded', initApp);

if ((import.meta as any).hot) {
  (import.meta as any).hot.accept(() => {
    window.location.reload();
  });
}
