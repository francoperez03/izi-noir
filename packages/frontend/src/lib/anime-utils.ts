import { animate, createTimeline, stagger, svg } from 'animejs';

const { createDrawable } = svg;

/**
 * Initialize all landing page animations
 */
export function initLandingAnimations() {
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Make everything visible without animation
    document.querySelectorAll('.hero-tagline, .hero-cta, .problem-message, .proof-title').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    document.querySelectorAll('.panel-js, .panel-noir, .panel-proof').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    document.querySelectorAll('.proof-cta').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    document.querySelectorAll('.workflow-title, .workflow-step, .features-title, .feature-card').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    return;
  }

  // Hero plays on load
  heroEntrySequence();

  // Scroll-triggered sections
  initScrollObservers();

  // Scroll-linked background
  initScrollBackground();

  // Button hover animations
  initButtonAnimations();
}

/**
 * Hero section entry animation
 */
function heroEntrySequence() {
  const brandText = document.querySelector('.brand-text');
  if (!brandText) return;

  // Wrap each character in a span
  const text = brandText.textContent || '';
  brandText.innerHTML = text.split('').map(char =>
    char === ' ' ? ' ' : `<span class="char">${char}</span>`
  ).join('');

  const chars = brandText.querySelectorAll('.char');

  const tl = createTimeline({
    defaults: { ease: 'outExpo' },
  });

  // Character reveal from center
  tl.add(chars, {
    opacity: [0, 1],
    translateY: [40, 0],
    filter: ['blur(8px)', 'blur(0px)'],
    delay: stagger(60, { from: 'center' }),
    duration: 800,
  }, 300);

  // Circuit lines draw - use createDrawable
  const circuitLines = document.querySelectorAll('.circuit-line');
  if (circuitLines.length > 0) {
    const drawables = createDrawable('.circuit-line');
    tl.add(drawables, {
      draw: ['0%', '100%'],
      duration: 1200,
      delay: stagger(100),
      ease: 'inOutQuad',
    }, '-=400');
  }

  // Tagline fade in
  tl.add('.hero-tagline', {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
  }, '-=600');

  // CTA button
  tl.add('.hero-cta', {
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: 400,
  }, '-=200');
}

/**
 * Initialize scroll-triggered animations
 */
function initScrollObservers() {
  // Problem section observer
  const problemSection = document.querySelector('.section-problem');
  if (problemSection) {
    const problemObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          problemAnimation();
          problemObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    problemObserver.observe(problemSection);
  }

  // Transformation section - scroll synced
  const transformSection = document.querySelector('.section-transformation');
  if (transformSection) {
    initTransformationScroll(transformSection as HTMLElement);
  }

  // Proof section observer
  const proofSection = document.querySelector('.section-proof');
  if (proofSection) {
    const proofObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          proofRevealAnimation();
          proofObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    proofObserver.observe(proofSection);
  }

  // Workflow section observer
  const workflowSection = document.querySelector('.section-workflow');
  if (workflowSection) {
    const workflowObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          workflowAnimation();
          workflowObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    workflowObserver.observe(workflowSection);
  }

  // Features section observer
  const featuresSection = document.querySelector('.section-features');
  if (featuresSection) {
    const featuresObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          featuresAnimation();
          featuresObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    featuresObserver.observe(featuresSection);
  }
}

/**
 * Problem section glitch animation
 */
function problemAnimation() {
  // Glitch effect on code
  animate('.problem-code', {
    translateX: [
      { to: -3, duration: 50 },
      { to: 3, duration: 50 },
      { to: -2, duration: 50 },
      { to: 2, duration: 50 },
      { to: 0, duration: 50 },
    ],
    opacity: [
      { to: 0.4, duration: 100 },
      { to: 0.8, duration: 100 },
      { to: 0.5, duration: 100 },
      { to: 0.7, duration: 100 },
    ],
    loop: 2,
    ease: 'inOutQuad',
  });

  // Overlay message fade in
  animate('.problem-message', {
    opacity: [0, 1],
    translateY: [40, 0],
    duration: 1000,
    delay: 500,
    ease: 'outExpo',
  });
}

/**
 * Transformation section scroll-synced animation (vanilla JS, no anime.js needed)
 */
function initTransformationScroll(container: HTMLElement) {
  const stickyContainer = container.querySelector('.sticky');
  if (!stickyContainer) return;

  let lastProgress = 0;

  const updateAnimation = () => {
    const rect = container.getBoundingClientRect();
    const containerHeight = container.offsetHeight;
    const viewportHeight = window.innerHeight;

    // Calculate scroll progress through this section (0 to 1)
    const scrollStart = rect.top;
    const scrollEnd = rect.bottom - viewportHeight;
    const scrollRange = containerHeight - viewportHeight;

    let progress = 0;
    if (scrollStart <= 0 && scrollEnd >= 0) {
      progress = Math.abs(scrollStart) / scrollRange;
    } else if (scrollEnd < 0) {
      progress = 1;
    }

    progress = Math.max(0, Math.min(1, progress));

    // Only update if progress changed significantly
    if (Math.abs(progress - lastProgress) < 0.005) return;
    lastProgress = progress;

    const panelJs = document.querySelector('.panel-js') as HTMLElement;
    const panelNoir = document.querySelector('.panel-noir') as HTMLElement;
    const panelProof = document.querySelector('.panel-proof') as HTMLElement;
    const flowLine1 = document.querySelector('.flow-line-1') as SVGPathElement;
    const flowLine2 = document.querySelector('.flow-line-2') as SVGPathElement;

    if (!panelJs || !panelNoir || !panelProof) return;

    // Calculate individual opacities based on progress
    let jsOpacity = 0.5;
    let noirOpacity = 0.5;
    let proofOpacity = 0.5;
    let line1Progress = 0;
    let line2Progress = 0;

    if (progress < 0.33) {
      // Phase 1: JS active
      const phase = progress / 0.33;
      jsOpacity = 0.5 + phase * 0.5;
      line1Progress = phase;
    } else if (progress < 0.66) {
      // Phase 2: Noir active
      const phase = (progress - 0.33) / 0.33;
      jsOpacity = 1 - phase * 0.4;
      noirOpacity = 0.5 + phase * 0.5;
      line1Progress = 1;
      line2Progress = phase;
    } else {
      // Phase 3: Proof active
      const phase = (progress - 0.66) / 0.34;
      jsOpacity = 0.6;
      noirOpacity = 1 - phase * 0.4;
      proofOpacity = 0.5 + phase * 0.5;
      line1Progress = 1;
      line2Progress = 1;
    }

    // Apply styles
    panelJs.style.opacity = String(jsOpacity);
    panelJs.style.borderColor = jsOpacity > 0.6 ? '#9945FF' : 'rgba(255,255,255,0.1)';

    panelNoir.style.opacity = String(noirOpacity);
    panelNoir.style.borderColor = noirOpacity > 0.6 ? '#FF6B35' : 'rgba(255,255,255,0.1)';

    panelProof.style.opacity = String(proofOpacity);
    panelProof.style.borderColor = proofOpacity > 0.6 ? '#14F195' : 'rgba(255,255,255,0.1)';

    // Animate flow lines
    if (flowLine1) {
      const length1 = flowLine1.getTotalLength();
      flowLine1.style.strokeDasharray = String(length1);
      flowLine1.style.strokeDashoffset = String(length1 * (1 - line1Progress));
    }
    if (flowLine2) {
      const length2 = flowLine2.getTotalLength();
      flowLine2.style.strokeDasharray = String(length2);
      flowLine2.style.strokeDashoffset = String(length2 * (1 - line2Progress));
    }
  };

  // Initial state
  document.querySelectorAll('.panel-js, .panel-noir, .panel-proof').forEach(el => {
    (el as HTMLElement).style.opacity = '0.5';
  });

  // Initialize flow lines
  document.querySelectorAll('.flow-line-1, .flow-line-2').forEach(el => {
    const path = el as SVGPathElement;
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
  });

  window.addEventListener('scroll', updateAnimation, { passive: true });
  updateAnimation();
}

/**
 * Proof section reveal animation
 */
function proofRevealAnimation() {
  const tl = createTimeline({ defaults: { ease: 'outExpo' } });

  // Initialize SVG drawables
  const checkmarkCircle = document.querySelector('.verified-checkmark circle');
  const checkmarkPath = document.querySelector('.verified-checkmark path');

  if (checkmarkCircle) {
    const circle = checkmarkCircle as SVGCircleElement;
    const circumference = 2 * Math.PI * parseFloat(circle.getAttribute('r') || '45');
    circle.style.strokeDasharray = String(circumference);
    circle.style.strokeDashoffset = String(circumference);

    tl.add(circle, {
      strokeDashoffset: [circumference, 0],
      duration: 800,
    });
  }

  if (checkmarkPath) {
    const path = checkmarkPath as SVGPathElement;
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);

    tl.add(path, {
      strokeDashoffset: [length, 0],
      duration: 600,
    }, '-=400');
  }

  // Title fade in
  tl.add('.proof-title', {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
  }, '-=300');

  // Stats counter animation
  const statNumbers = document.querySelectorAll('.stat-number');
  statNumbers.forEach((el, i) => {
    const target = parseInt((el as HTMLElement).dataset.value || '0', 10);
    const startVal = { val: 0 };

    tl.add(startVal, {
      val: target,
      duration: 1200,
      ease: 'outExpo',
      onUpdate: () => {
        el.textContent = String(Math.round(startVal.val));
      },
    }, i === 0 ? '-=200' : '-=1000');
  });

  // CTAs fade in
  tl.add('.proof-cta', {
    opacity: [0, 1],
    translateY: [15, 0],
    delay: stagger(100),
    duration: 400,
  }, '-=800');
}

/**
 * Scroll-linked background spotlight
 */
function initScrollBackground() {
  const updateBackground = () => {
    const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    const spotlightY = 20 + scrollPercent * 60;
    document.documentElement.style.setProperty('--scroll-y', `${spotlightY}%`);
  };

  window.addEventListener('scroll', updateBackground, { passive: true });
  updateBackground();
}

/**
 * Workflow section animation
 */
function workflowAnimation() {
  const tl = createTimeline({ defaults: { ease: 'outExpo' } });

  // Title fade in
  tl.add('.workflow-title', {
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
  });

  // Workflow steps stagger
  tl.add('.workflow-step', {
    opacity: [0, 1],
    translateY: [20, 0],
    delay: stagger(150),
    duration: 600,
  }, '-=400');

  // Arrows fade in
  tl.add('.workflow-arrow', {
    opacity: [0, 1],
    delay: stagger(150),
    duration: 300,
  }, '-=600');
}

/**
 * Features section animation
 */
function featuresAnimation() {
  const tl = createTimeline({ defaults: { ease: 'outExpo' } });

  // Title fade in
  tl.add('.features-title', {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
  });

  // Feature cards stagger from center
  tl.add('.feature-card', {
    opacity: [0, 1],
    translateY: [20, 0],
    delay: stagger(100, { from: 'center' }),
    duration: 500,
  }, '-=300');
}

/**
 * Initialize button hover animations
 */
function initButtonAnimations() {
  const buttons = document.querySelectorAll('.btn-primary');

  buttons.forEach((btn) => {
    const button = btn as HTMLElement;
    let isHovered = false;

    button.addEventListener('mouseenter', () => {
      if (isHovered) return;
      isHovered = true;

      // Animate gradient, scale, and shadow
      animate(button, {
        backgroundPosition: ['0% 0%', '100% 0%'],
        scale: [1, 1.02],
        boxShadow: [
          '0 10px 15px -3px rgba(153, 69, 255, 0.2)',
          '0 10px 20px -3px rgba(20, 241, 149, 0.3)',
        ],
        duration: 400,
        ease: 'outQuad',
      });
    });

    button.addEventListener('mouseleave', () => {
      if (!isHovered) return;
      isHovered = false;

      // Animate back
      animate(button, {
        backgroundPosition: ['100% 0%', '0% 0%'],
        scale: [1.02, 1],
        boxShadow: [
          '0 10px 20px -3px rgba(20, 241, 149, 0.3)',
          '0 10px 15px -3px rgba(153, 69, 255, 0.2)',
        ],
        duration: 300,
        ease: 'outQuad',
      });
    });
  });
}

/**
 * Cleanup function for unmounting
 */
export function cleanupAnimations() {
  // Remove scroll listeners would need to be tracked
  // For now, just a placeholder
}
