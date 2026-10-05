import fs from 'fs';
import path from 'path';
import { DatabaseService } from './database.service';
import { ProjectService } from './project.service';

export interface MarketingCampaignModel {
  id: string;
  project_id: string;
  name: string;
  description: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'Planned' | 'Active' | 'Completed' | 'Cancelled';
  channels_json: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingAccountModel {
  id: string;
  project_id: string;
  platform: string;
  username: string;
  url: string;
  email: string;
  status: 'Not Created' | 'Pending' | 'Created' | 'Active' | 'Inactive';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingEmailModel {
  id: string;
  project_id: string;
  email: string;
  type: string;
  usage: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingIdeaModel {
  id: string;
  project_id: string;
  title: string;
  description: string;
  goal: string;
  channel: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Idea' | 'Planned' | 'In Progress' | 'Done' | 'Discarded';
  expected_result: string;
  campaign_id?: string;
  date?: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingMetricModel {
  id: string;
  project_id: string;
  target_type: 'content' | 'campaign' | 'platform';
  target_id?: string;
  platform?: string;
  metric_name: string;
  value: number;
  date: string;
  notes?: string;
  created_at: string;
}

export interface MarketingItemModel {
  id: string;
  project_id: string;
  channel: string;
  title: string;
  description: string;
  status: 'Idea' | 'Draft' | 'Scheduled' | 'Published';
  target_date?: string;
  metrics?: string;
  created_at: string;
  updated_at: string;
}

export class MarketingService {
  private static instance: MarketingService;
  private dbService: DatabaseService;
  private projectService: ProjectService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.projectService = ProjectService.getInstance();
  }

  public static getInstance(): MarketingService {
    if (!MarketingService.instance) {
      MarketingService.instance = new MarketingService();
    }
    return MarketingService.instance;
  }

  // === Physical Directory Scaffold (Section 15) ===
  public ensureMarketingFolders(projectPath: string): { success: boolean; folders: string[] } {
    const foldersToCreate = [
      'marketing',
      'marketing/strategy',
      'marketing/campaigns',
      'marketing/ideas',
      'marketing/launch',
      'content',
      'content/ideas',
      'content/scripts',
      'content/thumbnails',
      'content/videos',
      'content/social',
      'content/published'
    ];

    const created: string[] = [];
    try {
      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
      }
      for (const sub of foldersToCreate) {
        const full = path.join(projectPath, sub);
        if (!fs.existsSync(full)) {
          fs.mkdirSync(full, { recursive: true });
          created.push(sub);
        }
      }
      return { success: true, folders: created };
    } catch (err) {
      console.error('Failed to create marketing folders:', err);
      return { success: false, folders: created };
    }
  }

  // === CAMPAIGNS ===
  public getCampaigns(projectId: string): MarketingCampaignModel[] {
    const db = this.dbService.getAdapter();
    return db.all<MarketingCampaignModel>(`
      SELECT * FROM marketing_campaigns
      WHERE project_id = ?
      ORDER BY updated_at DESC
    `, [projectId]);
  }

  public createCampaign(data: {
    projectId: string;
    name: string;
    description?: string;
    goal?: string;
    startDate?: string;
    start_date?: string;
    endDate?: string;
    end_date?: string;
    status?: 'Planned' | 'Active' | 'Completed' | 'Cancelled';
    channels?: string[];
    notes?: string;
  }): MarketingCampaignModel {
    const db = this.dbService.getAdapter();
    const id = 'cmp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const campaign: MarketingCampaignModel = {
      id,
      project_id: data.projectId,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      goal: data.goal?.trim() || '',
      start_date: data.startDate || data.start_date || '',
      end_date: data.endDate || data.end_date || '',
      status: data.status || 'Planned',
      channels_json: JSON.stringify(data.channels || []),
      notes: data.notes?.trim() || '',
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO marketing_campaigns (id, project_id, name, description, goal, start_date, end_date, status, channels_json, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      campaign.id,
      campaign.project_id,
      campaign.name,
      campaign.description,
      campaign.goal,
      campaign.start_date,
      campaign.end_date,
      campaign.status,
      campaign.channels_json,
      campaign.notes,
      campaign.created_at,
      campaign.updated_at
    ]);

    this.projectService.addActivity(data.projectId, 'Created marketing campaign', `"${campaign.name}"`);
    return campaign;
  }

  public updateCampaign(id: string, updates: Partial<MarketingCampaignModel> & { channels?: string[]; startDate?: string; endDate?: string }): MarketingCampaignModel | undefined {
    const db = this.dbService.getAdapter();
    const existing = db.get<MarketingCampaignModel>('SELECT * FROM marketing_campaigns WHERE id = ?', [id]);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: MarketingCampaignModel = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      goal: updates.goal !== undefined ? updates.goal.trim() : existing.goal,
      start_date: updates.startDate !== undefined ? updates.startDate : (updates.start_date !== undefined ? updates.start_date : existing.start_date),
      end_date: updates.endDate !== undefined ? updates.endDate : (updates.end_date !== undefined ? updates.end_date : existing.end_date),
      status: updates.status || existing.status,
      channels_json: updates.channels ? JSON.stringify(updates.channels) : (updates.channels_json !== undefined ? updates.channels_json : existing.channels_json),
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      updated_at: now
    };

    db.run(`
      UPDATE marketing_campaigns
      SET name = ?, description = ?, goal = ?, start_date = ?, end_date = ?, status = ?, channels_json = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.name,
      updated.description,
      updated.goal,
      updated.start_date,
      updated.end_date,
      updated.status,
      updated.channels_json,
      updated.notes,
      updated.updated_at,
      id
    ]);

    return updated;
  }

  public deleteCampaign(id: string): boolean {
    const db = this.dbService.getAdapter();
    const existing = db.get<MarketingCampaignModel>('SELECT * FROM marketing_campaigns WHERE id = ?', [id]);
    if (!existing) return false;

    db.run('DELETE FROM marketing_campaigns WHERE id = ?', [id]);
    this.projectService.addActivity(existing.project_id, 'Deleted marketing campaign', `"${existing.name}"`);
    return true;
  }

  // === ACCOUNTS ===
  public getAccounts(projectId: string): MarketingAccountModel[] {
    const db = this.dbService.getAdapter();
    return db.all<MarketingAccountModel>(`
      SELECT * FROM marketing_accounts
      WHERE project_id = ?
      ORDER BY platform ASC
    `, [projectId]);
  }

  public createAccount(data: {
    projectId: string;
    platform: string;
    username?: string;
    url?: string;
    email?: string;
    status?: 'Not Created' | 'Pending' | 'Created' | 'Active' | 'Inactive';
    notes?: string;
  }): MarketingAccountModel {
    const db = this.dbService.getAdapter();
    const id = 'acc_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const account: MarketingAccountModel = {
      id,
      project_id: data.projectId,
      platform: data.platform.trim(),
      username: data.username?.trim() || '',
      url: data.url?.trim() || '',
      email: data.email?.trim() || '',
      status: data.status || 'Not Created',
      notes: data.notes?.trim() || '',
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO marketing_accounts (id, project_id, platform, username, url, email, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      account.id,
      account.project_id,
      account.platform,
      account.username,
      account.url,
      account.email,
      account.status,
      account.notes,
      account.created_at,
      account.updated_at
    ]);

    return account;
  }

  public updateAccount(id: string, updates: Partial<MarketingAccountModel>): MarketingAccountModel | undefined {
    const db = this.dbService.getAdapter();
    const existing = db.get<MarketingAccountModel>('SELECT * FROM marketing_accounts WHERE id = ?', [id]);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: MarketingAccountModel = {
      ...existing,
      platform: updates.platform !== undefined ? updates.platform.trim() : existing.platform,
      username: updates.username !== undefined ? updates.username.trim() : existing.username,
      url: updates.url !== undefined ? updates.url.trim() : existing.url,
      email: updates.email !== undefined ? updates.email.trim() : existing.email,
      status: updates.status || existing.status,
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      updated_at: now
    };

    db.run(`
      UPDATE marketing_accounts
      SET platform = ?, username = ?, url = ?, email = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.platform,
      updated.username,
      updated.url,
      updated.email,
      updated.status,
      updated.notes,
      updated.updated_at,
      id
    ]);

    return updated;
  }

  public deleteAccount(id: string): boolean {
    const db = this.dbService.getAdapter();
    db.run('DELETE FROM marketing_accounts WHERE id = ?', [id]);
    return true;
  }

  // === EMAILS (Section 4) ===
  public getEmails(projectId: string): MarketingEmailModel[] {
    const db = this.dbService.getAdapter();
    return db.all<MarketingEmailModel>(`
      SELECT * FROM marketing_emails
      WHERE project_id = ?
      ORDER BY type ASC
    `, [projectId]);
  }

  public createEmail(data: {
    projectId: string;
    email: string;
    type: string;
    usage?: string;
    notes?: string;
  }): MarketingEmailModel {
    const db = this.dbService.getAdapter();
    const id = 'eml_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const item: MarketingEmailModel = {
      id,
      project_id: data.projectId,
      email: data.email.trim(),
      type: data.type.trim() || 'Main',
      usage: data.usage?.trim() || '',
      notes: data.notes?.trim() || '',
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO marketing_emails (id, project_id, email, type, usage, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.id,
      item.project_id,
      item.email,
      item.type,
      item.usage,
      item.notes,
      item.created_at,
      item.updated_at
    ]);

    return item;
  }

  public updateEmail(id: string, updates: Partial<MarketingEmailModel>): MarketingEmailModel | undefined {
    const db = this.dbService.getAdapter();
    const existing = db.get<MarketingEmailModel>('SELECT * FROM marketing_emails WHERE id = ?', [id]);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: MarketingEmailModel = {
      ...existing,
      email: updates.email !== undefined ? updates.email.trim() : existing.email,
      type: updates.type !== undefined ? updates.type.trim() : existing.type,
      usage: updates.usage !== undefined ? updates.usage.trim() : existing.usage,
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      updated_at: now
    };

    db.run(`
      UPDATE marketing_emails
      SET email = ?, type = ?, usage = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.email,
      updated.type,
      updated.usage,
      updated.notes,
      updated.updated_at,
      id
    ]);

    return updated;
  }

  public deleteEmail(id: string): boolean {
    const db = this.dbService.getAdapter();
    db.run('DELETE FROM marketing_emails WHERE id = ?', [id]);
    return true;
  }

  // === MARKETING IDEAS (Section 5) ===
  public getIdeas(projectId: string): MarketingIdeaModel[] {
    const db = this.dbService.getAdapter();
    return db.all<MarketingIdeaModel>(`
      SELECT * FROM marketing_ideas
      WHERE project_id = ?
      ORDER BY updated_at DESC
    `, [projectId]);
  }

  public createIdea(data: {
    projectId: string;
    title: string;
    description?: string;
    goal?: string;
    channel?: string;
    priority?: 'Low' | 'Medium' | 'High';
    status?: 'Idea' | 'Planned' | 'In Progress' | 'Done' | 'Discarded';
    expectedResult?: string;
    expected_result?: string;
    campaignId?: string;
    campaign_id?: string;
    date?: string;
    notes?: string;
  }): MarketingIdeaModel {
    const db = this.dbService.getAdapter();
    const id = 'ida_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const campaignId = data.campaignId || data.campaign_id || null;
    const expectedResult = data.expectedResult?.trim() || data.expected_result?.trim() || '';

    const idea: MarketingIdeaModel = {
      id,
      project_id: data.projectId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      goal: data.goal?.trim() || 'Get users',
      channel: data.channel?.trim() || 'General',
      priority: data.priority || 'Medium',
      status: data.status || 'Idea',
      expected_result: expectedResult,
      campaign_id: campaignId as any,
      date: data.date || '',
      notes: data.notes?.trim() || '',
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO marketing_ideas (id, project_id, title, description, goal, channel, priority, status, expected_result, campaign_id, date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      idea.id,
      idea.project_id,
      idea.title,
      idea.description,
      idea.goal,
      idea.channel,
      idea.priority,
      idea.status,
      idea.expected_result,
      idea.campaign_id || null,
      idea.date || null,
      idea.notes,
      idea.created_at,
      idea.updated_at
    ]);

    return idea;
  }

  public updateIdea(id: string, updates: Partial<MarketingIdeaModel> & { campaignId?: string; expectedResult?: string }): MarketingIdeaModel | undefined {
    const db = this.dbService.getAdapter();
    const existing = db.get<MarketingIdeaModel>('SELECT * FROM marketing_ideas WHERE id = ?', [id]);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updatedCampaignId = updates.campaign_id !== undefined ? updates.campaign_id : (updates.campaignId !== undefined ? updates.campaignId : existing.campaign_id);
    const updatedExpectedResult = updates.expected_result !== undefined ? updates.expected_result.trim() : (updates.expectedResult !== undefined ? updates.expectedResult.trim() : existing.expected_result);

    const updated: MarketingIdeaModel = {
      ...existing,
      title: updates.title !== undefined ? updates.title.trim() : existing.title,
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      goal: updates.goal || existing.goal,
      channel: updates.channel || existing.channel,
      priority: updates.priority || existing.priority,
      status: updates.status || existing.status,
      expected_result: updatedExpectedResult,
      campaign_id: updatedCampaignId,
      date: updates.date !== undefined ? updates.date : existing.date,
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      updated_at: now
    };

    db.run(`
      UPDATE marketing_ideas
      SET title = ?, description = ?, goal = ?, channel = ?, priority = ?, status = ?, expected_result = ?, campaign_id = ?, date = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.title,
      updated.description,
      updated.goal,
      updated.channel,
      updated.priority,
      updated.status,
      updated.expected_result,
      updated.campaign_id || null,
      updated.date || null,
      updated.notes,
      updated.updated_at,
      id
    ]);

    return updated;
  }

  public deleteIdea(id: string): boolean {
    const db = this.dbService.getAdapter();
    db.run('DELETE FROM marketing_ideas WHERE id = ?', [id]);
    return true;
  }

  // === METRICS (Section 14) ===
  public getMetrics(projectId: string): MarketingMetricModel[] {
    const db = this.dbService.getAdapter();
    return db.all<MarketingMetricModel>(`
      SELECT * FROM marketing_metrics
      WHERE project_id = ?
      ORDER BY date DESC, created_at DESC
    `, [projectId]);
  }

  public addMetric(data: {
    projectId: string;
    targetType: 'content' | 'campaign' | 'platform';
    targetId?: string;
    platform?: string;
    metricName: string;
    value: number;
    date: string;
    notes?: string;
  }): MarketingMetricModel {
    const db = this.dbService.getAdapter();
    const id = 'met_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const metric: MarketingMetricModel = {
      id,
      project_id: data.projectId,
      target_type: data.targetType,
      target_id: data.targetId || '',
      platform: data.platform || '',
      metric_name: data.metricName.trim(),
      value: Number(data.value) || 0,
      date: data.date || now.split('T')[0],
      notes: data.notes?.trim() || '',
      created_at: now
    };

    db.run(`
      INSERT INTO marketing_metrics (id, project_id, target_type, target_id, platform, metric_name, value, date, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      metric.id,
      metric.project_id,
      metric.target_type,
      metric.target_id || null,
      metric.platform || null,
      metric.metric_name,
      metric.value,
      metric.date,
      metric.notes || null,
      metric.created_at
    ]);

    return metric;
  }

  public deleteMetric(id: string): boolean {
    const db = this.dbService.getAdapter();
    db.run('DELETE FROM marketing_metrics WHERE id = ?', [id]);
    return true;
  }

  // === BACKWARD COMPATIBILITY: marketing_items ===
  public getByProject(projectId: string): MarketingItemModel[] {
    const db = this.dbService.getAdapter();
    return db.all<MarketingItemModel>(`
      SELECT * FROM marketing_items
      WHERE project_id = ?
      ORDER BY updated_at DESC
    `, [projectId]);
  }

  public create(data: {
    projectId: string;
    channel: string;
    title: string;
    description?: string;
    status?: 'Idea' | 'Draft' | 'Scheduled' | 'Published';
    targetDate?: string;
  }): MarketingItemModel {
    const db = this.dbService.getAdapter();
    const id = 'mkt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const item: MarketingItemModel = {
      id,
      project_id: data.projectId,
      channel: data.channel,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      status: data.status || 'Idea',
      target_date: data.targetDate,
      metrics: '',
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO marketing_items (id, project_id, channel, title, description, status, target_date, metrics, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      item.id,
      item.project_id,
      item.channel,
      item.title,
      item.description,
      item.status,
      item.target_date || null,
      item.metrics || null,
      item.created_at,
      item.updated_at
    ]);

    this.projectService.addActivity(data.projectId, 'Added marketing idea', `[${item.channel}] ${item.title}`);
    return item;
  }

  public update(id: string, updates: Partial<MarketingItemModel>): MarketingItemModel | undefined {
    const db = this.dbService.getAdapter();
    const existing = db.get<MarketingItemModel>('SELECT * FROM marketing_items WHERE id = ?', [id]);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: MarketingItemModel = {
      ...existing,
      channel: updates.channel || existing.channel,
      title: updates.title !== undefined ? updates.title.trim() : existing.title,
      description: updates.description !== undefined ? updates.description.trim() : existing.description,
      status: updates.status || existing.status,
      target_date: updates.target_date !== undefined ? updates.target_date : existing.target_date,
      metrics: updates.metrics !== undefined ? updates.metrics : existing.metrics,
      updated_at: now
    };

    db.run(`
      UPDATE marketing_items
      SET channel = ?, title = ?, description = ?, status = ?, target_date = ?, metrics = ?, updated_at = ?
      WHERE id = ?
    `, [
      updated.channel,
      updated.title,
      updated.description,
      updated.status,
      updated.target_date || null,
      updated.metrics || null,
      updated.updated_at,
      id
    ]);

    return updated;
  }

  public delete(id: string): boolean {
    const db = this.dbService.getAdapter();
    const existing = db.get<MarketingItemModel>('SELECT * FROM marketing_items WHERE id = ?', [id]);
    if (!existing) return false;

    db.run('DELETE FROM marketing_items WHERE id = ?', [id]);
    this.projectService.addActivity(existing.project_id, 'Deleted marketing item', `"${existing.title}"`);
    return true;
  }
}
