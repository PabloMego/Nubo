import path from 'path';
import fs from 'fs';
import { DatabaseService, DatabaseAdapter } from './database.service';
import { ProjectService } from './project.service';
import { FileService } from './file.service';

export interface BrandAssetModel {
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

export class BrandService {
  private static instance: BrandService;
  private dbService: DatabaseService;
  private projectService: ProjectService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.projectService = ProjectService.getInstance();
  }

  public static getInstance(): BrandService {
    if (!BrandService.instance) {
      BrandService.instance = new BrandService();
    }
    return BrandService.instance;
  }

  private ensureBrandColumns(db: DatabaseAdapter): void {
    const brandMigrations = [
      'ALTER TABLE brand_assets ADD COLUMN primary_logo_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN alternative_logo_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN favicon_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN banner TEXT',
      'ALTER TABLE brand_assets ADD COLUMN banner_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN brand_manual_pdf TEXT',
      'ALTER TABLE brand_assets ADD COLUMN brand_manual_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN what_is_it TEXT',
      'ALTER TABLE brand_assets ADD COLUMN mission TEXT',
      'ALTER TABLE brand_assets ADD COLUMN secondary_typography TEXT DEFAULT "Inter, sans-serif"',
      'ALTER TABLE brand_assets ADD COLUMN colors_json TEXT DEFAULT "[]"',
      'ALTER TABLE brand_assets ADD COLUMN graphics_json TEXT DEFAULT "[]"',
      'ALTER TABLE brand_assets ADD COLUMN asset_files_json TEXT DEFAULT "[]"',
      'ALTER TABLE brand_assets ADD COLUMN illustrator_file_path TEXT'
    ];

    for (const sql of brandMigrations) {
      try {
        db.run(sql);
      } catch {
        // column already exists
      }
    }
  }

  public getByProject(projectId: string): BrandAssetModel | undefined {
    const project = this.projectService.getById(projectId);
    if (project && project.folder_path) {
      FileService.getInstance().ensureBrandFolderStructure(project.folder_path);
    }

    const db = this.dbService.getAdapter();
    this.ensureBrandColumns(db);

    let row = db.get<BrandAssetModel>('SELECT * FROM brand_assets WHERE project_id = ?', [projectId]);
    if (!row) {
      // Create if missing
      const now = new Date().toISOString();
      const id = 'brand_' + projectId;
      db.run(`
        INSERT INTO brand_assets (id, project_id, primary_color, secondary_color, accent_color, typography, secondary_typography, created_at, updated_at)
        VALUES (?, ?, '#111111', '#F5F5F5', '#111111', 'Inter, system-ui', 'Inter, sans-serif', ?, ?)
      `, [id, projectId, now, now]);
      row = db.get<BrandAssetModel>('SELECT * FROM brand_assets WHERE project_id = ?', [projectId]);
    }

    if (row) {
      // Hydrate image base64 if path exists on disk but base64 is empty
      if (row.banner_path && !row.banner && fs.existsSync(row.banner_path)) {
        const res = FileService.getInstance().readFileAsBase64(row.banner_path);
        if (res) row.banner = res.base64;
      }
      if (row.primary_logo_path && !row.primary_logo && fs.existsSync(row.primary_logo_path)) {
        const res = FileService.getInstance().readFileAsBase64(row.primary_logo_path);
        if (res) row.primary_logo = res.base64;
      }
      if (row.alternative_logo_path && !row.alternative_logo && fs.existsSync(row.alternative_logo_path)) {
        const res = FileService.getInstance().readFileAsBase64(row.alternative_logo_path);
        if (res) row.alternative_logo = res.base64;
      }
      if (row.favicon_path && !row.favicon && fs.existsSync(row.favicon_path)) {
        const res = FileService.getInstance().readFileAsBase64(row.favicon_path);
        if (res) row.favicon = res.base64;
      }
      if (row.brand_manual_path && !row.brand_manual_pdf && fs.existsSync(row.brand_manual_path)) {
        const res = FileService.getInstance().readFileAsBase64(row.brand_manual_path);
        if (res) row.brand_manual_pdf = res.base64;
      }
      // If manual path not set but a PDF exists in Brand/Manual
      if (!row.brand_manual_path && project && project.folder_path) {
        const manualDir = path.join(project.folder_path, 'Brand', 'Manual');
        if (fs.existsSync(manualDir)) {
          const pdfs = fs.readdirSync(manualDir).filter(f => f.toLowerCase().endsWith('.pdf'));
          if (pdfs.length > 0) {
            row.brand_manual_path = path.join(manualDir, pdfs[0]);
            const res = FileService.getInstance().readFileAsBase64(row.brand_manual_path);
            if (res) row.brand_manual_pdf = res.base64;
          }
        }
      }
    }

    return row;
  }

  public update(projectId: string, data: Partial<BrandAssetModel>): BrandAssetModel {
    const project = this.projectService.getById(projectId);
    if (project && project.folder_path) {
      FileService.getInstance().ensureBrandFolderStructure(project.folder_path);
    }
    const db = this.dbService.getAdapter();
    this.ensureBrandColumns(db);

    const existing = this.getByProject(projectId);
    const now = new Date().toISOString();

    const updated: BrandAssetModel = {
      id: existing ? existing.id : 'brand_' + projectId,
      project_id: projectId,
      primary_logo: data.primary_logo !== undefined ? data.primary_logo : existing?.primary_logo,
      primary_logo_path: data.primary_logo_path !== undefined ? data.primary_logo_path : existing?.primary_logo_path,
      alternative_logo: data.alternative_logo !== undefined ? data.alternative_logo : existing?.alternative_logo,
      alternative_logo_path: data.alternative_logo_path !== undefined ? data.alternative_logo_path : existing?.alternative_logo_path,
      favicon: data.favicon !== undefined ? data.favicon : existing?.favicon,
      favicon_path: data.favicon_path !== undefined ? data.favicon_path : existing?.favicon_path,
      banner: data.banner !== undefined ? data.banner : existing?.banner,
      banner_path: data.banner_path !== undefined ? data.banner_path : existing?.banner_path,
      brand_manual_pdf: data.brand_manual_pdf !== undefined ? data.brand_manual_pdf : existing?.brand_manual_pdf,
      brand_manual_path: data.brand_manual_path !== undefined ? data.brand_manual_path : existing?.brand_manual_path,
      what_is_it: data.what_is_it !== undefined ? data.what_is_it : existing?.what_is_it,
      mission: data.mission !== undefined ? data.mission : existing?.mission,
      primary_color: data.primary_color || existing?.primary_color || '#111111',
      secondary_color: data.secondary_color || existing?.secondary_color || '#F5F5F5',
      accent_color: data.accent_color || existing?.accent_color || '#111111',
      typography: data.typography || existing?.typography || 'Inter, system-ui',
      secondary_typography: data.secondary_typography || existing?.secondary_typography || 'Inter, sans-serif',
      guidelines: data.guidelines !== undefined ? data.guidelines : existing?.guidelines,
      colors_json: data.colors_json !== undefined ? data.colors_json : existing?.colors_json,
      graphics_json: data.graphics_json !== undefined ? data.graphics_json : existing?.graphics_json,
      asset_files_json: data.asset_files_json !== undefined ? data.asset_files_json : existing?.asset_files_json,
      created_at: existing ? existing.created_at : now,
      updated_at: now
    };

    // If banner_path exists but banner was not passed, load it
    if (updated.banner_path && !updated.banner && fs.existsSync(updated.banner_path)) {
      const res = FileService.getInstance().readFileAsBase64(updated.banner_path);
      if (res) updated.banner = res.base64;
    }

    try {
      db.run(`
        INSERT INTO brand_assets (
          id, project_id, primary_logo, primary_logo_path, alternative_logo, alternative_logo_path,
          favicon, favicon_path, banner, banner_path, brand_manual_pdf, brand_manual_path,
          what_is_it, mission, primary_color, secondary_color, accent_color, typography,
          secondary_typography, guidelines, colors_json, graphics_json, asset_files_json,
          illustrator_file_path, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id) DO UPDATE SET
          primary_logo = excluded.primary_logo,
          primary_logo_path = excluded.primary_logo_path,
          alternative_logo = excluded.alternative_logo,
          alternative_logo_path = excluded.alternative_logo_path,
          favicon = excluded.favicon,
          favicon_path = excluded.favicon_path,
          banner = excluded.banner,
          banner_path = excluded.banner_path,
          brand_manual_pdf = excluded.brand_manual_pdf,
          brand_manual_path = excluded.brand_manual_path,
          what_is_it = excluded.what_is_it,
          mission = excluded.mission,
          primary_color = excluded.primary_color,
          secondary_color = excluded.secondary_color,
          accent_color = excluded.accent_color,
          typography = excluded.typography,
          secondary_typography = excluded.secondary_typography,
          guidelines = excluded.guidelines,
          colors_json = excluded.colors_json,
          graphics_json = excluded.graphics_json,
          asset_files_json = excluded.asset_files_json,
          illustrator_file_path = excluded.illustrator_file_path,
          updated_at = excluded.updated_at
      `, [
        updated.id,
        updated.project_id,
        updated.primary_logo || null,
        updated.primary_logo_path || null,
        updated.alternative_logo || null,
        updated.alternative_logo_path || null,
        updated.favicon || null,
        updated.favicon_path || null,
        updated.banner || null,
        updated.banner_path || null,
        updated.brand_manual_pdf || null,
        updated.brand_manual_path || null,
        updated.what_is_it || null,
        updated.mission || null,
        updated.primary_color,
        updated.secondary_color,
        updated.accent_color,
        updated.typography,
        updated.secondary_typography || 'Inter, sans-serif',
        updated.guidelines || null,
        updated.colors_json || '[]',
        updated.graphics_json || '[]',
        updated.asset_files_json || '[]',
        updated.illustrator_file_path || null,
        updated.created_at,
        updated.updated_at
      ]);
    } catch (err) {
      console.error('[BrandService] Error updating brand_assets:', err);
      throw err;
    }

    this.projectService.addActivity(projectId, 'Updated brand', 'Identidad de marca actualizada.');
    return updated;
  }
}
