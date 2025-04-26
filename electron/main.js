const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');

const preload = path.join(__dirname, 'preload.js');
const indexHTML = path.join(__dirname, 'static/index.html');
var quitAppWhenNoWindow = false;

var win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    // minWidth: 800,
    // minHeight: 600,
    webPreferences: {
      preload,
      sandbox: false,
    }
  });

  if(process.env.DEV == 'true') { 
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(indexHTML);
  }

  win.maximize();

  // security check decline all permissions except clipboard-read
  var ses = win.webContents.session
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    if(permission == 'clipboard-read') return callback(true);
    callback(false);
  });

  // Context menu
  ipcMain.on('show-context-menu', (event) => {
    const template = [
      { role: 'copy', label: 'Копировать' }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
  });
  ipcMain.on('show-context-menu2', (event) => {
    const template = [
      { role: 'cut', label: 'Вырезать' },
      { role: 'copy', label: 'Копировать' },
      { role: 'paste', label: 'Вставить' }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
  });
  ipcMain.on('show-message', (event, message) => {
    dialog.showMessageBoxSync(win, { message: message});
  });
  // Quit app when now window?
  ipcMain.on('set-quit-no-window', (event, quit) => { quitAppWhenNoWindow = Boolean(quit); });
}

//Chosing the path
ipcMain.handle('choose-directory', async (event, isDirectory = true) => {
  if(isDirectory) {
    return dialog.showOpenDialogSync(win, { properties: ['openDirectory'] });
  } else {
    return dialog.showOpenDialogSync(win, { 
      properties: ['openFile'],
      filters: [
        { name: '.exe', extensions: ['exe'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
  }
});

// start the app and allow only one copy of app running
// https://stackoverflow.com/questions/35916158/how-to-prevent-multiple-instances-in-electron
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      try {
        if (win.isMinimized()) win.restore();
      } catch {
        // fix minor error for MacOS
        if(process.platform === 'darwin') createWindow();
      }  
      win.focus();
    }
  })
  // Create myWindow, load the rest of the app, etc...
  app.on('ready', createWindow);
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || quitAppWhenNoWindow) {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security check no new window and don't go outside the app
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => { return { action: 'deny' } });
  contents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
  });
});