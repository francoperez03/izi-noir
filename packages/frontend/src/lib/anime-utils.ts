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
    document.querySelectorAll('.hood-title, .hood-card').forEach(el => {
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
    delay: stagger(40, { from: 'center' }),
    duration: 600,
  }, 100);

  // Circuit lines draw - use createDrawable
  const circuitLines = document.querySelectorAll('.circuit-line');
  if (circuitLines.length > 0) {
    const drawables = createDrawable('.circuit-line');
    tl.add(drawables, {
      draw: ['0%', '100%'],
      duration: 800,
      delay: stagger(80),
      ease: 'inOutQuad',
    }, '-=300');
  }

  // Tagline fade in
  tl.add('.hero-tagline', {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 400,
  }, '-=500');

  // CTA button - appears quickly after tagline
  tl.add('.hero-cta', {
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: 300,
  }, '-=300');
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

  // Hood section - card stack animation
  const hoodSection = document.querySelector('.section-hood');
  if (hoodSection) {
    initHoodStackAnimation(hoodSection as HTMLElement);
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
 * Hood section card stack animation
 */
function initHoodStackAnimation(container: HTMLElement) {
  const cardOrder = ['js', 'noir', 'acir', 'r1cs', 'proof'];
  const transformers = ['acorn', 'noir', 'arkworks', 'groth16'];
  let currentCard = 0;
  let isAnimating = false;

  // Get all cards
  const cards = cardOrder.map(name => container.querySelector(`.card-${name}`) as HTMLElement);
  const progressDots = container.querySelectorAll('.progress-dot');

  // Initial entry animation
  const entryTl = createTimeline({
    defaults: { ease: 'outExpo' },
  });

  // Title fade in
  entryTl.add('.hood-title', {
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
  });

  // Cards stagger in from bottom
  cardOrder.forEach((cardName, index) => {
    const offset = index * 15;
    entryTl.add(`.card-${cardName}`, {
      opacity: [0, 1],
      translateY: [60 + offset, offset],
      scale: [0.9, 1 - index * 0.03],
      duration: 500,
    }, index === 0 ? '-=400' : '-=400');
  });

  // Function to reveal next card
  function revealNextCard() {
    if (currentCard >= cardOrder.length - 1 || isAnimating) return;
    isAnimating = true;

    const currentEl = cards[currentCard];
    const transformerEl = container.querySelector(`.transformer-${transformers[currentCard]}`) as HTMLElement;

    const tl = createTimeline({
      defaults: { ease: 'outExpo' },
    });

    // 1. Current card flies away (up and to the right with rotation)
    tl.add(currentEl, {
      translateX: [0, 250],
      translateY: [currentCard * 15, -150],
      rotate: [0, 12],
      opacity: [1, 0],
      scale: [1, 0.85],
      duration: 500,
    });

    // 2. Transformer badge appears
    if (transformerEl) {
      tl.add(transformerEl, {
        opacity: [0, 1],
        scale: [0.7, 1],
        duration: 350,
      }, '-=250');

      // 3. Transformer badge fades out
      tl.add(transformerEl, {
        opacity: [1, 0],
        scale: [1, 1.15],
        duration: 250,
      }, '+=150');
    }

    // 4. Remaining cards shift up
    const remainingCards = cards.slice(currentCard + 1);
    remainingCards.forEach((card, i) => {
      if (!card) return;
      const newOffset = i * 15;
      const newScale = 1 - i * 0.03;
      tl.add(card, {
        translateY: newOffset,
        scale: newScale,
        duration: 350,
      }, transformerEl ? '-=250' : '-=200');
    });

    // 5. Update progress dots
    tl.call(() => {
      progressDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentCard + 1);
      });
      currentCard++;
      isAnimating = false;
    });
  }

  // Function to go back to previous card
  function revealPrevCard() {
    if (currentCard <= 0 || isAnimating) return;
    isAnimating = true;

    currentCard--;
    const cardEl = cards[currentCard];

    const tl = createTimeline({
      defaults: { ease: 'outExpo' },
    });

    // Bring card back
    tl.add(cardEl, {
      translateX: [250, 0],
      translateY: [-150, currentCard * 15],
      rotate: [12, 0],
      opacity: [0, 1],
      scale: [0.85, 1],
      duration: 500,
    });

    // Shift remaining cards back down
    const remainingCards = cards.slice(currentCard + 1);
    remainingCards.forEach((card, i) => {
      if (!card) return;
      const newOffset = (i + 1) * 15;
      const newScale = 1 - (i + 1) * 0.03;
      tl.add(card, {
        translateY: newOffset,
        scale: newScale,
        duration: 350,
      }, '-=400');
    });

    // Update progress dots
    tl.call(() => {
      progressDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentCard);
      });
      isAnimating = false;
    });
  }

  // Click handler for next card
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Don't trigger on progress dots
    if (target.classList.contains('progress-dot')) {
      const cardIndex = parseInt(target.dataset.card || '0', 10);
      while (currentCard < cardIndex) revealNextCard();
      while (currentCard > cardIndex) revealPrevCard();
      return;
    }
    revealNextCard();
  });

  // Scroll-based triggering
  let lastScrollProgress = 0;
  const thresholds = [0.25, 0.40, 0.55, 0.70];

  function onScroll() {
    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const sectionHeight = container.offsetHeight;

    // Calculate progress: 0 when section top enters, 1 when section bottom leaves
    const progress = Math.max(0, Math.min(1,
      (viewportHeight - rect.top) / (sectionHeight + viewportHeight * 0.5)
    ));

    // Forward transitions
    thresholds.forEach((threshold, i) => {
      if (lastScrollProgress < threshold && progress >= threshold && currentCard === i) {
        revealNextCard();
      }
    });

    // Backward transitions
    thresholds.forEach((threshold, i) => {
      if (lastScrollProgress >= threshold && progress < threshold && currentCard === i + 1) {
        revealPrevCard();
      }
    });

    lastScrollProgress = progress;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Set initial progress dot
  progressDots[0]?.classList.add('active');
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

  // Initialize and animate flow paths
  const flowPaths = document.querySelectorAll('.flow-path');
  if (flowPaths.length > 0) {
    flowPaths.forEach((path) => {
      const p = path as SVGPathElement;
      const length = p.getTotalLength();
      p.style.strokeDasharray = String(length);
      p.style.strokeDashoffset = String(length);
    });

    tl.add('.flow-path', {
      strokeDashoffset: 0,
      delay: stagger(150),
      duration: 400,
      ease: 'outQuad',
    }, '-=300');
  }

  // Arrows fade in (legacy, in case any remain)
  tl.add('.workflow-arrow', {
    opacity: [0, 1],
    delay: stagger(150),
    duration: 300,
  }, '-=600');
}

/**
 * 3D Tilt effect for workflow cards
 */
function initWorkflowCardTilt() {
  const cards = document.querySelectorAll('.workflow-step');

  cards.forEach((card) => {
    const el = card as HTMLElement;

    el.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 15;
      const rotateY = (centerX - x) / 15;

      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  });
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
