import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import initNoirC from '@noir-lang/noirc_abi';
import initACVM from '@noir-lang/acvm_js';
import acvm from '@noir-lang/acvm_js/web/acvm_js_bg.wasm?url';
import noirc from '@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url';
import {
  IziNoir,
  Provider,
  Chain,
  markWasmInitialized,
  AcornParser,
  generateNoir,
  type SolanaProofData,
} from '@izi-noir/sdk';
import {
  initDemoAnimations,
  cleanupDemoAnimations,
  animateCounter,
  animateCheckmark,
  animateSuccessPulse,
  animateError,
  animateProofResults,
  animateCopySuccess,
} from '../lib/demo-animations';
import { useSolanaDemo } from '../hooks/useSolanaDemo';
import { CodeBlock } from '../components/CodeBlock';
import { EditableCodeBlock } from '../components/EditableCodeBlock';

// Default circuit code
const DEFAULT_CIRCUIT = `([expected], [secret]) => {
  assert(secret * secret == expected);
}`;

// Default inputs
const DEFAULT_PUBLIC_INPUT = 100;
const DEFAULT_PRIVATE_INPUT = 10;

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

// Helper to truncate address
function truncateAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function DemoPage() {
  // State
  const [circuitCode, setCircuitCode] = useState(DEFAULT_CIRCUIT);
  const [noirCode, setNoirCode] = useState<string | null>(null);
  const [publicInput, setPublicInput] = useState(DEFAULT_PUBLIC_INPUT);
  const [privateInput, setPrivateInput] = useState(DEFAULT_PRIVATE_INPUT);
  const [transpileError, setTranspileError] = useState<string | null>(null);

  // UI state
  const [copiedCommand, setCopiedCommand] = useState<'npx' | 'npm' | null>(null);
  const [showNoir, setShowNoir] = useState(false);

  // Proof state
  const [isGenerating, setIsGenerating] = useState(false);
  const [proof, setProof] = useState<SolanaProofData | null>(null);
  const [proofTime, setProofTime] = useState<number | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  // Deploy state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [vkAccount, setVkAccount] = useState<string | null>(null);
  const [deployTx, setDeployTx] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Verify state
  type VerifyStep = 'idle' | 'building' | 'signing' | 'submitting' | 'confirming' | 'verified' | 'error';
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('idle');
  const [verifyTx, setVerifyTx] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Verify steps config
  const VERIFY_STEPS = [
    { id: 'building', label: 'Building transaction', icon: '🔧' },
    { id: 'signing', label: 'Waiting for signature', icon: '✍️' },
    { id: 'submitting', label: 'Submitting to Solana', icon: '🚀' },
    { id: 'confirming', label: 'Confirming', icon: '⏳' },
    { id: 'verified', label: 'Verified on-chain', icon: '✓' },
  ];

  // Wallet & Solana
  const { setVisible } = useWalletModal();
  const {
    connected,
    publicKey,
    balance,
    fetchBalance,
    deploy,
    verify,
    getExplorerUrl,
    getAccountExplorerUrl,
  } = useSolanaDemo();

  // Computed: inputs validation
  const inputsValid = privateInput * privateInput === publicInput;

  // Initialize WASM and animations
  useEffect(() => {
    initBrowserWasm();

    const timer = setTimeout(() => {
      initDemoAnimations();
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanupDemoAnimations();
    };
  }, []);

  // Fetch balance when connected
  useEffect(() => {
    if (connected) {
      fetchBalance();
    }
  }, [connected, fetchBalance]);

  // Transpile circuit code to Noir
  useEffect(() => {
    const transpileCode = () => {
      try {
        setTranspileError(null);
        const fn = new Function('return ' + circuitCode)();
        const parser = new AcornParser();
        const parsedCircuit = parser.parse(fn, [publicInput], [privateInput]);
        const result = generateNoir(parsedCircuit);
        setNoirCode(result);
      } catch (error) {
        setTranspileError((error as Error).message);
        setNoirCode(null);
      }
    };

    const debounce = setTimeout(transpileCode, 300);
    return () => clearTimeout(debounce);
  }, [circuitCode, publicInput, privateInput]);

  // Copy command to clipboard
  const handleCopyCommand = async (type: 'npx' | 'npm') => {
    const command = type === 'npx' ? 'npx create-izi-noir my-app' : 'npm i @izi-noir/sdk';
    await navigator.clipboard.writeText(command);
    setCopiedCommand(type);

    const btn = document.querySelector(`.copy-btn-${type}`);
    if (btn) animateCopySuccess(btn as HTMLElement);

    setTimeout(() => setCopiedCommand(null), 2000);
  };

  // Generate proof
  const handleGenerateProof = useCallback(async () => {
    if (!noirCode) return;

    setIsGenerating(true);
    setProofError(null);
    setProof(null);
    setProofTime(null);

    // Reset downstream state
    setVkAccount(null);
    setDeployTx(null);
    setVerifyTx(null);
    setVerified(null);

    try {
      await initBrowserWasm();

      const startTime = performance.now();

      const izi = await IziNoir.init({
        provider: Provider.Arkworks,
        chain: Chain.Solana,
      });

      await izi.compile(noirCode);

      const solanaProof = await izi.prove({
        expected: String(publicInput),
        secret: String(privateInput),
      }) as SolanaProofData;

      // Local verification
      const localVerified = await izi.verify(
        solanaProof.proof.bytes,
        solanaProof.publicInputs.hex
      );

      if (!localVerified) {
        throw new Error('Proof failed local verification!');
      }

      const endTime = performance.now();
      setProof(solanaProof);
      setProofTime(Math.round(endTime - startTime));

      // Animate results
      setTimeout(() => {
        animateProofResults();

        const timeEl = document.querySelector('.proof-time-value');
        if (timeEl) {
          animateCounter(timeEl as HTMLElement, Math.round(endTime - startTime), 800, ' ms');
        }

        animateCheckmark('.success-checkmark');
        animateSuccessPulse('.proof-result-card');
      }, 100);
    } catch (error) {
      console.error('Proof generation error:', error);
      setProofError((error as Error).message);
      animateError('.proof-error');
    } finally {
      setIsGenerating(false);
    }
  }, [noirCode, publicInput, privateInput]);

  // Deploy VK
  const handleDeploy = useCallback(async () => {
    if (!proof || !connected) return;

    setIsDeploying(true);
    setDeployError(null);
    setDeployStep(1);

    // Reset verify state
    setVerifyTx(null);
    setVerified(null);
    setVerifyStep('idle');

    try {
      setDeployStep(2);
      const result = await deploy(proof);
      setDeployStep(3);

      setVkAccount(result.vkAccount);
      setDeployTx(result.txSignature);
      animateSuccessPulse('.deploy-success');
    } catch (error) {
      console.error('Deploy error:', error);
      setDeployError((error as Error).message);
      animateError('.deploy-error');
    } finally {
      setIsDeploying(false);
      setDeployStep(0);
    }
  }, [proof, connected, deploy]);

  // Verify on-chain
  const handleVerify = useCallback(async () => {
    if (!proof || !vkAccount) return;

    setVerifyError(null);
    setVerifyStep('building');

    try {
      setVerifyStep('signing');
      const result = await verify(
        proof,
        vkAccount,
        (step) => {
          if (step === 'submitting') setVerifyStep('submitting');
          if (step === 'confirming') setVerifyStep('confirming');
        }
      );

      setVerified(result.verified);
      setVerifyTx(result.txSignature);
      setVerifyStep('verified');

      setTimeout(() => {
        animateCheckmark('.final-checkmark');
        animateSuccessPulse('.verified-badge');
      }, 100);
    } catch (error) {
      console.error('Verify error:', error);
      setVerifyError((error as Error).message);
      setVerifyStep('error');
      animateError('.verify-error');
    }
  }, [proof, vkAccount, verify]);

  const isVerifying = verifyStep !== 'idle' && verifyStep !== 'verified' && verifyStep !== 'error';

  return (
    <div className="demo-container overflow-x-hidden">
      {/* Back to Home */}
      <Link
        to="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all duration-200 backdrop-blur-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-sm">Home</span>
      </Link>

      {/* ===== HERO SECTION ===== */}
      <section className="demo-section demo-section-hero relative">
        {/* Circuit background SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1200 800"
        >
          <path
            className="circuit-line"
            d="M0,400 L200,400 L200,300 L400,300 L400,400 L600,400"
            stroke="#9945FF"
            strokeWidth="1"
            fill="none"
          />
          <path
            className="circuit-line"
            d="M1200,400 L1000,400 L1000,500 L800,500 L800,400 L600,400"
            stroke="#14F195"
            strokeWidth="1"
            fill="none"
          />
          <circle cx="600" cy="400" r="4" fill="#FF6B35" opacity="0.6"/>
          <circle cx="200" cy="400" r="3" fill="#9945FF" opacity="0.4"/>
          <circle cx="400" cy="300" r="3" fill="#9945FF" opacity="0.4"/>
          <circle cx="1000" cy="400" r="3" fill="#14F195" opacity="0.4"/>
          <circle cx="800" cy="500" r="3" fill="#14F195" opacity="0.4"/>
        </svg>

        <div className="relative z-10 text-center max-w-4xl">
          {/* Logo */}
          <div className="mb-8">
            <span className="text-6xl md:text-7xl font-black tracking-tighter">
              <span className="brand-gradient">IZI</span>
              <span className="text-white">-</span>
              <span className="text-noir-orange">NOIR</span>
            </span>
          </div>

          <h1 className="demo-hero-title text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Build Your ZK Proof
          </h1>

          <p className="demo-hero-subtitle text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto opacity-0">
            From JavaScript to Solana verification.<br className="hidden sm:block" />
            No cryptography knowledge required.
          </p>

          {/* Quick Start Commands */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 demo-hero-subtitle">
            <div className="terminal-card-hero group">
              <span className="terminal-prompt">$</span>
              <code className="text-gray-300">npx create-izi-noir my-app</code>
              <button
                className={`copy-btn copy-btn-npx ${copiedCommand === 'npx' ? 'copied' : ''}`}
                onClick={() => handleCopyCommand('npx')}
              >
                {copiedCommand === 'npx' ? '✓' : 'Copy'}
              </button>
            </div>
            <span className="text-gray-600 hidden sm:block">or</span>
            <div className="terminal-card-hero group">
              <span className="terminal-prompt">$</span>
              <code className="text-gray-300">npm i @izi-noir/sdk</code>
              <button
                className={`copy-btn copy-btn-npm ${copiedCommand === 'npm' ? 'copied' : ''}`}
                onClick={() => handleCopyCommand('npm')}
              >
                {copiedCommand === 'npm' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="demo-scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-2 bg-white/50 rounded-full mt-2 animate-bounce"/>
          </div>
        </div>
      </section>

      {/* ===== EDITOR SECTION ===== */}
      <section className="demo-section demo-section-editor">
        <div className="max-w-5xl mx-auto w-full">
          <h2 className="demo-section-title editor-title text-4xl md:text-5xl font-bold text-center mb-12 opacity-0">
            <span className="text-solana-purple">1.</span> Write Your Circuit
          </h2>

          {/* Circuit Explainer */}
          <div className="circuit-explainer workflow-step-vertical opacity-0 mb-8">
            <p className="explainer-main">
              This circuit proves: <strong>"I know a secret whose square equals the public value"</strong>
            </p>
            <p className="explainer-formula mt-2">
              <span className="text-solana-purple">secret</span><sup>2</sup> = <span className="text-solana-green">public</span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Code */}
            <div className="workflow-step workflow-step-vertical step-write opacity-0 h-full">
              <div className="step-header">
                <span className="step-number">JS</span>
                <span className="step-label">circuit.js</span>
              </div>
              <div className="step-content flex-1">
                <EditableCodeBlock
                  code={circuitCode}
                  onChange={setCircuitCode}
                  language="javascript"
                  rows={6}
                />
              </div>

              {/* Noir Toggle */}
              <button
                className={`noir-toggle ${showNoir ? 'open' : ''}`}
                onClick={() => setShowNoir(!showNoir)}
              >
                {showNoir ? 'Hide' : 'View'} Generated Noir
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showNoir && (
                <div className="noir-preview mt-4">
                  {transpileError ? (
                    <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg">{transpileError}</div>
                  ) : noirCode ? (
                    <CodeBlock code={noirCode} />
                  ) : (
                    <div className="text-gray-500 p-3">Transpiling...</div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Inputs */}
            <div className="workflow-step workflow-step-vertical step-deploy opacity-0 h-full">
              <div className="step-header">
                <span className="step-number">⚡</span>
                <span className="step-label">Inputs</span>
              </div>
              <div className="step-content flex-1 flex flex-col gap-4">
                {/* Public Input */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <span className="w-2 h-2 rounded-full bg-solana-green"></span>
                    Public Input
                  </label>
                  <input
                    type="number"
                    className="demo-input-field w-full"
                    value={publicInput}
                    onChange={(e) => setPublicInput(Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-600 mt-1">The target value everyone can see</p>
                </div>

                {/* Private Input */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <span className="w-2 h-2 rounded-full bg-solana-purple"></span>
                    Private Input
                  </label>
                  <input
                    type="number"
                    className="demo-input-field w-full"
                    value={privateInput}
                    onChange={(e) => setPrivateInput(Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-600 mt-1">Your secret (never revealed)</p>
                </div>

                {/* Validation inline */}
                <div className={`validation-box mt-auto ${inputsValid ? 'valid' : 'invalid'}`}>
                  {inputsValid ? (
                    <span>✓ {privateInput}² = {privateInput * privateInput} matches {publicInput}</span>
                  ) : (
                    <span>⚠ {privateInput}² = {privateInput * privateInput} ≠ {publicInput}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Generate Proof Button */}
          <div className="mt-10 text-center">
            <button
              className="demo-btn-primary text-lg"
              onClick={handleGenerateProof}
              disabled={isGenerating || !noirCode || !!transpileError}
            >
              {isGenerating ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  </svg>
                  Generating Groth16 Proof...
                </span>
              ) : (
                'Generate Groth16 Proof'
              )}
            </button>
          </div>

          {/* Proof Error */}
          {proofError && (
            <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm proof-error max-w-2xl mx-auto">
              {proofError}
            </div>
          )}

          {/* Proof Results */}
          {proof && (
            <div className="mt-8 proof-results-group">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="result-card proof-result-card">
                  <div className="result-value text-solana-green">256 bytes</div>
                  <div className="result-label">Proof Size</div>
                </div>
                <div className="result-card proof-result-card">
                  <div className="result-value text-white proof-time-value">{proofTime} ms</div>
                  <div className="result-label">Generation Time</div>
                </div>
                <div className="result-card proof-result-card">
                  <svg className="success-checkmark w-12 h-12 mx-auto" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="#14F195" strokeWidth="2" fill="none" opacity="0.3"/>
                    <path d="M30 52 L44 66 L72 38" stroke="#14F195" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <div className="result-label mt-2">Locally Verified</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== DEPLOY & VERIFY SECTION ===== */}
      <section className="demo-section demo-section-deploy">
        <div className="max-w-5xl mx-auto w-full">
          <h2 className="demo-section-title deploy-title text-4xl md:text-5xl font-bold text-center mb-12 opacity-0">
            <span className="text-solana-green">2.</span> Deploy & Verify
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Deploy Panel */}
            <div className="deploy-panel demo-panel opacity-0">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-solana-green/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-solana-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                Deploy to Solana
              </h3>

              {/* Wallet status */}
              {connected && publicKey ? (
                <div className="mb-6 p-4 rounded-xl bg-solana-green/5 border border-solana-green/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-solana-green animate-pulse"></div>
                    <span className="text-solana-green text-sm font-medium">Connected</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-500 font-mono">{truncateAddress(publicKey.toBase58())}</span>
                    <span className="text-gray-400">{balance?.toFixed(4)} SOL</span>
                  </div>
                </div>
              ) : (
                <button
                  className="demo-btn-secondary w-full mb-6"
                  onClick={() => setVisible(true)}
                >
                  Connect Phantom Wallet
                </button>
              )}

              <button
                className="demo-btn-primary w-full"
                onClick={handleDeploy}
                disabled={!proof || !connected || isDeploying}
              >
                {isDeploying ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                    </svg>
                    Deploying...
                  </span>
                ) : (
                  'Deploy VK to Devnet'
                )}
              </button>

              {/* Deploy progress */}
              {isDeploying && (
                <div className="mt-4 space-y-2">
                  {[
                    { step: 1, label: 'Creating VK account...' },
                    { step: 2, label: 'Initializing verifying key...' },
                    { step: 3, label: 'Confirming transaction...' },
                  ].map(({ step, label }) => (
                    <div key={step} className={`progress-step ${deployStep >= step ? 'completed' : ''}`}>
                      <span className="progress-step-dot"></span>
                      {label}
                    </div>
                  ))}
                </div>
              )}

              {/* Deploy error */}
              {deployError && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm deploy-error">
                  {deployError}
                </div>
              )}

              {/* Deploy success */}
              {vkAccount && (
                <div className="mt-4 p-4 rounded-xl bg-solana-green/10 border border-solana-green/30 deploy-success">
                  <div className="text-solana-green font-semibold mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Deployed!
                  </div>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-500">VK: </span>
                      <a href={getAccountExplorerUrl(vkAccount)} target="_blank" rel="noopener noreferrer" className="tx-link font-mono">
                        {truncateAddress(vkAccount)}
                      </a>
                    </div>
                    {deployTx && (
                      <div>
                        <span className="text-gray-500">Tx: </span>
                        <a href={getExplorerUrl(deployTx)} target="_blank" rel="noopener noreferrer" className="tx-link font-mono">
                          {truncateAddress(deployTx)}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Verify Panel */}
            <div className="verify-panel demo-panel opacity-0">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-solana-purple/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-solana-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                Verify On-Chain
              </h3>

              {/* Context */}
              {vkAccount && proof && verifyStep === 'idle' && !verified && (
                <div className="mb-6 p-4 rounded-xl bg-black/30 border border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Verifying claim:</p>
                  <p className="text-white font-mono text-sm">
                    "I know a <span className="text-solana-purple">secret</span> whose square equals{' '}
                    <span className="text-solana-green font-bold">{publicInput}</span>"
                  </p>
                </div>
              )}

              <button
                className="demo-btn-primary w-full"
                onClick={handleVerify}
                disabled={!vkAccount || !proof || isVerifying}
              >
                {isVerifying ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                    </svg>
                    Verifying...
                  </span>
                ) : verified ? (
                  'Verified ✓'
                ) : (
                  'Verify Proof On-Chain'
                )}
              </button>

              {/* Verify steps */}
              {isVerifying && (
                <div className="mt-4 space-y-2">
                  {VERIFY_STEPS.map((step, i) => {
                    const currentIdx = VERIFY_STEPS.findIndex(s => s.id === verifyStep);
                    const isActive = step.id === verifyStep;
                    const isComplete = currentIdx > i;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                          isActive ? 'bg-solana-purple/20 border border-solana-purple/50' :
                          isComplete ? 'bg-solana-green/10' :
                          'opacity-40'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isActive ? 'bg-solana-purple text-white animate-pulse' :
                          isComplete ? 'bg-solana-green text-black' :
                          'bg-gray-800 text-gray-500'
                        }`}>
                          {isComplete ? '✓' : step.icon}
                        </span>
                        <span className={`text-sm ${
                          isActive ? 'text-white' :
                          isComplete ? 'text-solana-green' :
                          'text-gray-500'
                        }`}>
                          {step.label}
                          {isActive && <span className="verify-dots ml-1"></span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Verify error */}
              {verifyError && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm verify-error">
                  {verifyError}
                  <button
                    onClick={() => { setVerifyStep('idle'); setVerifyError(null); }}
                    className="block mt-2 text-xs underline hover:text-red-300"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Verify success */}
              {verified && verifyStep === 'verified' && (
                <div className="mt-6 text-center">
                  <svg className="final-checkmark w-16 h-16 mx-auto mb-4" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="#14F195" strokeWidth="2" fill="none" opacity="0.3"/>
                    <path d="M30 52 L44 66 L72 38" stroke="#14F195" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>

                  <div className="verified-badge inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-solana-green/10 border border-solana-green/30 text-solana-green font-semibold mb-4">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Verified on Solana
                  </div>

                  {verifyTx && (
                    <div className="text-sm">
                      <a
                        href={getExplorerUrl(verifyTx)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-link"
                      >
                        View on Solana Explorer →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Idle message */}
              {verifyStep === 'idle' && !verified && !verifyError && (
                <p className="text-gray-500 text-sm mt-4 text-center">
                  {!vkAccount
                    ? 'Deploy the VK account first'
                    : !proof
                    ? 'Generate a proof first'
                    : 'Click to verify your proof on Solana devnet'}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold brand-gradient">IZI-NOIR</span>
            <span className="text-gray-700">|</span>
            <span className="text-gray-500 text-sm">Interactive Demo</span>
          </div>

          <div className="flex gap-8 text-sm text-gray-500">
            <Link to="/" className="hover:text-solana-purple transition-colors">
              Home
            </Link>
            <a
              href="https://github.com/francoperez03/izi-noir"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DemoPage;
