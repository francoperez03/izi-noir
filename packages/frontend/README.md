# IZI-NOIR Frontend

> Demo web application for ZK proof generation

A Vite + React application demonstrating the IZI-NOIR SDK capabilities. Compare different proving backends, generate proofs in the browser, and create Solana-compatible test vectors.

## Features

- **Backend Comparison** - Test Barretenberg vs Arkworks side by side
- **Proof Generation** - Generate ZK proofs directly in the browser
- **Solana Test Vectors** - Export complete data for on-chain verification
- **Performance Metrics** - View proof size and generation time
- **Wallet Integration** - Solana wallet infrastructure (ready for expansion)

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Vite | 5.4 | Build tool and dev server |
| React | 18.3 | UI framework |
| TypeScript | 5.4 | Type safety |
| Tailwind CSS | 3.4 | Styling |
| Playwright | 1.57 | E2E testing |

## Quick Start

```bash
# Install dependencies (from monorepo root)
npm install

# Start development server
npm run dev

# Or from this directory
cd packages/frontend
npm run dev
```

Visit `http://localhost:5173`

## How It Works

### WASM Initialization

The frontend initializes Noir WASM modules for browser-based proof generation:

```typescript
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
import { markWasmInitialized } from "@izi-noir/sdk";

// Initialize WASM with Vite URLs
await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
markWasmInitialized();
```

### Proof Generation

The app demonstrates two proving backends:

**Barretenberg (UltraHonk)**
- ~16 KB proofs
- Fast proving
- Good for development

**Arkworks (Groth16)**
- ~256 byte proofs
- Solana-optimized
- Best for on-chain verification

### Demo Circuit

The demo uses a simple squaring circuit:

```typescript
// Prove: secret² == expected
assert(secret * secret == expected);

// With inputs:
// secret = 10 (private)
// expected = 100 (public)
```

## User Interface

### Proof Generation Section

1. Click **Barretenberg** or **Arkworks** button
2. Wait for proof generation (shows loading state)
3. View results: backend name, proof size, time, verification status

### Solana Test Vectors Section

1. Click **Generate Test Vectors**
2. View generated data:
   - Verifying Key (base64)
   - Proof (base64)
   - Public Inputs (hex)
   - Account Size
   - Estimated Rent
3. Copy individual values or export full JSON

## Scripts

```bash
npm run dev        # Start dev server on port 5173
npm run build      # TypeScript + Vite production build
npm run preview    # Preview production build
npm run test       # Run Playwright E2E tests
npm run test:ui    # Interactive Playwright UI mode
npm run lint       # ESLint checking
npm run typecheck  # TypeScript validation
```

## Testing

E2E tests verify proof generation in a real browser:

```bash
# Run all tests
npm run test

# Interactive mode
npm run test:ui
```

### Test Scenarios

1. **Barretenberg Test**
   - Waits for WASM initialization
   - Generates proof with Barretenberg
   - Verifies result > 10KB, verified = true

2. **Arkworks Test**
   - Waits for WASM initialization
   - Generates proof with Arkworks
   - Verifies result < 1KB, verified = true

## Project Structure

```
packages/frontend/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main application component
│   ├── components/
│   │   └── WalletProvider.tsx # Solana wallet wrapper
│   └── styles/
│       └── globals.css       # Tailwind imports
├── tests/
│   └── proof-generation.spec.ts # Playwright E2E tests
├── index.html                # HTML entry point
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
├── playwright.config.ts      # Playwright configuration
└── tsconfig.json             # TypeScript configuration
```

## Vite Configuration

The Vite config includes special handling for WASM:

```typescript
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'wasm-mime-type',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ['@noir-lang/noirc_abi', '@noir-lang/acvm_js', '@aztec/bb.js'],
  },
});
```

## Wallet Integration

The app includes Solana wallet infrastructure for future expansion:

```typescript
import { WalletProvider } from './components/WalletProvider';

// Provides:
// - ConnectionProvider (devnet RPC)
// - WalletProvider
// - WalletModalProvider
```

Currently configured but not actively used. Ready for features like:
- Connect wallet to submit proofs on-chain
- Sign and broadcast verification transactions
- Display account balances and transaction history

## Environment

The app connects to Solana devnet by default:

```typescript
const endpoint = 'https://api.devnet.solana.com';
```

## Browser Support

Tested on:
- Chrome 120+
- Firefox 120+
- Safari 17+

Requires:
- WebAssembly support
- SharedArrayBuffer (for some proving operations)

## Development Notes

### Adding New Features

1. **New proving backend**: Add button in App.tsx, import provider
2. **New circuit**: Update the circuit function and inputs
3. **Wallet features**: Add wallet adapter and connect UI

### Performance Considerations

- Proof generation can take 10-60 seconds depending on circuit complexity
- WASM initialization happens once on page load
- Large proofs (Barretenberg) may cause brief UI freezes

## License

MIT
