import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { ProjectService } from '../services/project.service';
import { FileService } from '../services/file.service';
import { SettingsService } from '../services/settings.service';
import { TaskService } from '../services/task.service';
import { BrandService } from '../services/brand.service';
import { WebsiteService } from '../services/website.service';
import { MarketingService } from '../services/marketing.service';
import { ContentService } from '../services/content.service';
import { NotesService } from '../services/notes.service';
import { SearchService } from '../services/search.service';
import { BackupService } from '../services/backup.service';
import { SystemService } from '../services/system.service';
import { DevelopmentService } from '../services/development.service';

export function registerIpcHandlers(): void {
  const projectService = ProjectService.getInstance();
  const fileService = FileService.getInstance();
  const settingsService = SettingsService.getInstance();
  const taskService = TaskService.getInstance();
  const brandService = BrandService.getInstance();
  const websiteService = WebsiteService.getInstance();
  const marketingService = MarketingService.getInstance();
  const contentService = ContentService.getInstance();
  const notesService = NotesService.getInstance();
  const searchService = SearchService.getInstance();
  const backupService = BackupService.getInstance();
  const systemService = SystemService.getInstance();
  const developmentService = DevelopmentService.getInstance();

  // === Projects ===
  ipcMain.handle('nubo:projects:getAll', async () => {
    return projectService.getAll();
  });

  ipcMain.handle('nubo:projects:getById', async (_, id: string) => {
    return projectService.getById(id);
  });

  ipcMain.handle('nubo:projects:create', async (_, data: any) => {
    return projectService.create(data);
  });

  ipcMain.handle('nubo:projects:update', async (_, id: string, data: any) => {
    return projectService.update(id, data);
  });

  ipcMain.handle('nubo:projects:delete', async (_, id: string, deleteFiles: boolean = true) => {
    return projectService.delete(id, deleteFiles);
  });

  ipcMain.handle('nubo:projects:getActivities', async (_, projectId: string) => {
    return projectService.getActivities(projectId);
  });

  // === Files ===
  ipcMain.handle('nubo:files:listFiles', async (_, targetPath: string, rootFolder?: string, recursive?: boolean) => {
    return fileService.listFiles(targetPath, rootFolder, recursive);
  });

  ipcMain.handle('nubo:files:createFolder', async (_, parentDir: string, folderName: string) => {
    return fileService.createFolder(parentDir, folderName);
  });

  ipcMain.handle('nubo:files:uploadFiles', async (_, targetDir: string, filePaths: string[]) => {
    return fileService.uploadFiles(targetDir, filePaths);
  });

  ipcMain.handle('nubo:files:saveBuffer', async (_, targetDir: string, fileName: string, base64: string) => {
    return fileService.saveBuffer(targetDir, fileName, base64);
  });

  ipcMain.handle('nubo:files:renameItem', async (_, oldPath: string, newName: string) => {
    return fileService.renameItem(oldPath, newName);
  });

  ipcMain.handle('nubo:files:deleteItem', async (_, itemPath: string) => {
    return fileService.deleteItem(itemPath);
  });

  ipcMain.handle('nubo:files:moveItem', async (_, src: string, dest: string) => {
    return fileService.moveItem(src, dest);
  });

  ipcMain.handle('nubo:files:copyItem', async (_, src: string, dest: string) => {
    return fileService.copyItem(src, dest);
  });

  ipcMain.handle('nubo:files:openFile', async (_, filePath: string) => {
    return fileService.openFile(filePath);
  });

  ipcMain.handle('nubo:files:openContainingFolder', async (_, filePath: string) => {
    fileService.openContainingFolder(filePath);
    return true;
  });

  ipcMain.handle('nubo:files:readFileBase64', async (_, filePath: string) => {
    return fileService.readFileAsBase64(filePath);
  });

  ipcMain.handle('nubo:files:exportFile', async (event, srcPathOrBase64: string, defaultName: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(win!, {
      title: 'Descargar archivo / Download file',
      defaultPath: defaultName
    });

    if (!result.canceled && result.filePath) {
      if (srcPathOrBase64.startsWith('data:') || (!fs.existsSync(srcPathOrBase64) && srcPathOrBase64.length > 200)) {
        const base64Data = srcPathOrBase64.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        fs.writeFileSync(result.filePath, Buffer.from(base64Data, 'base64'));
      } else if (fs.existsSync(srcPathOrBase64)) {
        fs.copyFileSync(srcPathOrBase64, result.filePath);
      }
      return { success: true, filePath: result.filePath };
    }
    return { success: false, canceled: true };
  });

  // === Tasks ===
  ipcMain.handle('nubo:tasks:getByProject', async (_, projectId: string) => {
    return taskService.getByProject(projectId);
  });

  ipcMain.handle('nubo:tasks:create', async (_, data: any) => {
    return taskService.create(data);
  });

  ipcMain.handle('nubo:tasks:update', async (_, id: string, updates: any) => {
    return taskService.update(id, updates);
  });

  ipcMain.handle('nubo:tasks:delete', async (_, id: string) => {
    return taskService.delete(id);
  });

  // === Brand ===
  ipcMain.handle('nubo:brand:getByProject', async (_, projectId: string) => {
    return brandService.getByProject(projectId);
  });

  ipcMain.handle('nubo:brand:update', async (_, projectId: string, data: any) => {
    return brandService.update(projectId, data);
  });

  // === Website ===
  ipcMain.handle('nubo:website:getByProject', async (_, projectId: string) => {
    return websiteService.getByProject(projectId);
  });

  ipcMain.handle('nubo:website:update', async (_, projectId: string, data: any) => {
    return websiteService.update(projectId, data);
  });

  ipcMain.handle('nubo:website:ensureFolders', async (_, folderPath: string) => {
    return developmentService.ensureWebsiteFolders(folderPath);
  });

  // === Marketing ===
  ipcMain.handle('nubo:marketing:ensureFolders', async (_, projectPath: string) => {
    return marketingService.ensureMarketingFolders(projectPath);
  });

  ipcMain.handle('nubo:marketing:getCampaigns', async (_, projectId: string) => {
    return marketingService.getCampaigns(projectId);
  });

  ipcMain.handle('nubo:marketing:createCampaign', async (_, data: any) => {
    return marketingService.createCampaign(data);
  });

  ipcMain.handle('nubo:marketing:updateCampaign', async (_, id: string, updates: any) => {
    return marketingService.updateCampaign(id, updates);
  });

  ipcMain.handle('nubo:marketing:deleteCampaign', async (_, id: string) => {
    return marketingService.deleteCampaign(id);
  });

  ipcMain.handle('nubo:marketing:getAccounts', async (_, projectId: string) => {
    return marketingService.getAccounts(projectId);
  });

  ipcMain.handle('nubo:marketing:createAccount', async (_, data: any) => {
    return marketingService.createAccount(data);
  });

  ipcMain.handle('nubo:marketing:updateAccount', async (_, id: string, updates: any) => {
    return marketingService.updateAccount(id, updates);
  });

  ipcMain.handle('nubo:marketing:deleteAccount', async (_, id: string) => {
    return marketingService.deleteAccount(id);
  });

  ipcMain.handle('nubo:marketing:getEmails', async (_, projectId: string) => {
    return marketingService.getEmails(projectId);
  });

  ipcMain.handle('nubo:marketing:createEmail', async (_, data: any) => {
    return marketingService.createEmail(data);
  });

  ipcMain.handle('nubo:marketing:updateEmail', async (_, id: string, updates: any) => {
    return marketingService.updateEmail(id, updates);
  });

  ipcMain.handle('nubo:marketing:deleteEmail', async (_, id: string) => {
    return marketingService.deleteEmail(id);
  });

  ipcMain.handle('nubo:marketing:getIdeas', async (_, projectId: string) => {
    return marketingService.getIdeas(projectId);
  });

  ipcMain.handle('nubo:marketing:createIdea', async (_, data: any) => {
    return marketingService.createIdea(data);
  });

  ipcMain.handle('nubo:marketing:updateIdea', async (_, id: string, updates: any) => {
    return marketingService.updateIdea(id, updates);
  });

  ipcMain.handle('nubo:marketing:deleteIdea', async (_, id: string) => {
    return marketingService.deleteIdea(id);
  });

  ipcMain.handle('nubo:marketing:getMetrics', async (_, projectId: string) => {
    return marketingService.getMetrics(projectId);
  });

  ipcMain.handle('nubo:marketing:addMetric', async (_, data: any) => {
    return marketingService.addMetric(data);
  });

  ipcMain.handle('nubo:marketing:deleteMetric', async (_, id: string) => {
    return marketingService.deleteMetric(id);
  });

  ipcMain.handle('nubo:marketing:getByProject', async (_, projectId: string) => {
    return marketingService.getByProject(projectId);
  });

  ipcMain.handle('nubo:marketing:create', async (_, data: any) => {
    return marketingService.create(data);
  });

  ipcMain.handle('nubo:marketing:update', async (_, id: string, updates: any) => {
    return marketingService.update(id, updates);
  });

  ipcMain.handle('nubo:marketing:delete', async (_, id: string) => {
    return marketingService.delete(id);
  });

  // === Content ===
  ipcMain.handle('nubo:content:getByProject', async (_, projectId: string) => {
    return contentService.getByProject(projectId);
  });

  ipcMain.handle('nubo:content:create', async (_, data: any) => {
    return contentService.create(data);
  });

  ipcMain.handle('nubo:content:update', async (_, id: string, updates: any) => {
    return contentService.update(id, updates);
  });

  ipcMain.handle('nubo:content:delete', async (_, id: string) => {
    return contentService.delete(id);
  });

  // === Notes ===
  ipcMain.handle('nubo:notes:getByProject', async (_, projectId: string) => {
    return notesService.getByProject(projectId);
  });

  ipcMain.handle('nubo:notes:getById', async (_, id: string) => {
    return notesService.getById(id);
  });

  ipcMain.handle('nubo:notes:create', async (_, data: any) => {
    return notesService.create(data);
  });

  ipcMain.handle('nubo:notes:update', async (_, id: string, updates: any) => {
    return notesService.update(id, updates);
  });

  ipcMain.handle('nubo:notes:delete', async (_, id: string) => {
    return notesService.delete(id);
  });

  // === Settings ===
  ipcMain.handle('nubo:settings:get', async () => {
    return settingsService.getSettings();
  });

  ipcMain.handle('nubo:settings:update', async (_, updates: any) => {
    return settingsService.updateSettings(updates);
  });

  ipcMain.handle('nubo:settings:selectDirectory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // === GitHub Integration ===
  ipcMain.handle('nubo:github:getAccount', async () => {
    return settingsService.getGitHubAccount();
  });

  ipcMain.handle('nubo:github:connectAccount', async (_, token: string) => {
    return settingsService.verifyAndConnectGitHub(token);
  });

  ipcMain.handle('nubo:github:disconnectAccount', async () => {
    return settingsService.disconnectGitHub();
  });

  ipcMain.handle('nubo:github:openTokenGenerator', async () => {
    return settingsService.openTokenGenerator();
  });

  // === Search ===
  ipcMain.handle('nubo:search:query', async (_, query: string, projectId?: string) => {
    return searchService.search(query, projectId);
  });

  // === Backup (Import / Export) ===
  ipcMain.handle('nubo:backup:export', async (event, projectId: string) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      const project = projectService.getById(projectId);
      if (!project) {
        return { success: false, error: 'Proyecto no encontrado' };
      }

      const defaultName = `${project.name.replace(/[<>:"/\\|?*]/g, '_')}.nubo`;

      const result = await dialog.showSaveDialog(win!, {
        title: `Exportar Proyecto Nubo - ${project.name}`,
        defaultPath: defaultName,
        filters: [
          { name: 'Paquete de Proyecto Nubo (*.nubo)', extensions: ['nubo'] },
          { name: 'Archivo ZIP (*.zip)', extensions: ['zip'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        await backupService.exportProject(projectId, result.filePath);
        return { success: true, filePath: result.filePath };
      }
      return { success: false, cancelled: true };
    } catch (err: any) {
      console.error('[IPC] Error in nubo:backup:export:', err);
      return { success: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle('nubo:backup:import', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(win!, {
        title: 'Importar Proyecto Nubo (.nubo)',
        properties: ['openFile'],
        filters: [
          { name: 'Paquete de Proyecto Nubo (*.nubo)', extensions: ['nubo'] },
          { name: 'Archivo ZIP (*.zip)', extensions: ['zip'] },
          { name: 'Manifiesto JSON Legacy (*.json)', extensions: ['json'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const imported = await backupService.importProject(result.filePaths[0]);
        return { success: true, project: imported };
      }
      return { success: false, cancelled: true };
    } catch (err: any) {
      console.error('[IPC] Error in nubo:backup:import:', err);
      return { success: false, error: err?.message || String(err) };
    }
  });

  // === Native Dialogs ===
  ipcMain.handle('nubo:dialog:openFiles', async (event, options?: any) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile', 'multiSelections'],
      ...options
    });
    if (!result.canceled) {
      return result.filePaths;
    }
    return [];
  });

  // === System & Fonts ===
  ipcMain.handle('nubo:system:getInstalledFonts', async () => {
    return systemService.getInstalledFonts();
  });

  // === Development, Specs, Editor & Git ===
  ipcMain.handle('nubo:development:getSpecs', async (_, projectId: string) => {
    return developmentService.getSpecs(projectId);
  });

  ipcMain.handle('nubo:development:updateSpecs', async (_, projectId: string, updates: any) => {
    return developmentService.updateSpecs(projectId, updates);
  });

  ipcMain.handle('nubo:development:checkFolder', async (_, folderPath: string) => {
    return developmentService.checkFolder(folderPath);
  });

  ipcMain.handle('nubo:development:createFolder', async (_, folderPath: string) => {
    return developmentService.createProjectFolder(folderPath);
  });

  ipcMain.handle('nubo:development:ensureFolders', async (_, folderPath: string) => {
    return developmentService.ensureDevelopmentFolders(folderPath);
  });

  ipcMain.handle('nubo:development:openFolder', async (_, folderPath: string) => {
    return developmentService.openFolder(folderPath);
  });

  ipcMain.handle('nubo:development:openTerminal', async (_, folderPath: string) => {
    return developmentService.openTerminal(folderPath);
  });

  ipcMain.handle('nubo:development:openInEditor', async (_, folderPath: string, customCommand?: string) => {
    return developmentService.openInEditor(folderPath, customCommand);
  });

  ipcMain.handle('nubo:development:getGitStatus', async (_, folderPath: string) => {
    return developmentService.getGitStatus(folderPath);
  });

  ipcMain.handle('nubo:development:gitInit', async (_, folderPath: string) => {
    return developmentService.gitInit(folderPath);
  });

  ipcMain.handle('nubo:development:gitSetRemote', async (_, folderPath: string, remoteUrl: string) => {
    return developmentService.gitSetRemote(folderPath, remoteUrl);
  });

  ipcMain.handle('nubo:development:gitPush', async (_, folderPath: string, commitMessage?: string) => {
    return developmentService.gitPush(folderPath, commitMessage);
  });

  ipcMain.handle('nubo:development:gitPull', async (_, folderPath: string) => {
    return developmentService.gitPull(folderPath);
  });

  ipcMain.handle('nubo:development:gitDisconnectRemote', async (_, folderPath: string) => {
    return developmentService.gitDisconnectRemote(folderPath);
  });

  ipcMain.handle('nubo:development:gitRemoveRepo', async (_, folderPath: string) => {
    return developmentService.gitRemoveRepo(folderPath);
  });

  ipcMain.handle('nubo:development:openGitHub', async (_, url: string) => {
    return developmentService.openGitHub(url);
  });

  // === Window Controls ===
  ipcMain.handle('nubo:window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle('nubo:window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    } else {
      win.maximize();
      return true;
    }
  });

  ipcMain.handle('nubo:window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle('nubo:window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isMaximized() ?? false;
  });
}
