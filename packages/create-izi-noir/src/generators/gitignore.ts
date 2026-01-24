export function generateGitignore(): string {
  return `# Dependencies
node_modules/

# Build output
dist/
generated/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local
.env.*.local

# Test coverage
coverage/
`;
}
