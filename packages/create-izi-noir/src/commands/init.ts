import path from 'path';
import { execSync } from 'child_process';
import pc from 'picocolors';
import { promptProjectOptions, type ProjectOptions } from '../prompts/project.js';
import { writeFile, directoryExists, isDirectoryEmpty, ensureDir } from '../utils/fs.js';
import {
  createProgressReporter,
  createInstallProgress,
  createGitProgress,
  type ProgressReporter,
} from '../utils/progress.js';
import {
  generatePackageJson,
  generateTsconfig,
  generateBalanceProof,
  generateAgeProof,
  generateMinimalCircuit,
  generateCircuitsIndex,
  generateCircuitTypes,
  generateReadme,
  generateGitignore,
  generateViteConfig,
  generateTsconfigNode,
  generateIndexHtml,
  generateMainTsx,
  generateAppTsx,
  generateAppCss,
  generateIndexCss,
  generateViteEnvDts,
  generateViteSvg,
  generateCodeBlock,
  generateEditableCodeBlock,
  generateClaudeSkills,
} from '../generators/index.js';

interface CliOptions {
  template: string;
  provider: string;
  yes: boolean;
  skipInstall: boolean;
  skipGit: boolean;
}

export async function initCommand(
  projectName: string | undefined,
  options: CliOptions
): Promise<void> {
  let projectOptions: ProjectOptions | null;

  if (options.yes && projectName) {
    // Non-interactive mode with all defaults
    projectOptions = {
      projectName,
      template: options.template,
      provider: options.provider,
      skipInstall: options.skipInstall,
      skipGit: options.skipGit,
      aiTool: 'none',
    };
  } else {
    projectOptions = await promptProjectOptions({
      projectName,
      template: options.template,
      provider: options.provider,
      skipInstall: options.skipInstall,
      skipGit: options.skipGit,
    });
  }

  if (!projectOptions) {
    console.log(pc.yellow('\nOperation cancelled.'));
    process.exit(0);
  }

  const projectDir = path.resolve(process.cwd(), projectOptions.projectName);

  // Check if directory exists and is not empty
  if (await directoryExists(projectDir)) {
    if (!(await isDirectoryEmpty(projectDir))) {
      console.log(
        pc.red(`\nError: Directory "${projectOptions.projectName}" already exists and is not empty.`)
      );
      process.exit(1);
    }
  }

  console.log();

  // Create project structure with dynamic progress
  const progress = createProgressReporter();

  try {
    await progress.startThinking();
    await new Promise((r) => setTimeout(r, 800)); // Brief thinking phase
    progress.stopThinking();

    console.log(pc.bold('\n  Scaffolding your ZK project...\n'));

    await createProjectStructure(projectDir, projectOptions, progress);

    progress.showSuccess('Project structure created');
  } catch (error) {
    progress.showError('Failed to create project structure');
    console.error(pc.red('\n'), error);
    process.exit(1);
  }

  // Initialize git with dynamic progress
  if (!projectOptions.skipGit) {
    const gitProgress = createGitProgress();
    gitProgress.start();

    try {
      execSync('git init', { cwd: projectDir, stdio: 'ignore' });
      gitProgress.stop(true);
    } catch {
      gitProgress.stop(false);
      console.log(pc.yellow('  Warning: Failed to initialize git repository'));
    }
  }

  // Install dependencies with progress bar
  if (!projectOptions.skipInstall) {
    const installProgress = createInstallProgress();
    installProgress.start();

    try {
      execSync('npm install', { cwd: projectDir, stdio: 'ignore' });
      installProgress.stop(true);
    } catch {
      installProgress.stop(false);
      console.log(pc.yellow('  Run "npm install" manually.'));
    }
  }

  // Print success message
  printSuccessMessage(projectOptions);
}

async function createProjectStructure(
  projectDir: string,
  options: ProjectOptions,
  progress: ProgressReporter
): Promise<void> {
  // Create directories for Vite + React project
  const dirs = ['circuits', 'src', 'src/components', 'src/lib', 'public'];
  for (const dir of dirs) {
    await ensureDir(path.join(projectDir, dir));
    await progress.reportDirectory(dir);
  }

  // Generate and write files
  const files: Array<[string, string]> = [
    // Root config files
    ['package.json', generatePackageJson(options)],
    ['tsconfig.json', generateTsconfig()],
    ['tsconfig.node.json', generateTsconfigNode()],
    ['vite.config.ts', generateViteConfig()],
    ['index.html', generateIndexHtml(options)],
    ['README.md', generateReadme(options)],
    ['.gitignore', generateGitignore()],

    // Source files
    ['src/main.tsx', generateMainTsx(options)],
    ['src/App.tsx', generateAppTsx(options)],
    ['src/App.css', generateAppCss()],
    ['src/index.css', generateIndexCss()],
    ['src/vite-env.d.ts', generateViteEnvDts()],

    // Components
    ['src/components/CodeBlock.tsx', generateCodeBlock()],
    ['src/components/EditableCodeBlock.tsx', generateEditableCodeBlock()],

    // Public assets
    ['public/vite.svg', generateViteSvg()],
  ];

  // Add circuit files based on template
  switch (options.template) {
    case 'minimal':
      files.push(['circuits/my-circuit.ts', generateMinimalCircuit()]);
      break;
    case 'balance-proof':
      files.push(['circuits/balance-proof.ts', generateBalanceProof()]);
      break;
    default:
      files.push(['circuits/balance-proof.ts', generateBalanceProof()]);
      files.push(['circuits/age-proof.ts', generateAgeProof()]);
      break;
  }

  // Add circuits index and types
  files.push(['circuits/index.ts', generateCircuitsIndex(options.template)]);
  files.push(['circuits/types.d.ts', generateCircuitTypes()]);

  // Write files one by one with progress reporting
  const hasSkills = options.aiTool === 'claude';
  for (let i = 0; i < files.length; i++) {
    const [relativePath, content] = files[i];
    await writeFile(path.join(projectDir, relativePath), content);
    await progress.reportFile(relativePath, !hasSkills && i === files.length - 1);
  }

  // Copy Claude Code skills if selected
  if (hasSkills) {
    const skillFiles = generateClaudeSkills();
    const skillEntries = Object.entries(skillFiles);
    for (let i = 0; i < skillEntries.length; i++) {
      const [relativePath, content] = skillEntries[i];
      await writeFile(path.join(projectDir, relativePath), content);
      await progress.reportFile(relativePath, i === skillEntries.length - 1);
    }
  }
}

function printSuccessMessage(options: ProjectOptions): void {
  console.log();
  console.log(pc.green('✓') + ' Project created successfully!');
  if (options.aiTool === 'claude') {
    console.log(pc.green('✓') + ' Claude Code skill installed ' + pc.dim('(.claude/skills/izi-noir-circuit-patterns)'));
  }
  console.log();
  console.log('Next steps:');
  console.log();
  console.log(pc.cyan(`  cd ${options.projectName}`));

  if (options.skipInstall) {
    console.log(pc.cyan('  npm install'));
  }

  console.log(pc.cyan('  npm run dev'));
  console.log();
  console.log('Then open ' + pc.blue('http://localhost:5173') + ' in your browser.');
  console.log();
  console.log('To add circuits:');
  console.log();
  console.log(pc.dim('  1. Create a new circuit in circuits/*.ts'));
  console.log(pc.dim('  2. Export it from circuits/index.ts'));
  console.log(pc.dim('  3. Add it to CIRCUITS array in src/App.tsx'));
  console.log();
  console.log(
    pc.dim('Learn more: ') + pc.blue('https://github.com/izi-noir/izi-noir')
  );
  console.log();
}
