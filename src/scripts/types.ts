export interface Project {
  id: string;
  name: string;
  description: string;
  logo?: string;
  color: string;
  website?: string;
  github?: string;
  status: 'active' | 'paused' | 'completed' | 'idea';
  progress: number;
  folder_path: string;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_task_count?: number;
}

export interface Task {
  id: string;
  project_id: string;
  campaign_id?: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'task' | 'feature' | 'bug' | 'milestone' | 'launch';
  tags: string[];
  due_date?: string;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  created_at: string;
  updated_at: string;
}

export interface FileItem {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  extension: string;
  modifiedAt: string;
  isImage: boolean;
  isPdf: boolean;
}

export interface BrandColorItem {
  id: string;
  name: string;
  hex: string;
  category: 'primary' | 'secondary' | 'accent';
}

export interface BrandGraphicItem {
  id: string;
  title: string;
  type: 'icon' | 'graphic' | 'variant' | 'badge' | 'illustration';
  path?: string;
  previewUrl: string;
  size?: number;
  format?: string;
  created_at: string;
}

export interface BrandFileItem {
  id: string;
  name: string;
  path: string;
  category: 'logo' | 'banner' | 'manual' | 'graphic' | 'font' | 'other';
  size: number;
  extension: string;
  previewUrl?: string;
  modifiedAt: string;
}

export interface BrandAsset {
  id: string;
  project_id: string;
  primary_logo?: string;
  primary_logo_path?: string;
  alternative_logo?: string;
  alternative_logo_path?: string;
  favicon?: string;
  favicon_path?: string;
  banner?: string;
  banner_path?: string;
  brand_manual_pdf?: string;
  brand_manual_path?: string;
  what_is_it?: string;
  mission?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  typography: string;
  secondary_typography?: string;
  guidelines?: string;
  colors_json?: string;
  graphics_json?: string;
  asset_files_json?: string;
  illustrator_file_path?: string;
  created_at: string;
  updated_at: string;
}

export interface WebsiteReferenceImage {
  id: string;
  name: string;
  path: string;
  notes?: string;
  created_at: string;
}

export interface WebsitePage {
  title: string;
  path: string;
  status: string;
  notes?: string;
}

export interface WebsiteInfo {
  id: string;
  project_id: string;
  url?: string;
  domain?: string;
  repository?: string;
  hosting?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  pages: WebsitePage[];
  illustrator_file_path?: string;
  reference_images?: WebsiteReferenceImage[];
  created_at: string;
  updated_at: string;
}

export interface MarketingItem {
  id: string;
  project_id: string;
  channel: string;
  title: string;
  description: string;
  status: 'Idea' | 'Draft' | 'Scheduled' | 'Published';
  target_date?: string;
  metrics?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  project_id: string;
  name: string;
  description: string;
  goal: string;
  start_date?: string;
  end_date?: string;
  status: 'Planned' | 'Active' | 'Completed' | 'Cancelled';
  channels: string[];
  tasks?: string;
  metrics?: string;
  results?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingAccount {
  id: string;
  project_id: string;
  platform: 'Email' | 'Website' | 'YouTube' | 'TikTok' | 'Instagram' | 'X' | 'Reddit' | 'Discord' | 'LinkedIn' | 'Product Hunt' | 'GitHub' | 'Custom';
  username?: string;
  url?: string;
  email?: string;
  status: 'Not Created' | 'Pending' | 'Created' | 'Active' | 'Inactive';
  creation_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingEmail {
  id: string;
  project_id: string;
  email: string;
  type: string;
  usage?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingIdea {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  goal: 'Get users' | 'Get followers' | 'Generate traffic' | 'Get registrations' | 'Get sales' | 'Build community' | 'Validate product' | 'Brand awareness' | string;
  channel?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Idea' | 'Planned' | 'In Progress' | 'Done' | 'Discarded';
  campaign_id?: string;
  target_date?: string;
  expected_result?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingMetricEntry {
  id: string;
  project_id: string;
  target_type: 'content' | 'campaign' | 'platform';
  target_id?: string;
  target_name?: string;
  platform: string;
  metric_name: string;
  metric_value: number;
  recorded_at: string;
  notes?: string;
  created_at: string;
}

export interface ContentItem {
  id: string;
  project_id: string;
  title: string;
  platform: 'YouTube' | 'TikTok' | 'Instagram' | 'X' | 'Reddit' | 'Discord' | 'LinkedIn' | 'Other' | string;
  format?: 'YouTube Video' | 'YouTube Short' | 'TikTok' | 'Instagram Reel' | 'Instagram Post' | 'X Post' | 'X Thread' | 'Reddit Post' | 'Tutorial' | 'Image' | 'Announcement' | 'Other';
  status: 'Idea' | 'Script' | 'Recording' | 'Editing' | 'Scheduled' | 'Published';
  scheduled_date?: string;
  description?: string;
  topic?: string;
  campaign_id?: string;
  parent_idea_id?: string;
  goal?: string;
  hook?: string;
  script?: string;
  cta?: string;
  hashtags?: string;
  thumbnail?: string;
  published_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  project_id: string;
  title: string;
  content: string;
  pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  project_id: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface ConfiguredEditor {
  id: string;
  name: string;
  command: string;
}

export interface ProductFeature {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed';
  taskId?: string;
}

export interface ProductSpec {
  id: string;
  project_id: string;
  what_is_it: string;
  problem_solved: string;
  target_audience: string;
  goals: string;
  features: ProductFeature[];
  user_flows?: string;
  general_requirements?: string;
  created_at: string;
  updated_at: string;
}

export interface GitCommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitFileChange {
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  file: string;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  gitInstalled: boolean;
  connectedToGitHub: boolean;
  remoteUrl?: string;
  cleanRemoteUrl?: string;
  currentBranch?: string;
  hasChanges: boolean;
  modifiedCount: number;
  untrackedCount: number;
  statusText: string;
  changedFiles?: GitFileChange[];
  recentCommits?: GitCommitInfo[];
  ahead?: number;
  behind?: number;
  error?: string;
}

export interface GitHubAccount {
  token: string;
  username: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  connected_at: string;
}

export interface AppSettings {
  storagePath: string;
  theme: 'system' | 'light' | 'dark';
  sidebarCollapsed: boolean;
  startWithWindows: boolean;
  onboardingCompleted: boolean;
  language: 'es' | 'en';
  version: string;
  configuredEditor: ConfiguredEditor;
  githubAccount?: GitHubAccount | null;
}

export interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'file' | 'note' | 'brand' | 'marketing' | 'content';
  title: string;
  subtitle: string;
  projectId?: string;
  projectName?: string;
  actionPayload?: any;
}

declare global {
  interface Window {
    nubo: {
      projects: {
        getAll(): Promise<Project[]>;
        getById(id: string): Promise<Project | undefined>;
        create(data: any): Promise<Project>;
        update(id: string, data: any): Promise<Project | undefined>;
        delete(id: string, deleteFiles: boolean): Promise<boolean>;
        getActivities(projectId: string): Promise<Activity[]>;
      };
      files: {
        listFiles(targetPath: string, rootFolder?: string, recursive?: boolean): Promise<FileItem[]>;
        createFolder(parentDir: string, folderName: string): Promise<string>;
        uploadFiles(targetDir: string, filePaths: string[]): Promise<string[]>;
        saveBuffer(targetDir: string, fileName: string, base64: string): Promise<string>;
        renameItem(oldPath: string, newName: string): Promise<string>;
        deleteItem(itemPath: string): Promise<boolean>;
        moveItem(src: string, dest: string): Promise<string>;
        copyItem(src: string, dest: string): Promise<string>;
        openFile(filePath: string): Promise<string>;
        openContainingFolder(filePath: string): Promise<boolean>;
        readFileBase64(filePath: string): Promise<{ mimeType: string; base64: string } | null>;
        exportFile(srcPathOrBase64: string, defaultName: string): Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;
      };
      tasks: {
        getByProject(projectId: string): Promise<Task[]>;
        create(data: any): Promise<Task>;
        update(id: string, updates: any): Promise<Task | undefined>;
        delete(id: string): Promise<boolean>;
      };
      brand: {
        getByProject(projectId: string): Promise<BrandAsset>;
        update(projectId: string, data: any): Promise<BrandAsset>;
      };
      website: {
        getByProject(projectId: string): Promise<WebsiteInfo>;
        update(projectId: string, data: any): Promise<WebsiteInfo>;
        ensureFolders(folderPath: string): Promise<{ success: boolean; path?: string; folders?: string[] }>;
      };
      marketing: {
        getByProject(projectId: string): Promise<MarketingItem[]>;
        create(data: any): Promise<MarketingItem>;
        update(id: string, updates: any): Promise<MarketingItem | undefined>;
        delete(id: string): Promise<boolean>;
        ensureFolders(projectPath: string): Promise<{ success: boolean; folders: string[] }>;
        getCampaigns(projectId: string): Promise<MarketingCampaign[]>;
        createCampaign(data: any): Promise<MarketingCampaign>;
        updateCampaign(id: string, updates: any): Promise<MarketingCampaign | undefined>;
        deleteCampaign(id: string): Promise<boolean>;
        getAccounts(projectId: string): Promise<MarketingAccount[]>;
        createAccount(data: any): Promise<MarketingAccount>;
        updateAccount(id: string, updates: any): Promise<MarketingAccount | undefined>;
        deleteAccount(id: string): Promise<boolean>;
        getEmails(projectId: string): Promise<MarketingEmail[]>;
        createEmail(data: any): Promise<MarketingEmail>;
        updateEmail(id: string, updates: any): Promise<MarketingEmail | undefined>;
        deleteEmail(id: string): Promise<boolean>;
        getIdeas(projectId: string): Promise<MarketingIdea[]>;
        createIdea(data: any): Promise<MarketingIdea>;
        updateIdea(id: string, updates: any): Promise<MarketingIdea | undefined>;
        deleteIdea(id: string): Promise<boolean>;
        getMetrics(projectId: string): Promise<MarketingMetricEntry[]>;
        addMetric(data: any): Promise<MarketingMetricEntry>;
        deleteMetric(id: string): Promise<boolean>;
      };
      content: {
        getByProject(projectId: string): Promise<ContentItem[]>;
        create(data: any): Promise<ContentItem>;
        update(id: string, updates: any): Promise<ContentItem | undefined>;
        delete(id: string): Promise<boolean>;
      };
      notes: {
        getByProject(projectId: string): Promise<Note[]>;
        getById(id: string): Promise<Note | undefined>;
        create(data: any): Promise<Note>;
        update(id: string, updates: any): Promise<Note | undefined>;
        delete(id: string): Promise<boolean>;
      };
      settings: {
        get(): Promise<AppSettings>;
        update(updates: any): Promise<AppSettings>;
        selectDirectory(): Promise<string | null>;
      };
      github: {
        getAccount(): Promise<GitHubAccount | null>;
        connectAccount(token: string): Promise<{ success: boolean; account?: GitHubAccount; message?: string }>;
        disconnectAccount(): Promise<{ success: boolean }>;
        openTokenGenerator(): Promise<boolean>;
      };
      search: {
        query(q: string, projectId?: string): Promise<SearchResult[]>;
      };
      backup: {
        export(projectId: string): Promise<{ success: boolean; filePath?: string }>;
        import(): Promise<{ success: boolean; project?: Project }>;
      };
      dialog: {
        openFiles(options?: any): Promise<string[]>;
      };
      system: {
        getInstalledFonts(): Promise<string[]>;
      };
      development: {
        getSpecs(projectId: string): Promise<ProductSpec>;
        updateSpecs(projectId: string, updates: Partial<ProductSpec>): Promise<ProductSpec>;
        checkFolder(folderPath: string): Promise<{ exists: boolean; path: string }>;
        createFolder(folderPath: string): Promise<{ success: boolean; path: string }>;
        ensureFolders(folderPath: string): Promise<{ success: boolean; path?: string; folders?: string[] }>;
        openFolder(folderPath: string): Promise<boolean>;
        openTerminal(folderPath: string): Promise<{ success: boolean; error?: string }>;
        openInEditor(folderPath: string, customCommand?: string): Promise<{ success: boolean; error?: string; commandUsed: string }>;
        getGitStatus(folderPath: string): Promise<GitStatusResult>;
        gitInit(folderPath: string): Promise<{ success: boolean; message: string }>;
        gitSetRemote(folderPath: string, remoteUrl: string): Promise<{ success: boolean; message: string }>;
        gitPush(folderPath: string, commitMessage?: string): Promise<{ success: boolean; message: string }>;
        gitPull(folderPath: string): Promise<{ success: boolean; message: string }>;
        gitDisconnectRemote(folderPath: string): Promise<{ success: boolean; message: string }>;
        gitRemoveRepo(folderPath: string): Promise<{ success: boolean; message: string }>;
        openGitHub(url: string): Promise<boolean>;
      };
      window?: {
        minimize(): Promise<void>;
        maximize(): Promise<boolean>;
        close(): Promise<void>;
        isMaximized(): Promise<boolean>;
        onMaximizedChange(callback: (isMax: boolean) => void): () => void;
      };
    };
  }
}

/**
 * Minimal valid vector container (PDF 1.5 format) that Adobe Illustrator
 * opens natively as an artboard without any corruption warnings.
 */
export const MINIMAL_AI_TEMPLATE_BASE64 = 'JVBERi0xLjUNCiXDosOjw4/Dkw0KMSAwIG9iag0KPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4NCmVuZG9iag0KMiAwIG9iag0KPDwvVHlwZS9QYWdlcy9Db3VudCAxL0tpZHNbMyAwIFJdPj4NCmVuZG9iag0KMyAwIG9iag0KPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMTkyMCAxMDgwXS9Db250ZW50cyA0IDAgUi9SZXNvdXJjZXM8PD4+Pj4NCmVuZG9iag0KNCAwIG9iag0KPDwvTGVuZ3RoIDA+Pg0Kc3RyZWFtDQplbmRzdHJlYW0NCmVuZG9iag0KeHJlZg0KMCA1DQowMDAwMDAwMDAwIDY1NTM1IGYgDQowMDAwMDAwMDE3IDAwMDAwIG4gDQowMDAwMDAwMDY0IDAwMDAwIG4gDQowMDAwMDAwMTE3IDAwMDAwIG4gDQowMDAwMDAwMjAzIDAwMDAwIG4gDQp0cmFpbGVyDQo8PC9TaXplIDUvUm9vdCAxIDAgUj4+DQpzdGFydHhyZWYNCjI1NA0KJSVFT0YNCg==';
