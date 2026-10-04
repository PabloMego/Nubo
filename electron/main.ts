import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { DatabaseService } from './services/database.service';
import { registerIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // Initialize Database first
  const dbService = DatabaseService.getInstance();
  await dbService.initialize();

  // Register IPC
  registerIpcHandlers();

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0F0F11',
    title: 'Nubo',
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      plugins: true
    }
  });

  // Track and notify renderer of window maximize / unmaximize
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('nubo:window:maximized-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('nubo:window:maximized-change', false);
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    console.log(`[Main] Loading dev server: ${devUrl}`);
    await mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log(`[Main] Loading production index: ${indexPath}`);
    await mainWindow.loadFile(indexPath);
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  try {
    DatabaseService.getInstance().getAdapter().close();
  } catch (err) {
    console.error('Error closing database on exit:', err);
  }
});
