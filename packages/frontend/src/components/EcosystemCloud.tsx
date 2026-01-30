import { useState, useEffect } from 'react';
import { animate } from 'animejs';

interface EcosystemNode {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const ECOSYSTEM_NODES: EcosystemNode[] = [
  {
    id: 'sdk',
    label: 'SDK',
    description: 'Add privacy in 4 lines of code',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'cli',
    label: 'CLI',
    description: 'Scaffold projects in seconds',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'verifier',
    label: 'Verifier',
    description: 'On-chain verification',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'demo',
    label: 'Demo',
    description: 'Try before you integrate',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'skills',
    label: 'AI Skills',
    description: 'Best practices for circuit design',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function EcosystemCloud() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    // Animate nodes on mount
    animate('.ecosystem-node-card', {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: (_el: unknown, i: number) => i * 100,
      duration: 600,
      ease: 'outExpo',
    });
  }, []);

  const handleMouseEnter = (nodeId: string) => {
    setHoveredNode(nodeId);
    const el = document.querySelector(`[data-node="${nodeId}"]`);
    if (el) {
      animate(el, {
        scale: 1.05,
        duration: 200,
        ease: 'outQuad',
      });
    }
  };

  const handleMouseLeave = (nodeId: string) => {
    setHoveredNode(null);
    const el = document.querySelector(`[data-node="${nodeId}"]`);
    if (el) {
      animate(el, {
        scale: 1,
        duration: 200,
        ease: 'outQuad',
      });
    }
  };

  const renderNode = (node: EcosystemNode) => {
    const isHovered = hoveredNode === node.id;

    return (
      <div
        key={node.id}
        data-node={node.id}
        className={`ecosystem-node-card ${isHovered ? 'hovered' : ''}`}
        onMouseEnter={() => handleMouseEnter(node.id)}
        onMouseLeave={() => handleMouseLeave(node.id)}
      >
        <div className="node-icon">{node.icon}</div>
        <div className="node-content">
          <div className="node-label">{node.label}</div>
          <div className="node-description">{node.description}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="ecosystem-grid">
      {/* Center branding */}
      <div className="ecosystem-center">
        <div className="center-badge">
          <span className="center-label">IZI-NOIR</span>
          <span className="center-sublabel">Toolkit</span>
        </div>
      </div>

      {/* Node cards */}
      <div className="ecosystem-nodes">
        {ECOSYSTEM_NODES.map(renderNode)}
      </div>
    </div>
  );
}
