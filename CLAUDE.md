# IZI-NOIR Project

## Overview

IZI-NOIR is a privacy-preserving toolkit for Solana blockchain, utilizing Noir zero-knowledge proofs. This monorepo contains the SDK, frontend application, Solana smart contracts, and Claude agent skills.

## Project Structure

```
izi-noir/
├── packages/
│   ├── frontend/          # Vite + React web application
│   ├── sdk/               # @izi-noir/sdk (npm package)
│   ├── solana-contracts/  # Anchor-based Solana programs
│   └── agent-skills/      # Claude agent skills
└── tooling/               # Shared configurations
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development Commands

### Monorepo Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all packages in dev mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all files with Prettier |
| `pnpm clean` | Clean all build outputs |

### Package-Specific Commands

| Command | Description |
|---------|-------------|
| `pnpm build:sdk` | Build only the SDK |
| `pnpm build:contracts` | Build Solana contracts |
| `pnpm test:sdk` | Test SDK only |
| `pnpm test:contracts` | Test Solana contracts |

## Architecture Principles

1. **Privacy First** - All user data handling must preserve privacy guarantees
2. **Type Safety** - Use TypeScript strictly; avoid `any` types
3. **Test Coverage** - Maintain high test coverage for SDK and contracts
4. **Minimal Dependencies** - Keep dependencies lean and auditable

## Package Dependencies

```
frontend --> sdk --> solana-contracts (IDL types)
```

## Technology Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Vite + React + TypeScript + Tailwind
- **SDK**: TypeScript + tsup (ESM/CJS)
- **Contracts**: Anchor + Rust
- **Testing**: Vitest (SDK), Anchor test (Contracts)

## Environment Setup

1. Install pnpm 9+: `npm install -g pnpm`
2. Install Rust and Solana CLI
3. Install Anchor CLI
4. Run `pnpm install`

## Code Style

- ESLint and Prettier configs in `tooling/`
- Anchor conventions for Solana programs
- React hooks and functional components in frontend

## Key Files

| File | Purpose |
|------|---------|
| `packages/sdk/src/client.ts` | Main SDK client |
| `packages/sdk/src/types.ts` | TypeScript types |
| `packages/solana-contracts/programs/izi-noir/src/lib.rs` | Main Solana program |
| `packages/frontend/src/App.tsx` | Frontend entry component |

## Agent Skills

See `packages/agent-skills/` for Claude coding assistance skills:
- `solana-anchor` - Anchor development patterns
- `noir-circuits` - Zero-knowledge circuit design
