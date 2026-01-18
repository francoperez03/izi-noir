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
npm install

# Start development
npm run dev

# Build all packages
npm run build

# Run tests
npm test
```

## Development Commands

### Monorepo Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all packages in dev mode |
| `npm run build` | Build all packages |
| `npm test` | Run all tests |
| `npm run lint` | Lint all packages |
| `npm run format` | Format all files with Prettier |
| `npm run clean` | Clean all build outputs |

### Package-Specific Commands

| Command | Description |
|---------|-------------|
| `npm run build:sdk` | Build only the SDK |
| `npm run build:contracts` | Build Solana contracts |
| `npm run test:sdk` | Test SDK only |
| `npm run test:contracts` | Test Solana contracts |

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

- **Monorepo**: npm workspaces + Turborepo
- **Frontend**: Vite + React + TypeScript + Tailwind
- **SDK**: TypeScript + tsup (ESM/CJS)
- **Contracts**: Anchor + Rust
- **Testing**: Vitest (SDK), Anchor test (Contracts)

## Environment Setup

1. Node.js 22.12.0+
2. Install Rust and Solana CLI
3. Install Anchor CLI
4. Run `npm install`

## Code Style

- ESLint and Prettier configs in `tooling/`
- Anchor conventions for Solana programs
- React hooks and functional components in frontend

## Key Files

| File | Purpose |
|------|---------|
| `packages/sdk/src/index.ts` | SDK exports |
| `packages/sdk/src/createProof.ts` | Main proof creation API |
| `packages/sdk/src/parser.ts` | JS to Noir parser |
| `packages/sdk/src/generator.ts` | Noir code generator |
| `packages/sdk/src/prover.ts` | Proof generation/verification |
| `packages/solana-contracts/programs/izi-noir/src/lib.rs` | Main Solana program |
| `packages/frontend/src/App.tsx` | Frontend entry component |

## Agent Skills

See `packages/agent-skills/` for Claude coding assistance skills:
- `solana-anchor` - Anchor development patterns
- `noir-circuits` - Zero-knowledge circuit design
