// Configuração do Monaco Editor
window.require.config({
	paths: {
		'vs': '../node_modules/monaco-editor/min/vs'
	}
});

// Exportar variáveis para uso global
let monaco;

// Carregar o Monaco Editor
window.require(['vs/editor/editor.main'], function() {
	monaco = window.monaco;

	// Registrar linguagens personalizadas ou temas, se necessário

	// Configurar PHP
	monaco.languages.register({ id: 'php' });

	// Evento personalizado para notificar que o Monaco foi carregado
	window.dispatchEvent(new Event('monaco-ready'));
});