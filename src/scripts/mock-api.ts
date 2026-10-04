import { Project, Task, BrandAsset, WebsiteInfo, MarketingItem, ContentItem, Note, Activity, AppSettings, ProductSpec, MarketingCampaign, MarketingAccount, MarketingEmail, MarketingIdea, MarketingMetricEntry } from './types';

let demoProjects: Project[] = [
  {
    id: 'proj_nubo',
    name: 'Nubo',
    description: 'SaaS workspace y gestor de proyectos para programadores y digital makers.',
    color: '#111111',
    website: 'https://nubo.app',
    github: 'nubo/workspace',
    status: 'active',
    progress: 72,
    folder_path: 'C:/Users/medin/Documents/Nubo Projects/Nubo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_count: 5,
    completed_task_count: 3
  },
  {
    id: 'proj_game',
    name: 'My Game',
    description: 'Videojuego indie de aventura en 2D pixel art desarrollado en Godot.',
    color: '#6366F1',
    website: 'https://mygame.dev',
    github: 'indie/my-game',
    status: 'active',
    progress: 34,
    folder_path: 'C:/Users/medin/Documents/Nubo Projects/My Game',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_count: 6,
    completed_task_count: 2
  },
  {
    id: 'proj_startup',
    name: 'Startup AI',
    description: 'Plataforma para generar resúmenes automáticos con inteligencia artificial.',
    color: '#059669',
    website: 'https://startupai.io',
    github: 'org/startup-ai',
    status: 'active',
    progress: 48,
    folder_path: 'C:/Users/medin/Documents/Nubo Projects/Startup AI',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_count: 4,
    completed_task_count: 2
  }
];

let demoTasks: Task[] = [
  {
    id: 't1',
    project_id: 'proj_nubo',
    title: 'Finish landing page & visual assets',
    description: 'Diseño limpio y maquetación de la página web de presentación.',
    status: 'in_progress',
    priority: 'high',
    type: 'feature',
    tags: ['web', 'design'],
    checklist: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 't2',
    project_id: 'proj_nubo',
    title: 'Create launch video for YouTube and TikTok',
    description: 'Grabar demo del explorador de archivos y las secciones de marca.',
    status: 'todo',
    priority: 'high',
    type: 'task',
    tags: ['marketing'],
    checklist: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 't3',
    project_id: 'proj_nubo',
    title: 'Publish website on Vercel',
    description: 'Configurar dominio y certificado SSL.',
    status: 'todo',
    priority: 'medium',
    type: 'task',
    tags: ['infra'],
    checklist: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 't4',
    project_id: 'proj_nubo',
    title: 'Initial Electron window & SQLite integration',
    description: 'Arquitectura base con preload y servicios locales.',
    status: 'done',
    priority: 'urgent',
    type: 'task',
    tags: ['core'],
    checklist: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let demoActivities: Activity[] = [
  { id: 'a1', project_id: 'proj_nubo', action: 'Added logo.svg', details: 'Assets de marca actualizados', created_at: new Date().toISOString() },
  { id: 'a2', project_id: 'proj_nubo', action: 'Created landing page', details: 'Maquetación web completada', created_at: new Date().toISOString() },
  { id: 'a3', project_id: 'proj_nubo', action: 'Added TikTok idea', details: 'Building Nubo in public', created_at: new Date().toISOString() },
  { id: 'a4', project_id: 'proj_nubo', action: 'Updated project description', details: 'SaaS project workspace', created_at: new Date().toISOString() }
];

let demoBrand: BrandAsset = {
  id: 'b1',
  project_id: 'proj_nubo',
  primary_color: '#111111',
  secondary_color: '#FAFAFA',
  accent_color: '#0A84FF',
  typography: 'Inter, -apple-system, sans-serif',
  guidelines: 'Estética minimalista, predominantemente blanca, tipografía limpia y bordes finos.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

let demoWeb: WebsiteInfo = {
  id: 'w1',
  project_id: 'proj_nubo',
  url: 'https://nubo.app',
  domain: 'nubo.app',
  hosting: 'Vercel / Cloudflare',
  repository: 'nubo/workspace',
  seo_title: 'Nubo — El hogar de todo tu proyecto digital',
  seo_description: 'Workspace personal y elegante para programadores y makers.',
  seo_keywords: 'workspace, developer tools, electron, projects, sqlite',
  pages: [
    { title: 'Home', path: '/', status: 'Live', notes: 'Página principal' },
    { title: 'Pricing', path: '/pricing', status: 'Live', notes: 'Planes' },
    { title: 'Download', path: '/download', status: 'Draft', notes: 'Instalador Windows y Mac' }
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

let demoMarketing: MarketingItem[] = [
  { id: 'm1', project_id: 'proj_nubo', channel: 'TikTok', title: 'I built a project manager for developers', description: 'Video mostrando el explorador de archivos reales', status: 'Idea', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm2', project_id: 'proj_nubo', channel: 'TikTok', title: 'Why I stopped using Notion', description: 'Demostración de velocidad y enfoque en proyectos de código', status: 'Draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm3', project_id: 'proj_nubo', channel: 'X', title: 'Building Nubo in public thread', description: 'Hilo con capturas de pantalla de la arquitectura', status: 'Scheduled', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'm4', project_id: 'proj_nubo', channel: 'Product Hunt', title: 'Nubo Launch on Product Hunt', description: 'Preparar assets y primer comentario para el lanzamiento', status: 'Idea', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

let demoCampaigns: MarketingCampaign[] = [];
let demoAccounts: MarketingAccount[] = [];
let demoEmails: MarketingEmail[] = [];
let demoIdeas: MarketingIdea[] = [];
let demoMetrics: MarketingMetricEntry[] = [];

let demoContent: ContentItem[] = [];

let demoNotes: Note[] = [
  { id: 'n1', project_id: 'proj_nubo', title: 'Roadmap & Filosofía', content: '# Nubo Workspace\n\n- Minimalista y elegante\n- Rápido y personal\n- Control absoluto sobre archivos y tareas', pinned: true, tags: ['core'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'n2', project_id: 'proj_nubo', title: 'Ideas de integración Git', content: 'Listar commits recientes y ramas activas del proyecto.', pinned: false, tags: ['git'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const demoSpecsStore: Record<string, ProductSpec> = {};

export function installBrowserFallback(): void {
  if (typeof window !== 'undefined' && !window.nubo) {
    console.warn('[Nubo] window.nubo not detected. Activating browser fallback mode with rich demo data.');

    window.nubo = {
      projects: {
        getAll: async () => demoProjects,
        getById: async (id) => demoProjects.find(p => p.id === id),
        create: async (data) => {
          const newP: Project = {
            id: 'proj_' + Date.now(),
            name: data.name,
            description: data.description || '',
            color: data.color || '#111111',
            website: data.website || '',
            github: data.github || '',
            status: 'active',
            progress: 0,
            folder_path: 'C:/Users/medin/Documents/Nubo Projects/' + data.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            task_count: 0,
            completed_task_count: 0
          };
          demoProjects.unshift(newP);
          return newP;
        },
        update: async (id, data) => {
          const idx = demoProjects.findIndex(p => p.id === id);
          if (idx !== -1) {
            demoProjects[idx] = { ...demoProjects[idx], ...data };
            return demoProjects[idx];
          }
          return undefined;
        },
        delete: async (id) => {
          demoProjects = demoProjects.filter(p => p.id !== id);
          return true;
        },
        getActivities: async () => demoActivities
      },
      files: {
        listFiles: async (targetPath) => {
          return [
            { name: 'Brand', path: targetPath + '/Brand', relativePath: 'Brand', isDirectory: true, size: 0, extension: 'folder', modifiedAt: new Date().toISOString(), isImage: false, isPdf: false },
            { name: 'Website', path: targetPath + '/Website', relativePath: 'Website', isDirectory: true, size: 0, extension: 'folder', modifiedAt: new Date().toISOString(), isImage: false, isPdf: false },
            { name: 'Development', path: targetPath + '/Development', relativePath: 'Development', isDirectory: true, size: 0, extension: 'folder', modifiedAt: new Date().toISOString(), isImage: false, isPdf: false },
            { name: 'logo.svg', path: targetPath + '/logo.svg', relativePath: 'logo.svg', isDirectory: false, size: 4096, extension: 'svg', modifiedAt: new Date().toISOString(), isImage: true, isPdf: false },
            { name: 'favicon.png', path: targetPath + '/favicon.png', relativePath: 'favicon.png', isDirectory: false, size: 1024, extension: 'png', modifiedAt: new Date().toISOString(), isImage: true, isPdf: false },
            { name: 'brand-guide.pdf', path: targetPath + '/brand-guide.pdf', relativePath: 'brand-guide.pdf', isDirectory: false, size: 524288, extension: 'pdf', modifiedAt: new Date().toISOString(), isImage: false, isPdf: true }
          ];
        },
        createFolder: async (parentDir, name) => parentDir + '/' + name,
        uploadFiles: async () => [],
        saveBuffer: async () => '',
        renameItem: async () => '',
        deleteItem: async () => true,
        moveItem: async () => '',
        copyItem: async () => '',
        openFile: async () => '',
        openContainingFolder: async () => true,
        readFileBase64: async () => null,
        exportFile: async (srcPathOrBase64: string, defaultName: string) => {
          const a = document.createElement('a');
          a.href = srcPathOrBase64;
          a.download = defaultName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          return { success: true, filePath: defaultName };
        }
      },
      tasks: {
        getByProject: async (projectId?: string) => {
          return projectId ? demoTasks.filter(t => t.project_id === projectId) : demoTasks;
        },
        create: async (data) => {
          const nt: Task = {
            id: 'task_' + Date.now(),
            project_id: data.projectId || data.project_id,
            campaign_id: data.campaign_id || data.campaignId || undefined,
            title: data.title,
            description: data.description || '',
            status: data.status || 'todo',
            priority: data.priority || 'medium',
            type: data.type || 'task',
            tags: [],
            checklist: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          demoTasks.unshift(nt);
          return nt;
        },
        update: async (id, updates) => {
          const idx = demoTasks.findIndex(t => t.id === id);
          if (idx !== -1) {
            demoTasks[idx] = { ...demoTasks[idx], ...updates };
            return demoTasks[idx];
          }
          return undefined;
        },
        delete: async (id) => {
          demoTasks = demoTasks.filter(t => t.id !== id);
          return true;
        }
      },
      brand: {
        getByProject: async () => demoBrand,
        update: async (_, data) => {
          demoBrand = { ...demoBrand, ...data };
          return demoBrand;
        }
      },
      website: {
        getByProject: async () => demoWeb,
        update: async (_, data) => {
          demoWeb = { ...demoWeb, ...data };
          return demoWeb;
        },
        ensureFolders: async (p) => ({ success: true, path: p + '/Website', folders: ['Website', 'Website/Assets', 'Website/Pages', 'Website/Design', 'Website/Referencias'] })
      },
      marketing: {
        getByProject: async () => demoMarketing,
        create: async (data) => {
          const m: MarketingItem = {
            id: 'mkt_' + Date.now(),
            project_id: data.projectId,
            channel: data.channel,
            title: data.title,
            description: data.description || '',
            status: data.status || 'Idea',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          demoMarketing.unshift(m);
          return m;
        },
        update: async (id, updates) => {
          const idx = demoMarketing.findIndex(m => m.id === id);
          if (idx !== -1) {
            demoMarketing[idx] = { ...demoMarketing[idx], ...updates };
            return demoMarketing[idx];
          }
          return undefined;
        },
        delete: async (id) => {
          demoMarketing = demoMarketing.filter(m => m.id !== id);
          return true;
        },
        ensureFolders: async (projectPath) => ({
          success: true,
          folders: [
            'marketing/strategy',
            'marketing/campaigns',
            'marketing/ideas',
            'marketing/launch',
            'content/ideas',
            'content/scripts',
            'content/thumbnails',
            'content/videos',
            'content/social',
            'content/published'
          ]
        }),
        getCampaigns: async (projectId) => demoCampaigns.filter(c => !projectId || c.project_id === projectId),
        createCampaign: async (data) => {
          const item: MarketingCampaign = {
            id: 'cmp_' + Date.now(),
            project_id: data.projectId || data.project_id,
            name: data.name || 'Nueva Campaña',
            description: data.description || '',
            goal: data.goal || '',
            start_date: data.start_date || data.startDate || '',
            end_date: data.end_date || data.endDate || '',
            status: data.status || 'Planned',
            channels: data.channels || [],
            tasks: data.tasks || '',
            metrics: data.metrics || '',
            results: data.results || '',
            notes: data.notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          demoCampaigns.unshift(item);
          return item;
        },
        updateCampaign: async (id, updates) => {
          const idx = demoCampaigns.findIndex(c => c.id === id);
          if (idx !== -1) {
            demoCampaigns[idx] = { ...demoCampaigns[idx], ...updates, updated_at: new Date().toISOString() };
            return demoCampaigns[idx];
          }
          return undefined;
        },
        deleteCampaign: async (id) => {
          demoCampaigns = demoCampaigns.filter(c => c.id !== id);
          return true;
        },
        getAccounts: async (projectId) => demoAccounts.filter(a => !projectId || a.project_id === projectId),
        createAccount: async (data) => {
          const item: MarketingAccount = {
            id: 'acc_' + Date.now(),
            project_id: data.projectId || data.project_id,
            platform: data.platform || 'Custom',
            username: data.username || '',
            url: data.url || '',
            email: data.email || '',
            status: data.status || 'Not Created',
            creation_date: data.creation_date || '',
            notes: data.notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          demoAccounts.unshift(item);
          return item;
        },
        updateAccount: async (id, updates) => {
          const idx = demoAccounts.findIndex(a => a.id === id);
          if (idx !== -1) {
            demoAccounts[idx] = { ...demoAccounts[idx], ...updates, updated_at: new Date().toISOString() };
            return demoAccounts[idx];
          }
          return undefined;
        },
        deleteAccount: async (id) => {
          demoAccounts = demoAccounts.filter(a => a.id !== id);
          return true;
        },
        getEmails: async (projectId) => demoEmails.filter(e => !projectId || e.project_id === projectId),
        createEmail: async (data) => {
          const item: MarketingEmail = {
            id: 'eml_' + Date.now(),
            project_id: data.projectId || data.project_id,
            email: data.email || '',
            type: data.type || 'Main',
            usage: data.usage || '',
            notes: data.notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          demoEmails.unshift(item);
          return item;
        },
        updateEmail: async (id, updates) => {
          const idx = demoEmails.findIndex(e => e.id === id);
          if (idx !== -1) {
            demoEmails[idx] = { ...demoEmails[idx], ...updates, updated_at: new Date().toISOString() };
            return demoEmails[idx];
          }
          return undefined;
        },
        deleteEmail: async (id) => {
          demoEmails = demoEmails.filter(e => e.id !== id);
          return true;
        },
        getIdeas: async (projectId) => demoIdeas.filter(i => !projectId || i.project_id === projectId),
        createIdea: async (data) => {
          const item: MarketingIdea = {
            id: 'idea_' + Date.now(),
            project_id: data.projectId || data.project_id,
            campaign_id: data.campaign_id || data.campaignId || undefined,
            title: data.title || '',
            description: data.description || '',
            goal: data.goal || 'Get users',
            channel: data.channel || '',
            priority: data.priority || 'Medium',
            status: data.status || 'Idea',
            target_date: data.target_date || data.targetDate || '',
            expected_result: data.expected_result || data.expectedResult || '',
            notes: data.notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          demoIdeas.unshift(item);
          return item;
        },
        updateIdea: async (id, updates) => {
          const idx = demoIdeas.findIndex(i => i.id === id);
          if (idx !== -1) {
            demoIdeas[idx] = { ...demoIdeas[idx], ...updates, updated_at: new Date().toISOString() };
            return demoIdeas[idx];
          }
          return undefined;
        },
        deleteIdea: async (id) => {
          demoIdeas = demoIdeas.filter(i => i.id !== id);
          return true;
        },
        getMetrics: async (projectId) => demoMetrics.filter(m => !projectId || m.project_id === projectId),
        addMetric: async (data) => {
          const item: MarketingMetricEntry = {
            id: 'mtr_' + Date.now(),
            project_id: data.projectId || data.project_id,
            target_type: data.target_type || 'platform',
            target_id: data.target_id || '',
            target_name: data.target_name || '',
            platform: data.platform || '',
            metric_name: data.metric_name || '',
            metric_value: Number(data.metric_value) || 0,
            recorded_at: data.recorded_at || new Date().toISOString(),
            notes: data.notes || '',
            created_at: new Date().toISOString()
          };
          demoMetrics.unshift(item);
          return item;
        },
        deleteMetric: async (id) => {
          demoMetrics = demoMetrics.filter(m => m.id !== id);
          return true;
        }
      },
      content: {
        getByProject: async (projectId) => demoContent.filter(c => !projectId || c.project_id === projectId),
        create: async (data) => {
          const c: ContentItem = {
            id: 'cnt_' + Date.now(),
            project_id: data.projectId || data.project_id,
            title: data.title,
            platform: data.platform,
            format: data.format,
            status: data.status || 'Idea',
            scheduled_date: data.scheduled_date || data.scheduledDate || data.target_date || '',
            description: data.description || '',
            topic: data.topic || '',
            campaign_id: data.campaign_id || data.campaignId || '',
            parent_idea_id: data.parent_idea_id || data.parentIdeaId || '',
            goal: data.goal || '',
            hook: data.hook || '',
            script: data.script || '',
            cta: data.cta || '',
            hashtags: data.hashtags || '',
            thumbnail: data.thumbnail || '',
            published_url: data.published_url || data.publishedUrl || '',
            notes: data.notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          demoContent.unshift(c);
          return c;
        },
        update: async (id, updates) => {
          const idx = demoContent.findIndex(c => c.id === id);
          if (idx !== -1) {
            demoContent[idx] = { ...demoContent[idx], ...updates, updated_at: new Date().toISOString() };
            return demoContent[idx];
          }
          return undefined;
        },
        delete: async (id) => {
          demoContent = demoContent.filter(c => c.id !== id);
          return true;
        }
      },
      notes: {
        getByProject: async () => demoNotes,
        getById: async (id) => demoNotes.find(n => n.id === id),
        create: async (data) => {
          const n: Note = {
            id: 'note_' + Date.now(),
            project_id: data.projectId,
            title: data.title,
            content: data.content || '',
            pinned: false,
            tags: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          demoNotes.unshift(n);
          return n;
        },
        update: async (id, updates) => {
          const idx = demoNotes.findIndex(n => n.id === id);
          if (idx !== -1) {
            demoNotes[idx] = { ...demoNotes[idx], ...updates };
            return demoNotes[idx];
          }
          return undefined;
        },
        delete: async (id) => {
          demoNotes = demoNotes.filter(n => n.id !== id);
          return true;
        }
      },
      settings: {
        get: async () => ({
          storagePath: 'C:/Users/medin/Documents/Nubo Projects',
          theme: 'light',
          sidebarCollapsed: false,
          startWithWindows: false,
          onboardingCompleted: false,
          language: 'es',
          version: '1.0.0',
          configuredEditor: {
            id: 'code',
            name: 'Visual Studio Code',
            command: 'code'
          }
        }),
        update: async (u) => ({
          storagePath: u.storagePath || 'C:/Users/medin/Documents/Nubo Projects',
          theme: u.theme || 'light',
          sidebarCollapsed: u.sidebarCollapsed || false,
          startWithWindows: u.startWithWindows || false,
          onboardingCompleted: u.onboardingCompleted !== undefined ? u.onboardingCompleted : false,
          language: u.language || 'es',
          version: '1.0.0',
          configuredEditor: u.configuredEditor || {
            id: 'code',
            name: 'Visual Studio Code',
            command: 'code'
          }
        }),
        selectDirectory: async () => 'C:/Users/medin/Documents/Nubo Projects'
      },
      search: {
        query: async (q) => [
          { id: 'p1', type: 'project', title: 'Nubo', subtitle: 'Proyecto SaaS' },
          { id: 'f1', type: 'file', title: 'logo.svg', subtitle: 'Archivo en Brand' },
          { id: 't1', type: 'task', title: 'Finish landing page', subtitle: 'Tarea en Nubo' },
          { id: 'n1', type: 'note', title: 'Roadmap & Filosofía', subtitle: 'Nota en Nubo' }
        ]
      },
      backup: {
        export: async () => ({ success: true, filePath: 'Nubo.nubo' }),
        import: async () => ({ success: true, project: demoProjects[0] })
      },
      dialog: {
        openFiles: async () => []
      },
      system: {
        getInstalledFonts: async () => [
          'Arial', 'Calibri', 'Segoe UI', 'Bahnschrift', 'Cambria', 'Candara',
          'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New',
          'Georgia', 'Impact', 'Inter', 'Lucida Console', 'Palatino Linotype',
          'Roboto', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'
        ]
      },
      development: {
        getSpecs: async (projectId: string) => {
          if (!demoSpecsStore[projectId]) {
            if (projectId === 'proj_nubo') {
              demoSpecsStore[projectId] = {
                id: 'spec_nubo',
                project_id: projectId,
                what_is_it: 'Workspace personal para desarrolladores y makers que centraliza todo su proyecto digital.',
                problem_solved: 'Los desarrolladores y creadores tienen sus archivos, marca, tareas, marketing y código dispersos en múltiples herramientas desconectadas.',
                target_audience: 'Desarrolladores independientes, solopreneurs, equipos pequeños y makers que construyen productos digitales.',
                goals: '1. Simplificar la gestión integral del proyecto.\n2. Conectar de forma instantánea con el código real y el editor favorito.\n3. Mantener alineada la visión de producto con el trabajo diario.',
                features: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            } else {
              demoSpecsStore[projectId] = {
                id: 'spec_' + projectId,
                project_id: projectId,
                what_is_it: '',
                problem_solved: '',
                target_audience: '',
                goals: '',
                features: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            }
          }
          return demoSpecsStore[projectId];
        },
        updateSpecs: async (projectId: string, updates: any) => {
          const current = demoSpecsStore[projectId] || {
            id: 'spec_' + projectId,
            project_id: projectId,
            what_is_it: '',
            problem_solved: '',
            target_audience: '',
            goals: '',
            features: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const updated: ProductSpec = {
            ...current,
            what_is_it: updates.what_is_it !== undefined ? updates.what_is_it : current.what_is_it,
            problem_solved: updates.problem_solved !== undefined ? updates.problem_solved : current.problem_solved,
            target_audience: updates.target_audience !== undefined ? updates.target_audience : current.target_audience,
            goals: updates.goals !== undefined ? updates.goals : current.goals,
            features: updates.features !== undefined ? updates.features : current.features,
            updated_at: new Date().toISOString()
          };
          demoSpecsStore[projectId] = updated;
          return updated;
        },
        checkFolder: async (folderPath: string) => ({ exists: true, path: folderPath }),
        createFolder: async (folderPath: string) => ({ success: true, path: folderPath }),
        ensureFolders: async (folderPath: string) => ({ success: true, path: folderPath, folders: ['Development', 'Development/Specs', 'Development/Docs', 'src'] }),
        openFolder: async (folderPath: string) => true,
        openTerminal: async (folderPath: string) => ({ success: true }),
        openInEditor: async (folderPath: string, cmd?: string) => ({ success: true, commandUsed: cmd || 'code' }),
        getGitStatus: async (folderPath: string) => ({
          isGitRepo: true,
          gitInstalled: true,
          connectedToGitHub: true,
          remoteUrl: 'https://github.com/nubo/workspace.git',
          cleanRemoteUrl: 'https://github.com/nubo/workspace',
          currentBranch: 'main',
          hasChanges: false,
          modifiedCount: 0,
          untrackedCount: 0,
          statusText: 'Sin cambios pendientes'
        }),
        gitInit: async (folderPath: string) => ({ success: true, message: 'Initialized empty Git repository' }),
        gitSetRemote: async (folderPath: string, url: string) => ({ success: true, message: 'Remote origin configurado' }),
        gitPush: async (folderPath: string, commitMessage?: string) => ({ success: true, message: 'Everything up-to-date' }),
        gitPull: async (folderPath: string) => ({ success: true, message: 'Already up to date' }),
        gitDisconnectRemote: async (folderPath: string) => ({ success: true, message: 'Repositorio remoto desconectado' }),
        gitRemoveRepo: async (folderPath: string) => ({ success: true, message: 'Git eliminado del proyecto' }),
        openGitHub: async (url: string) => {
          window.open(url, '_blank');
          return true;
        }
      }
    };
  }
}
