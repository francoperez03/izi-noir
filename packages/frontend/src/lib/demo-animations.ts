import { animate, stagger } from 'animejs';

/**
 * Initialize demo page animations
 */
export function initDemoAnimations() {
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Make everything visible without animation
    document.querySelectorAll('.demo-hero-title, .demo-hero-subtitle, .demo-section-title').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    document.querySelectorAll('.workflow-step-vertical, .result-card, .demo-panel').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    return;
  }

  // Hero animation on load
  demoHeroAnimation();

  // Scroll observers for sections
  initDemoScrollObservers();
}

/**
 * Demo hero entry animation
 */
function demoHeroAnimation() {
  const title = document.querySelector('.demo-hero-title');
  if (!title) return;

  // Wrap characters
  const text = title.textContent || '';
  title.innerHTML = text.split('').map(char =>
    char === ' ' ? ' ' : `<span class="char">${char}</span>`
  ).join('');

  const chars = title.querySelectorAll('.char');

  // Animate characters
  animate(chars, {
    opacity: [0, 1],
    translateY: [30, 0],
    filter: ['blur(6px)', 'blur(0px)'],
    delay: stagger(40, { from: 'center' }),
    duration: 700,
    ease: 'outExpo',
  });

  // Subtitle and commands fade in
  animate('.demo-hero-subtitle', {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
    delay: stagger(200, { start: 400 }),
    ease: 'outExpo',
  });

  // Scroll indicator
  animate('.demo-scroll-indicator', {
    opacity: [0, 0.4],
    translateY: [10, 0],
    duration: 400,
    delay: 1000,
    ease: 'outExpo',
  });
}

/**
 * Initialize scroll-triggered animations
 */
function initDemoScrollObservers() {
  // Editor section
  observeSection('.demo-section-editor', () => {
    animate('.demo-section-title.editor-title', {
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      ease: 'outExpo',
    });

    animate('.circuit-explainer', {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      delay: 100,
      ease: 'outExpo',
    });

    animate('.workflow-step-vertical', {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: stagger(150, { start: 200 }),
      duration: 600,
      ease: 'outExpo',
    });
  });

  // Deploy section
  observeSection('.demo-section-deploy', () => {
    animate('.demo-section-title.deploy-title', {
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      ease: 'outExpo',
    });

    animate('.deploy-panel, .verify-panel', {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: stagger(100, { start: 200 }),
      duration: 600,
      ease: 'outExpo',
    });
  });
}

/**
 * Helper to observe a section and trigger animation once
 */
function observeSection(selector: string, callback: () => void) {
  const section = document.querySelector(selector);
  if (!section) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  observer.observe(section);
}

/**
 * Animate proof generation progress
 */
export function animateProofProgress(duration: number = 2000) {
  return animate('.proof-progress-fill', {
    width: ['0%', '100%'],
    duration,
    ease: 'linear',
  });
}

/**
 * Animate proof results appearing
 */
export function animateProofResults() {
  return animate('.proof-result-card', {
    opacity: [0, 1],
    translateY: [10, 0],
    scale: [0.98, 1],
    delay: stagger(100),
    duration: 500,
    ease: 'outExpo',
  });
}

/**
 * Animate counter from 0 to target value
 */
export function animateCounter(
  element: HTMLElement,
  targetValue: number,
  duration: number = 1000,
  suffix: string = ''
) {
  const obj = { val: 0 };
  return animate(obj, {
    val: [0, targetValue],
    duration,
    ease: 'outExpo',
    onUpdate: () => {
      element.textContent = Math.round(obj.val) + suffix;
    },
  });
}

/**
 * Animate checkmark SVG drawing
 */
export function animateCheckmark(selector: string) {
  const path = document.querySelector(`${selector} path`) as SVGPathElement;
  if (!path) return;

  const length = path.getTotalLength();
  path.style.strokeDasharray = String(length);
  path.style.strokeDashoffset = String(length);

  return animate(path, {
    strokeDashoffset: [length, 0],
    duration: 600,
    ease: 'outExpo',
  });
}

/**
 * Animate success pulse effect
 */
export function animateSuccessPulse(selector: string) {
  return animate(selector, {
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 0 0 rgba(20, 241, 149, 0)',
      '0 0 30px 10px rgba(20, 241, 149, 0.2)',
      '0 0 0 0 rgba(20, 241, 149, 0)',
    ],
    duration: 800,
    ease: 'outExpo',
  });
}

/**
 * Animate step completion
 */
export function animateStepComplete(stepElement: HTMLElement) {
  return animate(stepElement, {
    opacity: [0.5, 1],
    scale: [0.98, 1],
    duration: 300,
    ease: 'outExpo',
  });
}

/**
 * Animate error shake
 */
export function animateError(selector: string) {
  return animate(selector, {
    translateX: [
      { to: -8, duration: 50 },
      { to: 8, duration: 50 },
      { to: -6, duration: 50 },
      { to: 6, duration: 50 },
      { to: 0, duration: 50 },
    ],
    ease: 'inOutQuad',
  });
}

/**
 * Animate copy button feedback
 */
export function animateCopySuccess(button: HTMLElement) {
  return animate(button, {
    scale: [1, 1.1, 1],
    duration: 300,
    ease: 'outExpo',
  });
}

/**
 * Cleanup function
 */
export function cleanupDemoAnimations() {
  // Placeholder for cleanup if needed
}
