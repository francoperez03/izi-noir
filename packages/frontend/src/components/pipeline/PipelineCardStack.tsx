import { useRef, useState } from 'react';
import { animate } from 'animejs';

interface Stage {
  id: string;
  label: string;
  color: string;
  code: string | null;
  visual: string | null;
  explanation: string;
}

const stages: Stage[] = [
  {
    id: 'js',
    label: 'JavaScript',
    color: '#00D4FF', // Cyan
    code: `([expected], [secret]) => {\n  assert(secret * secret == expected);\n}`,
    visual: null,
    explanation: 'Your function with privacy assertions. Public inputs in first array, private in second.',
  },
  {
    id: 'noir',
    label: 'Noir',
    color: '#9945FF', // Purple
    code: `fn main(secret: Field, expected: pub Field) {\n    assert(secret * secret == expected);\n}`,
    visual: null,
    explanation: 'Transpiled to Noir, a domain-specific language for ZK circuits. Fields are finite field elements.',
  },
  {
    id: 'acir',
    label: 'ACIR',
    color: '#FF6B35', // Orange
    code: null,
    visual: '1 opcode • 3 witnesses',
    explanation: 'Abstract Circuit IR - platform-agnostic bytecode that can target multiple proving backends.',
  },
  {
    id: 'r1cs',
    label: 'R1CS',
    color: '#FFD700', // Gold (unique color)
    code: null,
    visual: 'A·x ⊙ B·x = C·x',
    explanation: 'Rank-1 Constraint System - the mathematical form. Each constraint: (A·x) * (B·x) = (C·x)',
  },
  {
    id: 'proof',
    label: 'ZK Proof',
    color: '#14F195', // Green
    code: null,
    visual: '256 bytes',
    explanation: 'Final Groth16 proof. Constant size regardless of circuit complexity. Verifiable on Solana.',
  },
];

const transformers = [
  { name: 'Acorn Parser', description: 'Parses JavaScript AST and extracts assert() statements' },
  { name: 'Noir WASM', description: 'Compiles Noir DSL to Abstract Circuit IR' },
  { name: 'Arkworks', description: 'Converts ACIR to R1CS constraint system' },
  { name: 'Groth16', description: 'Generates succinct zk-SNARK proof on BN254 curve' },
];

interface DragState {
  isDragging: boolean;
  startX: number;
  currentX: number;
}

export function PipelineCardStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [showTransformer, setShowTransformer] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    currentX: 0,
  });

  const advance = () => {
    if (isAnimating || currentStage >= stages.length - 1) return;
    setIsAnimating(true);

    const currentCard = containerRef.current?.querySelector(`.stack-card-${stages[currentStage].id}`);

    // Show transformer
    setShowTransformer(true);

    // Animate current card flying away
    if (currentCard) {
      animate(currentCard, {
        translateX: [0, 250],
        translateY: [0, -60],
        rotate: [0, 15],
        opacity: [1, 0],
        scale: [1, 0.9],
        duration: 500,
        ease: 'outExpo',
        onComplete: () => {
          setTimeout(() => {
            setShowTransformer(false);
            setCurrentStage((prev) => prev + 1);
            setIsAnimating(false);
          }, 600);
        },
      });
    }
  };

  const reset = () => {
    if (isAnimating || currentStage === 0) return;
    setIsAnimating(true);

    // Reset all cards to initial state
    stages.forEach((stage) => {
      const card = containerRef.current?.querySelector(`.stack-card-${stage.id}`);
      if (card) {
        animate(card, {
          translateX: 0,
          translateY: 0,
          rotate: 0,
          opacity: 1,
          scale: 1,
          duration: 400,
          ease: 'outExpo',
        });
      }
    });

    setTimeout(() => {
      setCurrentStage(0);
      setIsAnimating(false);
    }, 400);
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isAnimating) return;
    setDragState({ isDragging: true, startX: e.clientX, currentX: e.clientX });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    setDragState((prev) => ({ ...prev, currentX: e.clientX }));
  };

  const handlePointerUp = () => {
    if (!dragState.isDragging) return;

    const deltaX = dragState.currentX - dragState.startX;
    const threshold = 80;

    if (deltaX > threshold && currentStage < stages.length - 1) {
      advance();
    } else if (deltaX < -threshold && currentStage > 0) {
      reset();
    }

    setDragState({ isDragging: false, startX: 0, currentX: 0 });
  };

  const stage = stages[currentStage];
  const transformer = currentStage < transformers.length ? transformers[currentStage] : null;
  const dragOffset = dragState.isDragging ? dragState.currentX - dragState.startX : 0;

  return (
    <div ref={containerRef} className="card-stack-container relative min-h-[500px] w-full flex flex-col items-center justify-center py-8">
      {/* Card Stack */}
      <div className="relative w-full max-w-lg h-[320px]">
        {stages.map((s, i) => {
          const isVisible = i >= currentStage;
          const isActive = i === currentStage;

          // Calculate transform based on drag state
          let cardTransform = '';
          if (isActive && dragState.isDragging) {
            cardTransform = `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`;
          } else if (isVisible) {
            cardTransform = 'translateY(0) scale(1)';
          } else {
            cardTransform = 'translateY(-100px) translateX(250px) rotate(15deg) scale(0.9)';
          }

          return (
            <div
              key={s.id}
              className={`stack-card-${s.id} absolute inset-0 rounded-2xl border p-6 select-none`}
              onPointerDown={isActive ? handlePointerDown : undefined}
              onPointerMove={isActive ? handlePointerMove : undefined}
              onPointerUp={isActive ? handlePointerUp : undefined}
              onPointerCancel={isActive ? handlePointerUp : undefined}
              style={{
                borderColor: isActive ? s.color : 'rgba(255,255,255,0.1)',
                backgroundColor: '#050505', // Solid, matches landing
                boxShadow: isActive ? `0 0 40px ${s.color}40` : 'none',
                transform: cardTransform,
                opacity: isVisible ? 1 : 0,
                zIndex: stages.length - i,
                pointerEvents: isActive ? 'auto' : 'none',
                cursor: isActive ? (dragState.isDragging ? 'grabbing' : 'grab') : 'default',
                touchAction: 'none',
              }}
            >
              {/* Stage label */}
              <div
                className="text-xs uppercase tracking-widest mb-4 font-bold"
                style={{ color: s.color }}
              >
                {s.label}
              </div>

              {/* Content - Code or Visual */}
              {s.code ? (
                <pre
                  className="text-sm font-mono whitespace-pre-wrap leading-relaxed mb-4 p-4 rounded-lg bg-white/5"
                  style={{ color: s.color }}
                >
                  {s.code}
                </pre>
              ) : (
                <div className="text-center py-6 mb-4">
                  <div
                    className="text-3xl font-bold font-mono mb-2"
                    style={{ color: s.color }}
                  >
                    {s.visual}
                  </div>
                </div>
              )}

              {/* Explanation */}
              <p className="text-gray-400 text-sm leading-relaxed">
                {s.explanation}
              </p>

              {/* Final stage badges */}
              {isActive && currentStage === stages.length - 1 && (
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <span className="px-3 py-1 text-xs bg-solana-green/10 text-solana-green rounded-lg border border-solana-green/30">
                    Groth16
                  </span>
                  <span className="px-3 py-1 text-xs bg-solana-green/10 text-solana-green rounded-lg border border-solana-green/30">
                    Solana-ready
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Transformer overlay */}
        {showTransformer && transformer && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl pointer-events-none"
            style={{ zIndex: 100 }}
          >
            <div
              className="px-8 py-4 rounded-xl font-mono text-center border-2 animate-pulse"
              style={{
                borderColor: stage.color,
                color: stage.color,
                boxShadow: `0 0 40px ${stage.color}50`,
              }}
            >
              <div className="text-lg font-bold mb-2">{transformer.name}</div>
              <div className="text-xs text-gray-400">{transformer.description}</div>
            </div>
          </div>
        )}
      </div>

      {/* Stage progress indicator */}
      <div className="text-center mt-8 mb-4">
        <span
          className="text-lg font-bold"
          style={{ color: stages[currentStage].color }}
        >
          {stages[currentStage].label}
        </span>
        <span className="text-gray-600 mx-2">→</span>
        <span className="text-gray-400">
          {currentStage < stages.length - 1
            ? stages[currentStage + 1].label
            : 'Complete!'}
        </span>
      </div>

      {/* Drag hint */}
      <p className="text-gray-600 text-sm mb-4">
        Drag card right to transform, or use buttons below
      </p>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={reset}
          disabled={currentStage === 0 || isAnimating}
          className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors border border-white/10 rounded-lg hover:border-white/30 disabled:hover:border-white/10"
        >
          ← Reset
        </button>

        {/* Stage counter */}
        <span className="text-gray-500 text-sm font-mono min-w-[60px] text-center">
          {currentStage + 1} / {stages.length}
        </span>

        <button
          onClick={advance}
          disabled={currentStage === stages.length - 1 || isAnimating}
          className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-colors border border-white/10 rounded-lg hover:border-white/30 disabled:hover:border-white/10"
        >
          Transform →
        </button>
      </div>

      {/* Stage dots */}
      <div className="flex gap-2 mt-4">
        {stages.map((s, i) => (
          <div
            key={s.id}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentStage ? 'w-6' : 'w-2'
            }`}
            style={{
              backgroundColor: i <= currentStage ? s.color : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
