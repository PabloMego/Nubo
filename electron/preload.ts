import { contextBridge, ipcRenderer } from 'electron';

const nuboApi = {
  projects: {
    getAll: () => ipcRenderer.invoke('nubo:projects:getAll'),
    getById: (id: string) => ipcRenderer.invoke('nubo:projects:getById', id),
    create: (data: any) => ipcRenderer.invoke('nubo:projects:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('nubo:projects:update', id, data),
    delete: (id: string, deleteFiles: boolean = true) => ipcRenderer.invoke('nubo:projects:delete', id, deleteFiles),
    getActivities: (projectId: string) => ipcRenderer.invoke('nubo:projects:getActivities', projectId)
  },
  files: {
    listFiles: (targetPath: string, rootFolder?: string, recursive?: boolean) => ipcRenderer.invoke('nubo:files:listFiles', targetPath, rootFolder, recursive),
    createFolder: (parentDir: string, folderName: string) => ipcRenderer.invoke('nubo:files:createFolder', parentDir, folderName),
    uploadFiles: (targetDir: string, filePaths: string[]) => ipcRenderer.invoke('nubo:files:uploadFiles', targetDir, filePaths),
    saveBuffer: (targetDir: string, fileName: string, base64: string) => ipcRenderer.invoke('nubo:files:saveBuffer', targetDir, fileName, base64),
    renameItem: (oldPath: string, newName: string) => ipcRenderer.invoke('nubo:files:renameItem', oldPath, newName),
    deleteItem: (itemPath: string) => ipcRenderer.invoke('nubo:files:deleteItem', itemPath),
    moveItem: (src: string, dest: string) => ipcRenderer.invoke('nubo:files:moveItem', src, dest),
    copyItem: (src: string, dest: string) => ipcRenderer.invoke('nubo:files:copyItem', src, dest),
    openFile: (filePath: string) => ipcRenderer.invoke('nubo:files:openFile', filePath),
    openContainingFolder: (filePath: string) => ipcRenderer.invoke('nubo:files:openContainingFolder', filePath),
    readFileBase64: (filePath: string) => ipcRenderer.invoke('nubo:files:readFileBase64', filePath),
    exportFile: (srcPathOrBase64: string, defaultName: string) => ipcRenderer.invoke('nubo:files:exportFile', srcPathOrBase64, defaultName)
  },
  tasks: {
    getByProject: (projectId: string) => ipcRenderer.invoke('nubo:tasks:getByProject', projectId),
    create: (data: any) => ipcRenderer.invoke('nubo:tasks:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('nubo:tasks:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('nubo:tasks:delete', id)
  },
  brand: {
    getByProject: (projectId: string) => ipcRenderer.invoke('nubo:brand:getByProject', projectId),
    update: (projectId: string, data: any) => ipcRenderer.invoke('nubo:brand:update', projectId, data)
  },
  website: {
    getByProject: (projectId: string) => ipcRenderer.invoke('nubo:website:getByProject', projectId),
    update: (projectId: string, data: any) => ipcRenderer.invoke('nubo:website:update', projectId, data),
    ensureFolders: (folderPath: string) => ipcRenderer.invoke('nubo:website:ensureFolders', folderPath)
  },
  marketing: {
    getByProject: (projectId: string) => ipcRenderer.invoke('nubo:marketing:getByProject', projectId),
    create: (data: any) => ipcRenderer.invoke('nubo:marketing:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('nubo:marketing:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('nubo:marketing:delete', id),
    ensureFolders: (projectPath: string) => ipcRenderer.invoke('nubo:marketing:ensureFolders', projectPath),
    getCampaigns: (projectId: string) => ipcRenderer.invoke('nubo:marketing:getCampaigns', projectId),
    createCampaign: (data: any) => ipcRenderer.invoke('nubo:marketing:createCampaign', data),
    updateCampaign: (id: string, updates: any) => ipcRenderer.invoke('nubo:marketing:updateCampaign', id, updates),
    deleteCampaign: (id: string) => ipcRenderer.invoke('nubo:marketing:deleteCampaign', id),
    getAccounts: (projectId: string) => ipcRenderer.invoke('nubo:marketing:getAccounts', projectId),
    createAccount: (data: any) => ipcRenderer.invoke('nubo:marketing:createAccount', data),
    updateAccount: (id: string, updates: any) => ipcRenderer.invoke('nubo:marketing:updateAccount', id, updates),
    deleteAccount: (id: string) => ipcRenderer.invoke('nubo:marketing:deleteAccount', id),
    getEmails: (projectId: string) => ipcRenderer.invoke('nubo:marketing:getEmails', projectId),
    createEmail: (data: any) => ipcRenderer.invoke('nubo:marketing:createEmail', data),
    updateEmail: (id: string, updates: any) => ipcRenderer.invoke('nubo:marketing:updateEmail', id, updates),
    deleteEmail: (id: string) => ipcRenderer.invoke('nubo:marketing:deleteEmail', id),
    getIdeas: (projectId: string) => ipcRenderer.invoke('nubo:marketing:getIdeas', projectId),
    createIdea: (data: any) => ipcRenderer.invoke('nubo:marketing:createIdea', data),
    updateIdea: (id: string, updates: any) => ipcRenderer.invoke('nubo:marketing:updateIdea', id, updates),
    deleteIdea: (id: string) => ipcRenderer.invoke('nubo:marketing:deleteIdea', id),
    getMetrics: (projectId: string) => ipcRenderer.invoke('nubo:marketing:getMetrics', projectId),
    addMetric: (data: any) => ipcRenderer.invoke('nubo:marketing:addMetric', data),
    deleteMetric: (id: string) => ipcRenderer.invoke('nubo:marketing:deleteMetric', id)
  },
  content: {
    getByProject: (projectId: string) => ipcRenderer.invoke('nubo:content:getByProject', projectId),
    create: (data: any) => ipcRenderer.invoke('nubo:content:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('nubo:content:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('nubo:content:delete', id)
  },
  notes: {
    getByProject: (projectId: string) => ipcRenderer.invoke('nubo:notes:getByProject', projectId),
    getById: (id: string) => ipcRenderer.invoke('nubo:notes:getById', id),
    create: (data: any) => ipcRenderer.invoke('nubo:notes:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('nubo:notes:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('nubo:notes:delete', id)
  },
  settings: {
    get: () => ipcRenderer.invoke('nubo:settings:get'),
    update: (updates: any) => ipcRenderer.invoke('nubo:settings:update', updates),
    selectDirectory: () => ipcRenderer.invoke('nubo:settings:selectDirectory')
  },
  github: {
    getAccount: () => ipcRenderer.invoke('nubo:github:getAccount'),
    connectAccount: (token: string) => ipcRenderer.invoke('nubo:github:connectAccount', token),
    disconnectAccount: () => ipcRenderer.invoke('nubo:github:disconnectAccount'),
    openTokenGenerator: () => ipcRenderer.invoke('nubo:github:openTokenGenerator')
  },
  search: {
    query: (q: string, projectId?: string) => ipcRenderer.invoke('nubo:search:query', q, projectId)
  },
  backup: {
    export: (projectId: string) => ipcRenderer.invoke('nubo:backup:export', projectId),
    import: () => ipcRenderer.invoke('nubo:backup:import')
  },
  dialog: {
    openFiles: (options?: any) => ipcRenderer.invoke('nubo:dialog:openFiles', options)
  },
  system: {
    getInstalledFonts: () => ipcRenderer.invoke('nubo:system:getInstalledFonts')
  },
  development: {
    getSpecs: (projectId: string) => ipcRenderer.invoke('nubo:development:getSpecs', projectId),
    updateSpecs: (projectId: string, updates: any) => ipcRenderer.invoke('nubo:development:updateSpecs', projectId, updates),
    checkFolder: (folderPath: string) => ipcRenderer.invoke('nubo:development:checkFolder', folderPath),
    createFolder: (folderPath: string) => ipcRenderer.invoke('nubo:development:createFolder', folderPath),
    ensureFolders: (folderPath: string) => ipcRenderer.invoke('nubo:development:ensureFolders', folderPath),
    openFolder: (folderPath: string) => ipcRenderer.invoke('nubo:development:openFolder', folderPath),
    openTerminal: (folderPath: string) => ipcRenderer.invoke('nubo:development:openTerminal', folderPath),
    openInEditor: (folderPath: string, customCommand?: string) => ipcRenderer.invoke('nubo:development:openInEditor', folderPath, customCommand),
    getGitStatus: (folderPath: string) => ipcRenderer.invoke('nubo:development:getGitStatus', folderPath),
    gitInit: (folderPath: string) => ipcRenderer.invoke('nubo:development:gitInit', folderPath),
    gitSetRemote: (folderPath: string, remoteUrl: string) => ipcRenderer.invoke('nubo:development:gitSetRemote', folderPath, remoteUrl),
    gitPush: (folderPath: string, commitMessage?: string) => ipcRenderer.invoke('nubo:development:gitPush', folderPath, commitMessage),
    gitPull: (folderPath: string) => ipcRenderer.invoke('nubo:development:gitPull', folderPath),
    gitDisconnectRemote: (folderPath: string) => ipcRenderer.invoke('nubo:development:gitDisconnectRemote', folderPath),
    gitRemoveRepo: (folderPath: string) => ipcRenderer.invoke('nubo:development:gitRemoveRepo', folderPath),
    openGitHub: (url: string) => ipcRenderer.invoke('nubo:development:openGitHub', url)
  },
  window: {
    minimize: () => ipcRenderer.invoke('nubo:window:minimize'),
    maximize: () => ipcRenderer.invoke('nubo:window:maximize'),
    close: () => ipcRenderer.invoke('nubo:window:close'),
    isMaximized: () => ipcRenderer.invoke('nubo:window:isMaximized'),
    onMaximizedChange: (callback: (isMax: boolean) => void) => {
      const handler = (_: any, isMax: boolean) => callback(isMax);
      ipcRenderer.on('nubo:window:maximized-change', handler);
      return () => ipcRenderer.removeListener('nubo:window:maximized-change', handler);
    }
  }
};

contextBridge.exposeInMainWorld('nubo', nuboApi);

export type NuboApi = typeof nuboApi;
