// Gerenciamento dos recursos de IA
class AIManager {
  constructor() {
    this.analyzeCodeBtn = document.getElementById('analyzeCodeBtn');
    this.generateCodeBtn = document.getElementById('generateCodeBtn');
    this.documentCodeBtn = document.getElementById('documentCodeBtn');
    this.explainCodeBtn = document.getElementById('explainCodeBtn');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.analyzeCodeBtn.addEventListener('click', () => this.openAnalyzeCodePanel());
    this.generateCodeBtn.addEventListener('click', () => this.openGenerateCodePanel());
    this.documentCodeBtn.addEventListener('click', () => this.openDocumentCodePanel());
    this.explainCodeBtn.addEventListener('click', () => this.openExplainCodePanel());
  }
  
  // Atualizar estado dos botões com base no arquivo atual
  updateButtonState(isFileOpen, currentFilePath = null) {
    this.analyzeCodeBtn.disabled = !isFileOpen;
    this.documentCodeBtn.disabled = !isFileOpen;
    this.explainCodeBtn.disabled = !isFileOpen;
  }
  
  // Criar um painel para funcionalidades de IA
  createPanel(title) {
    // Remover painéis anteriores
    const oldPanel = document.querySelector('.ai-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    // Criar o novo painel
    const panel = document.createElement('div');
    panel.className = 'ai-panel';
    
    // Cabeçalho
    const header = document.createElement('div');
    header.className = 'ai-panel-header';
    header.innerHTML = `
      <div class="ai-panel-title">${title}</div>
      <button class="ai-panel-close">&times;</button>
    `;
    
    // Adicionar evento para fechar o painel
    header.querySelector('.ai-panel-close').addEventListener('click', () => {
      panel.remove();
    });
    
    // Conteúdo
    const content = document.createElement('div');
    content.className = 'ai-panel-content';
    
    // Rodapé
    const footer = document.createElement('div');
    footer.className = 'ai-panel-footer';
    
    // Montar o painel
    panel.appendChild(header);
    panel.appendChild(content);
    panel.appendChild(footer);
    
    // Adicionar ao DOM
    document.body.appendChild(panel);
    
    return { panel, content, footer };
  }
  
  // Mostrar indicador de carregamento
  showLoading(container, message = 'Processando...') {
    container.innerHTML = `
      <div class="ai-loading">
        <div class="ai-loading-spinner"></div>
        <div>${message}</div>
      </div>
    `;
  }
  
  // Abrir painel para análise de código
  async openAnalyzeCodePanel() {
    if (!activeFile || !editors[activeFile.path]) return;
    
    const { panel, content, footer } = this.createPanel('Análise de Código');
    
    // Conteúdo do painel
    content.innerHTML = `
      <p>Analisando o arquivo: <strong>${activeFile.name}</strong></p>
      <p>A IA analisará o código quanto a boas práticas, possíveis bugs, melhorias de desempenho e segurança.</p>
    `;
    
    // Botões do rodapé
    footer.innerHTML = `
      <button class="secondary" id="cancelAnalyze">Cancelar</button>
      <button id="startAnalyze">Analisar</button>
    `;
    
    // Configurar eventos
    footer.querySelector('#cancelAnalyze').addEventListener('click', () => {
      panel.remove();
    });
    
    footer.querySelector('#startAnalyze').addEventListener('click', async () => {
      // Obter o conteúdo do editor
      const code = editors[activeFile.path].editor.getValue();
      
      // Mostrar indicador de carregamento
      this.showLoading(content, 'Analisando código...');
      
      try {
        // Fazer a chamada à API
        const result = await window.electronAPI.analyzeCode(activeFile.path, code);
        
        if (result.error) {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>Erro ao analisar o código:</p>
              <div class="ai-result">${result.error}</div>
            </div>
          `;
        } else {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>Resultado da análise:</p>
              <div class="ai-result">${result.analysis.replace(/\n/g, '<br>')}</div>
            </div>
            <p><small>Tokens utilizados: ${result.tokens}</small></p>
          `;
        }
      } catch (error) {
        content.innerHTML = `
          <div class="ai-form-group">
            <p>Erro ao analisar o código:</p>
            <div class="ai-result">${error.message}</div>
          </div>
        `;
      }
      
      // Atualizar rodapé
      footer.innerHTML = `
        <button id="closeAnalyze">Fechar</button>
      `;
      
      footer.querySelector('#closeAnalyze').addEventListener('click', () => {
        panel.remove();
      });
    });
  }
  
  // Abrir painel para geração de código
  openGenerateCodePanel() {
    const { panel, content, footer } = this.createPanel('Gerar Código');
    
    // Conteúdo do painel
    content.innerHTML = `
      <div class="ai-form-group">
        <label for="codeDescription">Descreva o código que você deseja gerar:</label>
        <textarea id="codeDescription" placeholder="Por exemplo: 'Crie uma função PHP que valide um formulário de contato com campos de nome, email e mensagem.'"></textarea>
      </div>
      
      <div class="ai-form-group">
        <label for="codeLanguage">Linguagem:</label>
        <select id="codeLanguage">
          <option value="php" selected>PHP</option>
          <option value="javascript">JavaScript</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="sql">SQL</option>
        </select>
      </div>
    `;
    
    // Botões do rodapé
    footer.innerHTML = `
      <button class="secondary" id="cancelGenerate">Cancelar</button>
      <button id="startGenerate">Gerar</button>
    `;
    
    // Configurar eventos
    footer.querySelector('#cancelGenerate').addEventListener('click', () => {
      panel.remove();
    });
    
    footer.querySelector('#startGenerate').addEventListener('click', async () => {
      const description = document.getElementById('codeDescription').value;
      const language = document.getElementById('codeLanguage').value;
      
      if (!description.trim()) {
        alert('Por favor, forneça uma descrição do código que deseja gerar.');
        return;
      }
      
      // Mostrar indicador de carregamento
      this.showLoading(content, 'Gerando código...');
      
      try {
        // Fazer a chamada à API
        const result = await window.electronAPI.generateCode(description, language);
        
        if (result.error) {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>Erro ao gerar o código:</p>
              <div class="ai-result">${result.error}</div>
            </div>
          `;
        } else {
          // Processar o código gerado (remover backticks de código)
          let processedCode = result.code;
          if (processedCode.includes('```')) {
            // Extrair apenas o código de dentro das marcações de código
            const codeRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
            const matches = [...processedCode.matchAll(codeRegex)];
            if (matches.length > 0) {
              processedCode = matches[0][1];
            }
          }
          
          content.innerHTML = `
            <div class="ai-form-group">
              <p>Código gerado:</p>
              <div class="ai-result">${processedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
            </div>
            <p><small>Tokens utilizados: ${result.tokens}</small></p>
          `;
          
          // Atualizar rodapé para incluir botão de criar novo arquivo
          footer.innerHTML = `
            <button id="copyGeneratedCode">Copiar Código</button>
            <button id="closeGenerate">Fechar</button>
          `;
          
          footer.querySelector('#closeGenerate').addEventListener('click', () => {
            panel.remove();
          });
          
          footer.querySelector('#copyGeneratedCode').addEventListener('click', () => {
			  // Copiar o código gerado para a área de transferência
			  navigator.clipboard.writeText(processedCode).then(() => {
				  // Mostrar feedback visual de que o código foi copiado
				  const button = footer.querySelector('#copyGeneratedCode');
				  const originalText = button.textContent;
				  button.textContent = 'Copiado!';
				  button.style.backgroundColor = '#4CAF50';

				  setTimeout(() => {
					  button.textContent = originalText;
					  button.style.backgroundColor = ''; // Restaurar cor original
				  }, 2000);
			  }).catch(err => {
				  console.error('Erro ao copiar código:', err);
				  alert('Falha ao copiar o código');
			  });
		  });
          
        }
      } catch (error) {
        content.innerHTML = `
          <div class="ai-form-group">
            <p>Erro ao gerar o código:</p>
            <div class="ai-result">${error.message}</div>
          </div>
        `;
        
        footer.innerHTML = `
          <button id="closeGenerate">Fechar</button>
        `;
        
        footer.querySelector('#closeGenerate').addEventListener('click', () => {
          panel.remove();
        });
      }
    });
  }
  
  // Abrir painel para documentação de código
  async openDocumentCodePanel() {
    if (!activeFile || !editors[activeFile.path]) return;
    
    const { panel, content, footer } = this.createPanel('Documentar Código');
    
    // Conteúdo do painel
    content.innerHTML = `
      <p>Documentando o arquivo: <strong>${activeFile.name}</strong></p>
      <p>A IA adicionará comentários, docblocks e documentação ao código existente.</p>
    `;
    
    // Botões do rodapé
    footer.innerHTML = `
      <button class="secondary" id="cancelDocument">Cancelar</button>
      <button id="startDocument">Documentar</button>
    `;
    
    // Configurar eventos
    footer.querySelector('#cancelDocument').addEventListener('click', () => {
      panel.remove();
    });
    
    footer.querySelector('#startDocument').addEventListener('click', async () => {
      // Obter o conteúdo do editor
      const code = editors[activeFile.path].editor.getValue();
      
      // Determinar a linguagem com base na extensão do arquivo
      const extension = activeFile.name.split('.').pop().toLowerCase();
      let language = 'php';
      
      if (extension === 'js') language = 'javascript';
      else if (extension === 'html') language = 'html';
      else if (extension === 'css') language = 'css';
      
      // Mostrar indicador de carregamento
      this.showLoading(content, 'Documentando código...');
      
      try {
        // Fazer a chamada à API
        const result = await window.electronAPI.documentCode(code, language);
        
        if (result.error) {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>Erro ao documentar o código:</p>
              <div class="ai-result">${result.error}</div>
            </div>
          `;
        } else {
          // Processar o código documentado (remover backticks de código)
          let processedCode = result.documentedCode;
          if (processedCode.includes('```')) {
            // Extrair apenas o código de dentro das marcações de código
            const codeRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
            const matches = [...processedCode.matchAll(codeRegex)];
            if (matches.length > 0) {
              processedCode = matches[0][1];
            }
          }
          
          content.innerHTML = `
            <div class="ai-form-group">
              <p>Código documentado:</p>
              <div class="ai-result">${processedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
            </div>
            <p><small>Tokens utilizados: ${result.tokens}</small></p>
          `;
          
          // Atualizar rodapé para incluir botão de aplicar ao arquivo atual
          footer.innerHTML = `
            <button id="applyDocumentation">Aplicar ao Arquivo</button>
            <button id="closeDocument">Fechar</button>
          `;
          
          footer.querySelector('#closeDocument').addEventListener('click', () => {
            panel.remove();
          });
          
          footer.querySelector('#applyDocumentation').addEventListener('click', () => {
            // Atualizar o conteúdo do editor
            editors[activeFile.path].editor.setValue(processedCode);
            panel.remove();
          });
        }
      } catch (error) {
        content.innerHTML = `
          <div class="ai-form-group">
            <p>Erro ao documentar o código:</p>
            <div class="ai-result">${error.message}</div>
          </div>
        `;
        
        footer.innerHTML = `
          <button id="closeDocument">Fechar</button>
        `;
        
        footer.querySelector('#closeDocument').addEventListener('click', () => {
          panel.remove();
        });
      }
    });
  }
  
  // Abrir painel para explicação de código
  async openExplainCodePanel() {
    if (!activeFile || !editors[activeFile.path]) return;
    
    const { panel, content, footer } = this.createPanel('Explicar Código');
    
    // Verificar se há texto selecionado no editor
    let selectedCode = editors[activeFile.path].editor.getModel().getValueInRange(
      editors[activeFile.path].editor.getSelection()
    );
    
    // Se não houver seleção, usar todo o código
    if (!selectedCode) {
      selectedCode = editors[activeFile.path].editor.getValue();
    }
    
    // Conteúdo do painel
    content.innerHTML = `
      <p>Explicando o código do arquivo: <strong>${activeFile.name}</strong></p>
      <div class="ai-form-group">
        <label for="codeToExplain">Código a ser explicado (você pode editar):</label>
        <textarea id="codeToExplain">${selectedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
      </div>
    `;
    
    // Botões do rodapé
    footer.innerHTML = `
      <button class="secondary" id="cancelExplain">Cancelar</button>
      <button id="startExplain">Explicar</button>
    `;
    
    // Configurar eventos
    footer.querySelector('#cancelExplain').addEventListener('click', () => {
      panel.remove();
    });
    
    footer.querySelector('#startExplain').addEventListener('click', async () => {
      const codeToExplain = document.getElementById('codeToExplain').value;
      
      if (!codeToExplain.trim()) {
        alert('Por favor, forneça o código que deseja explicar.');
        return;
      }
      
      // Determinar a linguagem com base na extensão do arquivo
      const extension = activeFile.name.split('.').pop().toLowerCase();
      let language = 'php';
      
      if (extension === 'js') language = 'javascript';
      else if (extension === 'html') language = 'html';
      else if (extension === 'css') language = 'css';
      
      // Mostrar indicador de carregamento
      this.showLoading(content, 'Analisando e explicando o código...');
      
      try {
        // Fazer a chamada à API
        const result = await window.electronAPI.explainCode(codeToExplain, language);
        
        if (result.error) {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>Erro ao explicar o código:</p>
              <div class="ai-result">${result.error}</div>
            </div>
          `;
        } else {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>Explicação do código:</p>
              <div class="ai-result">${result.explanation.replace(/\n/g, '<br>')}</div>
            </div>
            <p><small>Tokens utilizados: ${result.tokens}</small></p>
          `;
        }
      } catch (error) {
        content.innerHTML = `
          <div class="ai-form-group">
            <p>Erro ao explicar o código:</p>
            <div class="ai-result">${error.message}</div>
          </div>
        `;
      }
      
      // Atualizar rodapé
      footer.innerHTML = `
        <button id="closeExplain">Fechar</button>
      `;
      
      footer.querySelector('#closeExplain').addEventListener('click', () => {
        panel.remove();
      });
    });
  }
}

// Exportar o gerenciador de IA para uso global
window.AIManager = AIManager;