# IZI-NOIR

Privacy-preserving toolkit for Solana using Noir zero-knowledge proofs. Write ZK circuits in JavaScript, compile to Noir, and generate proofs with multiple backends.

## Quick Start

```typescript
import { IziNoir, Provider } from '@izi-noir/sdk';

const izi = await IziNoir.init({ provider: Provider.Barretenberg });

const { proof, verified } = await izi.createProof(
  `fn main(secret: Field, expected: pub Field) {
    assert(secret * secret == expected);
  }`,
  { secret: '10', expected: '100' }
);
```

## Packages

| Package | Description |
|---------|-------------|
| [@izi-noir/sdk](./packages/sdk) | TypeScript SDK - JS→Noir transpilation + proof generation |
| [@izi-noir/frontend](./packages/frontend) | Web application demo |
| [@izi-noir/solana-contracts](./packages/solana-contracts) | Anchor-based Solana programs |
| [@izi-noir/agent-skills](./packages/agent-skills) | AI agent skills for Claude Code |

## AI Agent Skills

This project includes AI coding agent skills that teach assistants like Claude Code how to write valid JS/TS code for ZK circuit generation.

### Install Skills

```bash
# Using add-skill CLI (works with Claude Code, Cursor, Copilot, etc.)
npx add-skill github:your-org/izi-noir -s izi-noir-circuit-patterns

# Or copy manually
cp -r packages/agent-skills/izi-noir-circuit-patterns .claude/skills/
```

### Available Skills

| Skill | Description |
|-------|-------------|
| `izi-noir-circuit-patterns` | JS/TS patterns for writing code that transpiles to Noir circuits |
| `noir-circuits` | Zero-knowledge circuit design patterns |
| `solana-anchor` | Anchor-based Solana program development |

### What Skills Provide

The `izi-noir-circuit-patterns` skill teaches AI assistants:

- **Correct function signature**: `([public], [private]) => { assert(...) }`
- **Operator mapping**: Which JS operators work and how they convert to Noir
- **Mutability convention**: Using `mut_` prefix for mutable variables
- **Type mapping**: JS → Noir types (`number` → `Field`, arrays, etc.)
- **Limitations**: What JS features to avoid (objects, async, closures)
- **10+ working examples**: Complete JS → Noir transformations

Once installed, skills auto-activate when you ask about circuit functions, `createProof()`, or JS-to-Noir patterns.

## Getting Started

### Prerequisites

- Node.js 22.12.0+
- Rust (for Solana contracts)
- Solana CLI + Anchor CLI (optional)

### Installation

```bash
git clone https://github.com/your-org/izi-noir.git
cd izi-noir
npm install
npm run build
```

### Development

```bash
npm run dev      # Start development mode
npm test         # Run tests
npm run lint     # Lint code
```

## Proving Backends

| Backend | Proof Size | Environment | Best For |
|---------|-----------|-------------|----------|
| Barretenberg | ~16KB | Browser + Node.js | General use, fast proving |
| Arkworks | ~256 bytes | Browser + Node.js | On-chain verification (small proofs) |
| Sunspot | ~256 bytes | Node.js only | CLI workflows, pre-compiled circuits |

## Architecture

```
packages/
├── sdk/               # @izi-noir/sdk - JS→Noir + proof generation
├── frontend/          # Vite + React demo app
├── solana-contracts/  # Anchor programs
└── agent-skills/      # AI agent skills
tooling/               # Shared tsconfig, eslint, prettier
```

## License

MIT
