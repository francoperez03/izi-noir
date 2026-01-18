# IZI-NOIR Agent Skills

AI coding agent skills for IZI-NOIR development, following the Agent Skills specification for integration with Claude and other AI coding assistants.

## Available Skills

### solana-anchor

Expertise in Anchor-based Solana program development including:
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

These skills are automatically loaded by Claude Code when working in this repository. Reference specific skills when asking for help:

- "Using the solana-anchor skill, help me design..."
- "Apply noir-circuits rules to review this code..."

## Contributing

1. Create new folder under `skills/`
2. Add `SKILL.md` with skill definition
3. Add rules in `rules/` subfolder
4. Update this README

## License

MIT
