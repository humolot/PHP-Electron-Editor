// Terminal.js
class TerminalManager {
  constructor(terminalElement) {
    this.terminalElement = terminalElement;
    this.terminal = null;
    this.isInitialized = false;
    this.outputHandler = null;
    this.exitHandler = null;
  }
  
  async initialize(workingDir = null) {
    if (this.isInitialized) return;
    
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      theme: {
        background: '#1a202c',
        foreground: '#e2e8f0'
      }
    });
    
    this.terminal.open(this.terminalElement);
    const success = await window.electronAPI.startTerminal(workingDir);
    
    if (success) {
      this.outputHandler = (event, data) => {
        this.terminal.write(data);
      };
      
      this.exitHandler = (event, code) => {
        this.terminal.write(`\r\nProcess closed with code ${code || 0}\r\n`);
        setTimeout(() => this.initialize(workingDir), 1000);
      };
      
      window.electronAPI.onTerminalOutput(this.outputHandler);
      window.electronAPI.onTerminalExit(this.exitHandler);
      this.terminal.onData(data => {
        window.electronAPI.sendToTerminal(data);
      });
      
      this.terminal.write('Terminal started\r\n');
      this.isInitialized = true;
    } else {
      this.terminal.write('Failed to start terminal\r\n');
    }
  }
  
  async executeCommand(command) {
    const result = await window.electronAPI.executeCommand(command, this.currentDirectory);
    this.terminal.write(`${result.stdout}\r\n`);
    if (result.stderr) {
      this.terminal.write(`${result.stderr}\r\n`);
    }
    return result;
  }
  
  clear() {
    if (this.terminal) {
      this.terminal.clear();
    }
  }
  
  write(text) {
    if (this.terminal) {
      this.terminal.write(text);
    }
  }
  
  async dispose() {
    if (!this.isInitialized) return;
    
    if (this.outputHandler) {
      window.electronAPI.onTerminalOutput(this.outputHandler);
    }
    
    if (this.exitHandler) {
      window.electronAPI.onTerminalExit(this.exitHandler);
    }
    
    await window.electronAPI.killTerminal();
    
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
    
    this.isInitialized = false;
  }
}

window.TerminalManager = TerminalManager;