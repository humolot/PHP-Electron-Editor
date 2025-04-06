const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const os = require('os');
const { exec, spawn } = require('child_process');
const AdmZip = require('adm-zip');
const aiService = require('./ai-service');
let terminalProcess = null;

// Armazenamento de configurações persistente
const store = new Store();
const packageJson = require('../package.json');

// Janela principal
let mainWindow;

function createWindow() {
  // Criar a janela do navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Carregar o arquivo HTML
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenu(null);
  // Abrir DevTools em desenvolvimento
  //mainWindow.webContents.openDevTools();

  // Evento quando a janela é fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Quando o Electron estiver pronto
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Sair quando todas as janelas estiverem fechadas (exceto no macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Manipulação de eventos IPC (comunicação entre processos)

ipcMain.handle('get-app-info', () => {
  return {
    name: 'PHP Electron Editor',
    version: packageJson.version || '1.0.0', // Versão do seu projeto
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
    console.error('Erro ao salvar estado da sessão:', error);
    return false;
  }
});

ipcMain.handle('load-session-state', async () => {
  try {
    return store.get('sessionState');
  } catch (error) {
    console.error('Erro ao carregar estado da sessão:', error);
    return null;
  }
});

// Abrir um diretório de projeto
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

// Ler arquivos em um diretório
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
          children: [] // Carregaremos sob demanda
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
    console.error('Erro ao ler diretório:', error);
    return [];
  }
});

// Ler conteúdo de um arquivo
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Erro ao ler arquivo:', error);
    return null;
  }
});

// Salvar conteúdo em um arquivo
ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Erro ao salvar arquivo:', error);
    return false;
  }
});

// Criar novo arquivo
ipcMain.handle('create-file', async (event, dirPath, fileName) => {
  try {
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, '');  // Criar arquivo vazio
    
    // Usar o currentProject salvo na store para garantir a atualização correta
    const projectRoot = store.get('lastProjectPath');
    
    if (projectRoot) {
      const updatedFiles = await readDirectoryStructure(projectRoot);
      event.sender.send('file-created', updatedFiles);
    }
    
    return filePath;
  } catch (error) {
    console.error('Erro ao criar arquivo:', error);
    throw error;
  }
});

// Renomear arquivo
ipcMain.handle('rename-file', async (event, oldPath, newName) => {
  try {
    const newPath = path.join(path.dirname(oldPath), newName);
    fs.renameSync(oldPath, newPath);
    return newPath; // Retorna o novo caminho
  } catch (err) {
    console.error('Erro ao renomear arquivo:', err);
    throw err;
  }
});

//Delete 
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    fs.unlinkSync(filePath);  // Exclui o arquivo
    
    // Usar o currentProject salvo na store para garantir a atualização correta
    const projectRoot = store.get('lastProjectPath');
    
    if (projectRoot) {
      const updatedFiles = await readDirectoryStructure(projectRoot);
      event.sender.send('file-deleted', updatedFiles);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
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

// Nova abordagem para terminal interativo usando spawn
ipcMain.handle('create-terminal', async (event, workingDir) => {
  try {
    // Determinar qual shell usar com base no sistema operacional
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const cwd = workingDir || process.env.HOME || process.env.USERPROFILE;
    
    // Se já existir um processo de terminal, encerre-o
    if (terminalProcess) {
      terminalProcess.kill();
      terminalProcess = null;
    }
    
    // Criar um novo processo de terminal
    terminalProcess = spawn(shell, [], {
      cwd: cwd,
      env: process.env,
      shell: true
    });
    
    // Configurar manipuladores de eventos para stdout e stderr
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
    
    // Lidar com o encerramento do processo
    terminalProcess.on('close', (code) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-data', `\r\nProcesso encerrado com código ${code || 0}\r\n`);
      }
      terminalProcess = null;
    });
    
    // Enviar mensagem inicial para o terminal
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-data', `Terminal iniciado em ${cwd}\r\n`);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao criar terminal:', error);
    return false;
  }
});

// Escrever para o terminal
ipcMain.handle('write-to-terminal', async (event, data) => {
  if (terminalProcess && terminalProcess.stdin) {
    try {
      terminalProcess.stdin.write(data);
      return true;
    } catch (error) {
      console.error('Erro ao escrever no terminal:', error);
      return false;
    }
  }
  return false;
});

// Fechar o terminal
ipcMain.handle('close-terminal', async () => {
  if (terminalProcess) {
    try {
      terminalProcess.kill();
      terminalProcess = null;
      return true;
    } catch (error) {
      console.error('Erro ao fechar terminal:', error);
      return false;
    }
  }
  return false;
});

// Recursos de IA

// Analisar código
ipcMain.handle('analyze-code', async (event, filePath, code) => {
  try {
    const result = await aiService.analyzeCode(filePath, code);
    return result;
  } catch (error) {
    console.error('Erro ao analisar código:', error);
    return { error: `Erro ao analisar código: ${error.message}` };
  }
});

// Gerar código
ipcMain.handle('generate-code', async (event, description, language) => {
  try {
    const result = await aiService.generateCode(description, language);
    return result;
  } catch (error) {
    console.error('Erro ao gerar código:', error);
    return { error: `Erro ao gerar código: ${error.message}` };
  }
});

ipcMain.handle('close-app', () => {
  app.quit();
});

// Documentar código
ipcMain.handle('document-code', async (event, code, language) => {
  try {
    const result = await aiService.documentCode(code, language);
    return result;
  } catch (error) {
    console.error('Erro ao documentar código:', error);
    return { error: `Erro ao documentar código: ${error.message}` };
  }
});

// Explicar código
ipcMain.handle('explain-code', async (event, code, language) => {
  try {
    const result = await aiService.explainCode(code, language);
    return result;
  } catch (error) {
    console.error('Erro ao explicar código:', error);
    return { error: `Erro ao explicar código: ${error.message}` };
  }
});

// Executar um comando simples no terminal
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

// Iniciar um shell interativo
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
  
  // Encaminhar saída para o renderer
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

// Enviar entrada para o terminal
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

// Encerrar o terminal
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
    console.error('Erro ao exportar projeto:', error);
    return false;
  }
});

ipcMain.handle('importProjectFromZip', async (event, zipPath, destinationPath) => {
  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destinationPath, true);
    return true;
  } catch (error) {
    console.error('Erro ao importar projeto:', error);
    return false;
  }
});

// No main process
ipcMain.handle('show-save-dialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      ...options,
      properties: ['createDirectory']
    });
    return result.filePath || null;
  } catch (error) {
    console.error('Erro no save dialog:', error);
    return null;
  }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result.filePaths[0] || null;
  } catch (error) {
    console.error('Erro no open dialog:', error);
    return null;
  }
});