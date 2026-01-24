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
} from '../lib/demo-animations';
import { useSolanaDemo } from '../hooks/useSolanaDemo';
import { CodeBlock } from '../components/CodeBlock';

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

export function DemoPage() {
  // State
  const [circuitCode, setCircuitCode] = useState(DEFAULT_CIRCUIT);
  const [noirCode, setNoirCode] = useState<string | null>(null);
  const [publicInput, setPublicInput] = useState(DEFAULT_PUBLIC_INPUT);
  const [privateInput, setPrivateInput] = useState(DEFAULT_PRIVATE_INPUT);
  const [transpileError, setTranspileError] = useState<string | null>(null);

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
    { id: 'signing', label: 'Waiting for wallet signature', icon: '✍️' },
    { id: 'submitting', label: 'Submitting to Solana', icon: '🚀' },
    { id: 'confirming', label: 'Waiting for confirmation', icon: '⏳' },
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
        // Parse the function and generate Noir
        const fn = new Function('return ' + circuitCode)();
        const parser = new AcornParser();
        // Parse with the current input values
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

      // DEBUG: Log the input values being used
      console.log('=== PROOF GENERATION DEBUG ===');
      console.log('publicInput state value:', publicInput, typeof publicInput);
      console.log('privateInput state value:', privateInput, typeof privateInput);
      console.log('Expected: secret * secret =', privateInput * privateInput);
      console.log('Does it match publicInput?', privateInput * privateInput === publicInput);

      // Initialize IziNoir with Arkworks and Solana chain
      const izi = await IziNoir.init({
        provider: Provider.Arkworks,
        chain: Chain.Solana,
      });

      // Compile the Noir code
      await izi.compile(noirCode);

      // Generate proof (returns SolanaProofData because chain is Solana)
      const solanaProof = await izi.prove({
        expected: String(publicInput),
        secret: String(privateInput),
      }) as SolanaProofData;

      // DEBUG: Log generated proof details
      console.log('Generated proof public inputs (hex):', solanaProof.publicInputs.hex);
      console.log('Generated proof public inputs (bytes[0]):', Array.from(solanaProof.publicInputs.bytes[0]));
      console.log('VK nrPublicInputs:', solanaProof.verifyingKey.nrPublicInputs);
      console.log('==============================');

      // LOCAL VERIFICATION: Verify the proof locally before on-chain
      try {
        const localVerified = await izi.verify(
          solanaProof.proof.bytes,
          solanaProof.publicInputs.hex
        );
        console.log('=== LOCAL VERIFICATION ===');
        console.log('Local verification result:', localVerified ? '✓ VALID' : '✗ INVALID');
        console.log('==========================');
        if (!localVerified) {
          throw new Error('Proof failed local verification! This is a bug in proof generation.');
        }
      } catch (verifyError) {
        console.error('Local verification error:', verifyError);
      }

      const endTime = performance.now();
      const time = Math.round(endTime - startTime);

      setProof(solanaProof);
      setProofTime(time);

      // Animate the results
      setTimeout(() => {
        const proofSizeEl = document.querySelector('.proof-size-value');
        const proofTimeEl = document.querySelector('.proof-time-value');
        if (proofSizeEl) {
          animateCounter(proofSizeEl as HTMLElement, 256, 800, ' bytes');
        }
        if (proofTimeEl) {
          animateCounter(proofTimeEl as HTMLElement, time, 600, ' ms');
        }
        animateCheckmark('.proof-checkmark');
      }, 100);

    } catch (error) {
      console.error('Proof generation failed:', error);
      setProofError((error as Error).message);
      animateError('.proof-panel');
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

    try {
      setDeployStep(2);
      const result = await deploy(proof);

      setDeployStep(3);
      setVkAccount(result.vkAccount);
      setDeployTx(result.txSignature);

      // Refresh balance
      fetchBalance();

      // Animate success
      setTimeout(() => {
        animateSuccessPulse('.deploy-success');
      }, 100);

    } catch (error) {
      console.error('Deploy failed:', error);
      setDeployError((error as Error).message);
      animateError('.deploy-panel');
    } finally {
      setIsDeploying(false);
      setDeployStep(0);
    }
  }, [proof, connected, deploy, fetchBalance]);

  // Verify on-chain with step tracking
  const handleVerify = useCallback(async () => {
    if (!proof || !vkAccount) return;

    setVerifyStep('building');
    setVerifyError(null);
    setVerified(null);

    try {
      // Small delay for UX (shows building step)
      await new Promise(r => setTimeout(r, 400));

      setVerifyStep('signing');

      const result = await verify(
        proof,
        vkAccount,
        // Callback for step updates
        (step: 'submitting' | 'confirming') => setVerifyStep(step)
      );

      setVerifyStep('verified');
      setVerifyTx(result.txSignature);
      setVerified(result.verified);

      // Refresh balance
      fetchBalance();

      // Animate success
      if (result.verified) {
        setTimeout(() => {
          animateSuccessPulse('.verify-success');
          animateCheckmark('.final-checkmark');
        }, 100);
      }

    } catch (error) {
      console.error('Verify failed:', error);
      setVerifyStep('error');
      setVerifyError((error as Error).message);
      animateError('.verify-panel');
    }
  }, [proof, vkAccount, verify, fetchBalance]);

  // Computed state for button disabled
  const isVerifying = verifyStep !== 'idle' && verifyStep !== 'verified' && verifyStep !== 'error';

  // Truncate address
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="demo-container overflow-x-hidden">
      {/* ===== HERO SECTION ===== */}
      <section className="demo-section demo-section-hero relative">
        {/* Circuit background */}
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
        </svg>

        <div className="relative z-10 text-center max-w-4xl">
          <h1 className="demo-hero-title text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            Build Your ZK Proof
          </h1>

          <p className="demo-hero-subtitle text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto opacity-0">
            From JavaScript to Solana verification.<br className="hidden sm:block" />
            No cryptography knowledge required.
          </p>
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
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="demo-section-title editor-title text-5xl md:text-6xl font-bold text-center mb-12 opacity-0">
            <span className="text-solana-purple">1.</span> Write Your Circuit
          </h2>

          <div className="flex flex-col gap-6">
            {/* Circuit Editor */}
            <div className="workflow-step workflow-step-vertical step-write opacity-0">
              <div className="step-header">
                <span className="step-number">JS</span>
                <span className="step-label">circuit.js</span>
              </div>
              <div className="step-content">
                <textarea
                  className="code-block w-full bg-black/60 resize-none focus:outline-none focus:ring-1 focus:ring-solana-purple/50"
                  value={circuitCode}
                  onChange={(e) => setCircuitCode(e.target.value)}
                  rows={4}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Noir Preview */}
            <div className="workflow-step workflow-step-vertical step-prove opacity-0">
              <div className="step-header">
                <span className="step-number">NR</span>
                <span className="step-label">circuit.nr</span>
              </div>
              <div className="step-content">
                {transpileError ? (
                  <pre className="code-block text-red-400">{transpileError}</pre>
                ) : noirCode ? (
                  <CodeBlock code={noirCode} />
                ) : (
                  <div className="code-block text-gray-500">Transpiling...</div>
                )}
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="workflow-step workflow-step-vertical step-deploy opacity-0">
                <div className="step-header">
                  <span className="step-number">
                    <span className="w-2 h-2 rounded-full bg-solana-green inline-block"></span>
                  </span>
                  <span className="step-label">Public Input</span>
                </div>
                <div className="step-content">
                  <input
                    type="number"
                    className="demo-input-field w-full"
                    value={publicInput}
                    onChange={(e) => setPublicInput(Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-2">Everyone can see this value</p>
                </div>
              </div>

              <div className="workflow-step workflow-step-vertical step-write opacity-0">
                <div className="step-header">
                  <span className="step-number">
                    <span className="w-2 h-2 rounded-full bg-solana-purple inline-block"></span>
                  </span>
                  <span className="step-label">Private Input</span>
                </div>
                <div className="step-content">
                  <input
                    type="number"
                    className="demo-input-field w-full"
                    value={privateInput}
                    onChange={(e) => setPrivateInput(Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-2">Only you know this value</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROOF SECTION ===== */}
      <section className="demo-section demo-section-proof">
        <div className="max-w-4xl mx-auto w-full text-center">
          <h2 className="demo-section-title proof-title text-5xl md:text-6xl font-bold mb-12 opacity-0">
            <span className="text-noir-orange">2.</span> Generate Proof
          </h2>

          <div className="proof-panel demo-panel opacity-0">
            {/* Generate button */}
            <button
              className="demo-btn-primary text-lg mb-8"
              onClick={handleGenerateProof}
              disabled={isGenerating || !noirCode || !!transpileError}
            >
              {isGenerating ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate Groth16 Proof'
              )}
            </button>

            {/* Progress bar */}
            {isGenerating && (
              <div className="proof-progress mb-8">
                <div className="proof-progress-fill" style={{ width: '100%', transition: 'width 3s linear' }}/>
              </div>
            )}

            {/* Error */}
            {proofError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8 text-red-400 text-sm">
                {proofError}
              </div>
            )}

            {/* Results */}
            {proof && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="result-card">
                  <div className="result-value text-solana-green proof-size-value">256 bytes</div>
                  <div className="result-label">Proof Size</div>
                </div>
                <div className="result-card">
                  <div className="result-value text-white proof-time-value">{proofTime} ms</div>
                  <div className="result-label">Generation Time</div>
                </div>
                <div className="result-card">
                  <svg className="proof-checkmark success-checkmark" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45"/>
                    <path d="M30 52 L44 66 L72 38"/>
                  </svg>
                  <div className="result-label mt-2">Locally Verified</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== DEPLOY SECTION ===== */}
      <section className="demo-section demo-section-deploy">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="demo-section-title deploy-title text-5xl md:text-6xl font-bold text-center mb-12 opacity-0">
            <span className="text-solana-green">3.</span> Deploy to Solana
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wallet Panel */}
            <div className="deploy-panel demo-panel opacity-0">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-solana-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Wallet Connection
              </h3>

              {connected && publicKey ? (
                <div className="space-y-4">
                  <div className="wallet-badge">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {truncateAddress(publicKey.toBase58())}
                  </div>
                  <div className="text-sm text-gray-400">
                    Balance: <span className="text-white font-mono">{balance?.toFixed(4) ?? '...'} SOL</span>
                  </div>
                  <p className="text-xs text-gray-600">Network: Devnet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="wallet-badge wallet-badge-disconnected">
                    Not connected
                  </div>
                  <button
                    className="demo-btn-secondary w-full"
                    onClick={() => setVisible(true)}
                  >
                    Connect Phantom
                  </button>
                </div>
              )}
            </div>

            {/* Deploy Panel */}
            <div className="deploy-panel demo-panel opacity-0">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-solana-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Deploy VK Account
              </h3>

              {/* Deploy button */}
              <button
                className="demo-btn-primary w-full mb-4"
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
                  'Deploy to Devnet'
                )}
              </button>

              {/* Progress steps */}
              {isDeploying && (
                <div className="space-y-2 mb-4">
                  <div className={`progress-step ${deployStep >= 1 ? 'completed' : ''}`}>
                    <span className="progress-step-dot"></span>
                    Creating VK account...
                  </div>
                  <div className={`progress-step ${deployStep >= 2 ? 'active' : ''} ${deployStep >= 3 ? 'completed' : ''}`}>
                    <span className="progress-step-dot"></span>
                    Initializing verifying key...
                  </div>
                  <div className={`progress-step ${deployStep >= 3 ? 'completed' : ''}`}>
                    <span className="progress-step-dot"></span>
                    Confirming transaction...
                  </div>
                </div>
              )}

              {/* Error */}
              {deployError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                  {deployError}
                </div>
              )}

              {/* Success */}
              {vkAccount && (
                <div className="deploy-success bg-solana-green/10 border border-solana-green/30 rounded-lg p-4">
                  <div className="text-solana-green font-semibold mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Deployed!
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">VK Account: </span>
                    <a
                      href={getAccountExplorerUrl(vkAccount)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link font-mono"
                    >
                      {truncateAddress(vkAccount)}
                    </a>
                  </div>
                  {deployTx && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">Tx: </span>
                      <a
                        href={getExplorerUrl(deployTx)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-link font-mono"
                      >
                        {truncateAddress(deployTx)}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== VERIFY SECTION ===== */}
      <section className="demo-section demo-section-verify">
        <div className="max-w-4xl mx-auto w-full text-center">
          <h2 className="demo-section-title verify-title text-5xl md:text-6xl font-bold mb-12 opacity-0">
            <span className="brand-gradient">4.</span> Verify On-Chain
          </h2>

          <div className="verify-panel demo-panel opacity-0">
            {/* Context: What we're verifying */}
            {vkAccount && proof && verifyStep === 'idle' && !verified && (
              <div className="verify-context mb-8 p-4 rounded-lg bg-black/30 border border-white/10 text-left max-w-md mx-auto">
                <h4 className="text-xs font-mono text-gray-400 mb-2 uppercase tracking-wider">Verifying claim:</h4>
                <p className="text-white font-mono text-sm">
                  "I know a <span className="text-[#14F195]">secret</span> whose square equals{' '}
                  <span className="text-[#9945FF] font-bold">{publicInput}</span>"
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  The on-chain verifier will validate this without learning the secret.
                </p>
              </div>
            )}

            {/* Verify button */}
            <button
              className="demo-btn-primary text-lg mb-8"
              onClick={handleVerify}
              disabled={!vkAccount || !proof || isVerifying}
            >
              {isVerifying ? (
                <span className="flex items-center gap-3">
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

            {/* Step Progress UI */}
            {isVerifying && (
              <div className="verify-steps space-y-2 max-w-sm mx-auto mb-8 text-left">
                {VERIFY_STEPS.map((step, i) => {
                  const currentIdx = VERIFY_STEPS.findIndex(s => s.id === verifyStep);
                  const isActive = step.id === verifyStep;
                  const isComplete = currentIdx > i;
                  const isPending = currentIdx < i;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                        isActive ? 'bg-[#9945FF]/20 border border-[#9945FF]/50' :
                        isComplete ? 'bg-[#14F195]/10' :
                        'opacity-40'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                        isActive ? 'bg-[#9945FF] text-white animate-pulse' :
                        isComplete ? 'bg-[#14F195] text-black' :
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {isComplete ? '✓' : step.icon}
                      </span>
                      <span className={`text-sm ${
                        isActive ? 'text-white font-medium' :
                        isComplete ? 'text-[#14F195]' :
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

            {/* Error */}
            {verifyError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8 text-red-400 text-sm max-w-md mx-auto">
                {verifyError}
                <button
                  onClick={() => { setVerifyStep('idle'); setVerifyError(null); }}
                  className="block mt-2 text-xs underline hover:text-red-300"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Success */}
            {verified && verifyStep === 'verified' && (
              <div className="verify-success space-y-6">
                <svg className="final-checkmark w-24 h-24 mx-auto" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="#14F195" strokeWidth="2" fill="none" opacity="0.3"/>
                  <path d="M30 52 L44 66 L72 38" stroke="#14F195" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>

                <div className="verified-badge mx-auto">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
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
                      View on Solana Explorer
                    </a>
                  </div>
                )}

                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  Your proof has been verified on-chain. The verifier confirmed that you know
                  a secret value whose square equals {publicInput} — without revealing the secret.
                </p>
              </div>
            )}

            {verifyStep === 'idle' && !verified && !verifyError && (
              <p className="text-gray-500 text-sm">
                {!vkAccount
                  ? 'Deploy the VK account first'
                  : !proof
                  ? 'Generate a proof first'
                  : 'Click to verify your proof on Solana devnet'}
              </p>
            )}
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

// Also export as default for compatibility
export default DemoPage;
