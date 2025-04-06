const closeAppBtn = document.getElementById('closeApp');
  if (closeAppBtn) {
	closeAppBtn.addEventListener('click', async () => {
	const confirmClose = confirm(window.__('alerts.logout') || 'Deseja sair do editor? Alterações não salvas serão perdidas.');
		if (confirmClose) {
			await window.electronAPI.closeApp();
		}
	});
  }
  require(['vs/editor/editor.main'], function() {
	  window.monaco.languages.register({ id: 'php' });
	  window.dispatchEvent(new Event('monaco-ready'));
	  notyf.success('PHP Electron Editor 💡');
  });

  document.getElementById('terminal').addEventListener('click', () => {
	  terminalInput.focus();
  });
  
  document.getElementById('newFile').addEventListener('click', () => {
	  const modal = document.getElementById('fileNameModal');
	  modal.style.display = 'flex';
	  document.getElementById('submitFileName').addEventListener('click', () => {
		  const fileName = document.getElementById('fileNameInput').value.trim();
		  if (fileName) {
			  window.electronAPI.createFile(currentProject, fileName);
		  }
		  modal.style.display = 'none';
	  });
	  document.getElementById('cancelFileName').addEventListener('click', () => {
		  modal.style.display = 'none';
	  });
  });
  
  let commandHistory = [];
  let historyIndex = -1;

  const terminalInputContainer = document.querySelector('.terminal-input-container');
  const oldContainer = document.querySelector('.autocomplete-container');
  if (oldContainer) {
	  oldContainer.remove();
  }

  const autocompleteContainer = document.createElement('div');
  autocompleteContainer.className = 'autocomplete-container';
  autocompleteContainer.style.cssText = `
	  position: absolute !important;
	  bottom: 100% !important;
	  left: 0 !important;
	  width: 100% !important;
	  max-height: 200px !important;
	  background-color: #1a1a1a !important;
	  border: 2px solid #4a4a4a !important;
	  z-index: 9999 !important;
	  display: none;
	  overflow-y: auto !important;
	  color: white !important;
	`;

  terminalInputContainer.style.position = 'relative';
  terminalInputContainer.insertBefore(autocompleteContainer, document.getElementById('terminalInput'));

  let selectedIndex = 0;

  function showSuggestions()
  {
	  const value = terminalInput.value.trim().toLowerCase();

	  if (!value) {
		  autocompleteContainer.style.display = 'none';
		  return;
	  }

	  const filteredCommands = editorCommands.filter(cmd =>
	  cmd.command.toLowerCase().includes(value)
	  );

	  if (filteredCommands.length === 0) {
		  autocompleteContainer.style.display = 'none';
		  return;
	  }

	  const limitedCommands = filteredCommands.slice(0, 5);
	  autocompleteContainer.innerHTML = '';

	  limitedCommands.forEach((cmd, index) => {
		  const item = document.createElement('div');
		  item.style.cssText = `
		      padding: 8px !important;
		      border-bottom: 1px solid #555 !important;
		      cursor: pointer !important;
		      display: flex !important;
		      justify-content: space-between !important;
		    `;

		  if (index === 0) {
			  item.style.backgroundColor = '#2c3e50';
		  }

		  item.innerHTML = `
		      <span style="color: #61afef !important; font-weight: bold !important;">${cmd.command}</span>
		      <span style="color: #abb2bf !important; margin-left: 10px !important;">${cmd.description}</span>
		    `;

		  item.addEventListener('click', () => {
			  terminalInput.value = cmd.command;
			  autocompleteContainer.style.display = 'none';
			  terminalInput.focus();
		  });

		  autocompleteContainer.appendChild(item);
	  });

	  autocompleteContainer.style.display = 'block';
	  selectedIndex = 0;
  }

  // Substituir os listeners do input
  const terminalInput = document.getElementById('terminalInput');
  terminalInput.addEventListener('input', showSuggestions);
  terminalInput.addEventListener('focus', () => {
	  if (terminalInput.value.trim()) {
		  showSuggestions();
	  }
  });

  // Expandir eventos de teclado para navegação nas sugestões
  terminalInput.addEventListener('keydown', (e) => {
	  if (autocompleteContainer.style.display === 'block') {
		  const items = autocompleteContainer.querySelectorAll('div');
		  if (e.key === 'ArrowDown') {
			  e.preventDefault();
			  items[selectedIndex].style.backgroundColor = '';
			  selectedIndex = (selectedIndex + 1) % items.length;
			  items[selectedIndex].style.backgroundColor = '#2c3e50';
			  items[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			  return;
		  }
		  if (e.key === 'ArrowUp') {
			  e.preventDefault();
			  items[selectedIndex].style.backgroundColor = '';
			  selectedIndex = (selectedIndex - 1 + items.length) % items.length;
			  items[selectedIndex].style.backgroundColor = '#2c3e50';
			  items[selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			  return;
		  }
		  if (e.key === 'Tab') {
			  e.preventDefault();
			  if (items.length > 0) {
				  terminalInput.value = editorCommands[selectedIndex].command;
				  autocompleteContainer.style.display = 'none';
			  }
			  return;
		  }
		  if (e.key === 'Escape') {
			  autocompleteContainer.style.display = 'none';
			  return;
		  }
	  }

	  const value = terminalInput.value;

	  if (e.key === 'Enter') {
		  const command = value.trim();
		  if (command) {
			  window.electronAPI.sendCommand(command);
			  commandHistory.unshift(command);
			  if (commandHistory.length > 10)
				  commandHistory.pop();
			  historyIndex = -1;

			  terminalInput.value = '';
			  autocompleteContainer.style.display = 'none';
		  }
	  }

	  if (e.key === 'ArrowUp' && autocompleteContainer.style.display !== 'block') {
		  if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
			  historyIndex++;
			  terminalInput.value = commandHistory[historyIndex];
			  showSuggestions();
		  }
		  e.preventDefault();
	  }

	  if (e.key === 'ArrowDown' && autocompleteContainer.style.display !== 'block') {
		  if (historyIndex > 0) {
			  historyIndex--;
			  terminalInput.value = commandHistory[historyIndex];
			  showSuggestions();
		  } else {
			  historyIndex = -1;
			  terminalInput.value = '';
			  autocompleteContainer.style.display = 'none';
		  }
		  e.preventDefault();
	  }
  });

  document.addEventListener('click', (e) => {
	  if (!terminalInputContainer.contains(e.target)) {
		  autocompleteContainer.style.display = 'none';
	  }
  });