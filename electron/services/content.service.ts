import { DatabaseService } from './database.service';
import { ProjectService } from './project.service';

export interface ContentItemModel {
  id: string;
  project_id: string;
  title: string;
  platform: string;
  format?: string;
  topic?: string;
  status: string;
  scheduled_date?: string;
  campaign_id?: string;
  parent_idea_id?: string;
  goal?: string;
  hook?: string;
  script?: string;
  cta?: string;
  description: string;
  hashtags?: string;
  published_url?: string;
  thumbnail?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class ContentService {
  private static instance: ContentService;
  private dbService: DatabaseService;
  private projectService: ProjectService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.projectService = ProjectService.getInstance();
  }

  public static getInstance(): ContentService {
    if (!ContentService.instance) {
      ContentService.instance = new ContentService();
    }
    return ContentService.instance;
  }

  public getByProject(projectId: string): ContentItemModel[] {
    const db = this.dbService.getAdapter();
    return db.all<ContentItemModel>(`
      SELECT * FROM content_items
      WHERE project_id = ?
      ORDER BY updated_at DESC
    `, [projectId]);
  }

  public create(data: {
    projectId: string;
    title: string;
    platform: string;
    format?: string;
    topic?: string;
    status?: string;
    scheduledDate?: string;
    campaignId?: string;
    parentIdeaId?: string;
    goal?: string;
    hook?: string;
    script?: string;
    cta?: string;
    description?: string;
    hashtags?: string;
    publishedUrl?: string;
    thumbnail?: string;
    notes?: string;
  }): ContentItemModel {
    const db = this.dbService.getAdapter();
    const id = 'cnt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const item: ContentItemModel = {
      id,
      project_id: data.projectId,
      title: data.title.trim(),
      platform: data.platform || 'YouTube',
      format: data.format || 'Other',
      topic: data.topic?.trim() || '',
      status: data.status || 'Idea',
      scheduled_date: data.scheduledDate || (data as any).scheduled_date || '',
      campaign_id: data.campaignId || (data as any).campaign_id || '',
      parent_idea_id: data.parentIdeaId || (data as any).parent_idea_id || '',
      goal: data.goal?.trim() || '',
      hook: data.hook?.trim() || '',
      script: data.script?.trim() || '',
      cta: data.cta?.trim() || '',
      description: data.description?.trim() || '',
      hashtags: data.hashtags?.trim() || '',
      published_url: data.publishedUrl || (data as any).published_url || '',
      thumbnail: data.thumbnail?.trim() || '',
      notes: data.notes?.trim() || '',
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO content_items (
        id, project_id, title, platform, format, topic, status, scheduled_date, 
        campaign_id, parent_idea_id, goal, hook, script, cta, description, 
        hashtags, published_url, thumbnail, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.id,
      item.project_id,
      item.title,
      item.platform,
      item.format || null,
      item.topic || null,
      item.status,
      item.scheduled_date || null,
      item.campaign_id || null,
      item.parent_idea_id || null,
      item.goal || null,
      item.hook || null,
      item.script || null,
      item.cta || null,
      item.description,
      item.hashtags || null,
      item.published_url || null,
      item.thumbnail || null,
      item.notes || null,
      item.created_at,
      item.updated_at
    ]);

    this.projectService.addActivity(data.projectId, 'Added content piece', `[${item.platform}] ${item.title}`);
    return item;
  }

  public update(id: string, updates: Partial<ContentItemModel>): ContentItemModel | undefined {
    const db = this.dbService.getAdapter();
    const existing = db.get<ContentItemModel>('SELECT * FROM content_items WHERE id = ?', [id]);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: ContentItemModel = {
      ...existing,
      title: updates.title !== undefined ? updates.title.trim() : existing.title,
      platform: updates.platform || existing.platform,
      format: updates.format !== undefined ? updates.format : existing.format,
      topic: updates.topic !== undefined ? updates.topic.trim() : existing.topic,
      status: updates.status || existing.status,
      scheduled_date: (updates as any).scheduledDate !== undefined ? (updates as any).scheduledDate : (updates.scheduled_date !== undefined ? updates.scheduled_date : existing.scheduled_date),
      campaign_id: (updates as any).campaignId !== undefined ? (updates as any).campaignId : (updates.campaign_id !== undefined ? updates.campaign_id : existing.campaign_id),
      parent_idea_id: (updates as any).parentIdeaId !== undefined ? (updates as any).parentIdeaId : (updates.parent_idea_id !== undefined ? updates.parent_idea_id : existing.parent_idea_id),
      goal: updates.goal !== undefined ? updates.goal.trim() : existing.goal,
      hook: updates.hook !== undefined ? updates.hook.trim() : existing.hook,
      script: updates.script !== undefined ? updates.script : existing.script,
      cta: updates.cta !== undefined ? updates.cta.trim() : existing.cta,
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      hashtags: updates.hashtags !== undefined ? updates.hashtags.trim() : existing.hashtags,
      published_url: (updates as any).publishedUrl !== undefined ? (updates as any).publishedUrl : (updates.published_url !== undefined ? updates.published_url : existing.published_url),
      thumbnail: updates.thumbnail !== undefined ? updates.thumbnail : existing.thumbnail,
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      updated_at: now
    };

    db.run(`
      UPDATE content_items
      SET title = ?, platform = ?, format = ?, topic = ?, status = ?, scheduled_date = ?,
          campaign_id = ?, parent_idea_id = ?, goal = ?, hook = ?, script = ?, cta = ?,
          description = ?, hashtags = ?, published_url = ?, thumbnail = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.title,
      updated.platform,
      updated.format || null,
      updated.topic || null,
      updated.status,
      updated.scheduled_date || null,
      updated.campaign_id || null,
      updated.parent_idea_id || null,
      updated.goal || null,
      updated.hook || null,
      updated.script || null,
      updated.cta || null,
      updated.description,
      updated.hashtags || null,
      updated.published_url || null,
      updated.thumbnail || null,
      updated.notes || null,
      updated.updated_at,
      id
    ]);

    return updated;
  }

  public delete(id: string): boolean {
    const db = this.dbService.getAdapter();
    const existing = db.get<ContentItemModel>('SELECT * FROM content_items WHERE id = ?', [id]);
    if (!existing) return false;

    db.run('DELETE FROM content_items WHERE id = ?', [id]);
    this.projectService.addActivity(existing.project_id, 'Deleted content item', `"${existing.title}"`);
    return true;
  }
}
