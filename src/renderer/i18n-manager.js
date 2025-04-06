class I18nManager {
  constructor() {
    this.currentLanguage = 'pt-BR'; // Idioma padrão
    this.translations = {};
    this.supportedLanguages = [
      { code: 'pt-BR', name: 'Português' },
      { code: 'en-US', name: 'English' },
      { code: 'es-ES', name: 'Español' }
    ];
    
    // Inicializar
    this.init();
  }
  
  async init() {
    // Carregar idioma salvo, se existir
    const savedLanguage = localStorage.getItem('appLanguage');
    if (savedLanguage) {
      this.currentLanguage = savedLanguage;
    }
    
    // Carregar as traduções do idioma atual
    await this.loadTranslations(this.currentLanguage);
    
    // Atualizar a interface
    this.updateUI();
    
    // Configurar o seletor de idiomas
    this.setupLanguageSelector();
  }
  
  async loadTranslations(langCode) {
    try {
      // No Electron, precisamos usar a API IPC para ler arquivos
      const translations = await window.electronAPI.readLanguageFile(langCode);
      this.translations = translations;
      return true;
    } catch (error) {
      console.error(`Erro ao carregar traduções para ${langCode}:`, error);
      // Se falhar, tente carregar o idioma padrão
      if (langCode !== 'pt-BR') {
        console.log('Tentando carregar o idioma padrão (pt-BR)');
        return this.loadTranslations('pt-BR');
      }
      return false;
    }
  }
  
  translate(key) {
    // Suporta chaves aninhadas como 'ui.openProject'
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        console.warn(`Chave de tradução não encontrada: ${key}`);
        return key; // Retorna a própria chave se não encontrar tradução
      }
    }
    
    return value;
  }
  
  async changeLanguage(langCode) {
    if (langCode === this.currentLanguage) return;
    
    const success = await this.loadTranslations(langCode);
    if (success) {
      this.currentLanguage = langCode;
      localStorage.setItem('appLanguage', langCode);
      this.updateUI();
      
      // Disparar evento de mudança de idioma
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language: langCode } 
      }));
      
      // Notificar o usuário
      if (window.notyf) {
        window.notyf.success(`Idioma alterado para ${this.getLanguageName(langCode)}`);
      }
    }
  }
  
  getLanguageName(langCode) {
    const lang = this.supportedLanguages.find(l => l.code === langCode);
    return lang ? lang.name : langCode;
  }
  
  updateUI() {
    // Atualizar todos os elementos com atributo data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.translate(key);
    });
    
    // Atualizar placeholders com atributo data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.translate(key);
    });
    
    // Atualizar títulos com atributo data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.translate(key);
    });
    
    // Atualizar o seletor de idiomas
    const langSelector = document.getElementById('languageSelector');
    if (langSelector) {
      langSelector.value = this.currentLanguage;
    }
  }
  
  setupLanguageSelector() {
    const langSelector = document.getElementById('languageSelector');
    if (!langSelector) {
      console.warn('Seletor de idiomas não encontrado no DOM');
      return;
    }
    
    // Limpar opções existentes
    langSelector.innerHTML = '';
    
    // Adicionar opções para cada idioma suportado
    this.supportedLanguages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.name;
      langSelector.appendChild(option);
    });
    
    // Definir o idioma atual
    langSelector.value = this.currentLanguage;
    
    // Adicionar evento de mudança
    langSelector.addEventListener('change', (e) => {
      this.changeLanguage(e.target.value);
    });
  }
}

// Criar uma instância global
window.i18nManager = new I18nManager();

// Função auxiliar global para facilitar a tradução
window.__ = function(key) {
  return window.i18nManager.translate(key);
};