import prompts from 'prompts';
import pc from 'picocolors';

export interface ProjectOptions {
  projectName: string;
  template: string;
  provider: string;
  skipInstall: boolean;
  skipGit: boolean;
  aiTool: 'claude' | 'none';
}

const TEMPLATES = [
  { title: 'Default (balance + age proofs)', value: 'default' },
  { title: 'Minimal (empty circuit)', value: 'minimal' },
  { title: 'Balance Proof only', value: 'balance-proof' },
];

const NETWORKS = [
  { title: 'Solana', value: 'solana', description: 'Uses Groth16 for on-chain verification' },
];

// Map network to provider internally
function networkToProvider(network: string): string {
  return network === 'solana' ? 'arkworks' : 'barretenberg';
}

export async function promptProjectOptions(
  defaults: Partial<ProjectOptions>
): Promise<ProjectOptions | null> {
  console.log();
  console.log(pc.bold(pc.cyan('  IZI-NOIR')) + ' - Privacy-preserving toolkit for Solana');
  console.log();

  const questions: prompts.PromptObject[] = [];

  if (!defaults.projectName) {
    questions.push({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-zk-project',
      validate: (value: string) => {
        if (!value) return 'Project name is required';
        if (!/^[a-z0-9-_]+$/i.test(value)) {
          return 'Project name can only contain letters, numbers, hyphens, and underscores';
        }
        return true;
      },
    });
  }

  questions.push(
    {
      type: 'select',
      name: 'template',
      message: 'Select a template:',
      choices: TEMPLATES,
      initial: TEMPLATES.findIndex((t) => t.value === defaults.template) || 0,
    },
    {
      type: 'select',
      name: 'network',
      message: 'Where will you verify proofs?',
      choices: NETWORKS,
      initial: 0,
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: 'Install dependencies?',
      initial: !defaults.skipInstall,
    },
    {
      type: 'confirm',
      name: 'initGit',
      message: 'Initialize git repository?',
      initial: !defaults.skipGit,
    },
    {
      type: 'select',
      name: 'aiTool',
      message: 'Which AI coding assistant do you use?',
      choices: [
        { title: 'Claude Code', value: 'claude', description: 'Install IZI-NOIR circuit patterns skill' },
        { title: 'None / Other', value: 'none', description: 'Skip AI assistant configuration' },
      ],
      initial: 0,
    }
  );

  try {
    const response = await prompts(questions, {
      onCancel: () => {
        throw new Error('Operation cancelled');
      },
    });

    const network = response.network || 'solana';
    return {
      projectName: defaults.projectName || response.projectName,
      template: response.template || defaults.template || 'default',
      provider: networkToProvider(network),
      skipInstall: response.installDeps === false,
      skipGit: response.initGit === false,
      aiTool: response.aiTool || 'none',
    };
  } catch {
    return null;
  }
}
