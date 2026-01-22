import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initLandingAnimations, cleanupAnimations } from '../lib/anime-utils';

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
    <div className="landing-container overflow-x-hidden">
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
            <Link to="/" className="btn-primary inline-flex items-center gap-3 text-lg">
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
{`pragma circom 2.1.0;

template Multiplier() {
    signal private input a;
    signal private input b;
    signal output c;

    c <== a * b;

    component eq = IsEqual();
    eq.in[0] <== c;
    eq.in[1] <== expected;
    eq.out === 1;
}

template RangeProof(n) {
    signal input in;
    signal input max;
    signal output out;

    component lt = LessThan(n);
    lt.in[0] <== in;
    lt.in[1] <== max;
    out <== lt.out;
}`}
          </pre>

          {/* Overlay message */}
          <div className="problem-message absolute inset-0 flex items-center justify-center opacity-0">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Privacy shouldn't<br/>
              <span className="text-gray-500">require a PhD</span>
            </h2>
          </div>
        </div>
      </section>

      {/* ===== TRANSFORMATION SECTION ===== */}
      <section className="section-transformation" style={{ minHeight: '120vh' }}>
        <div className="sticky top-0 h-screen flex items-center justify-center px-4">
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8 max-w-6xl">
            {/* JS Panel */}
            <div className="panel-js code-panel min-w-[280px] lg:min-w-[300px]">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-solana-purple"/>
                JavaScript
              </div>
              <pre className="text-sm text-gray-300 font-mono leading-relaxed">
{`([expected], [secret]) => {
  assert(
    secret * secret == expected
  );
}`}
              </pre>
            </div>

            {/* Flow Arrow 1 */}
            <div className="hidden lg:block">
              <svg className="w-20 h-12" viewBox="0 0 80 48">
                <path
                  className="flow-line-1"
                  d="M0,24 L60,24"
                  stroke="#9945FF"
                  strokeWidth="2"
                  fill="none"
                />
                <polygon points="55,18 68,24 55,30" fill="#9945FF" opacity="0.8"/>
              </svg>
            </div>
            <div className="lg:hidden">
              <svg className="w-12 h-16" viewBox="0 0 48 64">
                <path
                  className="flow-line-1"
                  d="M24,0 L24,44"
                  stroke="#9945FF"
                  strokeWidth="2"
                  fill="none"
                />
                <polygon points="18,40 24,54 30,40" fill="#9945FF" opacity="0.8"/>
              </svg>
            </div>

            {/* Noir Panel */}
            <div className="panel-noir code-panel min-w-[280px] lg:min-w-[300px]">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-noir-orange"/>
                Noir
              </div>
              <pre className="text-sm text-gray-300 font-mono leading-relaxed">
{`fn main(
    expected: pub Field,
    secret: Field
) {
    assert(secret * secret == expected);
}`}
              </pre>
            </div>

            {/* Flow Arrow 2 */}
            <div className="hidden lg:block">
              <svg className="w-20 h-12" viewBox="0 0 80 48">
                <path
                  className="flow-line-2"
                  d="M0,24 L60,24"
                  stroke="#FF6B35"
                  strokeWidth="2"
                  fill="none"
                />
                <polygon points="55,18 68,24 55,30" fill="#14F195" opacity="0.8"/>
              </svg>
            </div>
            <div className="lg:hidden">
              <svg className="w-12 h-16" viewBox="0 0 48 64">
                <path
                  className="flow-line-2"
                  d="M24,0 L24,44"
                  stroke="#FF6B35"
                  strokeWidth="2"
                  fill="none"
                />
                <polygon points="18,40 24,54 30,40" fill="#14F195" opacity="0.8"/>
              </svg>
            </div>

            {/* Proof Panel */}
            <div className="panel-proof code-panel min-w-[280px] lg:min-w-[220px]">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-solana-green"/>
                Proof
              </div>
              <div className="flex flex-col items-center py-6">
                <span className="text-5xl lg:text-6xl font-bold text-solana-green font-mono">256</span>
                <span className="text-gray-500 text-sm mt-2">bytes</span>
                <span className="text-gray-600 text-xs mt-1">Groth16</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WORKFLOW SECTION ===== */}
      <section className="section-workflow flex items-center justify-center px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="workflow-title text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-12 opacity-0">
            Complete <span className="text-solana-purple">Workflow</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Step 1: WRITE */}
            <div className="workflow-step step-write relative opacity-0">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-solana-purple/20 flex items-center justify-center text-solana-purple font-bold text-sm">1</span>
                <span className="text-xs uppercase tracking-widest text-solana-purple">Write</span>
              </div>
              <pre className="text-xs text-gray-400 font-mono mb-3 overflow-x-auto">
{`([min], [balance]) => {
  assert(balance >= min);
}`}
              </pre>
              <p className="text-gray-500 text-sm">JavaScript you already know</p>
              {/* Arrow (desktop) */}
              <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 text-white/20 z-10">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Step 2: PROVE */}
            <div className="workflow-step step-prove relative opacity-0">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-noir-orange/20 flex items-center justify-center text-noir-orange font-bold text-sm">2</span>
                <span className="text-xs uppercase tracking-widest text-noir-orange">Prove</span>
              </div>
              <pre className="text-xs text-gray-400 font-mono mb-3 overflow-x-auto">
{`const proof = await izi
  .proveForSolana(inputs);`}
              </pre>
              <p className="text-gray-500 text-sm">256-byte Groth16 proof</p>
              {/* Arrow (desktop) */}
              <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 text-white/20 z-10">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Step 3: DEPLOY */}
            <div className="workflow-step step-deploy relative opacity-0">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-solana-green/20 flex items-center justify-center text-solana-green font-bold text-sm">3</span>
                <span className="text-xs uppercase tracking-widest text-solana-green">Deploy</span>
              </div>
              <pre className="text-xs text-gray-400 font-mono mb-3 overflow-x-auto">
{`await manager
  .ensureDeployed(proof);`}
              </pre>
              <p className="text-gray-500 text-sm">One-click to Solana</p>
              {/* Arrow (desktop) */}
              <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 text-white/20 z-10">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Step 4: VERIFY */}
            <div className="workflow-step step-verify opacity-0">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-solana-purple/20 to-solana-green/20 flex items-center justify-center font-bold text-sm">
                  <span className="brand-gradient">4</span>
                </span>
                <span className="text-xs uppercase tracking-widest brand-gradient">Verify</span>
              </div>
              <pre className="text-xs text-gray-400 font-mono mb-3 overflow-x-auto">
{`builder.buildVerify
  ProofInstruction();`}
              </pre>
              <p className="text-gray-500 text-sm">On-chain or off-chain</p>
            </div>
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
            Zero cryptography knowledge required.
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
            <Link to="/" className="proof-cta btn-primary opacity-0">
              Try the Demo
            </Link>
            <a
              href="https://github.com/izi-noir/izi-noir"
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
            <span className="text-xl font-bold brand-gradient">IZI-NOIR</span>
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
              href="https://github.com/izi-noir/izi-noir"
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
