import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { shell } from 'electron';
import { DatabaseService } from './database.service';
import { ProjectService } from './project.service';
import { SettingsService } from './settings.service';
import { FileService } from './file.service';

export interface ProductFeature {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed';
  taskId?: string; // Linked Kanban task id
}

export interface ProductSpec {
  id: string;
  project_id: string;
  what_is_it: string;
  problem_solved: string;
  target_audience: string;
  goals: string;
  features: ProductFeature[];
  user_flows: string;
  general_requirements: string;
  created_at: string;
  updated_at: string;
}

export interface GitCommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitFileChange {
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  file: string;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  gitInstalled: boolean;
  connectedToGitHub: boolean;
  remoteUrl?: string;
  cleanRemoteUrl?: string;
  currentBranch?: string;
  hasChanges: boolean;
  modifiedCount: number;
  untrackedCount: number;
  statusText: string;
  changedFiles?: GitFileChange[];
  recentCommits?: GitCommitInfo[];
  ahead?: number;
  behind?: number;
  error?: string;
}

export class DevelopmentService {
  private static instance: DevelopmentService;
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

  public static getInstance(): DevelopmentService {
    if (!DevelopmentService.instance) {
      DevelopmentService.instance = new DevelopmentService();
    }
    return DevelopmentService.instance;
  }

  // ==========================================
  // 1. PRODUCT SPECIFICATIONS (QUÉ SE CONSTRUYE)
  // ==========================================

  public getSpecs(projectId: string): ProductSpec {
    const db = this.dbService.getAdapter();
    const existing = db.get<any>('SELECT * FROM product_specs WHERE project_id = ?', [projectId]);

    if (existing) {
      return {
        ...existing,
        features: typeof existing.features_json === 'string' ? JSON.parse(existing.features_json || '[]') : (existing.features_json || [])
      };
    }

    // Create initial spec record from project info (start clean with 0 dummy features)
    const project = this.projectService.getById(projectId);
    const now = new Date().toISOString();
    const id = 'spec_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const starterSpec: ProductSpec = {
      id,
      project_id: projectId,
      what_is_it: project?.description || '',
      problem_solved: '',
      target_audience: '',
      goals: '',
      features: [],
      user_flows: '',
      general_requirements: '',
      created_at: now,
      updated_at: now
    };

    db.run(`
      INSERT INTO product_specs (id, project_id, what_is_it, problem_solved, target_audience, goals, features_json, user_flows, general_requirements, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      starterSpec.id,
      starterSpec.project_id,
      starterSpec.what_is_it,
      starterSpec.problem_solved,
      starterSpec.target_audience,
      starterSpec.goals,
      JSON.stringify(starterSpec.features),
      starterSpec.user_flows,
      starterSpec.general_requirements,
      starterSpec.created_at,
      starterSpec.updated_at
    ]);

    return starterSpec;
  }

  public updateSpecs(projectId: string, updates: Partial<ProductSpec>): ProductSpec {
    const db = this.dbService.getAdapter();
    const current = this.getSpecs(projectId);
    const now = new Date().toISOString();

    const updated: ProductSpec = {
      ...current,
      what_is_it: updates.what_is_it !== undefined ? updates.what_is_it : (current.what_is_it || ''),
      problem_solved: updates.problem_solved !== undefined ? updates.problem_solved : (current.problem_solved || ''),
      target_audience: updates.target_audience !== undefined ? updates.target_audience : (current.target_audience || ''),
      goals: updates.goals !== undefined ? updates.goals : (current.goals || ''),
      features: updates.features !== undefined ? updates.features : (current.features || []),
      user_flows: updates.user_flows !== undefined ? updates.user_flows : (current.user_flows || ''),
      general_requirements: updates.general_requirements !== undefined ? updates.general_requirements : (current.general_requirements || ''),
      updated_at: now
    };

    db.run(`
      UPDATE product_specs
      SET what_is_it = ?, problem_solved = ?, target_audience = ?, goals = ?, features_json = ?, user_flows = ?, general_requirements = ?, updated_at = ?
      WHERE project_id = ?
    `, [
      updated.what_is_it,
      updated.problem_solved,
      updated.target_audience,
      updated.goals,
      JSON.stringify(updated.features),
      updated.user_flows,
      updated.general_requirements,
      updated.updated_at,
      projectId
    ]);

    return updated;
  }

  // ==========================================
  // 2. PROYECTO / FOLDER & EDITOR
  // ==========================================

  public checkFolder(folderPath: string): { exists: boolean; path: string } {
    const norm = path.normalize(folderPath);
    return {
      exists: fs.existsSync(norm),
      path: norm
    };
  }

  public ensureDevelopmentFolders(folderPath: string): { success: boolean; path: string; folders: string[] } {
    try {
      const norm = path.normalize(folderPath);
      if (!fs.existsSync(norm)) {
        fs.mkdirSync(norm, { recursive: true });
      }

      // Ensure Development folder exists
      const devFolder = path.join(norm, 'Development');
      if (!fs.existsSync(devFolder)) {
        fs.mkdirSync(devFolder, { recursive: true });
      }

      // Ensure Proyecto folder inside Development exists for code
      const projectFolder = path.join(devFolder, 'Proyecto');
      if (!fs.existsSync(projectFolder)) {
        fs.mkdirSync(projectFolder, { recursive: true });
      }

      // Ensure full project structure
      this.fileService.createProjectFolderStructure(norm);

      return { success: true, path: norm, folders: ['Development', 'Development/Proyecto'] };
    } catch (err: any) {
      console.error('[DevelopmentService] Error ensuring development folders:', err);
      return { success: false, path: folderPath, folders: [] };
    }
  }

  public createProjectFolder(folderPath: string): { success: boolean; path: string } {
    const res = this.ensureDevelopmentFolders(folderPath);
    return { success: res.success, path: res.path };
  }

  public ensureWebsiteFolders(folderPath: string): { success: boolean; path: string; folders: string[] } {
    try {
      const norm = path.normalize(folderPath);
      const websiteFolder = norm.endsWith('Website') ? norm : path.join(norm, 'Website');
      if (!fs.existsSync(websiteFolder)) {
        fs.mkdirSync(websiteFolder, { recursive: true });
      }

      // Website/Proyecto: the dedicated empty folder for website code & Git
      const proyectoFolder = path.join(websiteFolder, 'Proyecto');
      if (!fs.existsSync(proyectoFolder)) {
        fs.mkdirSync(proyectoFolder, { recursive: true });
      }

      // Design and Referencias outside the code repository
      const designFolder = path.join(websiteFolder, 'Design');
      if (!fs.existsSync(designFolder)) {
        fs.mkdirSync(designFolder, { recursive: true });
      }

      const refFolder = path.join(websiteFolder, 'Referencias');
      if (!fs.existsSync(refFolder)) {
        fs.mkdirSync(refFolder, { recursive: true });
      }

      return {
        success: true,
        path: proyectoFolder,
        folders: ['Website', 'Website/Proyecto', 'Website/Design', 'Website/Referencias']
      };
    } catch (err: any) {
      console.error('[DevelopmentService] Error ensuring website folders:', err);
      return { success: false, path: folderPath, folders: [] };
    }
  }

  public getEffectiveTargetFolder(folderPath: string): string {
    const norm = path.normalize(folderPath);

    if (norm.endsWith(path.join('Website', 'Proyecto')) || norm.endsWith(path.join('website', 'proyecto'))) {
      if (!fs.existsSync(norm)) {
        try { fs.mkdirSync(norm, { recursive: true }); } catch (e) {}
      }
      return norm;
    }

    if (norm.endsWith(path.sep + 'Website') || norm.endsWith('Website')) {
      const webProyecto = path.join(norm, 'Proyecto');
      if (!fs.existsSync(webProyecto)) {
        try { fs.mkdirSync(webProyecto, { recursive: true }); } catch (e) {}
      }
      return webProyecto;
    }

    if (norm.endsWith(path.join('Development', 'Proyecto')) || norm.endsWith('Proyecto')) {
      if (!fs.existsSync(norm)) {
        try { fs.mkdirSync(norm, { recursive: true }); } catch (e) {}
      }
      return norm;
    }

    const devFolder = path.join(norm, 'Development');
    if (!fs.existsSync(devFolder)) {
      try { fs.mkdirSync(devFolder, { recursive: true }); } catch (e) {}
    }
    const devProyecto = path.join(devFolder, 'Proyecto');
    if (!fs.existsSync(devProyecto)) {
      try { fs.mkdirSync(devProyecto, { recursive: true }); } catch (e) {}
    }
    return devProyecto;
  }

  public resolveEditorCommand(command: string): { cmd: string; isExe: boolean } {
    const trimmed = (command || '').trim();
    const lower = trimmed.toLowerCase();

    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';

      // Antigravity resolution
      if (lower === 'agy' || lower === 'antigravity' || lower === 'antigravity-ide' || lower.includes('antigravity')) {
        const directCmd = path.join(localAppData, 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd');
        if (fs.existsSync(directCmd)) {
          return { cmd: directCmd, isExe: false };
        }
        const directExe = path.join(localAppData, 'Programs', 'Antigravity IDE', 'Antigravity IDE.exe');
        if (fs.existsSync(directExe)) {
          return { cmd: directExe, isExe: true };
        }
        return { cmd: 'antigravity-ide', isExe: false };
      }

      // VS Code resolution
      if (lower === 'code' || lower.includes('code')) {
        const directCmd = path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd');
        if (fs.existsSync(directCmd)) {
          return { cmd: directCmd, isExe: false };
        }
        const directExe = path.join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe');
        if (fs.existsSync(directExe)) {
          return { cmd: directExe, isExe: true };
        }
        return { cmd: 'code', isExe: false };
      }

      // Cursor resolution
      if (lower === 'cursor' || lower.includes('cursor')) {
        const directCmd = path.join(localAppData, 'Programs', 'cursor', 'bin', 'cursor.cmd');
        if (fs.existsSync(directCmd)) {
          return { cmd: directCmd, isExe: false };
        }
        const directExe = path.join(localAppData, 'Programs', 'cursor', 'Cursor.exe');
        if (fs.existsSync(directExe)) {
          return { cmd: directExe, isExe: true };
        }
        return { cmd: 'cursor', isExe: false };
      }
    }

    return { cmd: trimmed, isExe: trimmed.endsWith('.exe') };
  }

  public async openFolder(folderPath: string): Promise<boolean> {
    const target = this.getEffectiveTargetFolder(folderPath);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    const result = await shell.openPath(target);
    return result === '';
  }

  public async openTerminal(folderPath: string): Promise<{ success: boolean; error?: string }> {
    const target = this.getEffectiveTargetFolder(folderPath);
    if (!fs.existsSync(target)) {
      return { success: false, error: 'La carpeta no existe.' };
    }

    try {
      if (process.platform === 'win32') {
        const escapedPath = target.replace(/'/g, "''");
        spawn('cmd.exe', ['/c', 'start', 'powershell', '-NoExit', '-Command', `Set-Location -LiteralPath '${escapedPath}'`], {
          detached: true,
          stdio: 'ignore',
          shell: true
        }).unref();
      } else if (process.platform === 'darwin') {
        spawn('open', ['-a', 'Terminal', target], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('x-terminal-emulator', ['--working-directory', target], { detached: true, stdio: 'ignore' }).unref();
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async openInEditor(folderPath: string, customCommand?: string): Promise<{ success: boolean; error?: string; commandUsed: string }> {
    const target = this.getEffectiveTargetFolder(folderPath);
    if (!fs.existsSync(target)) {
      return { success: false, error: 'La carpeta del proyecto no existe.', commandUsed: '' };
    }

    const settings = this.settingsService.getSettings();
    const rawCommand = customCommand || settings.configuredEditor?.command || 'code';
    const resolved = this.resolveEditorCommand(rawCommand);

    try {
      if (process.platform === 'win32') {
        if (resolved.cmd.endsWith('.cmd') || resolved.cmd.endsWith('.bat') || (!resolved.cmd.includes('\\') && !resolved.cmd.includes('/'))) {
          const child = spawn('cmd.exe', ['/c', 'call', resolved.cmd, target], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        } else {
          const child = spawn('cmd.exe', ['/c', 'start', '""', resolved.cmd, target], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        }
      } else {
        spawn(resolved.cmd, [target], {
          detached: true,
          stdio: 'ignore',
          shell: true
        }).unref();
      }

      return { success: true, commandUsed: resolved.cmd };
    } catch (err: any) {
      return { success: false, error: `No se pudo abrir con "${rawCommand}". Detalle: ${err.message}`, commandUsed: rawCommand };
    }
  }

  // ==========================================
  // 3. GIT & GITHUB INTEGRATION
  // ==========================================

  private runExec(cmd: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(cmd, { cwd }, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  public getGitWorkingDir(folderPath: string): string {
    const norm = path.normalize(folderPath);

    if (norm.endsWith(path.join('Website', 'Proyecto')) || norm.endsWith(path.join('website', 'proyecto'))) {
      if (!fs.existsSync(norm)) {
        try { fs.mkdirSync(norm, { recursive: true }); } catch (e) {}
      }
      return norm;
    }

    if (norm.endsWith(path.sep + 'Website') || norm.endsWith('Website')) {
      const webProyecto = path.join(norm, 'Proyecto');
      if (!fs.existsSync(webProyecto)) {
        try { fs.mkdirSync(webProyecto, { recursive: true }); } catch (e) {}
      }
      return webProyecto;
    }

    if (norm.endsWith(path.join('Development', 'Proyecto')) || norm.endsWith('Proyecto')) {
      if (!fs.existsSync(norm)) {
        try { fs.mkdirSync(norm, { recursive: true }); } catch (e) {}
      }
      return norm;
    }

    const devFolder = path.join(norm, 'Development');
    if (!fs.existsSync(devFolder)) {
      try { fs.mkdirSync(devFolder, { recursive: true }); } catch (e) {}
    }
    const devProyecto = path.join(devFolder, 'Proyecto');
    if (!fs.existsSync(devProyecto)) {
      try { fs.mkdirSync(devProyecto, { recursive: true }); } catch (e) {}
    }
    return devProyecto;
  }

  public async getGitStatus(folderPath: string): Promise<GitStatusResult> {
    const target = this.getGitWorkingDir(folderPath);
    if (!fs.existsSync(target)) {
      return {
        isGitRepo: false,
        gitInstalled: true,
        connectedToGitHub: false,
        hasChanges: false,
        modifiedCount: 0,
        untrackedCount: 0,
        statusText: 'Carpeta no encontrada'
      };
    }

    try {
      // Check if git is installed
      try {
        await this.runExec('git --version', target);
      } catch {
        return {
          isGitRepo: false,
          gitInstalled: false,
          connectedToGitHub: false,
          hasChanges: false,
          modifiedCount: 0,
          untrackedCount: 0,
          statusText: 'Git no está instalado en el sistema'
        };
      }

      // Check if it's a git repo
      const isInsideWorkTree = await this.runExec('git rev-parse --is-inside-work-tree', target).catch(() => 'false');
      if (isInsideWorkTree !== 'true') {
        return {
          isGitRepo: false,
          gitInstalled: true,
          connectedToGitHub: false,
          hasChanges: false,
          modifiedCount: 0,
          untrackedCount: 0,
          statusText: 'No inicializado como repositorio Git'
        };
      }

      // Branch
      let currentBranch = await this.runExec('git branch --show-current', target).catch(() => '');
      if (!currentBranch) {
        currentBranch = await this.runExec('git rev-parse --abbrev-ref HEAD', target).catch(() => 'main');
      }

      // Remote URL
      let remoteUrl = await this.runExec('git config --get remote.origin.url', target).catch(() => '');
      let cleanRemoteUrl = '';
      let connectedToGitHub = false;

      if (remoteUrl) {
        cleanRemoteUrl = remoteUrl
          .replace(/^git@github\.com:/, 'https://github.com/')
          .replace(/\.git$/, '');
        connectedToGitHub = cleanRemoteUrl.includes('github.com');
      }

      // Status
      const porcelain = await this.runExec('git status --porcelain', target).catch(() => '');
      const lines = porcelain.split('\n').filter(l => l.trim().length > 0);
      const modifiedCount = lines.filter(l => !l.startsWith('??')).length;
      const untrackedCount = lines.filter(l => l.startsWith('??')).length;
      const hasChanges = lines.length > 0;

      const hasCommits = await this.runExec('git rev-parse --verify HEAD', target).then(() => true).catch(() => false);

      // Parse changed / pending files
      const changedFiles: GitFileChange[] = lines.slice(0, 15).map(line => {
        const code = line.substring(0, 2).trim();
        const file = line.substring(3).trim();
        let status: GitFileChange['status'] = 'modified';
        if (code === '??') status = 'untracked';
        else if (code.includes('A')) status = 'added';
        else if (code.includes('D')) status = 'deleted';
        else if (code.includes('R')) status = 'renamed';
        return { status, file };
      });

      // Fetch recent commits (last 5)
      let recentCommits: GitCommitInfo[] = [];
      if (hasCommits) {
        try {
          const logOutput = await this.runExec('git log -n 5 --pretty=format:"%h%x09%an%x09%cr%x09%s"', target);
          if (logOutput && logOutput.trim()) {
            recentCommits = logOutput.trim().split('\n').filter(Boolean).map(logLine => {
              const parts = logLine.split('\t');
              return {
                hash: parts[0]?.trim() || '',
                author: parts[1]?.trim() || '',
                date: parts[2]?.trim() || '',
                message: parts.slice(3).join('\t').trim() || ''
              };
            });
          }
        } catch (err) {
          console.warn('[Git] Error loading recent commits in getGitStatus:', err);
        }
      }

      let statusText = 'Sin cambios pendientes';
      if (!hasCommits) {
        if (lines.length > 0) {
          statusText = `${lines.length} archivo${lines.length > 1 ? 's' : ''} preparado${lines.length > 1 ? 's' : ''} para subir (primer push)`;
        } else {
          statusText = 'Repositorio nuevo (haz tu primer push)';
        }
      } else if (hasChanges) {
        const parts: string[] = [];
        if (modifiedCount > 0) parts.push(`${modifiedCount} modificado${modifiedCount > 1 ? 's' : ''}`);
        if (untrackedCount > 0) parts.push(`${untrackedCount} nuevo${untrackedCount > 1 ? 's' : ''}`);
        statusText = parts.join(', ');
      }

      return {
        isGitRepo: true,
        gitInstalled: true,
        connectedToGitHub,
        remoteUrl,
        cleanRemoteUrl,
        currentBranch: currentBranch || 'main',
        hasChanges: hasChanges || !hasCommits,
        modifiedCount,
        untrackedCount,
        statusText,
        changedFiles,
        recentCommits
      };
    } catch (err: any) {
      return {
        isGitRepo: false,
        gitInstalled: true,
        connectedToGitHub: false,
        hasChanges: false,
        modifiedCount: 0,
        untrackedCount: 0,
        statusText: err.message
      };
    }
  }

  /**
   * Helper to ensure git user.name and user.email are configured for the repo.
   * Prevents "Author identity unknown" fatal errors when committing.
   */
  private async ensureGitIdentity(target: string, remoteUrl?: string): Promise<void> {
    try {
      const userName = await this.runExec('git config user.name', target).catch(() => '');
      const userEmail = await this.runExec('git config user.email', target).catch(() => '');

      let inferredName = '';
      let inferredEmail = '';

      if (remoteUrl) {
        const match = remoteUrl.match(/github\.com[:/]([^/]+)/i);
        if (match && match[1]) {
          inferredName = match[1];
          inferredEmail = `${match[1]}@users.noreply.github.com`;
        }
      }

      if (!userName || !userName.trim()) {
        const fallbackName = inferredName || process.env.USERNAME || process.env.USER || 'Nubo Developer';
        await this.runExec(`git config user.name "${fallbackName}"`, target).catch(() => {});
      }

      if (!userEmail || !userEmail.trim()) {
        const fallbackEmail = inferredEmail || `${(process.env.USERNAME || 'developer').toLowerCase()}@users.noreply.github.com`;
        await this.runExec(`git config user.email "${fallbackEmail}"`, target).catch(() => {});
      }
    } catch (err) {
      console.warn('[DevelopmentService] ensureGitIdentity warning:', err);
    }
  }

  /**
   * Helper to inspect the remote repository heads and determine default branch
   */
  private async detectRemoteBranch(target: string, fallback: string = 'main'): Promise<{ hasRemote: boolean; isEmpty: boolean; branch: string }> {
    try {
      const remotes = await this.runExec('git remote', target).catch(() => '');
      if (!remotes.includes('origin')) {
        return { hasRemote: false, isEmpty: true, branch: fallback };
      }

      const remoteHeads = await this.runExec('git ls-remote --heads origin', target).catch(() => '');
      if (!remoteHeads.trim()) {
        return { hasRemote: true, isEmpty: true, branch: fallback };
      }

      if (remoteHeads.includes('refs/heads/main')) {
        return { hasRemote: true, isEmpty: false, branch: 'main' };
      }
      if (remoteHeads.includes('refs/heads/master')) {
        return { hasRemote: true, isEmpty: false, branch: 'master' };
      }

      const match = remoteHeads.match(/refs\/heads\/([^\s\n]+)/);
      return { hasRemote: true, isEmpty: false, branch: match ? match[1] : fallback };
    } catch {
      return { hasRemote: false, isEmpty: true, branch: fallback };
    }
  }

  public async gitInit(folderPath: string): Promise<{ success: boolean; message: string }> {
    const target = this.getGitWorkingDir(folderPath);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    try {
      const output = await this.runExec('git init', target);
      await this.runExec('git branch -M main', target).catch(() => {});
      await this.ensureGitIdentity(target);
      return { success: true, message: output };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public async gitSetRemote(folderPath: string, remoteUrl: string): Promise<{ success: boolean; message: string }> {
    const target = this.getGitWorkingDir(folderPath);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    const gitDir = path.join(target, '.git');
    if (!fs.existsSync(gitDir)) {
      await this.runExec('git init', target).catch(() => '');
      await this.runExec('git branch -M main', target).catch(() => {});
    }
    try {
      const cleanUrl = remoteUrl.trim();
      const existing = await this.runExec('git remote', target).catch(() => '');
      if (existing.includes('origin')) {
        await this.runExec(`git remote set-url origin "${cleanUrl}"`, target);
      } else {
        await this.runExec(`git remote add origin "${cleanUrl}"`, target);
      }

      await this.ensureGitIdentity(target, cleanUrl);

      const remoteInfo = await this.detectRemoteBranch(target, 'main');
      if (!remoteInfo.isEmpty) {
        await this.runExec(`git branch -M ${remoteInfo.branch}`, target).catch(() => {});
      } else {
        await this.runExec('git branch -M main', target).catch(() => {});
      }

      return { success: true, message: 'Repositorio remoto configurado correctamente.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public async gitDisconnectRemote(folderPath: string): Promise<{ success: boolean; message: string }> {
    const target = this.getGitWorkingDir(folderPath);
    try {
      const existing = await this.runExec('git remote', target).catch(() => '');
      if (existing.includes('origin')) {
        await this.runExec('git remote remove origin', target);
      }
      return { success: true, message: 'Repositorio remoto desconectado.' };
    } catch (err: any) {
      return { success: true, message: 'No había ningún repositorio remoto conectado.' };
    }
  }

  public async gitRemoveRepo(folderPath: string): Promise<{ success: boolean; message: string }> {
    const norm = path.normalize(folderPath);
    const targets = [
      path.join(norm, 'Development', 'Proyecto', '.git'),
      path.join(norm, 'Development', '.git'),
      path.join(norm, 'Proyecto', '.git'),
      path.join(norm, '.git')
    ];

    let removedAny = false;

    for (const gitPath of targets) {
      if (fs.existsSync(gitPath)) {
        try {
          fs.rmSync(gitPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } catch (err) {
          if (process.platform === 'win32') {
            try {
              await this.runExec(`attrib -r -s -h "${gitPath}\\*" /s /d`, norm).catch(() => {});
              await this.runExec(`rmdir /s /q "${gitPath}"`, norm).catch(() => {});
            } catch (e) {}
          }
        }

        if (!fs.existsSync(gitPath)) {
          removedAny = true;
        }
      }
    }

    if (removedAny) {
      return { success: true, message: 'Git eliminado del proyecto.' };
    }
    return { success: false, message: 'No se encontró repositorio Git (.git) para eliminar.' };
  }

  public async gitPush(folderPath: string, commitMessage?: string): Promise<{ success: boolean; message: string }> {
    const target = this.getGitWorkingDir(folderPath);
    if (!fs.existsSync(target)) {
      return { success: false, message: 'La carpeta del proyecto no existe.' };
    }

    try {
      // 1. Ensure git repo initialized
      const isInside = await this.runExec('git rev-parse --is-inside-work-tree', target).catch(() => 'false');
      if (isInside !== 'true') {
        await this.runExec('git init', target);
      }

      // 2. Ensure remote is configured
      const remotes = await this.runExec('git remote', target).catch(() => '');
      if (!remotes.includes('origin')) {
        return { success: false, message: 'No hay ningún repositorio remoto configurado. Conecta primero tu repositorio de GitHub.' };
      }

      const remoteUrl = await this.runExec('git config --get remote.origin.url', target).catch(() => '');

      // 3. Ensure identity so commits will never fail
      await this.ensureGitIdentity(target, remoteUrl);

      // 4. Detect remote branch preference
      const remoteInfo = await this.detectRemoteBranch(target, 'main');
      const targetBranch = remoteInfo.branch || 'main';

      // 5. Align local branch name
      await this.runExec(`git branch -M ${targetBranch}`, target).catch(() => {});

      // 6. Ensure at least one file exists in the directory
      const existingFiles = fs.readdirSync(target).filter(f => f !== '.git');
      if (existingFiles.length === 0) {
        fs.writeFileSync(path.join(target, 'README.md'), `# Proyecto\n\nCreado y gestionado con Nubo.\n`, 'utf-8');
      }

      // 7. Stage everything
      await this.runExec('git add -A', target);

      // 8. Check if HEAD has any commits
      const hasCommits = await this.runExec('git rev-parse --verify HEAD', target).then(() => true).catch(() => false);

      // 9. Commit if there are changes or if no commits yet
      const porcelain = await this.runExec('git status --porcelain', target).catch(() => '');
      if (porcelain.trim().length > 0 || !hasCommits) {
        const msg = commitMessage || (!hasCommits ? 'Initial commit' : `Update proyecto - ${new Date().toLocaleString()}`);
        const safeMsg = msg.replace(/"/g, '\\"');
        await this.runExec(`git commit -m "${safeMsg}"`, target);
      }

      // 10. Execute push with upstream tracking
      try {
        const output = await this.runExec(`git push -u origin ${targetBranch}`, target);
        return { success: true, message: output || 'Push completado exitosamente. Cambios subidos a GitHub.' };
      } catch (pushErr: any) {
        const pushErrMsg = (pushErr.message || pushErr.toString());

        // Handle case where remote already contains commits (need to merge/rebase first)
        if (pushErrMsg.includes('rejected') || pushErrMsg.includes('fetch first') || pushErrMsg.includes('non-fast-forward')) {
          try {
            await this.runExec(`git pull origin ${targetBranch} --allow-unrelated-histories --no-rebase -X theirs`, target);
            const retryOutput = await this.runExec(`git push -u origin ${targetBranch}`, target);
            return { success: true, message: retryOutput || 'Push completado tras sincronizar con GitHub.' };
          } catch (mergeErr: any) {
            return {
              success: false,
              message: `Conflicto al subir a GitHub. Intenta hacer "Pull" primero: ${mergeErr.message || mergeErr}`
            };
          }
        }

        return {
          success: false,
          message: `Error al hacer push: ${pushErrMsg}`
        };
      }
    } catch (err: any) {
      return { success: false, message: `Error en push: ${err.message || err}` };
    }
  }

  public async gitPull(folderPath: string): Promise<{ success: boolean; message: string }> {
    const target = this.getGitWorkingDir(folderPath);
    if (!fs.existsSync(target)) {
      return { success: false, message: 'La carpeta del proyecto no existe.' };
    }

    try {
      // 1. Check if git repo
      const isInside = await this.runExec('git rev-parse --is-inside-work-tree', target).catch(() => 'false');
      if (isInside !== 'true') {
        return { success: false, message: 'El proyecto no está inicializado como repositorio Git.' };
      }

      // 2. Check remote
      const remotes = await this.runExec('git remote', target).catch(() => '');
      if (!remotes.includes('origin')) {
        return { success: false, message: 'No hay ningún repositorio remoto configurado. Conecta primero con GitHub.' };
      }

      const remoteUrl = await this.runExec('git config --get remote.origin.url', target).catch(() => '');
      await this.ensureGitIdentity(target, remoteUrl);

      // 3. Inspect remote heads
      const remoteInfo = await this.detectRemoteBranch(target, 'main');
      if (remoteInfo.isEmpty) {
        return {
          success: true,
          message: 'El repositorio en GitHub está vacío (aún no tiene commits). Pulsa "Push" para subir tus archivos primero.'
        };
      }

      const targetBranch = remoteInfo.branch;

      // 4. Align local branch
      const currentBranch = (await this.runExec('git branch --show-current', target).catch(() => '')) || '';
      if (!currentBranch || currentBranch !== targetBranch) {
        await this.runExec(`git branch -M ${targetBranch}`, target).catch(() => {});
      }

      // 5. Check if local has commits
      const hasCommits = await this.runExec('git rev-parse --verify HEAD', target).then(() => true).catch(() => false);

      if (hasCommits) {
        // Auto-commit or save pending changes if any before pulling
        const porcelain = await this.runExec('git status --porcelain', target).catch(() => '');
        if (porcelain.trim().length > 0) {
          await this.runExec('git add -A', target);
          await this.runExec(`git commit -m "Auto-guardado antes de pull - ${new Date().toLocaleString()}"`, target).catch(() => {});
        }

        const output = await this.runExec(`git pull origin ${targetBranch} --allow-unrelated-histories`, target);
        await this.runExec(`git branch --set-upstream-to=origin/${targetBranch} ${targetBranch}`, target).catch(() => {});
        return { success: true, message: output || 'Pull completado. Archivos sincronizados con GitHub.' };
      } else {
        // Local has no commits, pull the branch from remote
        const output = await this.runExec(`git pull origin ${targetBranch}`, target);
        await this.runExec(`git branch --set-upstream-to=origin/${targetBranch} ${targetBranch}`, target).catch(() => {});
        return { success: true, message: output || 'Proyecto descargado con éxito desde GitHub.' };
      }
    } catch (err: any) {
      return { success: false, message: `Error al hacer pull: ${err.message || err}` };
    }
  }

  public async openGitHub(url: string): Promise<boolean> {
    if (!url) return false;
    let webUrl = url.trim();
    if (webUrl.startsWith('git@github.com:')) {
      webUrl = webUrl.replace('git@github.com:', 'https://github.com/').replace(/\.git$/, '');
    }
    if (!webUrl.startsWith('http')) {
      webUrl = 'https://' + webUrl;
    }
    await shell.openExternal(webUrl);
    return true;
  }
}
