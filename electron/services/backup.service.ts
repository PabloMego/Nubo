import fs from 'fs';
import path from 'path';
import { DatabaseService } from './database.service';
import { ProjectService, ProjectModel } from './project.service';
import { TaskService } from './task.service';
import { BrandService } from './brand.service';
import { WebsiteService } from './website.service';
import { MarketingService } from './marketing.service';
import { ContentService } from './content.service';
import { NotesService } from './notes.service';

export interface NuboProjectPackage {
  format: 'nubo-project-package';
  version: '1.0';
  exportedAt: string;
  project: ProjectModel;
  brand: any;
  website: any;
  tasks: any[];
  notes: any[];
  marketing: any[];
  content: any[];
}

export class BackupService {
  private static instance: BackupService;
  private dbService: DatabaseService;
  private projectService: ProjectService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.projectService = ProjectService.getInstance();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  public exportProjectToJson(projectId: string, destinationFilePath: string): boolean {
    const project = this.projectService.getById(projectId);
    if (!project) throw new Error('Project not found');

    const brand = BrandService.getInstance().getByProject(projectId);
    const website = WebsiteService.getInstance().getByProject(projectId);
    const tasks = TaskService.getInstance().getByProject(projectId);
    const notes = NotesService.getInstance().getByProject(projectId);
    const marketing = MarketingService.getInstance().getByProject(projectId);
    const content = ContentService.getInstance().getByProject(projectId);

    const pkg: NuboProjectPackage = {
      format: 'nubo-project-package',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project,
      brand,
      website,
      tasks,
      notes,
      marketing,
      content
    };

    fs.writeFileSync(destinationFilePath, JSON.stringify(pkg, null, 2), 'utf-8');
    this.projectService.addActivity(projectId, 'Exported project', `Exportado a ${path.basename(destinationFilePath)}`);
    return true;
  }

  public importProjectFromJson(sourceFilePath: string): ProjectModel {
    if (!fs.existsSync(sourceFilePath)) throw new Error('File does not exist');
    const content = fs.readFileSync(sourceFilePath, 'utf-8');
    const pkg: NuboProjectPackage = JSON.parse(content);

    if (pkg.format !== 'nubo-project-package') {
      throw new Error('Formato de archivo inválido para proyecto Nubo');
    }

    const originalProject = pkg.project;
    const newProject = this.projectService.create({
      name: `${originalProject.name} (Importado)`,
      description: originalProject.description,
      logo: originalProject.logo,
      color: originalProject.color,
      website: originalProject.website,
      github: originalProject.github,
      status: originalProject.status
    });

    const newId = newProject.id;

    // Import brand
    if (pkg.brand) {
      BrandService.getInstance().update(newId, {
        primary_color: pkg.brand.primary_color,
        secondary_color: pkg.brand.secondary_color,
        accent_color: pkg.brand.accent_color,
        typography: pkg.brand.typography,
        guidelines: pkg.brand.guidelines
      });
    }

    // Import website
    if (pkg.website) {
      WebsiteService.getInstance().update(newId, {
        url: pkg.website.url,
        domain: pkg.website.domain,
        repository: pkg.website.repository,
        hosting: pkg.website.hosting,
        seo_title: pkg.website.seo_title,
        seo_description: pkg.website.seo_description,
        seo_keywords: pkg.website.seo_keywords,
        pages: pkg.website.pages
      });
    }

    // Import tasks
    if (Array.isArray(pkg.tasks)) {
      for (const t of pkg.tasks) {
        TaskService.getInstance().create({
          projectId: newId,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          type: t.type,
          tags: t.tags,
          dueDate: t.due_date
        });
      }
    }

    // Import notes
    if (Array.isArray(pkg.notes)) {
      for (const n of pkg.notes) {
        NotesService.getInstance().create({
          projectId: newId,
          title: n.title,
          content: n.content,
          pinned: n.pinned,
          tags: n.tags
        });
      }
    }

    // Import marketing
    if (Array.isArray(pkg.marketing)) {
      for (const m of pkg.marketing) {
        MarketingService.getInstance().create({
          projectId: newId,
          channel: m.channel,
          title: m.title,
          description: m.description,
          status: m.status,
          targetDate: m.target_date
        });
      }
    }

    // Import content
    if (Array.isArray(pkg.content)) {
      for (const c of pkg.content) {
        ContentService.getInstance().create({
          projectId: newId,
          title: c.title,
          platform: c.platform,
          status: c.status,
          scheduledDate: c.scheduled_date,
          description: c.description,
          script: c.script,
          publishedUrl: c.published_url
        });
      }
    }

    return newProject;
  }
}
