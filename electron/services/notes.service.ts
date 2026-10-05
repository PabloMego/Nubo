import { DatabaseService } from './database.service';
import { ProjectService } from './project.service';

export interface NoteModel {
  id: string;
  project_id: string;
  title: string;
  content: string;
  pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export class NotesService {
  private static instance: NotesService;
  private dbService: DatabaseService;
  private projectService: ProjectService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.projectService = ProjectService.getInstance();
  }

  public static getInstance(): NotesService {
    if (!NotesService.instance) {
      NotesService.instance = new NotesService();
    }
    return NotesService.instance;
  }

  public getByProject(projectId: string): NoteModel[] {
    const db = this.dbService.getAdapter();
    const rows = db.all<any>(`
      SELECT * FROM notes
      WHERE project_id = ?
      ORDER BY pinned DESC, updated_at DESC
    `, [projectId]);

    return rows.map((r) => ({
      ...r,
      pinned: r.pinned === 1 || r.pinned === true,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : (r.tags || [])
    }));
  }

  public getById(id: string): NoteModel | undefined {
    const db = this.dbService.getAdapter();
    const r = db.get<any>('SELECT * FROM notes WHERE id = ?', [id]);
    if (!r) return undefined;
    return {
      ...r,
      pinned: r.pinned === 1 || r.pinned === true,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : (r.tags || [])
    };
  }

  public create(data: {
    projectId: string;
    title: string;
    content?: string;
    pinned?: boolean;
    tags?: string[];
  }): NoteModel {
    const db = this.dbService.getAdapter();
    const id = 'note_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const note: NoteModel = {
      id,
      project_id: data.projectId,
      title: data.title.trim() || 'Sin título',
      content: data.content || '',
      pinned: !!data.pinned,
      tags: data.tags || [],
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO notes (id, project_id, title, content, pinned, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      note.id,
      note.project_id,
      note.title,
      note.content,
      note.pinned ? 1 : 0,
      JSON.stringify(note.tags),
      note.created_at,
      note.updated_at
    ]);

    this.projectService.addActivity(data.projectId, 'Created note', `Nota: "${note.title}"`);
    return note;
  }

  public update(id: string, updates: Partial<NoteModel>): NoteModel | undefined {
    const db = this.dbService.getAdapter();
    const existing = this.getById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: NoteModel = {
      ...existing,
      title: updates.title !== undefined ? updates.title.trim() : existing.title,
      content: updates.content !== undefined ? updates.content : existing.content,
      pinned: updates.pinned !== undefined ? updates.pinned : existing.pinned,
      tags: updates.tags !== undefined ? updates.tags : existing.tags,
      updated_at: now
    };

    db.run(`
      UPDATE notes
      SET title = ?, content = ?, pinned = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.title,
      updated.content,
      updated.pinned ? 1 : 0,
      JSON.stringify(updated.tags),
      updated.updated_at,
      id
    ]);

    return updated;
  }

  public delete(id: string): boolean {
    const db = this.dbService.getAdapter();
    const existing = this.getById(id);
    if (!existing) return false;

    db.run('DELETE FROM notes WHERE id = ?', [id]);
    this.projectService.addActivity(existing.project_id, 'Deleted note', `"${existing.title}"`);
    return true;
  }
}
