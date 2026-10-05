import path from 'path';
import fs from 'fs';
import { shell } from 'electron';
import { DatabaseService } from './database.service';
import { SettingsService } from './settings.service';
import { FileService } from './file.service';

export interface ProjectModel {
  id: string;
  name: string;
  description: string;
  logo?: string;
  color: string;
  project_type?: 'program' | 'website' | 'script';
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

export interface ActivityModel {
  id: string;
  project_id: string;
  action: string;
  details?: string;
  created_at: string;
}

export class ProjectService {
  private static instance: ProjectService;
  private dbService: DatabaseService;
  private settingsService: SettingsService;
  private fileService: FileService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.settingsService = SettingsService.getInstance();
    this.fileService = FileService.getInstance();
  }

  public static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  public getAll(): ProjectModel[] {
    const db = this.dbService.getAdapter();
    const projects = db.all<ProjectModel>(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as completed_task_count
      FROM projects p
      ORDER BY p.updated_at DESC
    `);

    // Recalculate progress dynamically if tasks exist
    return projects.map((p) => {
      const total = p.task_count || 0;
      const completed = p.completed_task_count || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : p.progress || 0;
      return {
        ...p,
        progress
      };
    });
  }

  public getById(id: string): ProjectModel | undefined {
    const db = this.dbService.getAdapter();
    const project = db.get<ProjectModel>(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as completed_task_count
      FROM projects p
      WHERE p.id = ?
    `, [id]);

    if (!project) return undefined;

    if (project.folder_path && project.project_type !== 'script') {
      try {
        this.fileService.ensureBrandFolderStructure(project.folder_path);
      } catch (err) {
        console.warn('Could not ensure project folder structure:', err);
      }
    }

    const total = project.task_count || 0;
    const completed = project.completed_task_count || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : project.progress || 0;

    return {
      ...project,
      progress
    };
  }

  public create(data: {
    name: string;
    description?: string;
    logo?: string;
    color?: string;
    project_type?: 'program' | 'website' | 'script';
    website?: string;
    github?: string;
    status?: 'active' | 'paused' | 'completed' | 'idea';
    customFolderPath?: string;
  }): ProjectModel {
    const db = this.dbService.getAdapter();
    const id = 'proj_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const settings = this.settingsService.getSettings();
    const baseFolder = data.customFolderPath || settings.storagePath;
    const safeProjectName = data.name.replace(/[<>:"/\\|?*]/g, '_').trim();
    const projectFolderPath = path.join(baseFolder, safeProjectName);
    const projectType = data.project_type || 'program';

    // Create real folder structure on disk tailored to project type
    this.fileService.createProjectFolderStructure(projectFolderPath, projectType, data.name.trim());

    const project: ProjectModel = {
      id,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      logo: data.logo || '',
      color: data.color || '#111111',
      project_type: projectType,
      website: data.website?.trim() || '',
      github: data.github?.trim() || '',
      status: data.status || 'active',
      progress: 0,
      folder_path: projectFolderPath,
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO projects (id, name, description, logo, color, project_type, website, github, status, progress, folder_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      project.id,
      project.name,
      project.description,
      project.logo,
      project.color,
      project.project_type,
      project.website,
      project.github,
      project.status,
      project.progress,
      project.folder_path,
      project.created_at,
      project.updated_at
    ]);

    // Initialize associated Brand Assets row
    const brandId = 'brand_' + id;
    db.run(`
      INSERT INTO brand_assets (id, project_id, primary_color, secondary_color, accent_color, typography, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      brandId,
      id,
      '#111111',
      '#FAFAFA',
      project.color || '#111111',
      'Inter, -apple-system, sans-serif',
      now,
      now
    ]);

    // Initialize associated Website Info row
    const websiteId = 'web_' + id;
    db.run(`
      INSERT INTO website_info (id, project_id, url, repository, seo_title, pages, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      websiteId,
      id,
      project.website || '',
      project.github || '',
      project.name,
      JSON.stringify([
        { title: 'Home', path: '/', status: 'In progress', notes: 'Main landing page' },
        { title: 'Pricing', path: '/pricing', status: 'Draft', notes: 'Plans and tiers' }
      ]),
      now,
      now
    ]);

    // Log Activity (projects start with 0 tasks by default)
    this.addActivity(id, 'Created project', `Proyecto ${data.name} creado.`);

    return project;
  }

  public update(id: string, data: Partial<ProjectModel>): ProjectModel | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const db = this.dbService.getAdapter();
    const now = new Date().toISOString();

    const updated: ProjectModel = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      description: data.description !== undefined ? data.description.trim() : existing.description,
      logo: data.logo !== undefined ? data.logo : existing.logo,
      color: data.color !== undefined ? data.color : existing.color,
      project_type: data.project_type !== undefined ? data.project_type : (existing.project_type || 'program'),
      website: data.website !== undefined ? data.website.trim() : existing.website,
      github: data.github !== undefined ? data.github.trim() : existing.github,
      status: data.status !== undefined ? data.status : existing.status,
      progress: data.progress !== undefined ? data.progress : existing.progress,
      updated_at: now
    };

    db.run(`
      UPDATE projects
      SET name = ?, description = ?, logo = ?, color = ?, project_type = ?, website = ?, github = ?, status = ?, progress = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.name,
      updated.description,
      updated.logo,
      updated.color,
      updated.project_type || 'program',
      updated.website,
      updated.github,
      updated.status,
      updated.progress,
      updated.updated_at,
      id
    ]);

    this.addActivity(id, 'Updated project', `Detalles actualizados.`);

    return updated;
  }

  public async delete(id: string, deleteFiles: boolean = true): Promise<boolean> {
    const existing = this.getById(id);
    if (!existing) return false;

    const db = this.dbService.getAdapter();
    
    // Cascade delete all associated entities in SQLite
    db.run('DELETE FROM activities WHERE project_id = ?', [id]);
    db.run('DELETE FROM tasks WHERE project_id = ?', [id]);
    db.run('DELETE FROM brand_assets WHERE project_id = ?', [id]);
    db.run('DELETE FROM website_info WHERE project_id = ?', [id]);
    db.run('DELETE FROM marketing_items WHERE project_id = ?', [id]);
    db.run('DELETE FROM marketing_campaigns WHERE project_id = ?', [id]);
    db.run('DELETE FROM marketing_accounts WHERE project_id = ?', [id]);
    db.run('DELETE FROM marketing_emails WHERE project_id = ?', [id]);
    db.run('DELETE FROM marketing_ideas WHERE project_id = ?', [id]);
    db.run('DELETE FROM marketing_metrics WHERE project_id = ?', [id]);
    db.run('DELETE FROM content_items WHERE project_id = ?', [id]);
    db.run('DELETE FROM notes WHERE project_id = ?', [id]);
    db.run('DELETE FROM product_specs WHERE project_id = ?', [id]);
    db.run('DELETE FROM projects WHERE id = ?', [id]);

    // Physically delete folder from disk if requested (defaults to true)
    if (deleteFiles && existing.folder_path && fs.existsSync(existing.folder_path)) {
      try {
        await shell.trashItem(existing.folder_path);
      } catch (trashErr) {
        console.warn('[ProjectService] shell.trashItem failed, attempting recursive force delete:', trashErr);
        try {
          fs.rmSync(existing.folder_path, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
        } catch (rmErr) {
          console.error('[ProjectService] Error deleting physical folder:', rmErr);
        }
      }
    }

    return true;
  }

  public addActivity(projectId: string, action: string, details?: string): void {
    const db = this.dbService.getAdapter();
    const id = 'act_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    db.run(`
      INSERT INTO activities (id, project_id, action, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [id, projectId, action, details || '', now]);
  }

  public getActivities(projectId: string, limit: number = 15): ActivityModel[] {
    const db = this.dbService.getAdapter();
    return db.all<ActivityModel>(`
      SELECT * FROM activities
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [projectId, limit]);
  }
}
