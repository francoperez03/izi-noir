import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { animate } from 'animejs';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/why', label: 'Why' },
  { to: '/demo', label: 'Demo' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const underlineRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animate underline on route change
  useEffect(() => {
    const activeIndex = NAV_LINKS.findIndex(link => link.to === location.pathname);
    underlineRefs.current.forEach((ref, index) => {
      if (!ref) return;
      if (index === activeIndex) {
        animate(ref, {
          scaleX: [0, 1],
          opacity: [0, 0.6],
          duration: 300,
          ease: 'outQuad',
        });
      } else {
        animate(ref, {
          scaleX: 0,
          opacity: 0,
          duration: 200,
          ease: 'outQuad',
        });
      }
    });
  }, [location.pathname]);

  const handleMouseEnter = (index: number) => {
    const ref = underlineRefs.current[index];
    if (!ref) return;
    const isActive = NAV_LINKS[index].to === location.pathname;
    if (!isActive) {
      animate(ref, {
        scaleX: [0, 1],
        opacity: [0, 0.4],
        duration: 250,
        ease: 'outQuad',
      });
    }
  };

  const handleMouseLeave = (index: number) => {
    const ref = underlineRefs.current[index];
    if (!ref) return;
    const isActive = NAV_LINKS[index].to === location.pathname;
    if (!isActive) {
      animate(ref, {
        scaleX: 0,
        opacity: 0,
        duration: 200,
        ease: 'outQuad',
      });
    }
  };

  return (
    <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Desktop Navigation - Centered */}
        <nav className="navbar-nav-desktop">
          {NAV_LINKS.map((link, index) => (
            <Link
              key={link.to}
              to={link.to}
              className="nav-link"
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={() => handleMouseLeave(index)}
            >
              <span className="nav-link-text">{link.label}</span>
              <span
                ref={el => underlineRefs.current[index] = el}
                className="nav-link-underline"
              />
            </Link>
          ))}
        </nav>

        {/* Mobile Hamburger */}
        <button
          className={`navbar-hamburger ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      {/* Mobile Navigation */}
      <nav className={`navbar-nav-mobile ${isOpen ? 'open' : ''}`}>
        {NAV_LINKS.map((link, index) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link-mobile ${location.pathname === link.to ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
