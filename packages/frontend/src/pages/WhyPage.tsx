import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EcosystemCloud } from '../components/EcosystemCloud';
import { initWhyAnimations, cleanupWhyAnimations } from '../lib/why-animations';

const COMPARISON_DATA = [
  {
    today: 'Learn a new language (Noir, Circom)',
    withIzi: 'Use JavaScript you already know',
    todayIcon: (
      <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    today: 'Manual Solana integration',
    withIzi: 'Plug-and-play SDK',
    todayIcon: (
      <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    today: 'Re-deploy for every circuit change',
    withIzi: 'One program, infinite circuits',
    todayIcon: (
      <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const BENEFITS_DATA = [
  {
    stat: '10',
    unit: 'x',
    label: 'faster development',
    description: 'From months to days',
    color: 'solana-purple',
  },
  {
    stat: '256',
    unit: ' bytes',
    label: 'per proof',
    description: 'Optimized for Solana',
    color: 'solana-green',
  },
  {
    stat: '100',
    unit: '%',
    label: 'browser based',
    description: 'No server required',
    color: 'noir-orange',
  },
  {
    stat: '1',
    unit: '',
    label: 'program',
    description: 'Deploy once, use forever',
    color: 'izi-cyan',
  },
];

const USE_CASES_DATA = [
  {
    title: 'Private Voting',
    description: 'DAO governance without revealing votes',
  },
  {
    title: 'Credential Verification',
    description: 'Prove identity without exposing data',
  },
  {
    title: 'Anonymous Payments',
    description: 'Private transactions on Solana',
  },
  {
    title: 'Private NFT Ownership',
    description: 'Verify ownership without revealing holder',
  },
];

const ROADMAP_DATA = [
  { version: 'v1', title: 'SDK + Verifier', status: 'done' as const },
  { version: 'v2', title: 'More circuit patterns', status: 'next' as const },
  { version: 'v3', title: 'Recursive proofs', status: 'planned' as const },
  { version: 'v4', title: 'Mobile SDK', status: 'planned' as const },
];

export function WhyPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      initWhyAnimations();
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanupWhyAnimations();
    };
  }, []);

  return (
    <div className="why-container overflow-x-hidden pt-16">
      {/* ===== HERO SECTION ===== */}
      <section className="section-why-hero flex flex-col items-center justify-center relative px-4 py-24">
        <div className="relative z-10 text-center max-w-4xl">
          <h1 className="why-hero-title text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 opacity-0">
            Why IZI-NOIR?
          </h1>

          <p className="why-hero-subtitle text-2xl md:text-3xl lg:text-4xl text-gray-300 mb-6 opacity-0">
            "Noir made ZK accessible.<br className="hidden sm:block" />
            We make it familiar."
          </p>

          <p className="why-hero-body text-lg md:text-xl text-gray-500 max-w-2xl mx-auto opacity-0">
            Zero-knowledge proofs are no longer just for cryptographers. We bridge the gap — so your JavaScript team can add privacy to Solana using syntax they already know.
          </p>
        </div>

        {/* Decorative circuit lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1200 800"
        >
          <path
            d="M0,400 L200,400 L200,250 L400,250"
            stroke="#9945FF"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M1200,400 L1000,400 L1000,550 L800,550"
            stroke="#14F195"
            strokeWidth="1"
            fill="none"
          />
          <circle cx="400" cy="250" r="4" fill="#9945FF" opacity="0.5" />
          <circle cx="800" cy="550" r="4" fill="#14F195" opacity="0.5" />
        </svg>
      </section>

      {/* ===== PROBLEM SECTION ===== */}
      <section className="section-why-problem flex items-center justify-center px-4 py-24">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="problem-title text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-16 opacity-0">
            The <span className="text-amber-400">Familiarity</span> Gap
          </h2>

          <div className="comparison-table rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-2 border-b border-white/10">
              <div className="p-4 md:p-6 text-center border-r border-white/10">
                <span className="text-sm uppercase tracking-wider text-gray-500">Today</span>
              </div>
              <div className="p-4 md:p-6 text-center">
                <span className="text-sm uppercase tracking-wider text-solana-green">With IZI-NOIR</span>
              </div>
            </div>

            {/* Comparison rows */}
            {COMPARISON_DATA.map((row, index) => (
              <div
                key={index}
                className={`comparison-row grid grid-cols-2 opacity-0 ${
                  index < COMPARISON_DATA.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <div className="p-4 md:p-6 border-r border-white/10 flex items-center gap-3">
                  {row.todayIcon}
                  <span className="text-gray-400 text-sm md:text-base">{row.today}</span>
                </div>
                <div className="p-4 md:p-6 flex items-center gap-3">
                  <svg className="w-5 h-5 text-solana-green flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-white text-sm md:text-base font-medium">{row.withIzi}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ECOSYSTEM SECTION ===== */}
      <section className="section-why-ecosystem flex items-center justify-center px-4 py-24">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="ecosystem-title text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-16 opacity-0">
            The <span className="brand-gradient">Ecosystem</span>
          </h2>

          <EcosystemCloud />
        </div>
      </section>

      {/* ===== BENEFITS SECTION ===== */}
      <section className="section-why-benefits flex items-center justify-center px-4 py-24">
        <div className="max-w-5xl mx-auto w-full">
          <h2 className="benefits-title text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-16 opacity-0">
            High-Impact <span className="text-solana-green">Benefits</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS_DATA.map((benefit, index) => (
              <div
                key={index}
                className={`benefit-card p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm text-center opacity-0 hover:border-${benefit.color}/50 transition-all duration-300 hover:-translate-y-1`}
              >
                <div className={`text-5xl md:text-6xl font-bold text-${benefit.color} mb-2`}>
                  <span className="benefit-stat" data-value={benefit.stat}>{benefit.stat}</span>
                  <span className="text-3xl">{benefit.unit}</span>
                </div>
                <div className="text-sm uppercase tracking-wider text-gray-400 mb-3">
                  {benefit.label}
                </div>
                <div className="text-gray-500 text-sm">
                  {benefit.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== USE CASES SECTION ===== */}
      <section className="section-why-usecases flex items-center justify-center px-4 py-24">
        <div className="max-w-5xl mx-auto w-full">
          <h2 className="usecases-title text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6">
            Real-World <span className="text-noir-orange">Use Cases</span>
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
            Privacy-preserving applications you can build today
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {USE_CASES_DATA.map((useCase, index) => (
              <div
                key={index}
                className="use-case-card p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm hover:border-solana-purple/50 transition-all duration-300 hover:-translate-y-1"
              >
                <h3 className="text-xl font-bold text-white mb-2">{useCase.title}</h3>
                <p className="text-gray-400">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ROADMAP SECTION ===== */}
      <section className="section-why-roadmap flex items-center justify-center px-4 py-24">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="roadmap-title text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-16">
            <span className="text-izi-cyan">Roadmap</span>
          </h2>

          <div className="roadmap-timeline relative">
            {/* Timeline line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-white/10 transform md:-translate-x-1/2" />

            <div className="space-y-8">
              {ROADMAP_DATA.map((item, index) => (
                <div
                  key={index}
                  className={`roadmap-item relative flex items-center gap-6 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Dot */}
                  <div
                    className={`roadmap-dot absolute left-6 md:left-1/2 w-4 h-4 rounded-full transform -translate-x-1/2 z-10 ${
                      item.status === 'done'
                        ? 'bg-solana-green'
                        : item.status === 'next'
                          ? 'bg-solana-purple'
                          : 'bg-white/20'
                    }`}
                  />

                  {/* Card */}
                  <div
                    className={`ml-12 md:ml-0 md:w-[calc(50%-2rem)] p-6 rounded-2xl border backdrop-blur-sm ${
                      item.status === 'done'
                        ? 'border-solana-green/30 bg-solana-green/5'
                        : item.status === 'next'
                          ? 'border-solana-purple/30 bg-solana-purple/5'
                          : 'border-white/10 bg-black/30'
                    } ${index % 2 === 0 ? 'md:mr-auto' : 'md:ml-auto'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-sm font-mono font-bold ${
                          item.status === 'done'
                            ? 'text-solana-green'
                            : item.status === 'next'
                              ? 'text-solana-purple'
                              : 'text-gray-500'
                        }`}
                      >
                        {item.version}
                      </span>
                      {item.status === 'done' && (
                        <svg className="w-4 h-4 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {item.status === 'next' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-solana-purple/20 text-solana-purple">
                          Next
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="section-why-cta py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="why-cta-title text-4xl md:text-5xl lg:text-6xl font-bold mb-10 opacity-0">
            Ready to add <span className="text-solana-green">privacy</span>?
          </h2>

          <div className="why-cta-buttons flex flex-col sm:flex-row gap-4 justify-center opacity-0">
            <Link to="/demo" className="btn-primary inline-flex items-center justify-center gap-3 text-lg">
              Try the Demo
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="https://github.com/francoperez03/izi-noir"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center justify-center gap-3 text-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
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
