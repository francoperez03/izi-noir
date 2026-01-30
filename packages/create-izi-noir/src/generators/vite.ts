import type { ProjectOptions } from '../prompts/project.js';

export function generateViteConfig(): string {
  return `import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Plugin to set correct MIME type for WASM files in dev server
function wasmMimePlugin(): PluginOption {
  return {
    name: "wasm-mime-type",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith(".wasm")) {
          res.setHeader("Content-Type", "application/wasm");
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), wasmMimePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer/",
      util: "util/",
    },
  },
  define: {
    "global": "globalThis",
    "process.env": {},
  },
  optimizeDeps: {
    exclude: [
      "@noir-lang/noir_wasm",
      "@noir-lang/noir_js",
      "@noir-lang/acvm_js",
      "@noir-lang/noirc_abi",
      "@aztec/bb.js",
      "@izi-noir/sdk",
    ],
    include: ["buffer", "util"],
  },
  build: {
    rollupOptions: {
      external: [
        /arkworks_groth16_wasm/,
      ],
    },
  },
});
`;
}

export function generateTsconfigNode(): string {
  return `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
`;
}

export function generateIndexHtml(options: ProjectOptions): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${options.projectName} - ZK Proof Demo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

export function generateMainTsx(options: ProjectOptions): string {
  const isSolana = options.provider === 'arkworks';

  if (isSolana) {
    return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import App from './App';
import './index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

const endpoint = clusterApiUrl('devnet');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </StrictMode>,
);
`;
  }

  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;
}

export function generateAppTsx(options: ProjectOptions): string {
  const isSolana = options.provider === 'arkworks';
  const circuitImports = getCircuitImports(options.template);
  const circuitOptions = getCircuitOptions(options.template);

  const solanaImports = isSolana ? `
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Chain, Network } from '@izi-noir/sdk';` : '';

  const solanaHooks = isSolana ? `
  const { publicKey, connected, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();` : '';

  const solanaProviderConfig = isSolana ? `
      chain: Chain.Solana,
      network: Network.Devnet,` : '';

  const solanaState = isSolana ? `
  // Deploy state
  const [isDeploying, setIsDeploying] = useState(false);
  const [vkAccount, setVkAccount] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Verify state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);` : '';

  const solanaHandlers = isSolana ? `
  // Deploy VK to Solana
  const handleDeploy = async () => {
    if (!iziInstance || !connected || !publicKey || !sendTransaction) return;

    setIsDeploying(true);
    setDeployError(null);

    try {
      const result = await iziInstance.deploy({ publicKey, sendTransaction });
      setVkAccount(result.vkAccount);
    } catch (error) {
      console.error('Deploy error:', error);
      setDeployError((error as Error).message);
    } finally {
      setIsDeploying(false);
    }
  };

  // Verify proof on-chain
  const handleVerify = async () => {
    if (!iziInstance || !vkAccount || !publicKey || !sendTransaction) return;

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const result = await iziInstance.verifyOnChain({ publicKey, sendTransaction }, vkAccount);
      setVerified(result.verified);
    } catch (error) {
      console.error('Verify error:', error);
      setVerifyError((error as Error).message);
    } finally {
      setIsVerifying(false);
    }
  };` : '';

  const solanaDeploySection = isSolana ? `
        {/* Deploy & Verify Section */}
        {proof && (
          <div className="section">
            <h2>Deploy & Verify on Solana</h2>

            {!connected ? (
              <button onClick={() => setVisible(true)} className="btn btn-secondary">
                Connect Wallet
              </button>
            ) : (
              <div className="deploy-verify-row">
                <div className="deploy-box">
                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying || !!vkAccount}
                    className="btn btn-primary"
                  >
                    {isDeploying ? 'Deploying...' : vkAccount ? 'Deployed' : 'Deploy VK'}
                  </button>
                  {deployError && <p className="error">{deployError}</p>}
                  {vkAccount && <p className="success">VK: {vkAccount.slice(0, 8)}...</p>}
                </div>

                <div className="verify-box">
                  {publicInputs && (
                    <div className="public-inputs-display">
                      <span>Public inputs:</span>
                      <code>{JSON.stringify(publicInputs)}</code>
                    </div>
                  )}
                  <button
                    onClick={handleVerify}
                    disabled={!vkAccount || isVerifying}
                    className="btn btn-primary"
                    style={{ marginTop: publicInputs ? '0.5rem' : 0 }}
                  >
                    {isVerifying ? 'Verifying...' : verified ? 'Verified!' : 'Verify On-Chain'}
                  </button>
                  {verifyError && <p className="error">{verifyError}</p>}
                  {verified && <p className="success">Proof verified on Solana!</p>}
                </div>
              </div>
            )}
          </div>
        )}` : '';

  return `import { useState, useEffect, useCallback } from 'react';
import initNoirC from '@noir-lang/noirc_abi';
import initACVM from '@noir-lang/acvm_js';
import acvm from '@noir-lang/acvm_js/web/acvm_js_bg.wasm?url';
import noirc from '@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url';
import {
  IziNoir,
  Provider,
  markWasmInitialized,
  AcornParser,
  generateNoir,
} from '@izi-noir/sdk';${solanaImports}
import { CodeBlock } from './components/CodeBlock';
${circuitImports}
import './App.css';

// Circuit definition type
interface CircuitDef {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any;
  publicInputKeys: string[];
  privateInputKeys: string[];
  defaultInputs: Record<string, string>;
}

// Circuit options
const CIRCUITS: CircuitDef[] = ${circuitOptions};

// WASM initialization
let wasmInitialized = false;
async function initBrowserWasm() {
  if (wasmInitialized) return;
  await Promise.all([
    initACVM({ module_or_path: acvm }),
    initNoirC({ module_or_path: noirc }),
  ]);
  markWasmInitialized();
  wasmInitialized = true;
}

function App() {
  // Circuit state
  const [selectedCircuit, setSelectedCircuit] = useState(CIRCUITS[0].name);
  const [circuitCode, setCircuitCode] = useState(CIRCUITS[0].fn.toString());
  const [noirCode, setNoirCode] = useState<string | null>(null);
  const [transpileError, setTranspileError] = useState<string | null>(null);

  // Input state
  const [inputs, setInputs] = useState<Record<string, string>>(CIRCUITS[0].defaultInputs);

  // Proof state
  const [isGenerating, setIsGenerating] = useState(false);
  const [proof, setProof] = useState<Uint8Array | null>(null);
  const [proofTime, setProofTime] = useState<number | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [localVerified, setLocalVerified] = useState<boolean | null>(null);
  const [publicInputs, setPublicInputs] = useState<string[] | null>(null);

  // IziNoir instance
  const [iziInstance, setIziInstance] = useState<IziNoir | null>(null);
${solanaHooks}
${solanaState}

  // Update circuit when selection changes
  useEffect(() => {
    const circuit = CIRCUITS.find(c => c.name === selectedCircuit);
    if (circuit) {
      setCircuitCode(circuit.fn.toString());
      setInputs(circuit.defaultInputs);
      // Reset proof state
      setProof(null);
      setProofTime(null);
      setLocalVerified(null);
      setPublicInputs(null);
      setNoirCode(null);
    }
  }, [selectedCircuit]);

  // Transpile circuit to Noir
  useEffect(() => {
    const transpileCode = () => {
      try {
        setTranspileError(null);
        const circuit = CIRCUITS.find(c => c.name === selectedCircuit);
        if (!circuit) return;

        const parser = new AcornParser();
        const publicInputs = Object.entries(inputs)
          .filter(([key]) => circuit.publicInputKeys.includes(key))
          .map(([, val]) => Number(val));
        const privateInputs = Object.entries(inputs)
          .filter(([key]) => circuit.privateInputKeys.includes(key))
          .map(([, val]) => Number(val));

        const parsedCircuit = parser.parse(circuit.fn, publicInputs, privateInputs);
        const result = generateNoir(parsedCircuit);
        setNoirCode(result);
      } catch (error) {
        setTranspileError((error as Error).message);
        setNoirCode(null);
      }
    };

    const debounce = setTimeout(transpileCode, 300);
    return () => clearTimeout(debounce);
  }, [selectedCircuit, inputs]);

  // Generate proof
  const handleGenerateProof = useCallback(async () => {
    if (!noirCode) return;

    setIsGenerating(true);
    setProofError(null);
    setProof(null);
    setProofTime(null);
    setLocalVerified(null);

    try {
      await initBrowserWasm();

      const startTime = performance.now();

      const izi = await IziNoir.init({
        provider: Provider.${capitalizeFirst(options.provider)},${solanaProviderConfig}
      });

      await izi.compile(noirCode);

      const proofResult = await izi.prove(inputs);
      setIziInstance(izi);

      // Get proof bytes
      const proofBytes = 'bytes' in proofResult.proof
        ? proofResult.proof.bytes
        : proofResult.proof;
      const publicInputsHex = 'hex' in proofResult.publicInputs
        ? proofResult.publicInputs.hex
        : proofResult.publicInputs;

      // Local verification
      const verified = await izi.verify(proofBytes, publicInputsHex);
      setLocalVerified(verified);

      const endTime = performance.now();
      setProof(proofBytes);
      setProofTime(Math.round(endTime - startTime));
      setPublicInputs(publicInputsHex);
    } catch (error) {
      console.error('Proof generation error:', error);
      setProofError((error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [noirCode, inputs]);
${solanaHandlers}

  return (
    <div className="app">
      <header>
        <h1>${options.projectName}</h1>
        <p>Built with IZI-NOIR</p>
      </header>

      <main>
        {/* Circuit Selection */}
        <div className="section">
          <h2>1. Select Circuit</h2>
          <select
            value={selectedCircuit}
            onChange={(e) => setSelectedCircuit(e.target.value)}
            className="select"
          >
            {CIRCUITS.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Circuit Code */}
        <div className="section">
          <h2>2. Circuit Code</h2>
          <CodeBlock code={circuitCode} language="typescript" />

          {noirCode && (
            <details className="noir-details">
              <summary>View Generated Noir</summary>
              <CodeBlock code={noirCode} language="rust" />
            </details>
          )}

          {transpileError && (
            <p className="error">{transpileError}</p>
          )}
        </div>

        {/* Inputs */}
        <div className="section">
          <h2>3. Inputs</h2>
          <div className="inputs-grid">
            {Object.entries(inputs).map(([key, value]) => {
              const circuit = CIRCUITS.find(c => c.name === selectedCircuit);
              const isPublic = circuit?.publicInputKeys.includes(key);
              return (
                <div key={key} className="input-group">
                  <label>
                    <span className={\`input-badge \${isPublic ? 'public' : 'private'}\`}>
                      {isPublic ? 'public' : 'private'}
                    </span>
                    {key}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setInputs({ ...inputs, [key]: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Generate Proof */}
        <div className="section">
          <h2>4. Generate Proof</h2>
          <button
            onClick={handleGenerateProof}
            disabled={isGenerating || !noirCode || !!transpileError}
            className="btn btn-primary"
          >
            {isGenerating ? 'Generating...' : 'Generate Proof'}
          </button>

          {proofError && <p className="error">{proofError}</p>}

          {proof && (
            <div className="results">
              <div className="result-card">
                <span className="result-value">{proof.length} bytes</span>
                <span className="result-label">Proof Size</span>
              </div>
              <div className="result-card">
                <span className="result-value">{proofTime} ms</span>
                <span className="result-label">Generation Time</span>
              </div>
              <div className="result-card">
                <span className={\`result-value \${localVerified ? 'success' : 'error'}\`}>
                  {localVerified ? 'Yes' : 'No'}
                </span>
                <span className="result-label">Locally Verified</span>
              </div>
            </div>
          )}
        </div>
${solanaDeploySection}
      </main>

      <footer>
        <p>Built with <a href="https://github.com/izi-noir/izi-noir" target="_blank">IZI-NOIR</a></p>
      </footer>
    </div>
  );
}

export default App;
`;
}

function getCircuitImports(template: string): string {
  switch (template) {
    case 'minimal':
      return `import { myCircuit } from '../circuits';`;
    case 'balance-proof':
      return `import { balanceProof } from '../circuits';`;
    default:
      return `import { balanceProof, ageProof } from '../circuits';`;
  }
}

function getCircuitOptions(template: string): string {
  switch (template) {
    case 'minimal':
      return `[
  {
    name: 'myCircuit',
    fn: myCircuit,
    publicInputKeys: ['publicInput'],
    privateInputKeys: ['privateInput'],
    defaultInputs: { publicInput: '42', privateInput: '42' },
  },
]`;
    case 'balance-proof':
      return `[
  {
    name: 'balanceProof',
    fn: balanceProof,
    publicInputKeys: ['threshold'],
    privateInputKeys: ['balance'],
    defaultInputs: { threshold: '100', balance: '1500' },
  },
]`;
    default:
      return `[
  {
    name: 'balanceProof',
    fn: balanceProof,
    publicInputKeys: ['threshold'],
    privateInputKeys: ['balance'],
    defaultInputs: { threshold: '100', balance: '1500' },
  },
  {
    name: 'ageProof',
    fn: ageProof,
    publicInputKeys: ['currentYear', 'minAge'],
    privateInputKeys: ['birthYear'],
    defaultInputs: { currentYear: '2024', minAge: '18', birthYear: '1990' },
  },
]`;
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateAppCss(): string {
  return `/* ================================
   CSS Variables - IZI-NOIR Theme
   ================================ */
:root {
  --solana-purple: #9945FF;
  --solana-green: #14F195;
  --noir-primary: #050505;
  --noir-elevated: #0A0A0A;
  --noir-orange: #FF6B35;
  --izi-cyan: #00D4FF;
  --text: #ffffff;
  --text-muted: #888888;
  --border: rgba(255, 255, 255, 0.1);
}

/* ================================
   Reset & Base Styles
   ================================ */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: var(--noir-primary);
  /* Noise texture + radial gradients like the main frontend */
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.015'/%3E%3C/svg%3E"),
    radial-gradient(
      ellipse 60% 40% at 50% 30%,
      rgba(153, 69, 255, 0.06) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse 80% 50% at 50% 110%,
      rgba(20, 241, 149, 0.04) 0%,
      transparent 40%
    );
  background-attachment: fixed;
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: rgba(153, 69, 255, 0.3);
  color: white;
}

/* ================================
   Layout
   ================================ */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  padding: 2rem;
  text-align: center;
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(8px);
  background: rgba(0, 0, 0, 0.3);
}

header h1 {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--solana-purple) 0%, var(--noir-orange) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

header p {
  color: var(--text-muted);
  margin-top: 0.5rem;
}

main {
  flex: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

/* ================================
   Section Cards - Glassmorphism
   ================================ */
.section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.section:hover {
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 30px rgba(153, 69, 255, 0.1);
}

.section h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text);
}

/* ================================
   Form Controls
   ================================ */
.select {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-family: inherit;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.select:focus {
  outline: none;
  border-color: var(--solana-purple);
  box-shadow: 0 0 20px rgba(153, 69, 255, 0.2);
}

.inputs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.input-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: 6px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.input-badge.public {
  background: rgba(20, 241, 149, 0.2);
  color: var(--solana-green);
  border: 1px solid rgba(20, 241, 149, 0.3);
}

.input-badge.private {
  background: rgba(153, 69, 255, 0.2);
  color: var(--solana-purple);
  border: 1px solid rgba(153, 69, 255, 0.3);
}

.input-group input {
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 1rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.input-group input:focus {
  outline: none;
  border-color: var(--solana-purple);
  box-shadow: 0 0 20px rgba(153, 69, 255, 0.2);
}

/* ================================
   Buttons - Animated Gradient
   ================================ */
.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(
    90deg,
    var(--solana-purple) 0%,
    var(--solana-purple) 50%,
    var(--solana-green) 100%
  );
  background-size: 200% 100%;
  background-position: 0% 0%;
  color: white;
  box-shadow: 0 0 20px rgba(153, 69, 255, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background-position: 100% 0%;
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(20, 241, 149, 0.3);
}

.btn-secondary {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--solana-purple);
  box-shadow: 0 0 20px rgba(153, 69, 255, 0.15);
}

/* ================================
   Results Grid
   ================================ */
.results {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .results {
    grid-template-columns: 1fr;
  }
}

.result-card {
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-align: center;
  transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

.result-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-4px);
  box-shadow: 0 0 25px rgba(153, 69, 255, 0.15);
}

.result-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  display: block;
}

.result-value.success {
  color: var(--solana-green);
}

.result-value.error {
  color: #ff4444;
}

.result-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.5rem;
  display: block;
}

/* ================================
   Messages
   ================================ */
.error {
  color: #ff6b6b;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: 8px;
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.success {
  color: var(--solana-green);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(20, 241, 149, 0.1);
  border: 1px solid rgba(20, 241, 149, 0.2);
  border-radius: 8px;
}

/* ================================
   Noir Code Details
   ================================ */
.noir-details {
  margin-top: 1rem;
}

.noir-details summary {
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.875rem;
  padding: 0.5rem 0;
  transition: color 0.3s ease;
}

.noir-details summary:hover {
  color: var(--solana-purple);
}

.noir-details[open] summary {
  color: var(--solana-purple);
}

/* ================================
   Deploy & Verify Section
   ================================ */
.deploy-verify-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

@media (max-width: 640px) {
  .deploy-verify-row {
    grid-template-columns: 1fr;
  }
}

.deploy-box,
.verify-box {
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  word-break: break-word;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.deploy-box:hover,
.verify-box:hover {
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 20px rgba(153, 69, 255, 0.1);
}

.public-inputs-display {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.public-inputs-display code {
  display: block;
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  overflow-x: auto;
  max-width: 100%;
}

/* ================================
   Footer
   ================================ */
footer {
  padding: 1.5rem;
  text-align: center;
  border-top: 1px solid var(--border);
  backdrop-filter: blur(8px);
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-muted);
  font-size: 0.875rem;
}

footer a {
  color: var(--solana-purple);
  text-decoration: none;
  transition: color 0.3s ease;
}

footer a:hover {
  color: var(--solana-green);
}

/* ================================
   Custom Scrollbar
   ================================ */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--noir-primary);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ================================
   Accessibility - Reduced Motion
   ================================ */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
}

export function generateIndexCss(): string {
  return `/* Base styles - fonts are loaded in index.html */
body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Ensure mono font is applied to code elements */
code, pre, .mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}
`;
}

export function generateViteEnvDts(): string {
  return `/// <reference types="vite/client" />
`;
}

export function generateViteSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFBD4F"></stop><stop offset="100%" stop-color="#FF980E"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>
`;
}

export function generateWasmLib(): string {
  return `import initNoirC from '@noir-lang/noirc_abi';
import initACVM from '@noir-lang/acvm_js';
import acvm from '@noir-lang/acvm_js/web/acvm_js_bg.wasm?url';
import noirc from '@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url';
import { markWasmInitialized } from '@izi-noir/sdk';

let wasmInitialized = false;

export async function initBrowserWasm(): Promise<void> {
  if (wasmInitialized) return;

  await Promise.all([
    initACVM({ module_or_path: acvm }),
    initNoirC({ module_or_path: noirc }),
  ]);

  markWasmInitialized();
  wasmInitialized = true;
}
`;
}
