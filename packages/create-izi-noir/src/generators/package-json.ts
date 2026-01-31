import type { ProjectOptions } from '../prompts/project.js';

export function generatePackageJson(options: ProjectOptions): string {
  const isSolana = options.provider === 'arkworks';

  const dependencies: Record<string, string> = {
    '@izi-noir/sdk': '^0.1.18',
    '@noir-lang/acvm_js': '1.0.0-beta.13-1d260df.nightly',
    '@noir-lang/noirc_abi': '1.0.0-beta.13-1d260df.nightly',
    'react': '^18.3.1',
    'react-dom': '^18.3.1',
    'prism-react-renderer': '^2.4.1',
    'buffer': '^6.0.3',
    'util': '^0.12.5',
  };

  // Add Solana wallet adapter dependencies
  if (isSolana) {
    dependencies['@solana/wallet-adapter-react'] = '^0.15.0';
    dependencies['@solana/wallet-adapter-react-ui'] = '^0.9.0';
    dependencies['@solana/wallet-adapter-wallets'] = '^0.19.0';
    dependencies['@solana/web3.js'] = '^1.95.0';
  }

  const pkg = {
    name: options.projectName,
    version: '0.1.0',
    private: true,
    description: 'ZK circuits built with IZI-NOIR',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
      typecheck: 'tsc --noEmit',
    },
    dependencies,
    devDependencies: {
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      '@vitejs/plugin-react': '^4.3.0',
      'typescript': '^5.4.0',
      'vite': '^5.4.0',
    },
    keywords: ['zk', 'noir', 'zero-knowledge', 'privacy', isSolana ? 'solana' : 'evm'],
    license: 'MIT',
  };

  return JSON.stringify(pkg, null, 2);
}
