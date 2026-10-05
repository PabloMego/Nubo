import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { DatabaseService } from './database.service';
import { ProjectService, ProjectModel } from './project.service';
import { SettingsService } from './settings.service';
import { FileService } from './file.service';

const archiver = require('archiver');
const extractZip = require('extract-zip');

export interface NuboProjectPackage {
  format: 'nubo-project-package';
  version: '2.0';
  exportedAt: string;
  originalFolderPath: string;
  project: ProjectModel;
  product_specs?: any;
  brand_assets?: any;
  website_info?: any;
  tasks: any[];
  notes: any[];
  marketing_items: any[];
  marketing_campaigns: any[];
  marketing_accounts: any[];
  marketing_emails: any[];
  marketing_ideas: any[];
  marketing_metrics: any[];
  content_items: any[];
  activities: any[];
}

export class BackupService {
  private static instance: BackupService;
  private dbService: DatabaseService;
  private projectService: ProjectService;
  private settingsService: SettingsService;
  private fileService: FileService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.projectService = ProjectService.getInstance();
    this.settingsService = SettingsService.getInstance();
    this.fileService = FileService.getInstance();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Export an entire project into a portable .nubo archive containing:
   * 1. manifest.json with all database metadata, relations and specs
   * 2. files/ containing the full physical folder structure and assets
   */
  public async exportProject(projectId: string, destinationFilePath: string): Promise<boolean> {
    const db = this.dbService.getAdapter();
    const project = this.projectService.getById(projectId);
    if (!project) throw new Error('Proyecto no encontrado');

    const specs = db.get(`SELECT * FROM product_specs WHERE project_id = ?`, [projectId]) || null;
    const brand = db.get(`SELECT * FROM brand_assets WHERE project_id = ?`, [projectId]) || null;
    const website = db.get(`SELECT * FROM website_info WHERE project_id = ?`, [projectId]) || null;
    const tasks = db.all(`SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];
    const notes = db.all(`SELECT * FROM notes WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];
    const marketing_items = db.all(`SELECT * FROM marketing_items WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];
    const marketing_campaigns = db.all(`SELECT * FROM marketing_campaigns WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];
    const marketing_accounts = db.all(`SELECT * FROM marketing_accounts WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];
    const marketing_emails = db.all(`SELECT * FROM marketing_emails WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];
    const marketing_ideas = db.all(`SELECT * FROM marketing_ideas WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];
    const marketing_metrics = db.all(`SELECT * FROM marketing_metrics WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];
    const content_items = db.all(`SELECT * FROM content_items WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];
    const activities = db.all(`SELECT * FROM activities WHERE project_id = ? ORDER BY created_at ASC`, [projectId]) || [];

    const pkg: NuboProjectPackage = {
      format: 'nubo-project-package',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      originalFolderPath: project.folder_path,
      project,
      product_specs: specs,
      brand_assets: brand,
      website_info: website,
      tasks,
      notes,
      marketing_items,
      marketing_campaigns,
      marketing_accounts,
      marketing_emails,
      marketing_ideas,
      marketing_metrics,
      content_items,
      activities
    };

    // Ensure parent directory for destination exists
    const destDir = path.dirname(destinationFilePath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const output = fs.createWriteStream(destinationFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', (err: any) => reject(err));
      archive.on('error', (err: any) => reject(err));

      archive.pipe(output);

      // Append manifest.json
      archive.append(JSON.stringify(pkg, null, 2), { name: 'manifest.json' });

      // Append all physical project files, skipping heavy caches/locks
      if (project.folder_path && fs.existsSync(project.folder_path)) {
        this.addDirectoryToArchive(archive, project.folder_path, 'files');
      }

      archive.finalize();
    });

    this.projectService.addActivity(
      projectId,
      'Exported project',
      `Proyecto exportado con éxito a ${path.basename(destinationFilePath)}`
    );

    return true;
  }

  /**
   * Import a .nubo (or .zip) archive, unbundle files to storage path,
   * rebase asset paths, and restore all SQLite entities.
   */
  public async importProject(sourceFilePath: string): Promise<ProjectModel> {
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error('El archivo seleccionado no existe.');
    }

    const tempDir = path.join(
      os.tmpdir(),
      `nubo-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    );
    fs.mkdirSync(tempDir, { recursive: true });

    let pkg: NuboProjectPackage | null = null;
    let hasExtractedFiles = false;

    try {
      // 1. Try to extract as ZIP archive (.nubo or .zip)
      await extractZip(sourceFilePath, { dir: tempDir });
      const manifestPath = path.join(tempDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        hasExtractedFiles = fs.existsSync(path.join(tempDir, 'files'));
      }
    } catch (extractErr) {
      // 2. Fallback: check if sourceFilePath was a raw JSON manifest
      try {
        const rawContent = fs.readFileSync(sourceFilePath, 'utf-8');
        const parsed = JSON.parse(rawContent);
        if (parsed && (parsed.format === 'nubo-project-package' || parsed.project)) {
          pkg = parsed;
          hasExtractedFiles = false;
        }
      } catch {
        // Clean up tempDir
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        throw new Error(`El archivo seleccionado no es un paquete válido de Nubo: ${extractErr}`);
      }
    }

    if (!pkg || !pkg.project) {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      throw new Error('El paquete no contiene un manifiesto de proyecto válido.');
    }

    // Determine target folder in current user's storage path
    const settings = this.settingsService.getSettings();
    const defaultStorage = app ? path.join(app.getPath('documents'), 'Nubo') : path.join(process.cwd(), 'NuboProjects');
    const baseFolder = settings.storagePath || defaultStorage;
    if (!fs.existsSync(baseFolder)) {
      fs.mkdirSync(baseFolder, { recursive: true });
    }

    const originalName = (pkg.project.name || 'Proyecto Importado').trim();
    const db = this.dbService.getAdapter();

    // Check if folder or DB project name collides
    let candidateName = originalName;
    let safeName = candidateName.replace(/[<>:"/\\|?*]/g, '_').trim();
    let targetFolderPath = path.join(baseFolder, safeName);

    const existingProject = db.get(`SELECT id FROM projects WHERE name = ?`, [originalName]);

    if (fs.existsSync(targetFolderPath) || existingProject) {
      let counter = 1;
      candidateName = `${originalName} (Importado)`;
      safeName = candidateName.replace(/[<>:"/\\|?*]/g, '_').trim();
      targetFolderPath = path.join(baseFolder, safeName);

      while (fs.existsSync(targetFolderPath) || db.get(`SELECT id FROM projects WHERE name = ?`, [candidateName])) {
        counter++;
        candidateName = `${originalName} (Importado ${counter})`;
        safeName = candidateName.replace(/[<>:"/\\|?*]/g, '_').trim();
        targetFolderPath = path.join(baseFolder, safeName);
      }
    }

    fs.mkdirSync(targetFolderPath, { recursive: true });

    // Copy extracted physical files
    if (hasExtractedFiles) {
      const extractedFilesDir = path.join(tempDir, 'files');
      try {
        fs.cpSync(extractedFilesDir, targetFolderPath, { recursive: true });
      } catch (cpErr) {
        console.error('[BackupService] Error copying extracted project files:', cpErr);
      }
    }

    // Ensure all standard folders exist
    this.fileService.createProjectFolderStructure(targetFolderPath);
    this.fileService.ensureBrandFolderStructure(targetFolderPath);

    // Path Rebasing Helper
    const oldRoot = pkg.originalFolderPath || pkg.project.folder_path;
    const rebasePath = (oldPath: string | null | undefined): string | null | undefined => {
      if (!oldPath || typeof oldPath !== 'string' || oldPath.trim() === '') return oldPath;
      const trimmed = oldPath.trim();

      if (oldRoot) {
        try {
          const rel = path.relative(oldRoot, trimmed);
          if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
            return path.join(targetFolderPath, rel);
          }
        } catch {}
      }

      // Check if file exists inside target folder under common locations
      const base = path.basename(trimmed);
      const candidates = [
        path.join(targetFolderPath, 'Brand', 'Logos', base),
        path.join(targetFolderPath, 'Brand', 'Banners', base),
        path.join(targetFolderPath, 'Brand', 'Manual', base),
        path.join(targetFolderPath, 'Brand', 'Graphics', base),
        path.join(targetFolderPath, 'Brand', 'Fonts', base),
        path.join(targetFolderPath, 'Website', 'Design', base),
        path.join(targetFolderPath, 'Website', 'Referencias', base),
        path.join(targetFolderPath, 'Website', 'Proyecto', base),
        path.join(targetFolderPath, 'Files', base),
        path.join(targetFolderPath, base)
      ];

      for (const c of candidates) {
        if (fs.existsSync(c)) {
          return c;
        }
      }

      return trimmed;
    };

    // Generate fresh unique Project ID
    const newProjectId = 'proj_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    // 1. Insert Project record
    const rebasedLogo = rebasePath(pkg.project.logo) || pkg.project.logo || '';
    db.run(`
      INSERT INTO projects (id, name, description, logo, color, website, github, status, progress, folder_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newProjectId,
      candidateName,
      pkg.project.description || '',
      rebasedLogo,
      pkg.project.color || '#111111',
      pkg.project.website || '',
      pkg.project.github || '',
      pkg.project.status || 'active',
      pkg.project.progress || 0,
      targetFolderPath,
      pkg.project.created_at || now,
      now
    ]);

    // 2. Insert Product Specs
    const specs = pkg.product_specs;
    if (specs) {
      const specId = 'spec_' + newProjectId;
      db.run(`
        INSERT INTO product_specs (id, project_id, what_is_it, problem_solved, target_audience, goals, features_json, user_flows, general_requirements, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        specId,
        newProjectId,
        specs.what_is_it || '',
        specs.problem_solved || '',
        specs.target_audience || '',
        specs.goals || '',
        specs.features_json || '[]',
        specs.user_flows || '',
        specs.general_requirements || '',
        now,
        now
      ]);
    }

    // 3. Insert Brand Assets
    const brand = pkg.brand_assets || (pkg as any).brand;
    const brandId = 'brand_' + newProjectId;
    if (brand) {
      let rebasedAssetFiles = brand.asset_files_json || '[]';
      try {
        const list = JSON.parse(rebasedAssetFiles);
        if (Array.isArray(list)) {
          list.forEach((item: any) => {
            if (item && item.path) item.path = rebasePath(item.path);
          });
          rebasedAssetFiles = JSON.stringify(list);
        }
      } catch {}

      db.run(`
        INSERT INTO brand_assets (
          id, project_id, primary_logo, primary_logo_path, alternative_logo, alternative_logo_path,
          favicon, favicon_path, banner, banner_path, brand_manual_pdf, brand_manual_path,
          what_is_it, mission, primary_color, secondary_color, accent_color,
          typography, secondary_typography, guidelines, colors_json, graphics_json, asset_files_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        brandId,
        newProjectId,
        brand.primary_logo || null,
        rebasePath(brand.primary_logo_path) || null,
        brand.alternative_logo || null,
        rebasePath(brand.alternative_logo_path) || null,
        brand.favicon || null,
        rebasePath(brand.favicon_path) || null,
        brand.banner || null,
        rebasePath(brand.banner_path) || null,
        brand.brand_manual_pdf || null,
        rebasePath(brand.brand_manual_path) || null,
        brand.what_is_it || '',
        brand.mission || '',
        brand.primary_color || '#111111',
        brand.secondary_color || '#FAFAFA',
        brand.accent_color || pkg.project.color || '#111111',
        brand.typography || 'Inter, -apple-system, sans-serif',
        brand.secondary_typography || 'Inter, sans-serif',
        brand.guidelines || '',
        brand.colors_json || '[]',
        brand.graphics_json || '[]',
        rebasedAssetFiles,
        now,
        now
      ]);
    } else {
      db.run(`
        INSERT INTO brand_assets (id, project_id, primary_color, secondary_color, accent_color, typography, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [brandId, newProjectId, '#111111', '#FAFAFA', pkg.project.color || '#111111', 'Inter, -apple-system, sans-serif', now, now]);
    }

    // 4. Insert Website Info
    const website = pkg.website_info || (pkg as any).website;
    const websiteId = 'web_' + newProjectId;
    if (website) {
      let rebasedRefs = website.reference_images_json || '[]';
      try {
        const list = JSON.parse(rebasedRefs);
        if (Array.isArray(list)) {
          list.forEach((item: any) => {
            if (typeof item === 'string') item = rebasePath(item);
            else if (item && item.path) item.path = rebasePath(item.path);
          });
          rebasedRefs = JSON.stringify(list);
        }
      } catch {}

      db.run(`
        INSERT INTO website_info (
          id, project_id, url, domain, repository, hosting,
          seo_title, seo_description, seo_keywords, pages,
          illustrator_file_path, reference_images_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        websiteId,
        newProjectId,
        website.url || '',
        website.domain || '',
        website.repository || '',
        website.hosting || '',
        website.seo_title || candidateName,
        website.seo_description || '',
        website.seo_keywords || '',
        website.pages || '[]',
        rebasePath(website.illustrator_file_path) || null,
        rebasedRefs,
        now,
        now
      ]);
    } else {
      db.run(`
        INSERT INTO website_info (id, project_id, url, repository, seo_title, pages, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [websiteId, newProjectId, pkg.project.website || '', pkg.project.github || '', candidateName, '[]', now, now]);
    }

    // 5. Campaigns Mapping
    const campaignIdMap = new Map<string, string>();
    const campaigns = Array.isArray(pkg.marketing_campaigns) ? pkg.marketing_campaigns : [];
    for (const c of campaigns) {
      const newCampId = 'camp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      campaignIdMap.set(c.id, newCampId);
      db.run(`
        INSERT INTO marketing_campaigns (id, project_id, name, description, goal, start_date, end_date, status, channels_json, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newCampId,
        newProjectId,
        c.name,
        c.description || '',
        c.goal || '',
        c.start_date || null,
        c.end_date || null,
        c.status || 'Planned',
        c.channels_json || '[]',
        c.notes || '',
        c.created_at || now,
        now
      ]);
    }

    // 6. Marketing Ideas Mapping
    const ideaIdMap = new Map<string, string>();
    const ideas = Array.isArray(pkg.marketing_ideas) ? pkg.marketing_ideas : [];
    for (const i of ideas) {
      const newIdeaId = 'idea_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      ideaIdMap.set(i.id, newIdeaId);
      const remappedCampId = i.campaign_id ? campaignIdMap.get(i.campaign_id) || null : null;
      db.run(`
        INSERT INTO marketing_ideas (id, project_id, campaign_id, title, description, goal, channel, priority, status, expected_result, date, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newIdeaId,
        newProjectId,
        remappedCampId,
        i.title,
        i.description || '',
        i.goal || '',
        i.channel || '',
        i.priority || 'Medium',
        i.status || 'Idea',
        i.expected_result || '',
        i.date || null,
        i.notes || '',
        i.created_at || now,
        now
      ]);
    }

    // 7. Tasks
    const tasks = Array.isArray(pkg.tasks) ? pkg.tasks : [];
    for (const t of tasks) {
      const newTaskId = 'task_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const remappedCampId = t.campaign_id ? campaignIdMap.get(t.campaign_id) || null : null;
      db.run(`
        INSERT INTO tasks (id, project_id, campaign_id, title, description, status, priority, type, tags, due_date, checklist, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newTaskId,
        newProjectId,
        remappedCampId,
        t.title,
        t.description || '',
        t.status || 'todo',
        t.priority || 'medium',
        t.type || 'task',
        typeof t.tags === 'string' ? t.tags : JSON.stringify(t.tags || []),
        t.due_date || null,
        typeof t.checklist === 'string' ? t.checklist : JSON.stringify(t.checklist || []),
        t.created_at || now,
        now
      ]);
    }

    // 8. Notes
    const notes = Array.isArray(pkg.notes) ? pkg.notes : [];
    for (const n of notes) {
      const newNoteId = 'note_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      db.run(`
        INSERT INTO notes (id, project_id, title, content, pinned, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newNoteId,
        newProjectId,
        n.title,
        n.content || '',
        n.pinned ? 1 : 0,
        typeof n.tags === 'string' ? n.tags : JSON.stringify(n.tags || []),
        n.created_at || now,
        now
      ]);
    }

    // 9. Marketing Accounts
    const accounts = Array.isArray(pkg.marketing_accounts) ? pkg.marketing_accounts : [];
    for (const a of accounts) {
      const newAccId = 'acc_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      db.run(`
        INSERT INTO marketing_accounts (id, project_id, platform, username, url, email, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newAccId,
        newProjectId,
        a.platform,
        a.username || '',
        a.url || '',
        a.email || '',
        a.status || 'Not Created',
        a.notes || '',
        a.created_at || now,
        now
      ]);
    }

    // 10. Marketing Emails
    const emails = Array.isArray(pkg.marketing_emails) ? pkg.marketing_emails : [];
    for (const em of emails) {
      const newEmailId = 'email_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      db.run(`
        INSERT INTO marketing_emails (id, project_id, email, type, usage, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newEmailId,
        newProjectId,
        em.email,
        em.type,
        em.usage || '',
        em.notes || '',
        em.created_at || now,
        now
      ]);
    }

    // 11. Marketing Metrics
    const metrics = Array.isArray(pkg.marketing_metrics) ? pkg.marketing_metrics : [];
    for (const m of metrics) {
      const newMetricId = 'metric_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const remappedTargetId = (m.target_id && campaignIdMap.has(m.target_id)) ? campaignIdMap.get(m.target_id) : m.target_id;
      db.run(`
        INSERT INTO marketing_metrics (id, project_id, target_type, target_id, platform, metric_name, value, date, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newMetricId,
        newProjectId,
        m.target_type,
        remappedTargetId || null,
        m.platform || '',
        m.metric_name,
        m.value || 0,
        m.date || now,
        m.notes || '',
        m.created_at || now
      ]);
    }

    // 12. Content Items
    const content = Array.isArray(pkg.content_items)
      ? pkg.content_items
      : (Array.isArray((pkg as any).content) ? (pkg as any).content : []);
    for (const ci of content) {
      const newContentId = 'content_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const remappedCampId = ci.campaign_id ? campaignIdMap.get(ci.campaign_id) || null : null;
      const remappedIdeaId = ci.parent_idea_id ? ideaIdMap.get(ci.parent_idea_id) || null : null;
      db.run(`
        INSERT INTO content_items (
          id, project_id, campaign_id, parent_idea_id, title, platform, format,
          status, scheduled_date, description, script, hook, cta, hashtags,
          notes, goal, published_url, thumbnail, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newContentId,
        newProjectId,
        remappedCampId,
        remappedIdeaId,
        ci.title,
        ci.platform,
        ci.format || 'Other',
        ci.status || 'Idea',
        ci.scheduled_date || null,
        ci.description || '',
        ci.script || '',
        ci.hook || '',
        ci.cta || '',
        ci.hashtags || '',
        ci.notes || '',
        ci.goal || '',
        ci.published_url || '',
        ci.thumbnail || '',
        ci.created_at || now,
        now
      ]);
    }

    // 13. Marketing Items (legacy)
    const marketingItems = Array.isArray(pkg.marketing_items)
      ? pkg.marketing_items
      : (Array.isArray((pkg as any).marketing) ? (pkg as any).marketing : []);
    for (const mi of marketingItems) {
      const newMktId = 'mkt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      db.run(`
        INSERT INTO marketing_items (id, project_id, channel, title, description, status, target_date, metrics, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newMktId,
        newProjectId,
        mi.channel || 'General',
        mi.title,
        mi.description || '',
        mi.status || 'Idea',
        mi.target_date || null,
        mi.metrics || '',
        mi.created_at || now,
        now
      ]);
    }

    // 14. Activities
    const activities = Array.isArray(pkg.activities) ? pkg.activities : [];
    for (const act of activities) {
      const newActId = 'act_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      db.run(`
        INSERT INTO activities (id, project_id, action, details, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
        newActId,
        newProjectId,
        act.action,
        act.details || '',
        act.created_at || now
      ]);
    }

    // Log Activity for Import
    this.projectService.addActivity(
      newProjectId,
      'Imported project',
      `Proyecto "${candidateName}" importado con éxito desde archivo .nubo`
    );

    // Clean up temporary extraction folder
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('[BackupService] Could not remove temp directory:', e);
    }

    const importedProject = this.projectService.getById(newProjectId);
    if (!importedProject) {
      throw new Error('Error al inicializar el proyecto importado.');
    }

    return importedProject;
  }

  /**
   * Recursively adds directory contents to the zip archive, ignoring caches and lock files.
   */
  private addDirectoryToArchive(archive: any, currentDir: string, prefixInZip: string): void {
    const IGNORED_DIRS = new Set([
      'node_modules',
      '.vite',
      'dist',
      'build',
      '.cache',
      '.git',
      '.next',
      '.nuxt'
    ]);
    const IGNORED_FILES = new Set([
      '.DS_Store',
      'Thumbs.db',
      'desktop.ini'
    ]);

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (IGNORED_DIRS.has(entry.name)) continue;
          const subDirPath = path.join(currentDir, entry.name);
          const nextPrefix = prefixInZip ? `${prefixInZip}/${entry.name}` : entry.name;
          this.addDirectoryToArchive(archive, subDirPath, nextPrefix);
        } else if (entry.isFile()) {
          if (IGNORED_FILES.has(entry.name)) continue;
          if (entry.name.startsWith('~$') || entry.name.endsWith('.tmp')) continue;

          const filePath = path.join(currentDir, entry.name);
          const zipEntryName = prefixInZip ? `${prefixInZip}/${entry.name}` : entry.name;
          archive.file(filePath, { name: zipEntryName.replace(/\\/g, '/') });
        }
      }
    } catch (err) {
      console.warn(`[BackupService] Warning reading directory for export: ${currentDir}`, err);
    }
  }
}
