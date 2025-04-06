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
  // Iniciar terminal automaticamente com diretório atual
  window.electronAPI.startTerminal();
  
  if (window.i18nManager) {
	  
  } else {
	  console.warn('Error i18nManager');
  }
  
  // Mostrar a saída no console ou em algum <div>
  window.electronAPI.onTerminalOutput((event, data) => {
	  //notyf.success('Saída do terminal:', data);
	  const output = document.getElementById('terminal');
	  if (output) {
		  output.textContent += data.toString();
		  output.scrollTop = output.scrollHeight; // scroll automático
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
    console.log('AIManager não está disponível ainda');
    return;
  }
  
  if (activeFile) {
    console.log('Atualizando estado dos botões com arquivo ativo:', activeFile.name);
    window.aiManager.updateButtonState(true, activeFile.path);
  } else {
    console.log('Nenhum arquivo ativo, botões desabilitados');
    window.aiManager.updateButtonState(false);
  }
}

// Modificar a função initAIManager para usar a nova função
function initAIManager() {
  console.log('Tentando inicializar AIManager...');
  
  if (typeof window.AIManager !== 'function') {
    console.warn('AIManager classe não está disponível, tentando novamente em 1 segundo...');
    setTimeout(initAIManager, 1000);
    return;
  }
  
  if (!window.aiManager) {
    console.log('Criando nova instância do AIManager');
    try {
      window.aiManager = new window.AIManager();
      notyf.success('AIManager Carregado');
      // Chamar a função de atualização após inicialização
      updateAIManagerState();
    } catch (error) {
      console.error('Erro ao instanciar AIManager:', error);
      notyf.error('Erro ao carregar AIManager');
      return;
    }
  }
}

// Manipuladores de eventos
async function handleOpenProject() {
  const projectPath = await window.electronAPI.openDirectory();
  if (projectPath) {
    currentProject = projectPath;
    projectTitleEl.textContent = getProjectName(projectPath);
    newFileBtn.disabled = false;
    
    // Carregar a estrutura de arquivos do projeto
    const files = await window.electronAPI.readDirectory(projectPath);
    renderFileExplorer(files);
    
    // Atualizar o diretório do terminal se estiver ativo
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
    notyf.success('Arquivo salvo com sucesso!');
  }
}

function toggleTerminal() {
  const isHidden = terminalContainer.classList.toggle('hidden');
  toggleTerminalBtn.textContent = isHidden ? '▼' : '▲';
  
  if (!isHidden) {
    // Inicializar o terminal se ainda não foi feito
    if (!terminalManager) {
      terminalManager = new TerminalManager(terminal);
      terminalManager.initialize().then(() => {
        // Inicializar no diretório do projeto, se houver
        if (currentProject) {
          terminalManager.write(`cd "${currentProject}"\r`);
        }
      });
    } else {
      // Ajustar o tamanho do terminal ao exibi-lo
      terminalManager.fit();
    }
  }
}

// Funções de utilidade
function getProjectName(path) {
  // Extrair o nome do diretório do caminho completo
  return path.split(/[\\/]/).pop();
}

// Renderizar o explorador de arquivos
function renderFileExplorer(files) {
  fileExplorer.innerHTML = '';
  files.forEach(item => {
    const element = createFileExplorerItem(item);
    fileExplorer.appendChild(element);
  });
}

// Escutando o evento 'file-created' para atualizar a interface
window.electronAPI.onFileCreated((updatedFiles) => {
  renderFileExplorer(updatedFiles); // Atualiza a interface com a nova lista de arquivos
});

// Escutando o evento 'file-deleted' para atualizar a interface
window.electronAPI.onFileDeleted((updatedFiles) => {
  renderFileExplorer(updatedFiles); // Atualiza a interface com a nova lista de arquivos
});

// Função para criar o arquivo
async function createFile(dirPath, fileName) {
  try {
    const filePath = await window.electronAPI.createFile(dirPath, fileName);
    notyf.success('Arquivo criado:', filePath);
  } catch (error) {
    notyf.error('Erro ao criar o arquivo:', error);
  }
}

// Criar um item no explorador de arquivos
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
    
    // Adicionar evento de clique para expandir/recolher diretório
    header.addEventListener('click', async () => {
      if (children.classList.contains('expanded')) {
        children.classList.remove('expanded');
      } else {
        if (children.children.length === 0) {
          // Carregar conteúdo do diretório se ainda não estiver carregado
          const dirContents = await window.electronAPI.readDirectory(item.path);
          dirContents.forEach(child => {
            const childElement = createFileExplorerItem(child);
            children.appendChild(childElement);
          });
        }
        children.classList.add('expanded');
      }
    });
    
    // Adicionar evento para o menu de contexto no diretório
    header.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		showContextMenu(e, [
			{
				label: 'Novo Arquivo',
				action: () => {
					// Definir o caminho do diretório atual como contexto global
					window.currentContextPath = item.path;

					// Abrir a modal de criação de arquivo
					const fileNameModal = document.getElementById('fileNameModal');
					const fileNameInput = document.getElementById('fileNameInput');

					// Limpar input anterior
					fileNameInput.value = ''; // Limpar em vez de preencher

					// Definir placeholder
					fileNameInput.placeholder = 'novo_arquivo.php';

					// Exibir a modal
					fileNameModal.style.display = 'flex';
					fileNameInput.focus();
				}
			}
		]);
	});
    
    itemElement.appendChild(header);
    itemElement.appendChild(children);
  } else {
    // É um arquivo
    itemElement.className = 'file-item';
    
    // Determinar o ícone com base na extensão
    let icon = '📄';
    if (item.extension === 'php') icon = '🐘';
    else if (item.extension === 'js') icon = '📜';
    else if (item.extension === 'css') icon = '🎨';
    else if (item.extension === 'html') icon = '🌐';
    
    itemElement.innerHTML = `
      <span class="file-item-icon">${icon}</span>
      <span class="file-item-name">${item.name}</span>
    `;
    
    // Adicionar evento para abrir o arquivo
    itemElement.addEventListener('click', () => {
      openFile(item);
    });
    
    // Adicionar evento para o menu de contexto no arquivo
	itemElement.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		showContextMenu(e, [
			{
				label: 'Renomear',
				action: () => {
					// Exibir o modal de renomeação
					const modal = document.getElementById('renameFileModal');
					const newFileNameInput = document.getElementById('newFileNameInput');
					newFileNameInput.value = item.name; // Preencher com o nome atual

					modal.style.display = 'flex'; // Mostrar o modal

					// Ao confirmar o novo nome
					document.getElementById('renameFileConfirm').addEventListener('click', () => {
						const newName = newFileNameInput.value.trim();
						if (newName) {
							renameFile(item, newName); // Chamar a função para renomear o arquivo
							modal.style.display = 'none'; // Fechar o modal
						}
					});

					// Ao cancelar a renomeação
					document.getElementById('renameFileCancel').addEventListener('click', () => {
						modal.style.display = 'none'; // Fechar o modal sem alterar
					});
				}
			},
			{
				label: 'Excluir',
				action: () => {
					// Confirmar exclusão
					const confirmDelete = confirm('Tem certeza de que deseja excluir este arquivo?');
					if (confirmDelete) {
						deleteFile(item); // Chamar função para excluir o arquivo
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
		// Usar o valor do input ou o placeholder se estiver vazio
		const fileName = fileNameInput.value.trim() || fileNameInput.placeholder;

		if (fileName && window.currentContextPath) {
			// Usar o caminho do diretório do contexto de menu
			createNewFile(window.currentContextPath, fileName);
			fileNameModal.style.display = 'none';
		}
	});

	cancelFileNameBtn.addEventListener('click', () => {
		fileNameModal.style.display = 'none';
	});

	// Suporte para Enter
	fileNameInput.addEventListener('keyup', (e) => {
		if (e.key === 'Enter') {
			// Usar o valor do input ou o placeholder se estiver vazio
			const fileName = fileNameInput.value.trim() || fileNameInput.placeholder;

			if (fileName && window.currentContextPath) {
				createNewFile(window.currentContextPath, fileName);
				fileNameModal.style.display = 'none';
			}
		}
	});
}

// Abrir um arquivo no editor
async function openFile(file, setAsActive = true) {
  // Verificar se o arquivo já está aberto
  const existingTabIndex = openFiles.findIndex(f => f.path === file.path);
  if (existingTabIndex !== -1) {
    // Se já estiver aberto, apenas ative a aba
    setActiveFile(existingTabIndex);
    return;
  }
  
  // Carregar o conteúdo do arquivo
  const content = await window.electronAPI.readFile(file.path);
  if (content !== null) {
    // Adicionar à lista de arquivos abertos
    openFiles.push(file);
    const tabIndex = openFiles.length - 1;
    
    // Criar uma nova aba
    createTab(file, tabIndex);
    
    // Criar um editor para este arquivo (ou reusá-lo se já existir)
    createEditor(file.path, content);
    
    // Ativar esta aba
	if (setAsActive) {
		setActiveFile(tabIndex);
	}
    
    // Habilitar o botão de salvar
    saveFileBtn.disabled = false;
    saveSessionState();
  }
}

// Criar uma nova aba
function createTab(file, index) {
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.index = index;
  tab.innerHTML = `
    <span class="tab-name">${file.name}</span>
    <span class="tab-close">×</span>
  `;
  
  // Evento de clique para ativar a aba
  tab.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-close')) {
      setActiveFile(index);
    }
  });
  
  // Evento de clique para fechar a aba
  const closeBtn = tab.querySelector('.tab-close');
  closeBtn.addEventListener('click', () => {
    closeTab(index);
  });
  
  tabsContainer.appendChild(tab);
}

// Definir o arquivo ativo
function setActiveFile(index) {
  // Remover a classe 'active' de todas as abas
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Esconder todos os editores
  Object.values(editors).forEach(editor => {
    editor.container.style.display = 'none';
  });
  
  // Ativar a aba selecionada
  const tab = document.querySelector(`.tab[data-index="${index}"]`);
  if (tab) {
    tab.classList.add('active');
    activeFile = openFiles[index];
    
    // Mostrar o editor correto
    if (editors[activeFile.path]) {
      editors[activeFile.path].container.style.display = 'block';
    }
    
    // Atualizar estado dos botões de IA
    updateAIManagerState();
  }
}

// Fechar uma aba
function closeTab(index) {
	
  openFiles.splice(index, 1); // Corrigido: estava usando (index, index + 1)
  
  // Remover a aba do DOM - Adicionando verificação
  const tabToRemove = document.querySelector(`.tab[data-index="${index}"]`);
  if (tabToRemove) {
    tabToRemove.remove();
  }
  
  // Atualizar os índices das abas restantes
  document.querySelectorAll('.tab').forEach((tab, i) => {
    tab.dataset.index = i;
  });
  
  // Se não houver mais abas, desabilitar o botão de salvar
  if (openFiles.length === 0) {
    activeFile = null;
    saveFileBtn.disabled = true;
    
    // Desabilitar botões de IA
    if (aiManager) {
      aiManager.updateButtonState(false);
    }
    
    // Mostrar o placeholder novamente
    const placeholder = document.createElement('div');
    placeholder.className = 'editor-placeholder';
    placeholder.textContent = 'Abra um projeto para começar a editar';
    codeEditorContainer.innerHTML = '';
    codeEditorContainer.appendChild(placeholder);
  } else {
    // Ativar a próxima aba disponível
    const newIndex = Math.min(index, openFiles.length - 1);
    setActiveFile(newIndex);
  }
  
  saveSessionState();
  
}

// Criar um editor Monaco para o arquivo
function createEditor(filePath, content) {
  // Verificar se já existe um editor para este arquivo
  if (editors[filePath]) {
    return editors[filePath];
  }
  
  // Limpar o placeholder se existir
  const placeholder = codeEditorContainer.querySelector('.editor-placeholder');
  if (placeholder) {
    placeholder.remove();
  }
  
  // Criar um container para o editor
  const editorContainer = document.createElement('div');
  editorContainer.className = 'code-editor';
  editorContainer.style.height = '100%';
  editorContainer.style.display = 'none'; // Inicialmente oculto
  codeEditorContainer.appendChild(editorContainer);
  
  // Determinar a linguagem com base na extensão do arquivo
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
    // Adicione outros tipos conforme necessário
  }
  
  // Criar o editor Monaco
  const monacoEditor = monaco.editor.create(editorContainer, {
    value: content,
    language: language,
    theme: 'vs-dark', // Você pode usar 'vs' (claro) ou 'vs-dark' (escuro)
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
  
  // Adicionar eventos de teclado (Ctrl+S para salvar)
  monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() {
    handleSaveFile();
  });
  
  // Armazenar a referência do editor
  editors[filePath] = {
    container: editorContainer,
    editor: monacoEditor
  };
  
  return editors[filePath];
}

// Obter o conteúdo do editor ativo
function getActiveEditorContent() {
  if (!activeFile || !editors[activeFile.path]) return '';
  return editors[activeFile.path].editor.getValue();
}

// Criar um novo arquivo
async function createNewFile(dirPath, fileName) {
  const newFilePath = await window.electronAPI.createFile(dirPath, fileName);
  if (newFilePath) {
    // Atualizar o explorador de arquivos
    const dirFiles = await window.electronAPI.readDirectory(dirPath);
    
    // Se for o diretório raiz do projeto, atualizar todo o explorador
    if (dirPath === currentProject) {
      renderFileExplorer(dirFiles);
    } else {
      // Caso contrário, encontrar e atualizar apenas o diretório específico
      // (Esta parte seria implementada em uma versão mais completa)
      // Por enquanto, vamos apenas recarregar todo o explorador
      const projectFiles = await window.electronAPI.readDirectory(currentProject);
      renderFileExplorer(projectFiles);
    }
    
    // Abrir o novo arquivo no editor
    const newFile = {
      name: fileName,
      path: newFilePath,
      type: 'file',
      extension: fileName.split('.').pop()
    };
    
    openFile(newFile);
  }
}

// Renomear arquivo
async function renameFile(file, newName) {
  const newPath = await window.electronAPI.renameFile(file.path, newName); // Chamando a API do Electron para renomear

  if (newPath) {
    // Atualizar o explorador de arquivos
    const parentDir = file.path.substring(0, file.path.lastIndexOf('/'));
    const dirFiles = await window.electronAPI.readDirectory(parentDir);
    
    // Recarregar todo o explorador de arquivos
    const projectFiles = await window.electronAPI.readDirectory(currentProject);
    renderFileExplorer(projectFiles); // Atualizar a interface com o novo nome
    
    // Atualizar referências se o arquivo estiver aberto
    const openFileIndex = openFiles.findIndex(f => f.path === file.path);
    if (openFileIndex !== -1) {
      // Atualizar o caminho e nome nos arquivos abertos
      openFiles[openFileIndex].path = newPath;
      openFiles[openFileIndex].name = newName;
      
      // Atualizar o nome na aba
      const tab = document.querySelector(`.tab[data-index="${openFileIndex}"]`);
      if (tab) {
        tab.querySelector('.tab-name').textContent = newName;
      }
      
      // Atualizar as referências do editor
      if (editors[file.path]) {
        const editorInstance = editors[file.path];
        delete editors[file.path];
        editors[newPath] = editorInstance;
      }
      
      // Se for o arquivo ativo, atualizar a referência
      if (activeFile && activeFile.path === file.path) {
        activeFile.path = newPath;
        activeFile.name = newName;
      }
    }
  }
}

async function deleteFile(file) {
  try {
    // Chama a API do Electron para excluir o arquivo
    const result = await window.electronAPI.deleteFile(file.path);
    
    if (result) {
      // Atualizar o explorador de arquivos após a exclusão
      const parentDir = file.path.substring(0, file.path.lastIndexOf('/'));
      const projectFiles = await window.electronAPI.readDirectory(currentProject);
      renderFileExplorer(projectFiles); // Atualizar a interface de arquivos

      // Remover o arquivo da lista de arquivos abertos, se estiver aberto
      const openFileIndex = openFiles.findIndex(f => f.path === file.path);
      if (openFileIndex !== -1) {
        openFiles.splice(openFileIndex, 1); // Remover o arquivo da lista de arquivos abertos
        const tab = document.querySelector(`.tab[data-index="${openFileIndex}"]`);
        if (tab) {
          tab.remove(); // Remover a aba do arquivo
        }
      }

      // Atualizar a referência do arquivo ativo
      if (activeFile && activeFile.path === file.path) {
        activeFile = null; // Limpar a referência do arquivo ativo
      }
    }
  } catch (err) {
    console.error('Erro ao excluir o arquivo:', err);
  }
}



// Função para salvar o estado da sessão
async function saveSessionState() {
  if (!currentProject) return;
  
  // Preparar dados de arquivos abertos para salvar
  const openFilesData = openFiles.map(file => ({
    path: file.path,
    name: file.name,
    type: file.type,
    extension: file.extension
  }));
  
  // Identificar o arquivo ativo
  const activeFilePath = activeFile ? activeFile.path : null;
  
  // Salvar o estado da sessão
  await window.electronAPI.saveSessionState({
    currentProject,
    openFiles: openFilesData,
    activeFilePath
  });
}

// Carregar o estado da sessão
async function loadSessionState() {
  const state = await window.electronAPI.loadSessionState();
  
  if (state && state.currentProject) {
    // Restaurar o projeto atual
    currentProject = state.currentProject;
    projectTitleEl.textContent = getProjectName(currentProject);
    newFileBtn.disabled = false;
    
    // Carregar a estrutura de arquivos do projeto
    const files = await window.electronAPI.readDirectory(currentProject);
    renderFileExplorer(files);
    
    // Restaurar arquivos abertos
    if (state.openFiles && state.openFiles.length > 0) {
      // Abrir cada arquivo na ordem
      for (const fileData of state.openFiles) {
        const file = {
          path: fileData.path,
          name: fileData.name,
          type: fileData.type,
          extension: fileData.extension
        };
        await openFile(file, false); // false significa não definir como ativo ainda
      }
      
      // Restaurar o arquivo ativo
      if (state.activeFilePath) {
        const activeIndex = openFiles.findIndex(f => f.path === state.activeFilePath);
        if (activeIndex !== -1) {
          setActiveFile(activeIndex);
        }
      }
    }
  }
}

// Exibir menu de contexto
function showContextMenu(event, menuItems) {
  // Remover menu anterior, se existir
  const oldMenu = document.querySelector('.context-menu');
  if (oldMenu) {
    oldMenu.remove();
  }
  
  // Criar o novo menu
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  
  // Adicionar os itens do menu
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
  
  // Adicionar o menu ao DOM
  document.body.appendChild(menu);
  
  // Remover o menu ao clicar fora dele
  document.addEventListener('click', function closeMenu(e) {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
}

// Função para imprimir no terminal
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

// Adicionar um botão Sobre no toolbar ou menu
function setupAboutButton() {
  // Se você já tiver um botão de Sobre, adicione o event listener
  const aboutButton = document.getElementById('aboutButton');
  if (aboutButton) {
    aboutButton.addEventListener('click', showAboutDialog);
  }
}