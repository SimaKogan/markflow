'use strict';
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const FILTERS = [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }];

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    title: 'Markflow',
    backgroundColor: '#0f1117',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // External links open in the system browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  // The page asks to block closing while a file has unsaved changes (beforeunload).
  // Electron blocks silently unless we ask the user; preventDefault() lets the close go ahead.
  win.webContents.on('will-prevent-unload', (e) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['Keep editing', 'Discard changes'],
      defaultId: 0,
      cancelId: 0,
      title: 'Unsaved changes',
      message: 'You have unsaved changes.',
      detail: 'If you close now, your latest edits to this file will be lost.'
    });
    if (choice === 1) e.preventDefault();
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

// Only paths the user picked through a dialog may be written without asking again.
// This stops a compromised page from writing to arbitrary locations.
const knownPaths = new Set();

ipcMain.handle('file:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ filters: FILTERS, properties: ['openFile'] });
  if (canceled || !filePaths[0]) return null;
  knownPaths.add(filePaths[0]);
  return { path: filePaths[0], content: await fs.readFile(filePaths[0], 'utf8') };
});

ipcMain.handle('file:save', async (_e, { content, filePath }) => {
  if (typeof content !== 'string') return null;
  let target = typeof filePath === 'string' && knownPaths.has(filePath) ? filePath : null;
  if (!target) {
    const res = await dialog.showSaveDialog({ defaultPath: 'untitled.md', filters: FILTERS });
    if (res.canceled || !res.filePath) return null;
    target = res.filePath;
  }
  knownPaths.add(target);
  await fs.writeFile(target, content, 'utf8');
  return { path: target };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
