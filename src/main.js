const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const os = require('os');
const { exec, spawn } = require('child_process');
const AdmZip = require('adm-zip');
const aiService = require('./ai-service');
let terminalProcess = null;
const store = new Store();
const packageJson = require('../package.json');
let appLanguage = store.get('appLanguage', 'pt-BR');
let translations = {};

function loadTranslations(langCode) {
  try {
    const filePath = path.join(__dirname, 'i18n', `${langCode}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      translations = JSON.parse(content);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error ${langCode}:`, error);
    return false;
  }
}

loadTranslations(appLanguage);

let mainWindow;

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenu(null);
  //mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-app-info', () => {
  return {
    name: 'PHP Electron Editor',
    version: packageJson.version || '1.0.0',
    author: 'Gianck Luiz - Humolot',
    company: 'GoodBits Tech Panamá',
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    platform: process.platform,
    arch: process.arch,
    buildDate: new Date().toISOString()
  };
});

ipcMain.handle('save-session-state', async (event, state) => {
  try {
    store.set('sessionState', state);
    return true;
  } catch (error) {
    console.error('Error saving session state:', error);
    return false;
  }
});

ipcMain.handle('load-session-state', async () => {
  try {
    return store.get('sessionState');
  } catch (error) {
    console.error('Error loading session state:', error);
    return null;
  }
});

ipcMain.handle('open-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    const projectPath = result.filePaths[0];
    store.set('lastProjectPath', projectPath);
    return projectPath;
  }
  
  return null;
});

ipcMain.handle('read-directory', async (event, dir) => {
  try {
    const items = await fs.promises.readdir(dir, { withFileTypes: true });
    const fileStructure = await Promise.all(items.map(async item => {
      const path = `${dir}/${item.name}`;
      if (item.isDirectory()) {
        return {
          name: item.name,
          path: path,
          type: 'directory',
          children: []
        };
      } else {
        return {
          name: item.name,
          path: path,
          type: 'file',
          extension: item.name.split('.').pop()
        };
      }
    }));
    return fileStructure;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving file:', error);
    return false;
  }
});

ipcMain.handle('create-file', async (event, dirPath, fileName) => {
  try {
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, '');
    const projectRoot = store.get('lastProjectPath');
    if (projectRoot) {
      const updatedFiles = await readDirectoryStructure(projectRoot);
      event.sender.send('file-created', updatedFiles);
    }
    return filePath;
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
});

ipcMain.handle('rename-file', async (event, oldPath, newName) => {
  try {
    const newPath = path.join(path.dirname(oldPath), newName);
    fs.renameSync(oldPath, newPath);
    return newPath;
  } catch (err) {
    console.error('Error renaming file:', err);
    throw err;
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    fs.unlinkSync(filePath);
    const projectRoot = store.get('lastProjectPath');
    if (projectRoot) {
      const updatedFiles = await readDirectoryStructure(projectRoot);
      event.sender.send('file-deleted', updatedFiles);
    }
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
});

async function readDirectoryStructure(dir) {
  const items = await fs.promises.readdir(dir, { withFileTypes: true });
  const fileStructure = await Promise.all(items.map(async item => {
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) {
      return {
        name: item.name,
        path: path,
        type: 'directory',
        children: await readDirectoryStructure(path)
      };
    } else {
      return {
        name: item.name,
        path: path,
        type: 'file',
        extension: item.name.split('.').pop()
      };
    }
  }));
  return fileStructure;
}

ipcMain.handle('create-terminal', async (event, workingDir) => {
  try {
    
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const cwd = workingDir || process.env.HOME || process.env.USERPROFILE;
    
    if (terminalProcess) {
      terminalProcess.kill();
      terminalProcess = null;
    }

    terminalProcess = spawn(shell, [], {
      cwd: cwd,
      env: process.env,
      shell: true
    });
    
    terminalProcess.stdout.on('data', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-data', data.toString());
      }
    });
    
    terminalProcess.stderr.on('data', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-data', data.toString());
      }
    });
    
    terminalProcess.on('close', (code) => {
	  if (mainWindow && !mainWindow.isDestroyed()) {
		  mainWindow.webContents.send('terminal-data', `\r\nProcess closed with code ${code || 0}\r\n`);
      }
      terminalProcess = null;
    });
    
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send('terminal-data', `Terminal started in ${cwd}\r\n`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating terminal:', error);
    return false;
  }
});

ipcMain.handle('write-to-terminal', async (event, data) => {
  if (terminalProcess && terminalProcess.stdin) {
    try {
      terminalProcess.stdin.write(data);
      return true;
    } catch (error) {
      console.error('Error writing to terminal:', error);
      return false;
    }
  }
  return false;
});

ipcMain.handle('close-terminal', async () => {
  if (terminalProcess) {
    try {
      terminalProcess.kill();
      terminalProcess = null;
      return true;
    } catch (error) {
      console.error('Error closing terminal:', error);
      return false;
    }
  }
  return false;
});

ipcMain.handle('analyze-code', async (event, filePath, code) => {
  try {
    const result = await aiService.analyzeCode(filePath, code);
    return result;
  } catch (error) {
    console.error('Error parsing code:', error);
    return { error: `Error parsing code: ${error.message}` };
  }
});

ipcMain.handle('generate-code', async (event, description, language) => {
  try {
    const result = await aiService.generateCode(description, language);
    return result;
  } catch (error) {
    console.error('Error generating code:', error);
    return { error: `Error generating code: ${error.message}` };
  }
});

ipcMain.handle('close-app', () => {
  app.quit();
});

ipcMain.handle('document-code', async (event, code, language) => {
  try {
    const result = await aiService.documentCode(code, language);
    return result;
  } catch (error) {
    console.error('Error documenting code:', error);
    return { error: `Error documenting code: ${error.message}` };
  }
});

ipcMain.handle('explain-code', async (event, code, language) => {
  try {
    const result = await aiService.explainCode(code, language);
    return result;
  } catch (error) {
    console.error('Error explaining code:', error);
    return { error: `Error explaining code: ${error.message}` };
  }
});

ipcMain.handle('execute-command', async (event, command, cwd) => {
  return new Promise((resolve) => {
    const childProcess = spawn(command, [], {
      shell: true,
      cwd: cwd || process.env.HOME || process.env.USERPROFILE,
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    childProcess.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr
      });
    });
  });
});

ipcMain.handle('start-terminal', async (event, cwd) => {
  if (terminalProcess) {
    terminalProcess.kill();
  }
  
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const workingDir = cwd || process.env.HOME || process.env.USERPROFILE;
  
  terminalProcess = spawn(shell, [], {
    cwd: workingDir,
    env: process.env,
    shell: true
  });
  
  terminalProcess.stdout.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-output', data.toString());
    }
  });
  
  terminalProcess.stderr.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-output', data.toString());
    }
  });
  
  terminalProcess.on('exit', (code) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-exit', code);
    }
    terminalProcess = null;
  });
  
  return true;
});

ipcMain.handle('send-to-terminal', async (event, data) => {
  if (terminalProcess && terminalProcess.stdin) {
    terminalProcess.stdin.write(data);
    return true;
  }
  return false;
});

ipcMain.on('terminal-command', (event, command) => {
  if (terminalProcess) {
    terminalProcess.stdin.write(command + '\n');
  }
});

ipcMain.handle('kill-terminal', async () => {
  if (terminalProcess) {
    terminalProcess.kill();
    terminalProcess = null;
    return true;
  }
  return false;
});

ipcMain.handle('exportProjectToZip', async (event, projectPath, exportPath) => {
  try {
    const zip = new AdmZip();
    
    function addDirectoryToZip(dirPath, zipPath = '') {
      const items = fs.readdirSync(dirPath);
      
      items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const relativePath = path.join(zipPath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          addDirectoryToZip(fullPath, relativePath);
        } else {
          zip.addLocalFile(fullPath, relativePath);
        }
      });
    }
    
    addDirectoryToZip(projectPath);
    zip.writeZip(exportPath);
    
    return true;
  } catch (error) {
    console.error('Error exporting project:', error);
    return false;
  }
});

ipcMain.handle('importProjectFromZip', async (event, zipPath, destinationPath) => {
  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destinationPath, true);
    return true;
  } catch (error) {
    console.error('Error importing project:', error);
    return false;
  }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      ...options,
      properties: ['createDirectory']
    });
    return result.filePath || null;
  } catch (error) {
    console.error('Error in save dialog:', error);
    return null;
  }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result.filePaths[0] || null;
  } catch (error) {
    console.error('Error in open dialog:', error);
    return null;
  }
});

ipcMain.handle('read-language-file', async (event, langCode) => {
  try {
    const filePath = path.join(__dirname, 'i18n', `${langCode}.json`);
    const content = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading language file ${langCode}:`, error);
    return null;
  }
});

ipcMain.handle('get-available-languages', async () => {
  try {
    const i18nDir = path.join(__dirname, 'i18n');
    const files = await fs.promises.readdir(i18nDir);
    
    const languages = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const langCode = path.basename(file, '.json');
        
        try {
          const content = fs.readFileSync(path.join(i18nDir, file), 'utf8');
          const data = JSON.parse(content);
          return {
            code: langCode,
            name: data.languageName || langCode
          };
        } catch (err) {
          return { code: langCode, name: langCode };
        }
      });
    
    return languages;
  } catch (error) {
    console.error('Error listing available languages:', error);
    return [];
  }
});

ipcMain.handle('set-app-language', async (event, langCode) => {
  try {

    const filePath = path.join(__dirname, 'i18n', `${langCode}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Language file not found: ${langCode}`);
    }
    
    appLanguage = langCode;
    store.set('appLanguage', langCode);
    
    loadTranslations(langCode);
    
    if (mainWindow && translations.appTitle) {
      mainWindow.setTitle(translations.appTitle);
    }
    
    return true;
  } catch (error) {
    console.error('Error setting application language:', error);
    return false;
  }
});