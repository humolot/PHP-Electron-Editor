// Elementos do DOM
const fileExplorer = document.getElementById('fileExplorer');
const tabsContainer = document.getElementById('tabsContainer');
const codeEditorContainer = document.getElementById('codeEditorContainer');
const openProjectBtn = document.getElementById('openProject');
const newFileBtn = document.getElementById('newFile');
const saveFileBtn = document.getElementById('saveFile');
const toggleTerminalBtn = document.getElementById('toggleTerminal');
const terminalContainer = document.querySelector('.terminal-container');
const terminal = document.getElementById('terminal');
const projectTitleEl = document.querySelector('.project-title');

// Estado da aplicação
let currentProject = null;
let openFiles = [];
let activeFile = null;
let editors = {};  // Armazenar instâncias do editor por caminho de arquivo
let terminalManager = null; // Gerenciador do terminal
let aiManager = null; // Gerenciador de recursos de IA

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSessionState();
  setupAboutButton();
  setupNewFileModal();
  setupProjectButtons();
  initAIManager();

  window.electronAPI.startTerminal();
  
  if (window.i18nManager) {
	  
  } else {
	  console.warn('Error i18nManager');
  }
  
  window.electronAPI.onTerminalOutput((event, data) => {
	  const output = document.getElementById('terminal');
	  if (output) {
		  output.textContent += data.toString();
		  output.scrollTop = output.scrollHeight;
	  }
  });

});

// Configurar event listeners
function setupEventListeners() {
  openProjectBtn.addEventListener('click', handleOpenProject);
  saveFileBtn.addEventListener('click', handleSaveFile);
}

// Adicionar esta função para centralizar a lógica de atualização
function updateAIManagerState() {
  if (!window.aiManager) {
	  console.log('AIManager is not available yet');
    return;
  }
  
  if (activeFile) {
    window.aiManager.updateButtonState(true, activeFile.path);
  } else {
    window.aiManager.updateButtonState(false);
  }
}

function initAIManager() {
  console.log('Trying to initialize AIManager...');
  
  if (typeof window.AIManager !== 'function') {
	console.warn('AIManager class is not available, retrying in 1 second...');
    setTimeout(initAIManager, 1000);
    return;
  }
  
  if (!window.aiManager) {
	  console.log('Creating new AIManager instance');
    try {
      window.aiManager = new window.AIManager();
      notyf.success('AIManager Loaded');
      updateAIManagerState();
    } catch (error) {
      console.error('Error instantiating AIManager:', error);
      notyf.error('Error instantiating AIManager');
      return;
    }
  }
}

async function handleOpenProject() {
  const projectPath = await window.electronAPI.openDirectory();
  if (projectPath) {
    currentProject = projectPath;
    projectTitleEl.textContent = getProjectName(projectPath);
    newFileBtn.disabled = false;
    
    const files = await window.electronAPI.readDirectory(projectPath);
    renderFileExplorer(files);
    
    if (terminalManager && terminalManager.isInitialized) {
      terminalManager.write(`cd "${projectPath}"\r`);
    }
    
    saveSessionState();
    
  }
}

async function handleSaveFile() {
  if (!activeFile) return;
  
  const content = getActiveEditorContent();
  const success = await window.electronAPI.saveFile(activeFile.path, content);
  
  if (success) {
	  notyf.success(window.__('alerts.file_save_success') || 'Arquivo salvo com sucesso!');
  }
}

function toggleTerminal() {
  const isHidden = terminalContainer.classList.toggle('hidden');
  toggleTerminalBtn.textContent = isHidden ? '▼' : '▲';
  
  if (!isHidden) {
    if (!terminalManager) {
      terminalManager = new TerminalManager(terminal);
      terminalManager.initialize().then(() => {
        if (currentProject) {
          terminalManager.write(`cd "${currentProject}"\r`);
        }
      });
    } else {
      terminalManager.fit();
    }
  }
}

function getProjectName(path) {
  return path.split(/[\\/]/).pop();
}

function renderFileExplorer(files) {
  fileExplorer.innerHTML = '';
  files.forEach(item => {
    const element = createFileExplorerItem(item);
    fileExplorer.appendChild(element);
  });
}

window.electronAPI.onFileCreated((updatedFiles) => {
  renderFileExplorer(updatedFiles);
});


window.electronAPI.onFileDeleted((updatedFiles) => {
  renderFileExplorer(updatedFiles);
});

async function createFile(dirPath, fileName) {
  try {
    const filePath = await window.electronAPI.createFile(dirPath, fileName);
    notyf.success(window.__('alerts.file_created') || 'Arquivo Criado:', filePath);
  } catch (error) {
    notyf.error(window.__('alerts.error_createfile') || 'Erro ao criar o arquivo:', error);
  }
}

function createFileExplorerItem(item) {
  const itemElement = document.createElement('div');
  
  if (item.type === 'directory') {
    itemElement.className = 'directory-item';
    
    const header = document.createElement('div');
    header.className = 'file-item';
    header.innerHTML = `
      <span class="file-item-icon">📁</span>
      <span class="file-item-name">${item.name}</span>
    `;
    
    const children = document.createElement('div');
    children.className = 'directory-children';
    
    header.addEventListener('click', async () => {
      if (children.classList.contains('expanded')) {
        children.classList.remove('expanded');
      } else {
        if (children.children.length === 0) {
          const dirContents = await window.electronAPI.readDirectory(item.path);
          dirContents.forEach(child => {
            const childElement = createFileExplorerItem(child);
            children.appendChild(childElement);
          });
        }
        children.classList.add('expanded');
      }
    });
    
    header.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		showContextMenu(e, [
			{
				label: window.__('buttons.new_file') || 'Novo Arquivo',
				action: () => {
					window.currentContextPath = item.path;

					const fileNameModal = document.getElementById('fileNameModal');
					const fileNameInput = document.getElementById('fileNameInput');

					fileNameInput.value = ''; // Limpar em vez de preencher
					fileNameInput.placeholder = 'NewFileName.php';
					fileNameModal.style.display = 'flex';
					fileNameInput.focus();
				}
			}
		]);
	});
    
    itemElement.appendChild(header);
    itemElement.appendChild(children);
    
  } else {
   
    itemElement.className = 'file-item';
    
    let icon = '📄';
    if (item.extension === 'php') icon = '🐘';
    else if (item.extension === 'js') icon = '📜';
    else if (item.extension === 'css') icon = '🎨';
    else if (item.extension === 'html') icon = '🌐';
    
    itemElement.innerHTML = `
      <span class="file-item-icon">${icon}</span>
      <span class="file-item-name">${item.name}</span>
    `;
    
    itemElement.addEventListener('click', () => {
      openFile(item);
    });
    
	itemElement.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		showContextMenu(e, [
			{
				label: window.__('buttons.rename') || 'Renomear',
				action: () => {
					const modal = document.getElementById('renameFileModal');
					const newFileNameInput = document.getElementById('newFileNameInput');
					newFileNameInput.value = item.name;
					modal.style.display = 'flex';
					document.getElementById('renameFileConfirm').addEventListener('click', () => {
						const newName = newFileNameInput.value.trim();
						if (newName) {
							renameFile(item, newName);
							modal.style.display = 'none';
						}
					});
					document.getElementById('renameFileCancel').addEventListener('click', () => {
						modal.style.display = 'none';
					});
				}
			},
			{
				label: window.__('buttons.delete') || 'Excluir',
				action: () => {
					const cnfDel = confirm(window.__('alerts.confirm_delete') || 'Tem certeza de que deseja excluir este arquivo?');
					if (cnfDel) {
						deleteFile(item);
					}
				}
			}
		]);
	});

  }
  
  return itemElement;
}

function setupNewFileModal()
{
	const fileNameModal = document.getElementById('fileNameModal');
	const fileNameInput = document.getElementById('fileNameInput');
	const submitFileNameBtn = document.getElementById('submitFileName');
	const cancelFileNameBtn = document.getElementById('cancelFileName');

	submitFileNameBtn.addEventListener('click', () => {
		const fileName = fileNameInput.value.trim() || fileNameInput.placeholder;

		if (fileName && window.currentContextPath) {
			createNewFile(window.currentContextPath, fileName);
			fileNameModal.style.display = 'none';
		}
	});

	cancelFileNameBtn.addEventListener('click', () => {
		fileNameModal.style.display = 'none';
	});

	fileNameInput.addEventListener('keyup', (e) => {
		if (e.key === 'Enter') {
			const fileName = fileNameInput.value.trim() || fileNameInput.placeholder;
			if (fileName && window.currentContextPath) {
				createNewFile(window.currentContextPath, fileName);
				fileNameModal.style.display = 'none';
			}
		}
	});
}

async function openFile(file, setAsActive = true) {
  const existingTabIndex = openFiles.findIndex(f => f.path === file.path);
  if (existingTabIndex !== -1) {
    setActiveFile(existingTabIndex);
    return;
  }
  
  const content = await window.electronAPI.readFile(file.path);
  if (content !== null) {
    openFiles.push(file);
    const tabIndex = openFiles.length - 1;
    createTab(file, tabIndex);
    createEditor(file.path, content);
	if (setAsActive) {
		setActiveFile(tabIndex);
	}
    saveFileBtn.disabled = false;
    saveSessionState();
  }
}

function createTab(file, index) {
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.index = index;
  tab.innerHTML = `
    <span class="tab-name">${file.name}</span>
    <span class="tab-close">×</span>
  `;
  
  tab.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-close')) {
      setActiveFile(index);
    }
  });
  
  const closeBtn = tab.querySelector('.tab-close');
  closeBtn.addEventListener('click', () => {
    closeTab(index);
  });
  
  tabsContainer.appendChild(tab);
}

function setActiveFile(index) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  Object.values(editors).forEach(editor => {
    editor.container.style.display = 'none';
  });
  
  const tab = document.querySelector(`.tab[data-index="${index}"]`);
  if (tab) {
    tab.classList.add('active');
    activeFile = openFiles[index];
    if (editors[activeFile.path]) {
      editors[activeFile.path].container.style.display = 'block';
    }
    
    updateAIManagerState();
  }
}

function closeTab(index) {
	
  openFiles.splice(index, 1);
  
  const tabToRemove = document.querySelector(`.tab[data-index="${index}"]`);
  if (tabToRemove) {
    tabToRemove.remove();
  }
  
  document.querySelectorAll('.tab').forEach((tab, i) => {
    tab.dataset.index = i;
  });
  
  if (openFiles.length === 0) {
    activeFile = null;
    saveFileBtn.disabled = true;
    
    if (aiManager) {
      aiManager.updateButtonState(false);
    }
    
    const placeholder = document.createElement('div');
    placeholder.className = 'editor-placeholder';
    placeholder.textContent = window.__('ui.editorPlaceholder') || 'Abra um projeto para começar a editar';
    codeEditorContainer.innerHTML = '';
    codeEditorContainer.appendChild(placeholder);
  } else {
    const newIndex = Math.min(index, openFiles.length - 1);
    setActiveFile(newIndex);
  }
  
  saveSessionState();
  
}

function createEditor(filePath, content) {
  
  if (editors[filePath]) {
    return editors[filePath];
  }
  
  const placeholder = codeEditorContainer.querySelector('.editor-placeholder');
  if (placeholder) {
    placeholder.remove();
  }
  
  const editorContainer = document.createElement('div');
  editorContainer.className = 'code-editor';
  editorContainer.style.height = '100%';
  editorContainer.style.display = 'none';
  codeEditorContainer.appendChild(editorContainer);
  
  const extension = filePath.split('.').pop().toLowerCase();
  let language = 'plaintext';
  
  switch (extension) {
    case 'php':
      language = 'php';
      break;
    case 'js':
      language = 'javascript';
      break;
    case 'html':
      language = 'html';
      break;
    case 'css':
      language = 'css';
      break;
    case 'json':
      language = 'json';
      break;
    case 'md':
      language = 'markdown';
      break;
    case 'xml':
      language = 'xml';
      break;
    case 'sql':
      language = 'sql';
      break;
  }
  
  const monacoEditor = monaco.editor.create(editorContainer, {
    value: content,
    language: language,
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: {
      enabled: true
    },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    tabSize: 4,
    insertSpaces: true,
    wordWrap: 'on'
  });
  
  monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() {
    handleSaveFile();
  });
  
  editors[filePath] = {
    container: editorContainer,
    editor: monacoEditor
  };
  
  return editors[filePath];
}

function getActiveEditorContent() {
  if (!activeFile || !editors[activeFile.path]) return '';
  return editors[activeFile.path].editor.getValue();
}

async function createNewFile(dirPath, fileName) {
  const newFilePath = await window.electronAPI.createFile(dirPath, fileName);
  if (newFilePath) {

    const dirFiles = await window.electronAPI.readDirectory(dirPath);
    
    if (dirPath === currentProject) {
      renderFileExplorer(dirFiles);
    } else {
      const projectFiles = await window.electronAPI.readDirectory(currentProject);
      renderFileExplorer(projectFiles);
    }
    
    const newFile = {
      name: fileName,
      path: newFilePath,
      type: 'file',
      extension: fileName.split('.').pop()
    };
    
    openFile(newFile);
  }
}

async function renameFile(file, newName) {
  const newPath = await window.electronAPI.renameFile(file.path, newName);

  if (newPath) {
    
    const parentDir = file.path.substring(0, file.path.lastIndexOf('/'));
    const dirFiles = await window.electronAPI.readDirectory(parentDir);
    
    const projectFiles = await window.electronAPI.readDirectory(currentProject);
    renderFileExplorer(projectFiles);
    
    const openFileIndex = openFiles.findIndex(f => f.path === file.path);
    if (openFileIndex !== -1) {

      openFiles[openFileIndex].path = newPath;
      openFiles[openFileIndex].name = newName;
      
      const tab = document.querySelector(`.tab[data-index="${openFileIndex}"]`);
      if (tab) {
        tab.querySelector('.tab-name').textContent = newName;
      }
      
      if (editors[file.path]) {
        const editorInstance = editors[file.path];
        delete editors[file.path];
        editors[newPath] = editorInstance;
      }
      
      if (activeFile && activeFile.path === file.path) {
        activeFile.path = newPath;
        activeFile.name = newName;
      }
    }
  }
}

async function deleteFile(file) {
  try {
    
    const result = await window.electronAPI.deleteFile(file.path);
    
    if (result) {
     
      const parentDir = file.path.substring(0, file.path.lastIndexOf('/'));
      const projectFiles = await window.electronAPI.readDirectory(currentProject);
      renderFileExplorer(projectFiles);

      const openFileIndex = openFiles.findIndex(f => f.path === file.path);
      if (openFileIndex !== -1) {
        openFiles.splice(openFileIndex, 1);
        const tab = document.querySelector(`.tab[data-index="${openFileIndex}"]`);
        if (tab) {
          tab.remove();
        }
      }

      if (activeFile && activeFile.path === file.path) {
        activeFile = null;
      }
    }
  } catch (err) {
    console.error('Error deleting file:', err);
  }
}

async function saveSessionState() {
  if (!currentProject) return;
  
  const openFilesData = openFiles.map(file => ({
    path: file.path,
    name: file.name,
    type: file.type,
    extension: file.extension
  }));
  
  const activeFilePath = activeFile ? activeFile.path : null;

  await window.electronAPI.saveSessionState({
    currentProject,
    openFiles: openFilesData,
    activeFilePath
  });
}

async function loadSessionState() {
  const state = await window.electronAPI.loadSessionState();
  
  if (state && state.currentProject) {

    currentProject = state.currentProject;
    projectTitleEl.textContent = getProjectName(currentProject);
    newFileBtn.disabled = false;
    
    const files = await window.electronAPI.readDirectory(currentProject);
    renderFileExplorer(files);
    
    if (state.openFiles && state.openFiles.length > 0) {
      for (const fileData of state.openFiles) {
        const file = {
          path: fileData.path,
          name: fileData.name,
          type: fileData.type,
          extension: fileData.extension
        };
        await openFile(file, false);
      }
      
      if (state.activeFilePath) {
        const activeIndex = openFiles.findIndex(f => f.path === state.activeFilePath);
        if (activeIndex !== -1) {
          setActiveFile(activeIndex);
        }
      }
    }
  }
}

function showContextMenu(event, menuItems) {

  const oldMenu = document.querySelector('.context-menu');
  if (oldMenu) {
    oldMenu.remove();
  }
  
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  
  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.textContent = item.label;
    menuItem.addEventListener('click', () => {
      item.action();
      menu.remove();
    });
    menu.appendChild(menuItem);
  });
  
  document.body.appendChild(menu);
  
  document.addEventListener('click', function closeMenu(e) {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
}

function printToTerminal(message) {
  const line = document.createElement('div');
  line.textContent = message;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}
async function exportProject() {
  if (!currentProject) {
    alert(window.__('exportProject.no_project_selected') || 'Nenhum projeto selecionado para exportar');
    return;
  }

  try {
    const exportPath = await window.electronAPI.showSaveDialog({
      title: window.__('exportProject.export_project_title') || 'Exportar Projeto',
      defaultPath: `${getProjectName(currentProject)}.peditor`,
      filters: [{ name: 'Projeto Editor', extensions: ['peditor'] }]
    });

    if (exportPath) {
      await window.electronAPI.exportProjectToZip(currentProject, exportPath);
      alert(window.__('exportProject.project_exported_success') || 'Projeto exportado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao exportar projeto:', error);
    alert(window.__('exportProject.project_export_failed') || 'Falha ao exportar o projeto');
  }
}

async function importProject() {
  try {
    const importPath = await window.electronAPI.showOpenDialog({
      title: window.__('importProject.import_project_title') || 'Importar Projeto',
      filters: [{ name: 'Projeto Editor', extensions: ['peditor'] }]
    });

    if (importPath) {
      const destinationPath = await window.electronAPI.showOpenDialog({
        title: window.__('importProject.select_directory_for_import') || 'Selecione o diretório para importar o projeto',
        properties: ['openDirectory']
      });

      if (destinationPath) {
        await window.electronAPI.importProjectFromZip(importPath, destinationPath);
        
        currentProject = destinationPath;
        projectTitleEl.textContent = getProjectName(destinationPath);
        newFileBtn.disabled = false;
        
        const files = await window.electronAPI.readDirectory(destinationPath);
        renderFileExplorer(files);
        
        alert(window.__('importProject.project_imported_success') || 'Projeto importado com sucesso!');
      }
    }
  } catch (error) {
    console.error('Erro ao importar projeto:', error);
    alert(window.__('importProject.project_import_failed') || 'Falha ao importar o projeto');
  }
}

function setupProjectButtons() {
  const exportProjectBtn = document.getElementById('exportProjectBtn');
  const importProjectBtn = document.getElementById('importProjectBtn');

  exportProjectBtn.addEventListener('click', () => {
    if (currentProject) {
      exportProject();
    } else {
      alert(window.__('setupProjectButtons.open_project_before_export') || 'Abra um projeto antes de exportar');
    }
  });

  importProjectBtn.addEventListener('click', () => {
    importProject();
  });
}

async function showAboutDialog() {
  try {
    const appInfo = await window.electronAPI.getAppInfo();
    
    const aboutModal = document.createElement('div');
    aboutModal.className = 'modal';
    aboutModal.innerHTML = `
      <div class="modal-content-about about-dialog">
        <button class="close-modal" aria-label="Fechar">&times;</button>
        <h2>${window.__('aboutDialog.about_title') || 'Sobre'} ${appInfo.name}</h2>
        <div class="about-info">
          <div class="about-section">
            <h3>${window.__('aboutDialog.app_info') || 'Informações do Aplicativo'}</h3>
            <p><strong>${window.__('aboutDialog.app_name') || 'Nome'}:</strong> ${appInfo.name}</p>
            <p><strong>${window.__('aboutDialog.app_version') || 'Versão'}:</strong> ${appInfo.version}</p>
            <p><strong>${window.__('aboutDialog.app_author') || 'Autor'}:</strong> ${appInfo.author}</p>
            <p><strong>${window.__('aboutDialog.app_company') || 'Empresa'}:</strong> ${appInfo.company}</p>
          </div>
          <div class="about-section">
            <h3>${window.__('aboutDialog.system_info') || 'Informações do Sistema'}</h3>
            <p><strong>${window.__('aboutDialog.platform') || 'Plataforma'}:</strong> ${appInfo.platform}</p>
            <p><strong>${window.__('aboutDialog.architecture') || 'Arquitetura'}:</strong> ${appInfo.arch}</p>
            <p><strong>${window.__('aboutDialog.build') || 'Build'}:</strong> ${new Date(appInfo.buildDate).toLocaleString()}</p>
          </div>
          <div class="about-section">
            <h3>${window.__('aboutDialog.tech_versions') || 'Versões de Tecnologia'}</h3>
            <p><strong>${window.__('aboutDialog.electron_version') || 'Electron'}:</strong> ${appInfo.electronVersion}</p>
            <p><strong>${window.__('aboutDialog.node_version') || 'Node.js'}:</strong> ${appInfo.nodeVersion}</p>
            <p><strong>${window.__('aboutDialog.chrome_version') || 'Chrome'}:</strong> ${appInfo.chromeVersion}</p>
          </div>
          <div class="about-section">
            <h3>${window.__('aboutDialog.ai_engine_info') || 'Motor de IA Embarcado'}</h3>
            <p><strong>${window.__('aboutDialog.ai_core') || 'Núcleo IA'}:</strong> GPT-4o OpenAI</p>
            <p><strong>${window.__('aboutDialog.ai_intelligence') || 'Inteligência'}:</strong> Geração e Análise Contextual</p>
            <p><strong>${window.__('aboutDialog.ai_innovation') || 'Inovação'}:</strong> Assistência em Codificação</p>
          </div>
        </div>
        <div class="modal-buttons">
          <button id="closeAboutModal">${window.__('aboutDialog.close_button') || 'Fechar'}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(aboutModal);
    aboutModal.style.display = 'flex';
    
    const closeBtn = aboutModal.querySelector('.close-modal');
    const closeModalBtn = aboutModal.querySelector('#closeAboutModal');
    
    const handleClose = () => {
      aboutModal.remove();
    };
    
    closeBtn.addEventListener('click', handleClose);
    closeModalBtn.addEventListener('click', handleClose);
    
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) {
        handleClose();
      }
    });
  } catch (error) {
    console.error('Erro ao mostrar diálogo Sobre:', error);
    alert(window.__('aboutDialog.project_import_failed') || 'Não foi possível carregar as informações do aplicativo.');
  }
}

function setupAboutButton() {
  const aboutButton = document.getElementById('aboutButton');
  if (aboutButton) {
    aboutButton.addEventListener('click', showAboutDialog);
  }
}