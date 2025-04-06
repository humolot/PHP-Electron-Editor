const editorCommands = [
	// Comandos de Terminal / Shell (Windows/Linux)
	{ command: 'cd', description: 'Muda o diretório atual' },
	{ command: 'mkdir', description: 'Cria um novo diretório' },
	{ command: 'rmdir', description: 'Remove um diretório vazio' },
	{ command: 'rm', description: 'Remove arquivos ou diretórios' },
	{ command: 'dir', description: 'Lista arquivos e pastas (Windows)' },
	{ command: 'ls', description: 'Lista arquivos e pastas (Linux/Mac)' },
	{ command: 'cls', description: 'Limpa a tela (Windows)' },
	{ command: 'clear', description: 'Limpa a tela (Linux/Mac)' },

	// PHP puro
	{ command: 'php -v', description: 'Exibe a versão do PHP' },
	{ command: 'php -m', description: 'Lista os módulos instalados do PHP' },
	{ command: 'php -S localhost:8000', description: 'Inicia um servidor embutido do PHP' },
	{ command: 'php file.php', description: 'Executa um script PHP' },

	// Composer
	{ command: 'composer install', description: 'Instala as dependências do projeto' },
	{ command: 'composer update', description: 'Atualiza as dependências do projeto' },
	{ command: 'composer require', description: 'Adiciona pacotes como dependências' },
	{ command: 'composer remove', description: 'Remove pacotes do projeto' },
	{ command: 'composer dump-autoload', description: 'Atualiza o autoloader' },
	{ command: 'composer create-project', description: 'Cria um novo projeto' },
	{ command: 'composer validate', description: 'Valida o composer.json' },
	{ command: 'composer show', description: 'Mostra informações sobre pacotes' },

	// Laravel Artisan (complementares)
	{ command: 'php artisan optimize', description: 'Otimiza a performance da aplicação' },
	{ command: 'php artisan optimize:clear', description: 'Limpa os caches otimizados' },
	{ command: 'php artisan config:cache', description: 'Cria cache das configurações' },
	{ command: 'php artisan route:cache', description: 'Cria cache das rotas' },
	{ command: 'php artisan view:cache', description: 'Compila todas as views Blade' },
	{ command: 'php artisan event:cache', description: 'Cacheia eventos e listeners' },
	{ command: 'php artisan make:request', description: 'Cria uma nova Form Request' },
	{ command: 'php artisan make:middleware', description: 'Cria um novo Middleware' },
	{ command: 'php artisan make:job', description: 'Cria um novo Job' },
	{ command: 'php artisan make:event', description: 'Cria um novo Evento' },
	{ command: 'php artisan make:listener', description: 'Cria um novo Listener' },
	{ command: 'php artisan make:command', description: 'Cria um novo comando Artisan' },
	{ command: 'php artisan schedule:run', description: 'Executa tarefas agendadas' },
	{ command: 'php artisan queue:work', description: 'Processa jobs da fila' },
	{ command: 'php artisan queue:restart', description: 'Reinicia os workers da fila' },
	{ command: 'php artisan down', description: 'Coloca a aplicação em modo de manutenção' },
	{ command: 'php artisan up', description: 'Tira a aplicação do modo de manutenção' },

	// CodeIgniter (php spark)
	{ command: 'php spark serve', description: 'Inicia o servidor de desenvolvimento' },
	{ command: 'php spark migrate', description: 'Executa as migrações' },
	{ command: 'php spark migrate:rollback', description: 'Reverte a última migração' },
	{ command: 'php spark make:controller', description: 'Cria um novo controller' },
	{ command: 'php spark make:model', description: 'Cria um novo model' },
	{ command: 'php spark make:migration', description: 'Cria uma nova migration' },
	{ command: 'php spark make:seeder', description: 'Cria um novo seeder' },
	{ command: 'php spark db:seed', description: 'Executa os seeders' },
	{ command: 'php spark cache:clear', description: 'Limpa o cache do aplicativo' },
	{ command: 'php spark routes', description: 'Lista todas as rotas registradas' },

	// Git
	{ command: 'git init', description: 'Inicializa um repositório Git' },
	{ command: 'git clone', description: 'Clona um repositório Git' },
	{ command: 'git add', description: 'Adiciona arquivos ao staging' },
	{ command: 'git commit -m', description: 'Cria um novo commit' },
	{ command: 'git push', description: 'Envia commits para o repositório remoto' },
	{ command: 'git pull', description: 'Baixa e integra mudanças do repositório remoto' },
	{ command: 'git status', description: 'Mostra o status do repositório' },
	{ command: 'git branch', description: 'Lista, cria ou deleta branches' },
	{ command: 'git checkout', description: 'Muda para outro branch ou commit' },

	// NPM/Yarn
	{ command: 'npm install', description: 'Instala dependências' },
	{ command: 'npm update', description: 'Atualiza dependências' },
	{ command: 'npm run', description: 'Executa scripts definidos no package.json' },
	{ command: 'npm run dev', description: 'Executa o script de desenvolvimento' },
	{ command: 'npm run build', description: 'Executa o script de build para produção' },
	{ command: 'yarn install', description: 'Instala dependências (Yarn)' },
	{ command: 'yarn run', description: 'Executa scripts com Yarn' }
];
