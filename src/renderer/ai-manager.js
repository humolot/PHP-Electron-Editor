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
  showLoading(container, message = window.__('ai.processing') || 'Processando...') {
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
    
    const { panel, content, footer } = this.createPanel(window.__('ai.modal_codeanalyze') || 'Análise de Código');
    
    // Conteúdo do painel
    content.innerHTML = `
      <p>${window.__('ai.analyzecodetitle') || 'Analisando o arquivo:'} <strong>${activeFile.name}</strong></p>
      <p>${window.__('ai.analyzecodepanel') || 'A IA analisará o código quanto a boas práticas, possíveis bugs, melhorias de desempenho e segurança.'}</p>
    `;
    
    // Botões do rodapé
    footer.innerHTML = `
      <button class="secondary" id="cancelAnalyze">${window.__('buttons.cancel') || 'Cancelar'}</button>
      <button id="startAnalyze">${window.__('buttons.analyze') || 'Analisar'}</button>
    `;
    
    // Configurar eventos
    footer.querySelector('#cancelAnalyze').addEventListener('click', () => {
      panel.remove();
    });
    
    footer.querySelector('#startAnalyze').addEventListener('click', async () => {
      // Obter o conteúdo do editor
      const code = editors[activeFile.path].editor.getValue();
      
      // Mostrar indicador de carregamento
      this.showLoading(content, window.__('ai.loadinganalyzer') || 'Analisando código...');
      
      try {
        // Fazer a chamada à API
        const result = await window.electronAPI.analyzeCode(activeFile.path, code);
        
        if (result.error) {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>${window.__('ai.error_analyze') || 'Erro ao analisar o código:'}</p>
              <div class="ai-result">${result.error}</div>
            </div>
          `;
        } else {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>${window.__('ai.result_analyze') || 'Resultado da análise:'}</p>
              <div class="ai-result">${result.analysis.replace(/\n/g, '<br>')}</div>
            </div>
            <p><small>${window.__('ai.tokens_used') || 'Tokens utilizados:'} ${result.tokens}</small></p>
          `;
        }
      } catch (error) {
        content.innerHTML = `
          <div class="ai-form-group">
            <p>${window.__('ai.error_analyze') || 'Erro ao analisar o código:'}</p>
            <div class="ai-result">${error.message}</div>
          </div>
        `;
      }
      
      // Atualizar rodapé
      footer.innerHTML = `
        <button id="closeAnalyze">${window.__('buttons.close') || 'Fechar'}</button>
      `;
      
      footer.querySelector('#closeAnalyze').addEventListener('click', () => {
        panel.remove();
      });
    });
  }
  
  // Abrir painel para geração de código
  openGenerateCodePanel() {
    const { panel, content, footer } = this.createPanel(window.__('ai.modal_generate') || 'Gerar Código');
    content.innerHTML = `
      <div class="ai-form-group">
        <label for="codeDescription">${window.__('ai.generate_description') || 'Descreva o código que você deseja gerar:'}</label>
        <textarea id="codeDescription" placeholder="${window.__('ai.generate_example') || 'Crie uma função PHP que valide um formulário de contato com campos de nome, email e mensagem.'}"></textarea>
      </div>
      
      <div class="ai-form-group">
        <label for="codeLanguage">${window.__('ai.lang') || 'Linguagem:'}</label>
        <select id="codeLanguage">
          <option value="php" selected>PHP</option>
          <option value="javascript">JavaScript</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="sql">SQL</option>
        </select>
      </div>
    `;
    footer.innerHTML = `
      <button class="secondary" id="cancelGenerate">${window.__('buttons.cancel') || 'Cancelar'}</button>
      <button id="startGenerate">${window.__('buttons.generate') || 'Gerar'}</button>
    `;
    footer.querySelector('#cancelGenerate').addEventListener('click', () => {
      panel.remove();
    });
    
    footer.querySelector('#startGenerate').addEventListener('click', async () => {
      const description = document.getElementById('codeDescription').value;
      const language = document.getElementById('codeLanguage').value;
      
      if (!description.trim()) {
        alert(window.__('alerts.enter_code_generate') || 'Por favor, forneça uma descrição do código que deseja gerar.');
        return;
      }
      
      this.showLoading(content, window.__('ai.loading_generate') || 'Gerando código...');
      
      try {
        const result = await window.electronAPI.generateCode(description, language);
        if (result.error) {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>${window.__('ai.error_generate_code') || 'Erro ao gerar o código:'}</p>
              <div class="ai-result">${result.error}</div>
            </div>
          `;
        } else {
          let processedCode = result.code;
          if (processedCode.includes('```')) {
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
            <p><small>${window.__('ai.tokens_used') || 'Tokens utilizados:'} ${result.tokens}</small></p>
          `;
          
          footer.innerHTML = `
            <button id="copyGeneratedCode">${window.__('buttons.copy_code') || 'Copiar Código'}</button>
            <button id="closeGenerate">${window.__('buttons.close') || 'Fechar'}</button>
          `;
          
          footer.querySelector('#closeGenerate').addEventListener('click', () => {
            panel.remove();
          });
          
          footer.querySelector('#copyGeneratedCode').addEventListener('click', () => {
			  navigator.clipboard.writeText(processedCode).then(() => {
				  const button = footer.querySelector('#copyGeneratedCode');
				  const originalText = button.textContent;
				  button.textContent = window.__('alerts.copied') || 'Copiado!';
				  button.style.backgroundColor = '#4CAF50';

				  setTimeout(() => {
					  button.textContent = originalText;
					  button.style.backgroundColor = '';
				  }, 2000);
			  }).catch(err => {
				  console.error('Erro ao copiar código:', err);
				  alert(window.__('ai.error_generate_code') || 'Erro ao gerar o código:');
			  });
		  });
          
        }
      } catch (error) {
        content.innerHTML = `
          <div class="ai-form-group">
            <p>${window.__('ai.error_generate_code') || 'Erro ao gerar o código:'}</p>
            <div class="ai-result">${error.message}</div>
          </div>
        `;
        
        footer.innerHTML = `
          <button id="closeGenerate">${window.__('buttons.close') || 'Fechar'}</button>
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
    
    const { panel, content, footer } = this.createPanel(window.__('ai.modal_document') || 'Documentar Código');
    
    // Conteúdo do painel
    content.innerHTML = `
      <p>${window.__('ai.document_title') || 'Documentando o arquivo:'} <strong>${activeFile.name}</strong></p>
      <p>${window.__('ai.document_description') || 'A IA adicionará comentários, docblocks e documentação ao código existente.'}</p>
    `;
    
    // Botões do rodapé
    footer.innerHTML = `
      <button class="secondary" id="cancelDocument">${window.__('buttons.cancel') || 'Cancelar'}</button>
      <button id="startDocument">${window.__('buttons.document') || 'Documentar'}</button>
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
      this.showLoading(content, window.__('ai.documenting') || 'Documentando código...');
      
      try {
        // Fazer a chamada à API
        const result = await window.electronAPI.documentCode(code, language);
        
        if (result.error) {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>${window.__('ai.error_generate_code') || 'Erro ao gerar o código:'}</p>
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
              <p>${window.__('ai.documented_code') || 'Código documentado:'}</p>
              <div class="ai-result">${processedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
            </div>
            <p><small>${window.__('ai.tokens_used') || 'Tokens utilizados:'} ${result.tokens}</small></p>
          `;
          
          // Atualizar rodapé para incluir botão de aplicar ao arquivo atual
          footer.innerHTML = `
            <button id="applyDocumentation">${window.__('buttons.apply_code') || 'Aplicar ao Arquivo'}</button>
            <button id="closeDocument">${window.__('buttons.close') || 'Fechar'}</button>
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
            <p>${window.__('ai.error_documented') || 'Erro ao documentar o código:'}</p>
            <div class="ai-result">${error.message}</div>
          </div>
        `;
        
        footer.innerHTML = `
          <button id="closeDocument">${window.__('buttons.close') || 'Fechar'}</button>
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
    
    const { panel, content, footer } = this.createPanel(window.__('ai.modal_explain_code') || 'Explicar Código');
    
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
    <p>${window.__('ai.explaining_code') || 'Explicando o código do arquivo:'} <strong>${activeFile.name}</strong></p>
    <div class="ai-form-group">
    <label for="codeToExplain">${window.__('ai.explaining_code_example') || 'Código a ser explicado (você pode editar):'}</label>
    <textarea id="codeToExplain">${selectedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
    </div>
    `;
    
    // Botões do rodapé
    footer.innerHTML = `
      <button class="secondary" id="cancelExplain">${window.__('buttons.cancel') || 'Cancelar'}</button>
      <button id="startExplain">${window.__('buttons.explain') || 'Explicar'}</button>
    `;
    
    // Configurar eventos
    footer.querySelector('#cancelExplain').addEventListener('click', () => {
      panel.remove();
    });
    
    footer.querySelector('#startExplain').addEventListener('click', async () => {
      const codeToExplain = document.getElementById('codeToExplain').value;
      
	  if (!codeToExplain.trim()) {
		  alert(window.__('alerts.wait_for_explanation') || 'Por favor, forneça o código que deseja explicar.');
        return;
      }
      
      // Determinar a linguagem com base na extensão do arquivo
      const extension = activeFile.name.split('.').pop().toLowerCase();
      let language = 'php';
      
      if (extension === 'js') language = 'javascript';
      else if (extension === 'html') language = 'html';
      else if (extension === 'css') language = 'css';
      
      // Mostrar indicador de carregamento
      this.showLoading(content, window.__('ai.explaining_loading') || 'Analisando e explicando o código...');
      
      try {
        // Fazer a chamada à API
        const result = await window.electronAPI.explainCode(codeToExplain, language);
        
        if (result.error) {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>${window.__('ai.error_explain') || 'Erro ao explicar o código:'}</p>
              <div class="ai-result">${result.error}</div>
            </div>
          `;
        } else {
          content.innerHTML = `
            <div class="ai-form-group">
              <p>${window.__('ai.success_explain') || 'Explicação do código:'}</p>
              <div class="ai-result">${result.explanation.replace(/\n/g, '<br>')}</div>
            </div>
            <p><small>${window.__('ai.tokens_used') || 'Tokens utilizados:'} ${result.tokens}</small></p>
          `;
        }
      } catch (error) {
        content.innerHTML = `
          <div class="ai-form-group">
            <p>${window.__('ai.error_explain') || 'Erro ao explicar o código:'}</p>
            <div class="ai-result">${error.message}</div>
          </div>
        `;
      }
      
      // Atualizar rodapé
      footer.innerHTML = `
        <button id="closeExplain">${window.__('buttons.close') || 'Fechar'}</button>
      `;
      
      footer.querySelector('#closeExplain').addEventListener('click', () => {
        panel.remove();
      });
    });
  }
}

// Exportar o gerenciador de IA para uso global
window.AIManager = AIManager;