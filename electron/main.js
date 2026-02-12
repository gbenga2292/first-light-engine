import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let splashWindow;

function createWindow() {
  // Create splash window
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    // Icon path depends on environment
    icon: process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../public/favicon.ico')
      : path.join(__dirname, '../dist/favicon.ico')
  });

  // Load splash screen
  const splashPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../public/splash.html')
    : path.join(__dirname, '../dist/splash.html');

  splashWindow.loadFile(splashPath);

  // Create main window (hidden initially)
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Don't show until ready
    titleBarStyle: 'hidden', // Hide native title bar but keep window controls functionality
    titleBarOverlay: {
      color: '#00000000', // Fully transparent
      symbolColor: '#ffffff',
      height: 0 // Minimize the overlay height
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../public/favicon.ico')
      : path.join(__dirname, '../dist/favicon.ico')
  });

  // Remove default menu
  mainWindow.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);

  // Load application
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // When main window is ready to show, close splash and show main window
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
    }
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// Deep Linking Setup
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('dcel-inventory', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('dcel-inventory');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // On Windows, the deep link is in the commandLine array
      const deepLink = commandLine.find((arg) => arg.startsWith('dcel-inventory://'));
      if (deepLink) {
        mainWindow.webContents.send('deep-link', deepLink);
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    // Handle deep link on startup (Windows)
    const deepLink = process.argv.find((arg) => arg.startsWith('dcel-inventory://'));
    if (deepLink && mainWindow) {
      // Small delay to ensure React handles it? Or just send it.
      // Note: Creating window is async-ish, but variable isn't assigned until constructed.
      // However, we can't send until window "ready-to-show"? 
      // We'll rely on the existing 'ready-to-show' OR we can send it once 'did-finish-load'.
      mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('deep-link', deepLink);
      });
    }
  });

  // Handle deep link (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send('deep-link', url);
    }
  });
}

// Global window-all-closed handler (moved to inside ready block or kept global? commonly global)
// We need to keep it global but outside the lock check?
// Actually if we don't get lock, we quit, so this is fine.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler for simple window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow?.maximize();
    return true;
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());
ipcMain.handle('window:toggleDevTools', () => mainWindow?.webContents.toggleDevTools());
ipcMain.handle('window:update-title-bar-overlay', (event, options) => {
  if (mainWindow) {
    mainWindow.setTitleBarOverlay(options);
  }
});
