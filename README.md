# IZI-NOIR

Privacy-preserving toolkit for Solana using Noir zero-knowledge proofs.

## Packages

| Package | Description |
|---------|-------------|
| [@izi-noir/sdk](./packages/sdk) | TypeScript SDK for interacting with the protocol |
| [@izi-noir/frontend](./packages/frontend) | Web application |
| [@izi-noir/solana-contracts](./packages/solana-contracts) | Anchor-based Solana programs |
| [@izi-noir/agent-skills](./packages/agent-skills) | Claude agent skills for development |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust (for Solana contracts)
- Solana CLI
- Anchor CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/izi-noir.git
cd izi-noir

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Start development mode
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Architecture

The project uses a monorepo structure managed by pnpm workspaces and Turborepo:

- **packages/** - All packages (frontend, sdk, contracts, agent-skills)
- **tooling/** - Shared configurations

## License

MIT
