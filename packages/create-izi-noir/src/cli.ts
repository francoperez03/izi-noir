import { Command } from 'commander';
import { initCommand } from './commands/init.js';

const VERSION = '0.1.0';

export const cli = new Command()
  .name('create-izi-noir')
  .description('Create a new IZI-NOIR ZK project')
  .version(VERSION)
  .argument('[project-name]', 'Name of the project to create')
  .option('-t, --template <template>', 'Template to use', 'default')
  .option('-p, --provider <provider>', 'Proving provider', 'arkworks')
  .option('-y, --yes', 'Skip prompts and use defaults', false)
  .option('--skip-install', 'Skip npm install', false)
  .option('--skip-git', 'Skip git initialization', false)
  .action(initCommand);
