# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IZI-NOIR is a privacy-preserving toolkit for Solana. The core SDK transpiles JavaScript functions with `assert()` statements into Noir ZK circuits, compiles them, and generates/verifies proofs.

## Commands

```bash
npm install              # Install all workspace dependencies
npm run build            # Build all packages
npm test                 # Run all tests
npm run build:sdk        # Build only SDK
npm run test:sdk         # Test only SDK
npm run build:contracts  # Build Solana contracts
npm run lint             # Lint all packages
npm run format           # Format with Prettier
```

## Architecture

```
packages/
├── sdk/               # @izi-noir/sdk - JS to Noir transpiler
├── frontend/          # Vite + React web app
├── solana-contracts/  # Anchor programs
└── agent-skills/      # Claude Code skills
tooling/               # Shared tsconfig, eslint, prettier
```

## SDK Pipeline

The SDK transforms JS assertions into ZK proofs:

```
JS Function → Parse AST → Generate Noir → Compile → Prove → Verify
```

**Example usage:**
```typescript
const result = await createProof(
  [100],           // public inputs
  [10],            // private inputs
  ([expected], [secret]) => {
    assert(secret * secret == expected);
  }
);
// result.verified === true
```

**Key files:**
- `packages/sdk/src/parser.ts` - Parses JS function AST using acorn
- `packages/sdk/src/generator.ts` - Generates Noir code from AST
- `packages/sdk/src/compiler.ts` - Compiles Noir using @noir-lang/noir_wasm
- `packages/sdk/src/prover.ts` - Generates/verifies proofs using @aztec/bb.js
- `packages/sdk/src/createProof.ts` - Main API that orchestrates the pipeline

## Key Dependencies

- **@noir-lang/*** - Noir compiler and runtime (nightly versions required)
- **@aztec/bb.js** - Barretenberg proving backend
- **acorn** - JavaScript parser for AST extraction

## Requirements

- Node.js 22.12.0+ (required for Noir WASM)
- Rust + Solana CLI + Anchor CLI (for contracts only)
