// Terminal.js básico e funcional
class TerminalManager {
  constructor(terminalElement) {
    this.terminalElement = terminalElement;
    this.terminal = null;
    this.isInitialized = false;
    
    // Referências para os handlers de eventos
    this.outputHandler = null;
    this.exitHandler = null;
  }
  
  async initialize(workingDir = null) {
    if (this.isInitialized) return;
    
    // Criar o terminal xterm.js
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      theme: {
        background: '#1a202c',
        foreground: '#e2e8f0'
      }
    });
    
    // Abrir o terminal no elemento do DOM
    this.terminal.open(this.terminalElement);
    
    // Iniciar o processo de terminal no processo principal
    const success = await window.electronAPI.startTerminal(workingDir);
    
    if (success) {
      // Configurar handlers de eventos
      this.outputHandler = (event, data) => {
        this.terminal.write(data);
      };
      
      this.exitHandler = (event, code) => {
        this.terminal.write(`\r\nProcesso encerrado com código ${code || 0}\r\n`);
        // Reiniciar o terminal automaticamente
        setTimeout(() => this.initialize(workingDir), 1000);
      };
      
      // Registrar handlers
      window.electronAPI.onTerminalOutput(this.outputHandler);
      window.electronAPI.onTerminalExit(this.exitHandler);
      
      // Configurar entrada do usuário
      this.terminal.onData(data => {
        window.electronAPI.sendToTerminal(data);
      });
      
      this.terminal.write('Terminal iniciado\r\n');
      this.isInitialized = true;
    } else {
      this.terminal.write('Falha ao iniciar o terminal\r\n');
    }
  }
  
  // Executar um comando único e retornar o resultado
  async executeCommand(command) {
    const result = await window.electronAPI.executeCommand(command, this.currentDirectory);
    this.terminal.write(`${result.stdout}\r\n`);
    if (result.stderr) {
      this.terminal.write(`${result.stderr}\r\n`);
    }
    return result;
  }
  
  // Limpar o terminal
  clear() {
    if (this.terminal) {
      this.terminal.clear();
    }
  }
  
  // Enviar texto para o terminal
  write(text) {
    if (this.terminal) {
      this.terminal.write(text);
    }
  }
  
  // Encerrar o terminal
  async dispose() {
    if (!this.isInitialized) return;
    
    // Remover os handlers de eventos
    if (this.outputHandler) {
      window.electronAPI.onTerminalOutput(this.outputHandler);
    }
    
    if (this.exitHandler) {
      window.electronAPI.onTerminalExit(this.exitHandler);
    }
    
    // Encerrar o processo do terminal
    await window.electronAPI.killTerminal();
    
    // Limpar o terminal
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
    
    this.isInitialized = false;
  }
}

// Exportar o gerenciador de terminal para uso global
window.TerminalManager = TerminalManager;