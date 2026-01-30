import { animate, createTimeline, stagger } from 'animejs';

/**
 * Initialize all Why page animations
 */
export function initWhyAnimations() {
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Make everything visible without animation
    document.querySelectorAll('.why-hero-title, .why-hero-subtitle, .why-hero-body').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    document.querySelectorAll('.problem-title, .comparison-table, .benefit-card, .ecosystem-title').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    document.querySelectorAll('.why-cta-title, .why-cta-buttons').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    return;
  }

  // Hero plays on load
  whyHeroAnimation();

  // Scroll-triggered sections
  initWhyScrollObservers();
}

/**
 * Why hero section entry animation
 */
function whyHeroAnimation() {
  const tl = createTimeline({
    defaults: { ease: 'outExpo' },
  });

  // Title fade in
  tl.add('.why-hero-title', {
    opacity: [0, 1],
    translateY: [40, 0],
    duration: 800,
  }, 100);

  // Subtitle fade in
  tl.add('.why-hero-subtitle', {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
  }, '-=500');

  // Body text fade in
  tl.add('.why-hero-body', {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
  }, '-=400');
}

/**
 * Initialize scroll-triggered animations for Why page
 */
function initWhyScrollObservers() {
  // Problem section observer
  const problemSection = document.querySelector('.section-why-problem');
  if (problemSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          problemSectionAnimation();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(problemSection);
  }

  // Ecosystem section observer
  const ecosystemSection = document.querySelector('.section-why-ecosystem');
  if (ecosystemSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ecosystemSectionAnimation();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(ecosystemSection);
  }

  // Benefits section observer
  const benefitsSection = document.querySelector('.section-why-benefits');
  if (benefitsSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          benefitsSectionAnimation();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(benefitsSection);
  }

  // CTA section observer
  const ctaSection = document.querySelector('.section-why-cta');
  if (ctaSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ctaSectionAnimation();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    observer.observe(ctaSection);
  }
}

/**
 * Problem section animation
 */
function problemSectionAnimation() {
  const tl = createTimeline({ defaults: { ease: 'outExpo' } });

  // Title fade in
  tl.add('.problem-title', {
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
  });

  // Comparison rows stagger
  tl.add('.comparison-row', {
    opacity: [0, 1],
    translateX: [-20, 0],
    delay: stagger(100),
    duration: 500,
  }, '-=400');
}

/**
 * Ecosystem section animation
 */
function ecosystemSectionAnimation() {
  const tl = createTimeline({ defaults: { ease: 'outExpo' } });

  // Title fade in
  tl.add('.ecosystem-title', {
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
  });

  // Cloud container scale in
  tl.add('.ecosystem-cloud-container', {
    opacity: [0, 1],
    scale: [0.9, 1],
    duration: 800,
  }, '-=400');

  // Animate center node pulse
  animateCenterPulse();
}

/**
 * Center node pulse animation
 */
function animateCenterPulse() {
  const glow = document.querySelector('.center-glow');
  if (!glow) return;

  animate(glow, {
    opacity: [0.3, 0.6, 0.3],
    scale: [1, 1.05, 1],
    duration: 3000,
    loop: true,
    ease: 'inOutSine',
  });
}

/**
 * Benefits section animation
 */
function benefitsSectionAnimation() {
  const tl = createTimeline({ defaults: { ease: 'outExpo' } });

  // Title fade in
  tl.add('.benefits-title', {
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
  });

  // Benefit cards stagger
  tl.add('.benefit-card', {
    opacity: [0, 1],
    translateY: [30, 0],
    delay: stagger(100, { from: 'center' }),
    duration: 600,
  }, '-=400');

  // Animate stat numbers
  const statNumbers = document.querySelectorAll('.benefit-stat');
  statNumbers.forEach((el) => {
    const target = (el as HTMLElement).dataset.value;
    if (!target || isNaN(parseInt(target, 10))) return;

    const targetNum = parseInt(target, 10);
    const startVal = { val: 0 };

    animate(startVal, {
      val: targetNum,
      duration: 1500,
      ease: 'outExpo',
      onUpdate: () => {
        el.textContent = String(Math.round(startVal.val));
      },
    });
  });
}

/**
 * CTA section animation
 */
function ctaSectionAnimation() {
  const tl = createTimeline({ defaults: { ease: 'outExpo' } });

  // Title fade in
  tl.add('.why-cta-title', {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
  });

  // Buttons fade in
  tl.add('.why-cta-buttons', {
    opacity: [0, 1],
    translateY: [15, 0],
    duration: 500,
  }, '-=300');
}

/**
 * Cleanup function for unmounting
 */
export function cleanupWhyAnimations() {
  // Placeholder for cleanup if needed
}
