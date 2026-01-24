import type { ProjectOptions } from '../prompts/project.js';

export function generatePackageJson(options: ProjectOptions): string {
  const pkg = {
    name: options.projectName,
    version: '0.1.0',
    description: 'ZK circuits built with IZI-NOIR',
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
      './circuits': {
        types: './circuits/index.d.ts',
        import: './circuits/index.js',
      },
    },
    files: ['dist', 'circuits', 'generated'],
    scripts: {
      build: 'izi-noir build && tsc',
      'build:circuits': 'izi-noir build',
      dev: 'izi-noir build --watch',
      test: 'tsx scripts/test-proof.ts',
      prepublishOnly: 'npm run build',
    },
    dependencies: {
      '@izi-noir/sdk': '^0.1.0',
    },
    devDependencies: {
      '@types/node': '^22.0.0',
      tsx: '^4.0.0',
      typescript: '^5.4.0',
    },
    keywords: ['zk', 'noir', 'zero-knowledge', 'privacy', 'solana'],
    license: 'MIT',
  };

  return JSON.stringify(pkg, null, 2);
}
