const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Inicializar o cliente OpenAI com a chave da API
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} catch (error) {
  console.error('Erro ao inicializar a API OpenAI:', error);
}

class AIService {
  constructor() {
    this.model = process.env.AI_MODEL || 'gpt-4';
  }

  // Verificar se o serviço de IA está disponível
  isAvailable() {
    return !!openai && !!process.env.OPENAI_API_KEY;
  }

  // Analisar um arquivo de código
  async analyzeCode(filePath, code) {
    if (!this.isAvailable()) {
      return { error: 'Serviço de IA não está disponível. Verifique a chave da API.' };
    }

    try {
      const extension = path.extname(filePath).toLowerCase();
      let language = 'código';
      
      // Determinar a linguagem com base na extensão
      if (extension === '.php') language = 'PHP';
      else if (extension === '.js') language = 'JavaScript';
      else if (extension === '.html') language = 'HTML';
      else if (extension === '.css') language = 'CSS';
      
      const prompt = `
Analise o seguinte código ${language} quanto a boas práticas, possíveis bugs, melhorias de desempenho e segurança:

\`\`\`${language}
${code}
\`\`\`

Forneça uma análise estruturada com os seguintes tópicos:
1. Resumo geral do código
2. Possíveis bugs ou problemas
3. Vulnerabilidades de segurança
4. Oportunidades de melhoria
5. Boas práticas aplicadas e não aplicadas
`;

      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "Você é um assistente especializado em análise e revisão de código, com foco em boas práticas, segurança e desempenho." },
          { role: "user", content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.3
      });

      return {
        analysis: completion.choices[0].message.content,
        tokens: completion.usage.total_tokens
      };
    } catch (error) {
      console.error('Erro ao analisar código:', error);
      return { error: `Erro ao analisar código: ${error.message}` };
    }
  }

  // Gerar código com base em uma descrição
  async generateCode(description, language = 'php') {
    if (!this.isAvailable()) {
      return { error: 'Serviço de IA não está disponível. Verifique a chave da API.' };
    }

    try {
      const prompt = `
Gere um código em ${language} com base na seguinte descrição:

${description}

Forneça apenas o código, com comentários explicativos onde apropriado.
`;

      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: `Você é um assistente especializado em programação ${language}, com foco em código limpo, seguro e bem documentado.` },
          { role: "user", content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.3
      });

      return {
        code: completion.choices[0].message.content,
        tokens: completion.usage.total_tokens
      };
    } catch (error) {
      console.error('Erro ao gerar código:', error);
      return { error: `Erro ao gerar código: ${error.message}` };
    }
  }

  // Documentar código automaticamente
  async documentCode(code, language = 'php') {
    if (!this.isAvailable()) {
      return { error: 'Serviço de IA não está disponível. Verifique a chave da API.' };
    }

    try {
      const prompt = `
Adicione documentação completa ao seguinte código ${language}:

\`\`\`${language}
${code}
\`\`\`

Forneça o código original com documentação adicional, incluindo:
1. Comentários de cabeçalho para classes e funções
2. Descrições de parâmetros e valores de retorno
3. Explicações para trechos complexos
4. Docblocks no estilo apropriado para a linguagem

Retorne apenas o código documentado.
`;

      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: `Você é um assistente especializado em documentação de código ${language}.` },
          { role: "user", content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.2
      });

      return {
        documentedCode: completion.choices[0].message.content,
        tokens: completion.usage.total_tokens
      };
    } catch (error) {
      console.error('Erro ao documentar código:', error);
      return { error: `Erro ao documentar código: ${error.message}` };
    }
  }

  // Explicar um trecho de código
  async explainCode(code, language = 'php') {
    if (!this.isAvailable()) {
      return { error: 'Serviço de IA não está disponível. Verifique a chave da API.' };
    }

    try {
      const prompt = `
Explique o seguinte trecho de código ${language} de forma detalhada e didática:

\`\`\`${language}
${code}
\`\`\`

Forneça uma explicação linha por linha ou por blocos lógicos, destacando:
1. O que cada parte do código faz
2. Como os diferentes componentes interagem
3. Conceitos importantes utilizados
4. A lógica por trás das decisões de implementação
`;

      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: `Você é um professor experiente de programação ${language}, especializado em explicar código de forma clara e didática.` },
          { role: "user", content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.4
      });

      return {
        explanation: completion.choices[0].message.content,
        tokens: completion.usage.total_tokens
      };
    } catch (error) {
      console.error('Erro ao explicar código:', error);
      return { error: `Erro ao explicar código: ${error.message}` };
    }
  }
}

module.exports = new AIService();