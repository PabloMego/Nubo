import { DatabaseService } from './database.service';
import { ProjectService } from './project.service';

export interface TaskModel {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'task' | 'feature' | 'bug' | 'milestone';
  tags: string[];
  due_date?: string;
  checklist: Array<{ id: string; text: string; done: boolean }>;
  campaign_id?: string;
  created_at: string;
  updated_at: string;
}

export class TaskService {
  private static instance: TaskService;
  private dbService: DatabaseService;
  private projectService: ProjectService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.projectService = ProjectService.getInstance();
  }

  public static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  public getByProject(projectId: string): TaskModel[] {
    const db = this.dbService.getAdapter();
    const rows = db.all<any>(`
      SELECT * FROM tasks
      WHERE project_id = ?
      ORDER BY 
        CASE status 
          WHEN 'in_progress' THEN 1 
          WHEN 'todo' THEN 2 
          WHEN 'done' THEN 3 
        END,
        updated_at DESC
    `, [projectId]);

    return rows.map((r) => ({
      ...r,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : (r.tags || []),
      checklist: typeof r.checklist === 'string' ? JSON.parse(r.checklist || '[]') : (r.checklist || [])
    }));
  }

  public create(data: {
    projectId: string;
    title: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    type?: 'task' | 'feature' | 'bug' | 'milestone' | 'launch';
    tags?: string[];
    dueDate?: string;
    campaignId?: string;
    campaign_id?: string;
  }): TaskModel {
    const db = this.dbService.getAdapter();
    const id = 'task_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const campaignId = data.campaignId || data.campaign_id || undefined;

    const task: TaskModel = {
      id,
      project_id: data.projectId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      type: (data.type as any) || 'task',
      tags: data.tags || [],
      due_date: data.dueDate,
      checklist: [],
      campaign_id: campaignId,
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO tasks (id, project_id, title, description, status, priority, type, tags, due_date, checklist, campaign_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.id,
      task.project_id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.type,
      JSON.stringify(task.tags),
      task.due_date || null,
      JSON.stringify(task.checklist),
      task.campaign_id || null,
      task.created_at,
      task.updated_at
    ]);

    this.projectService.addActivity(data.projectId, 'Added task', `Tarea: "${task.title}"`);
    return task;
  }

  public update(id: string, updates: Partial<TaskModel> & { campaignId?: string }): TaskModel | undefined {
    const db = this.dbService.getAdapter();
    const existing = db.get<any>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: TaskModel = {
      id: existing.id,
      project_id: existing.project_id,
      title: updates.title !== undefined ? updates.title.trim() : existing.title,
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      status: updates.status || existing.status,
      priority: updates.priority || existing.priority,
      type: updates.type || existing.type,
      tags: updates.tags !== undefined ? updates.tags : (typeof existing.tags === 'string' ? JSON.parse(existing.tags || '[]') : (existing.tags || [])),
      due_date: updates.due_date !== undefined ? updates.due_date : existing.due_date,
      checklist: updates.checklist !== undefined ? updates.checklist : (typeof existing.checklist === 'string' ? JSON.parse(existing.checklist || '[]') : (existing.checklist || [])),
      campaign_id: updates.campaign_id !== undefined ? updates.campaign_id : (updates.campaignId !== undefined ? updates.campaignId : existing.campaign_id),
      created_at: existing.created_at,
      updated_at: now
    };

    db.run(`
      UPDATE tasks
      SET title = ?, description = ?, status = ?, priority = ?, type = ?, tags = ?, due_date = ?, checklist = ?, campaign_id = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.title,
      updated.description,
      updated.status,
      updated.priority,
      updated.type,
      JSON.stringify(updated.tags),
      updated.due_date || null,
      JSON.stringify(updated.checklist),
      updated.campaign_id || null,
      updated.updated_at,
      id
    ]);

    if (updates.status && updates.status !== existing.status) {
      this.projectService.addActivity(
        updated.project_id,
        'Updated task status',
        `"${updated.title}" -> ${updated.status}`
      );
    }

    return updated;
  }

  public delete(id: string): boolean {
    const db = this.dbService.getAdapter();
    const existing = db.get<any>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!existing) return false;

    db.run('DELETE FROM tasks WHERE id = ?', [id]);
    this.projectService.addActivity(existing.project_id, 'Deleted task', `"${existing.title}"`);
    return true;
  }
}
