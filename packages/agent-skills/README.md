# IZI-NOIR Agent Skills

AI coding agent skills for IZI-NOIR development, following the [Agent Skills specification](https://agentskills.io) for integration with Claude Code, Cursor, GitHub Copilot, and other AI coding assistants.

## Installation

```bash
# Install all skills using add-skill CLI
npx add-skill github:your-org/izi-noir

# Install specific skill
npx add-skill github:your-org/izi-noir -s izi-noir-circuit-patterns

# Or copy manually to your project
cp -r izi-noir-circuit-patterns /path/to/project/.claude/skills/
```

## Available Skills

### izi-noir-circuit-patterns

**The primary skill for writing JS/TS code that transpiles to Noir ZK circuits.**

Teaches AI assistants:
- Correct function signature: `([public], [private]) => { assert(...) }`
- Operator mapping (JS → Noir)
- Mutability convention (`mut_` prefix)
- Type mapping (`number` → `Field`, arrays, etc.)
- Unsupported features to avoid
- 10+ working JS → Noir examples

**Auto-activates on:** "circuit function", "createProof", "assert statement", "JS to Noir"

```
izi-noir-circuit-patterns/
├── SKILL.md                    # Main skill file
└── assets/
    ├── valid-examples.ts       # Complete working examples
    └── operator-mapping.md     # Full JS → Noir mapping table
```

### solana-anchor

Expertise in Anchor-based Solana program development:
- Program architecture patterns
- Account validation and security
- Cross-program invocations (CPI)
- Testing with Anchor test framework

### noir-circuits

Zero-knowledge circuit development with Noir:
- Circuit design patterns
- Proof generation and verification
- Integration with on-chain verifiers
- Performance optimization

## Usage

Skills auto-activate based on context. You can also reference them explicitly:

```
"Help me write a circuit that proves I know a preimage"
→ Activates izi-noir-circuit-patterns

"Using the solana-anchor skill, help me design an account structure"
→ Activates solana-anchor
```

## Skill Structure

Each skill follows the Agent Skills spec:

```
skill-name/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── assets/           # Optional: templates, examples, schemas
└── references/       # Optional: links to local documentation
```

### SKILL.md Format

```yaml
---
name: skill-identifier
description: >
  Brief description.
  Trigger: When to activate this skill.
metadata:
  version: "1.0"
  scope: [sdk]              # Where skill applies
  auto_invoke:              # Trigger phrases
    - "phrase one"
    - "phrase two"
allowed-tools: Read, Glob, Grep
---

# Skill Content
Instructions for the AI assistant...
```

## Contributing

1. Create new folder (e.g., `my-skill/`)
2. Add `SKILL.md` with YAML frontmatter
3. Add assets in `assets/` if needed
4. Test with Claude Code or `npx add-skill --list`
5. Update this README

## License

MIT
