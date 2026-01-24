# create-izi-noir

CLI to scaffold IZI-NOIR ZK projects.

## Usage

```bash
# Create a new project interactively
npx create-izi-noir my-project

# Create with options
npx create-izi-noir my-project --template balance-proof --provider arkworks

# Skip prompts
npx create-izi-noir my-project --skip-install --skip-git
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --template <template>` | Template to use (default, minimal, balance-proof) | default |
| `-p, --provider <provider>` | Proving provider (arkworks, barretenberg) | arkworks |
| `-y, --yes` | Skip prompts and use defaults | false |
| `--skip-install` | Skip npm install | false |
| `--skip-git` | Skip git initialization | false |

## Templates

### Default
Includes balance proof and age proof circuit examples.

### Minimal
Empty circuit for starting from scratch.

### Balance Proof
Single balance proof circuit example.

## Generated Project Structure

```
my-project/
├── circuits/
│   ├── balance-proof.ts    # ZK circuit as JS function
│   ├── age-proof.ts
│   └── index.ts
├── generated/              # Compiled circuits (npm run build)
├── scripts/
│   └── test-proof.ts       # Test script
├── package.json
├── tsconfig.json
├── izi-noir.config.ts
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Build the CLI
npm run build

# Test locally
node dist/index.js test-project
```

## License

MIT
