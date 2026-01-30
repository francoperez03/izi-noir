import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initLandingAnimations, cleanupAnimations } from '../lib/anime-utils';
import { CodeBlock } from '../components/CodeBlock';
import { PipelineCardStack } from '../components/pipeline';

export function LandingPage() {
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initLandingAnimations();
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanupAnimations();
    };
  }, []);

  return (
    <div className="landing-container overflow-x-hidden pt-16">
      {/* ===== HERO SECTION ===== */}
      <section className="section-hero min-h-screen flex flex-col items-center justify-center relative px-4">
        {/* SVG Circuit Background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1200 800"
        >
          {/* Left circuit path */}
          <path
            className="circuit-line"
            d="M0,400 L150,400 L150,250 L350,250 L350,400 L500,400"
            stroke="#9945FF"
            strokeWidth="1"
            fill="none"
          />
          {/* Right circuit path */}
          <path
            className="circuit-line"
            d="M1200,400 L1050,400 L1050,550 L850,550 L850,400 L700,400"
            stroke="#14F195"
            strokeWidth="1"
            fill="none"
          />
          {/* Top decorative */}
          <path
            className="circuit-line"
            d="M400,0 L400,100 L600,100 L600,150"
            stroke="#FF6B35"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
          {/* Bottom decorative */}
          <path
            className="circuit-line"
            d="M600,800 L600,700 L800,700 L800,650"
            stroke="#9945FF"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />
          {/* Connection nodes */}
          <circle cx="500" cy="400" r="3" fill="#9945FF" opacity="0.6"/>
          <circle cx="700" cy="400" r="3" fill="#14F195" opacity="0.6"/>
          <circle cx="600" cy="150" r="2" fill="#FF6B35" opacity="0.4"/>
          <circle cx="600" cy="650" r="2" fill="#9945FF" opacity="0.4"/>
        </svg>

        <div className="relative z-10 text-center max-w-4xl">
          <h1 className="brand-text text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-6">
            IZI-NOIR
          </h1>

          <p className="hero-tagline text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto opacity-0">
            Write ZK circuits in JavaScript.<br className="hidden sm:block" />
            Verify on Solana.
          </p>

          <div className="hero-cta opacity-0">
            <Link to="/demo" className="btn-primary inline-flex items-center gap-3 text-lg">
              Try the Demo
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-40">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-2 bg-white/50 rounded-full mt-2 animate-bounce"/>
          </div>
        </div>
      </section>

      {/* ===== PROBLEM SECTION ===== */}
      <section className="section-problem min-h-screen flex items-center justify-center px-4 py-24">
        <div className="relative max-w-3xl text-center">
          {/* Faded code background */}
          <pre className="problem-code text-xs md:text-sm text-gray-700 font-mono leading-loose opacity-0 select-none">
{`fn main(
    expected: pub Field,
    secret: Field
) {
    assert(secret * secret == expected);
}

fn verify_range(
    value: Field,
    min: pub Field,
    max: pub Field
) {
    assert(value >= min);
    assert(value <= max);
}

fn verify_membership(
    leaf: Field,
    root: pub Field,
    path: [Field; 32]
) {
    let computed = compute_root(leaf, path);
    assert(computed == root);
}`}
          </pre>

          {/* Overlay message */}
          <div className="problem-message absolute inset-0 flex items-center justify-center opacity-0 px-4">
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight text-center max-w-5xl">
              What if ZK felt<br/>
              <span className="text-gray-500">as natural as JavaScript?</span>
            </h2>
          </div>
        </div>
      </section>

      {/* ===== WORKFLOW SECTION ===== */}
      <section className="section-workflow min-h-screen flex items-center justify-center px-4 py-24">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="workflow-title text-5xl md:text-6xl lg:text-7xl font-bold text-center mb-16 opacity-0">
            How It <span className="text-solana-purple">Works</span>
          </h2>

          <div className="flex flex-col gap-6">
            {/* Step 1: INIT */}
            <div className="workflow-step workflow-step-vertical step-init opacity-0">
              <div className="step-header">
                <span className="step-number">1</span>
                <span className="step-label">Initialize</span>
              </div>
              <div className="step-content">
                <CodeBlock code={`const izi = await IziNoir.init({
  provider: Provider.Arkworks,
  chain: Chain.Solana
});`} />
                <p className="step-description">Configure provider and target chain</p>
              </div>
            </div>

            {/* Step 2: WRITE */}
            <div className="workflow-step workflow-step-vertical step-write opacity-0">
              <div className="step-header">
                <span className="step-number">2</span>
                <span className="step-label">Write</span>
              </div>
              <div className="step-content">
                <CodeBlock code={`([expected], [secret]) => {
  assert(secret * secret == expected);
}`} language="javascript" />
                <p className="step-description">JavaScript you already know</p>
              </div>
            </div>

            {/* Step 3: COMPILE */}
            <div className="workflow-step workflow-step-vertical step-prove opacity-0">
              <div className="step-header">
                <span className="step-number">3</span>
                <span className="step-label">Compile</span>
              </div>
              <div className="step-content">
                <CodeBlock code={`const { verifyingKey } = await izi.compile(noirCode);
// VK ready for deployment`} />
                <p className="step-description">Noir compile + trusted setup</p>
              </div>
            </div>

            {/* Step 4: PROVE */}
            <div className="workflow-step workflow-step-vertical step-deploy opacity-0">
              <div className="step-header">
                <span className="step-number">4</span>
                <span className="step-label">Prove</span>
              </div>
              <div className="step-content">
                <CodeBlock code={`const proof = await izi.prove(inputs);
// 256-byte Groth16 proof`} />
                <p className="step-description">Fast proof generation</p>
              </div>
            </div>

            {/* Step 5: DEPLOY & VERIFY */}
            <div className="workflow-step workflow-step-vertical step-verify opacity-0">
              <div className="step-header">
                <span className="step-number">5</span>
                <span className="step-label">Verify</span>
              </div>
              <div className="step-content">
                <CodeBlock code={`await izi.deploy(wallet);        // Deploy VK
await izi.verifyOnChain(wallet); // Verify proof`} />
                <p className="step-description">One-line Solana deployment</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PIPELINE VISUALIZATIONS - COMPARISON ===== */}
      <section className="section-pipeline-demos py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-center mb-8">
            Under the <span className="text-gray-500">Hood</span>
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
            JS → Acorn → Noir → Noir WASM → ACIR → Arkworks → R1CS → Groth16 → Proof (256 bytes)
          </p>

          {/* Card Stack - drag or click to navigate */}
          <div className="overflow-hidden">
            <PipelineCardStack />
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="section-features py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="features-title text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16 opacity-0">
            Built for <span className="text-solana-green">Developers</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: No Anchor */}
            <div className="feature-card opacity-0">
              <div className="w-10 h-10 rounded-lg bg-solana-purple/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">No Anchor Required</h3>
              <p className="text-gray-500 text-sm">Build Solana transactions without framework dependencies</p>
            </div>

            {/* Feature 2: One-Click Deploy */}
            <div className="feature-card opacity-0">
              <div className="w-10 h-10 rounded-lg bg-solana-green/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">One-Click Deploy</h3>
              <p className="text-gray-500 text-sm">Idempotent VK deployment with local persistence</p>
            </div>

            {/* Feature 3: Version Circuits */}
            <div className="feature-card opacity-0">
              <div className="w-10 h-10 rounded-lg bg-noir-orange/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-noir-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Version Your Circuits</h3>
              <p className="text-gray-500 text-sm">Name, version, and document your privacy logic</p>
            </div>

            {/* Feature 4: Backend Ready */}
            <div className="feature-card opacity-0">
              <div className="w-10 h-10 rounded-lg bg-solana-purple/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Backend Ready</h3>
              <p className="text-gray-500 text-sm">Express middleware for off-chain verification</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROOF SECTION ===== */}
      <section className="section-proof min-h-screen flex items-center justify-center px-4 py-24">
        <div className="text-center max-w-4xl mx-auto">
          {/* Verified checkmark SVG */}
          <svg
            className="verified-checkmark w-20 h-20 md:w-28 md:h-28 mx-auto mb-10"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="#14F195"
              strokeWidth="2"
              opacity="0.4"
            />
            <path
              d="M30 52 L44 66 L72 38"
              fill="none"
              stroke="#14F195"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <h2 className="proof-title text-4xl md:text-6xl lg:text-7xl font-bold mb-6 opacity-0">
            <span className="text-solana-green">Verified</span> on Solana
          </h2>

          <p className="text-lg md:text-xl text-gray-400 mb-16 max-w-xl mx-auto">
            From JavaScript to on-chain verification.<br/>
            Using syntax you already know.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 md:gap-16 mb-16 max-w-xl mx-auto">
            <div>
              <span
                className="stat-number text-3xl md:text-5xl font-bold text-white font-mono"
                data-value="256"
              >
                0
              </span>
              <span className="text-gray-500 text-xs md:text-sm block mt-2">bytes/proof</span>
            </div>
            <div>
              <span
                className="stat-number text-3xl md:text-5xl font-bold text-white font-mono"
                data-value="4"
              >
                0
              </span>
              <span className="text-gray-500 text-xs md:text-sm block mt-2">new APIs</span>
            </div>
            <div>
              <span className="text-2xl md:text-4xl font-bold text-solana-green font-mono">
                Browser
              </span>
              <span className="text-gray-500 text-xs md:text-sm block mt-2">+ Server</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo" className="proof-cta btn-primary opacity-0">
              Try the Demo
            </Link>
            <a
              href="https://github.com/francoperez03/izi-noir"
              target="_blank"
              rel="noopener noreferrer"
              className="proof-cta btn-secondary inline-flex items-center justify-center gap-3 opacity-0"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="section-footer py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-white">IZI-NOIR</span>
            <span className="text-gray-700">|</span>
            <span className="text-gray-500 text-sm">Privacy for Solana</span>
          </div>

          <div className="flex gap-8 text-sm text-gray-500">
            <a
              href="https://noir-lang.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-noir-orange transition-colors"
            >
              Noir
            </a>
            <a
              href="https://solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-solana-purple transition-colors"
            >
              Solana
            </a>
            <a
              href="https://github.com/francoperez03/izi-noir"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>

          <span className="text-gray-600 text-sm">
            {new Date().getFullYear()} IZI-NOIR
          </span>
        </div>
      </footer>
    </div>
  );
}
