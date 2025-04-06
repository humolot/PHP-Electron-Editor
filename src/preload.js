const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras do Electron para o processo de renderização
contextBridge.exposeInMainWorld('electronAPI', {
  // Gerenciamento de projeto
  openDirectory: () => ipcRenderer.invoke('open-directory'),
  readDirectory: (dir) => ipcRenderer.invoke('read-directory', dir),
  
  // Manipulação de arquivos
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  renameFile: (oldPath, newName) => ipcRenderer.invoke('rename-file', oldPath, newName),
  
  // Terminal
  executeCommand: (command, cwd) => ipcRenderer.invoke('execute-command', command, cwd),
  startTerminal: (cwd) => ipcRenderer.invoke('start-terminal', cwd),
  sendToTerminal: (data) => ipcRenderer.invoke('send-to-terminal', data),
  killTerminal: () => ipcRenderer.invoke('kill-terminal'),
  onTerminalOutput: (callback) => ipcRenderer.on('terminal-output', callback),
  onTerminalExit: (callback) => ipcRenderer.on('terminal-exit', callback),
  sendCommand: (command) => ipcRenderer.send('terminal-command', command),
  
  // Recursos de IA
  analyzeCode: (filePath, code) => ipcRenderer.invoke('analyze-code', filePath, code),
  generateCode: (description, language) => ipcRenderer.invoke('generate-code', description, language),
  documentCode: (code, language) => ipcRenderer.invoke('document-code', code, language),
  explainCode: (code, language) => ipcRenderer.invoke('explain-code', code, language),
  
  saveSessionState: (state) => ipcRenderer.invoke('save-session-state', state),
  loadSessionState: () => ipcRenderer.invoke('load-session-state'),
  
  createFile: (dirPath, fileName) => ipcRenderer.invoke('create-file', dirPath, fileName),
  onFileCreated: (callback) => ipcRenderer.on('file-created', (event, updatedFiles) => callback(updatedFiles)),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  onFileDeleted: (callback) => ipcRenderer.on('file-deleted', (event, updatedFiles) => callback(updatedFiles)),
  
  // Sistema
  exportProjectToZip: (projectPath, exportPath) => ipcRenderer.invoke('exportProjectToZip', projectPath, exportPath),
  importProjectFromZip: (zipPath, destinationPath) => ipcRenderer.invoke('importProjectFromZip', zipPath, destinationPath),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  closeApp: () => ipcRenderer.invoke('close-app')
});