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
    this.notify();
  }

  public setActiveSection(section: AppSection) {
    this.state.activeSection = section;
    if (section === 'home') {
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
