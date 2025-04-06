# PHP Electron Editor

Um editor de código moderno para desenvolvimento PHP, construído com Electron. Este editor combina uma interface elegante com recursos poderosos, incluindo integração com IA para análise e geração de código.

![PHP Electron Editor](https://goodbits.tech/editor_ai/editor1.png)

![PHP Electron Editor](https://goodbits.tech/editor_ai/editor2.png)
![PHP Electron Editor](https://goodbits.tech/editor_ai/editor3.png)
![PHP Electron Editor](https://goodbits.tech/editor_ai/editor4.png)

## Recursos

- **Editor de código completo** baseado no Monaco Editor (o mesmo usado no VS Code)
- **Explorador de arquivos** para navegar pelos projetos
- **Sistema de abas** para editar múltiplos arquivos
- **Terminal integrado** com autocompletar para comandos comuns
- **Recursos de IA** para análise, documentação e geração de código
- **Persistência de sessão** para lembrar arquivos abertos entre sessões

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 14 ou superior)
- npm (normalmente vem com o Node.js)
- Para recursos de IA: Chave de API da OpenAI

## Instalação

1. Clone o repositório:
   `bash
   git clone https://github.com/humolot/PHP-Electron-Editor.git
   cd php-electron-editor
   `

2. Instale as dependências:
   `bash
   npm install
   `

3. Configure a API da OpenAI (opcional, para recursos de IA):
   - Crie um arquivo `.env` na raiz do projeto
   - Adicione sua chave de API da OpenAI:
     `
     OPENAI_API_KEY=sua_chave_de_api_aqui
     AI_MODEL=gpt-4
     `

## Execução

Para iniciar o editor em modo de desenvolvimento:

`npm start`

## Compilação

Para compilar o aplicativo para distribuição:

`npm run build`

Isso criará executáveis na pasta `dist` para o seu sistema operacional atual.

## Uso

### Abrir um projeto

1. Clique no botão "Abrir Projeto" para selecionar uma pasta de projeto PHP
2. Navegue pelos arquivos no explorador à esquerda

### Edição de código

- Clique nos arquivos no explorador para abri-los em abas
- Use o editor Monaco com realce de sintaxe para PHP e outras linguagens
- Salve arquivos com Ctrl+S ou clicando no botão "Salvar"

### Terminal

- Use o terminal integrado para executar comandos
- Aproveite o autocompletar para comandos comuns do PHP, Composer, Laravel, etc.
- Navegue pelo histórico de comandos com as setas para cima e para baixo

### Recursos de IA

- **Analisar Código**: Analisa o código atual quanto a problemas e boas práticas
- **Gerar Código**: Cria código PHP com base em uma descrição em linguagem natural
- **Documentar**: Adiciona documentação ao código existente
- **Explicar**: Fornece uma explicação detalhada do código selecionado

## Atalhos de teclado

- **Ctrl+S**: Salvar arquivo atual
- **Tab**: Completar comando no terminal
- **Setas cima/baixo**: Navegar pelo histórico de comandos no terminal

## Personalização

Você pode personalizar o editor modificando:
- `style.css` para alterar a aparência
- `commands-database.js` para adicionar mais comandos ao autocompletar
- Arquivos de configuração na pasta `.editor-config`

## Tecnologias

- [Electron](https://electronjs.org/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [OpenAI API](https://openai.com/api/) para recursos de IA

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests para melhorar o editor.

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b minha-nova-feature`)
3. Faça commit das suas alterações (`git commit -am 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin minha-nova-feature`)
5. Crie um novo Pull Request

## Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).

## Resolução de problemas

### Terminal não abre
- Verifique se você tem o terminal padrão do seu sistema configurado corretamente
- No Windows, verifique se o PowerShell está disponível

### Erro ao usar recursos de IA
- Verifique se sua chave de API da OpenAI está configurada corretamente no arquivo `.env`
- Certifique-se de que você tem saldo suficiente na sua conta `OpenAI`;
