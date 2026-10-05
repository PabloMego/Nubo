import path from 'path';
import fs from 'fs';
import { DatabaseService } from './database.service';

export interface SearchResultItem {
  id: string;
  type: 'project' | 'task' | 'file' | 'note' | 'brand' | 'marketing' | 'content';
  title: string;
  subtitle: string;
  projectId?: string;
  projectName?: string;
  actionPayload?: any;
}

export class SearchService {
  private static instance: SearchService;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  public search(query: string, currentProjectId?: string): SearchResultItem[] {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const db = this.dbService.getAdapter();
    const results: SearchResultItem[] = [];

    // 1. Projects
    const projects = db.all<any>(`
      SELECT id, name, description, status FROM projects
      WHERE lower(name) LIKE ? OR lower(description) LIKE ?
      LIMIT 6
    `, [`%${q}%`, `%${q}%`]);

    for (const p of projects) {
      results.push({
        id: p.id,
        type: 'project',
        title: p.name,
        subtitle: p.description ? `Proyecto • ${p.description.substring(0, 45)}` : 'Proyecto',
        projectId: p.id,
        projectName: p.name,
        actionPayload: { section: 'overview', projectId: p.id }
      });
    }

    // 2. Tasks
    const tasks = db.all<any>(`
      SELECT t.id, t.title, t.status, t.project_id, p.name as project_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE lower(t.title) LIKE ? OR lower(t.description) LIKE ?
      LIMIT 8
    `, [`%${q}%`, `%${q}%`]);

    for (const t of tasks) {
      results.push({
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: `Tarea [${t.status}] • ${t.project_name}`,
        projectId: t.project_id,
        projectName: t.project_name,
        actionPayload: { section: 'development', projectId: t.project_id, taskId: t.id }
      });
    }

    // 3. Notes
    const notes = db.all<any>(`
      SELECT n.id, n.title, n.project_id, p.name as project_name
      FROM notes n
      JOIN projects p ON p.id = n.project_id
      WHERE lower(n.title) LIKE ? OR lower(n.content) LIKE ?
      LIMIT 6
    `, [`%${q}%`, `%${q}%`]);

    for (const n of notes) {
      results.push({
        id: n.id,
        type: 'note',
        title: n.title,
        subtitle: `Nota • ${n.project_name}`,
        projectId: n.project_id,
        projectName: n.project_name,
        actionPayload: { section: 'notes', projectId: n.project_id, noteId: n.id }
      });
    }

    // 4. Marketing / Content
    const marketing = db.all<any>(`
      SELECT m.id, m.title, m.channel, m.project_id, p.name as project_name
      FROM marketing_items m
      JOIN projects p ON p.id = m.project_id
      WHERE lower(m.title) LIKE ?
      LIMIT 4
    `, [`%${q}%`]);

    for (const m of marketing) {
      results.push({
        id: m.id,
        type: 'marketing',
        title: m.title,
        subtitle: `Marketing [${m.channel}] • ${m.project_name}`,
        projectId: m.project_id,
        projectName: m.project_name,
        actionPayload: { section: 'marketing', projectId: m.project_id }
      });
    }

    // 5. Files on disk for active or found projects
    try {
      const allProjects = db.all<any>('SELECT id, name, folder_path FROM projects LIMIT 10');
      for (const p of allProjects) {
        if (!p.folder_path || !fs.existsSync(p.folder_path)) continue;
        const subfolders = ['Brand', 'Website', 'Marketing', 'Content', 'Development', 'Files', 'Notes'];
        for (const sub of subfolders) {
          const target = path.join(p.folder_path, sub);
          if (!fs.existsSync(target)) continue;
          const files = fs.readdirSync(target);
          for (const f of files) {
            if (f.toLowerCase().includes(q)) {
              results.push({
                id: `file_${p.id}_${sub}_${f}`,
                type: 'file',
                title: f,
                subtitle: `Archivo en ${sub} • ${p.name}`,
                projectId: p.id,
                projectName: p.name,
                actionPayload: {
                  section: 'files',
                  projectId: p.id,
                  filePath: path.join(target, f),
                  folder: sub
                }
              });
              if (results.length >= 25) break;
            }
          }
          if (results.length >= 25) break;
        }
        if (results.length >= 25) break;
      }
    } catch (e) {
      console.warn('Search file scan error:', e);
    }

    return results.slice(0, 20);
  }
}
