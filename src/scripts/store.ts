import { Project, AppSettings } from './types';
import { setLanguage, SupportedLanguage } from './i18n';

export type AppSection = 
  | 'home' 
  | 'overview' 
  | 'guide'
  | 'development' 
  | 'brand' 
  | 'website' 
  | 'marketing' 
  | 'content' 
  | 'files' 
  | 'notes' 
  | 'settings';

export interface AppState {
  currentProject: Project | null;
  projects: Project[];
  activeSection: AppSection;
  settings: AppSettings | null;
  sidebarCollapsed: boolean;
  selectedFilePath: string | null;
}

type StateListener = (state: AppState) => void;

class Store {
  private state: AppState = {
    currentProject: null,
    projects: [],
    activeSection: 'home',
    settings: null,
    sidebarCollapsed: false,
    selectedFilePath: null
  };

  private listeners: Set<StateListener> = new Set();

  public getState(): AppState {
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public setProjects(projects: Project[]) {
    this.state.projects = projects;
    if (this.state.currentProject) {
      const updated = projects.find(p => p.id === this.state.currentProject?.id);
      if (updated) {
        this.state.currentProject = updated;
      } else {
        this.state.currentProject = null;
      }
    }
    this.notify();
  }

  public setCurrentProject(project: Project | null) {
    this.state.currentProject = project;
    if (project && (this.state.activeSection === 'settings' || this.state.activeSection === 'home')) {
      this.state.activeSection = 'overview';
    }
    if (project?.project_type === 'script') {
      const nonScriptSections: AppSection[] = ['brand', 'website', 'marketing', 'content', 'guide'];
      if (nonScriptSections.includes(this.state.activeSection)) {
        this.state.activeSection = 'overview';
      }
    } else if (project?.project_type === 'website') {
      if (this.state.activeSection === 'development') {
        this.state.activeSection = 'website';
      }
    }
    this.notify();
  }

  public selectProject(project: Project | null, section: AppSection = 'overview') {
    this.state.currentProject = project;
    let targetSection = section;
    if (project?.project_type === 'script') {
      const nonScriptSections: AppSection[] = ['brand', 'website', 'marketing', 'content', 'guide'];
      if (nonScriptSections.includes(targetSection)) {
        targetSection = 'overview';
      }
    } else if (project?.project_type === 'website') {
      if (targetSection === 'development') {
        targetSection = 'website';
      }
    }
    this.state.activeSection = targetSection;
    this.notify();
  }

  public setActiveSection(section: AppSection) {
    let targetSection = section;
    if (this.state.currentProject?.project_type === 'script') {
      const nonScriptSections: AppSection[] = ['brand', 'website', 'marketing', 'content', 'guide'];
      if (nonScriptSections.includes(targetSection)) {
        targetSection = 'overview';
      }
    } else if (this.state.currentProject?.project_type === 'website') {
      if (targetSection === 'development') {
        targetSection = 'website';
      }
    }
    this.state.activeSection = targetSection;
    if (targetSection === 'home') {
      this.state.currentProject = null;
    }
    this.notify();
  }

  public setSettings(settings: AppSettings) {
    this.state.settings = settings;
    this.state.sidebarCollapsed = settings.sidebarCollapsed;
    if (settings.language) {
      setLanguage(settings.language);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = settings.language;
      }
    }
    this.notify();
  }

  public async setLanguage(lang: SupportedLanguage) {
    if (this.state.settings) {
      this.state.settings.language = lang;
    }
    setLanguage(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    if (window.nubo?.settings) {
      await window.nubo.settings.update({ language: lang });
    }
    this.notify();
  }

  public toggleSidebar() {
    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
    if (window.nubo?.settings) {
      window.nubo.settings.update({ sidebarCollapsed: this.state.sidebarCollapsed });
    }
    this.notify();
  }

  public setSelectedFilePath(path: string | null) {
    this.state.selectedFilePath = path;
    this.notify();
  }
}

export const appStore = new Store();
