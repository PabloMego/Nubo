import { DatabaseService } from './database.service';
import { ProjectService } from './project.service';

export interface WebsitePage {
  title: string;
  path: string;
  status: string;
  notes?: string;
}

export interface WebsiteReferenceImage {
  id: string;
  name: string;
  path: string;
  notes?: string;
  created_at: string;
}

export interface WebsiteInfoModel {
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

export class WebsiteService {
  private static instance: WebsiteService;
  private dbService: DatabaseService;
  private projectService: ProjectService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.projectService = ProjectService.getInstance();
  }

  public static getInstance(): WebsiteService {
    if (!WebsiteService.instance) {
      WebsiteService.instance = new WebsiteService();
    }
    return WebsiteService.instance;
  }

  public getByProject(projectId: string): WebsiteInfoModel {
    const db = this.dbService.getAdapter();
    const row = db.get<any>('SELECT * FROM website_info WHERE project_id = ?', [projectId]);
    if (!row) {
      const now = new Date().toISOString();
      const id = 'web_' + projectId;
      const defaultPages = [
        { title: 'Home', path: '/', status: 'In progress', notes: 'Main landing page' },
        { title: 'Pricing', path: '/pricing', status: 'Draft', notes: 'Plans and tiers' }
      ];
      db.run(`
        INSERT INTO website_info (id, project_id, pages, illustrator_file_path, reference_images_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, projectId, JSON.stringify(defaultPages), null, JSON.stringify([]), now, now]);

      return {
        id,
        project_id: projectId,
        pages: defaultPages,
        illustrator_file_path: undefined,
        reference_images: [],
        created_at: now,
        updated_at: now
      };
    }

    return {
      ...row,
      pages: typeof row.pages === 'string' ? JSON.parse(row.pages || '[]') : (row.pages || []),
      illustrator_file_path: row.illustrator_file_path || undefined,
      reference_images: typeof row.reference_images_json === 'string' 
        ? JSON.parse(row.reference_images_json || '[]') 
        : (row.reference_images || [])
    };
  }

  public update(projectId: string, data: Partial<WebsiteInfoModel>): WebsiteInfoModel {
    const existing = this.getByProject(projectId);
    const db = this.dbService.getAdapter();
    const now = new Date().toISOString();

    const updated: WebsiteInfoModel = {
      id: existing.id,
      project_id: projectId,
      url: data.url !== undefined ? data.url : existing.url,
      domain: data.domain !== undefined ? data.domain : existing.domain,
      repository: data.repository !== undefined ? data.repository : existing.repository,
      hosting: data.hosting !== undefined ? data.hosting : existing.hosting,
      seo_title: data.seo_title !== undefined ? data.seo_title : existing.seo_title,
      seo_description: data.seo_description !== undefined ? data.seo_description : existing.seo_description,
      seo_keywords: data.seo_keywords !== undefined ? data.seo_keywords : existing.seo_keywords,
      pages: data.pages !== undefined ? data.pages : existing.pages,
      illustrator_file_path: data.illustrator_file_path !== undefined ? data.illustrator_file_path : existing.illustrator_file_path,
      reference_images: data.reference_images !== undefined ? data.reference_images : (existing.reference_images || []),
      created_at: existing.created_at,
      updated_at: now
    };

    db.run(`
      UPDATE website_info
      SET url = ?, domain = ?, repository = ?, hosting = ?, seo_title = ?, seo_description = ?, seo_keywords = ?, pages = ?, illustrator_file_path = ?, reference_images_json = ?, updated_at = ?
      WHERE project_id = ?
    `, [
      updated.url || null,
      updated.domain || null,
      updated.repository || null,
      updated.hosting || null,
      updated.seo_title || null,
      updated.seo_description || null,
      updated.seo_keywords || null,
      JSON.stringify(updated.pages),
      updated.illustrator_file_path || null,
      JSON.stringify(updated.reference_images || []),
      updated.updated_at,
      projectId
    ]);

    this.projectService.addActivity(projectId, 'Updated website info', 'Datos del sitio web actualizados.');
    return updated;
  }
}
