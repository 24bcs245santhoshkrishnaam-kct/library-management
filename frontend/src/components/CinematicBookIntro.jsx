import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, BookOpen, ShieldCheck, GraduationCap, Settings, CheckCircle2 } from 'lucide-react';

/**
 * Shared Cinematic 3D Book Animation
 *
 * Supports 3 modes across the entire website:
 * 1. mode="intro" (Default): Full cinematic sequence for website opening, revealing "KCT AI SMART LIBRARY".
 * 2. mode="login-transition": Smooth book-opening transition into Student/Librarian/Admin dashboards.
 * 3. mode="logout-transition": Reverse book-closing animation returning securely to the login portal.
 *
 * Includes Skip Intro button, reduced-motion detection, and session caching.
 */
export default function CinematicBookIntro({ mode = 'intro', role = 'student', onComplete }) {
  const [animStage, setAnimStage] = useState(mode === 'logout-transition' ? 0 : 0);
  const [skipped, setSkipped] = useState(false);
  const canvasRef = useRef(null);

  // Handle Skip
  const handleSkip = () => {
    setSkipped(true);
    if (mode === 'intro') {
      try {
        sessionStorage.setItem('smart_library_intro_watched', 'true');
      } catch (e) {}
    }
    if (onComplete) onComplete();
  };

  // Timeline sequences depending on mode
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      handleSkip();
      return;
    }

    let timers = [];
    let completed = false;

    const safeComplete = () => {
      if (completed) return;
      completed = true;
      if (mode === 'intro') {
        try {
          sessionStorage.setItem('smart_library_intro_watched', 'true');
        } catch (e) {}
      }
      if (onComplete) onComplete();
    };

    if (mode === 'logout-transition') {
      // LOGOUT: Book closes in reverse
      timers.push(setTimeout(() => setAnimStage(1), 250));
      timers.push(setTimeout(() => setAnimStage(2), 650));
      timers.push(setTimeout(() => setAnimStage(3), 1050));
      timers.push(setTimeout(() => safeComplete(), 1550));
      // Failsafe timer
      timers.push(setTimeout(() => safeComplete(), 2000));
    } else if (mode === 'login-transition') {
      // LOGIN: Snappy opening transition into dashboard (~1.8s)
      timers.push(setTimeout(() => setAnimStage(2), 150));  // Cover opens
      timers.push(setTimeout(() => setAnimStage(3), 500));  // Pages fan & light blooms
      timers.push(setTimeout(() => setAnimStage(4), 950));  // Glow & Title emerge
      timers.push(setTimeout(() => setAnimStage(5), 1400)); // Zoom into dashboard
      timers.push(setTimeout(() => safeComplete(), 1800));
      // Failsafe timer
      timers.push(setTimeout(() => safeComplete(), 2400));
    } else {
      // INITIAL OPENING INTRO: Full cinematic narrative sequence (~5.2s)
      timers.push(setTimeout(() => setAnimStage(1), 300));   // Tilt forward
      timers.push(setTimeout(() => setAnimStage(2), 1100));  // Cover hinges open
      timers.push(setTimeout(() => setAnimStage(3), 1900));  // Pages turn with curl
      timers.push(setTimeout(() => setAnimStage(4), 2800));  // Golden light blooms & KCT AI title emerges
      timers.push(setTimeout(() => setAnimStage(5), 4400));  // Camera zoom-in
      timers.push(setTimeout(() => {
        setAnimStage(6);
        safeComplete();
      }, 5200));
      // Failsafe timer
      timers.push(setTimeout(() => safeComplete(), 6000));
    }

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [mode]);

  // Floating ambient canvas particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Ethereal golden & teal dust particles
    const particleCount = mode === 'intro' ? 45 : 30;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 2.2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.8 - 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      hue: Math.random() > 0.4 ? 42 : 175 // Gold or Teal
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${p.hue}, 95%, 60%, 0.8)`;
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode]);

  if (skipped) return null;

  const isLogout = mode === 'logout-transition';

  return (
    <div className={`cinematic-intro-wrapper ${animStage >= 5 && mode !== 'logout-transition' ? 'stage-push' : ''}`}>
      {/* Background Ambience & Canvas */}
      <canvas ref={canvasRef} className="cinematic-particles-canvas" />

      {/* Floating Radial Backlight Spot */}
      <div className={`cinematic-backlight ${(animStage >= 4 || (mode === 'login-transition' && animStage >= 3)) ? 'bloom-bright' : ''}`} />

      {/* Skip Intro Button */}
      <button 
        type="button" 
        className="cinematic-skip-btn" 
        onClick={handleSkip}
        title={mode === 'intro' ? "Skip intro animation" : "Proceed immediately"}
      >
        <span>{mode === 'intro' ? 'Skip Intro' : 'Skip Animation'}</span>
        <ArrowRight size={14} />
      </button>

      {/* Brand Header */}
      <div className="cinematic-brand-header">
        <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
          <BookOpen size={20} className="text-teal-400" />
          <span className="fw-bold text-white letter-spacing-1" style={{ letterSpacing: '0.12em' }}>
            KCT AI SMART LIBRARY
          </span>
        </div>
        <p className="text-white-50 small mb-0">Autonomous Academic Knowledge Center • Kumaraguru College of Technology</p>
      </div>

      {/* 3D Scene Viewport */}
      <div className="cinematic-3d-viewport">
        <div 
          className={`cinematic-book-container 
            ${!isLogout && animStage >= 1 ? 'stage-tilt' : ''} 
            ${!isLogout && animStage >= 2 ? 'stage-open' : ''} 
            ${!isLogout && animStage >= 5 ? 'stage-zoom' : ''}
            ${isLogout ? (animStage === 0 ? 'stage-open' : animStage === 1 ? 'stage-closing-pages' : 'stage-closed-flat') : ''}
          `}
        >
          {/* Realistic 3D Soft Shadow underneath */}
          <div className="cinematic-book-shadow" />

          {/* Book Spine (Left edge) */}
          <div className="book-spine">
            <div className="spine-rib spine-rib-1" />
            <div className="spine-rib spine-rib-2" />
            <div className="spine-title">KCT AI SMART LIBRARY • 2026</div>
            <div className="spine-rib spine-rib-3" />
            <div className="spine-rib spine-rib-4" />
          </div>

          {/* Back Hardcover */}
          <div className="book-cover-back" />

          {/* Page Edges Block (Top, Right, Bottom thickness) */}
          <div className="book-page-block-right" />
          <div className="book-page-block-top" />
          <div className="book-page-block-bottom" />

          {/* Right Base Page (Inside right cover) */}
          <div className="book-inside-right">
            <div className="inside-page-content">
              <div className="page-header-line">
                <span>SECTION I</span>
                <span>CURRICULUM ARCHIVE</span>
              </div>
              <h5 className="page-inner-title">Autonomous Knowledge Hub</h5>
              <p className="page-inner-text">
                Welcome to the digital gateway of KCT AI Smart Library. Explore 625+ peer-reviewed engineering textbooks, classical Shakespeare works, and ancient Sangam Tamil literature.
              </p>
              <div className="page-ornament-divider">✦ ✦ ✦</div>
              <div className="page-signature-stamp">
                <span className="stamp-badge">VERIFIED KCT REPOSITORY</span>
                <span className="stamp-date">OCTOBER 2026 • AUTONOMOUS ARCHIVE</span>
              </div>
            </div>
            {/* Inner Golden Radiance when book opens */}
            <div className={`inside-golden-glow ${((!isLogout && animStage >= 4) || (mode === 'login-transition' && animStage >= 3)) ? 'glow-active' : ''}`} />
          </div>

          {/* Flipping Page 3 */}
          <div className={`flipping-page page-layer-3 ${(!isLogout && animStage >= 3) || (isLogout && animStage === 0) ? 'flip-3' : ''}`}>
            <div className="page-face page-face-front">
              <div className="page-mini-diagram" />
              <div className="page-mock-text">
                <div className="line-bar w-75" />
                <div className="line-bar w-100" />
                <div className="line-bar w-90" />
                <div className="line-bar w-60" />
              </div>
            </div>
            <div className="page-face page-face-back">
              <div className="page-mock-text">
                <div className="line-bar w-80" />
                <div className="line-bar w-95" />
                <div className="line-bar w-70" />
              </div>
            </div>
          </div>

          {/* Flipping Page 2 */}
          <div className={`flipping-page page-layer-2 ${(!isLogout && animStage >= 3) || (isLogout && animStage === 0) ? 'flip-2' : ''}`}>
            <div className="page-face page-face-front">
              <div className="page-mock-text">
                <div className="line-bar w-85" />
                <div className="line-bar w-100" />
                <div className="line-bar w-65" />
              </div>
            </div>
            <div className="page-face page-face-back">
              <div className="page-mock-text">
                <div className="line-bar w-90" />
                <div className="line-bar w-80" />
                <div className="line-bar w-50" />
              </div>
            </div>
          </div>

          {/* Flipping Page 1 */}
          <div className={`flipping-page page-layer-1 ${(!isLogout && animStage >= 3) || (isLogout && animStage === 0) ? 'flip-1' : ''}`}>
            <div className="page-face page-face-front">
              <div className="page-title-front">CURRICULUM INDEX</div>
              <div className="page-mock-text">
                <div className="line-bar w-100" />
                <div className="line-bar w-85" />
                <div className="line-bar w-90" />
              </div>
            </div>
            <div className="page-face page-face-back">
              <div className="page-mock-text">
                <div className="line-bar w-75" />
                <div className="line-bar w-85" />
              </div>
            </div>
          </div>

          {/* Front Hardcover with Realistic Hinge */}
          <div className={`book-cover-front ${(!isLogout && animStage >= 2) || (isLogout && animStage < 2) ? 'cover-hinge-open' : 'cover-hinge-shut'}`}>
            <div className="cover-leather-texture">
              {/* Gold Foil Embossed Border */}
              <div className="cover-gold-border">
                <div className="corner-filigree corner-tl" />
                <div className="corner-filigree corner-tr" />
                <div className="corner-filigree corner-bl" />
                <div className="corner-filigree corner-br" />

                {/* College Crest */}
                <div className="cover-crest">
                  <div className="crest-outer-circle">
                    <BookOpen size={32} className="crest-icon" />
                  </div>
                  <div className="crest-stars">★★★</div>
                </div>

                {/* Gilded Book Titles */}
                <div className="cover-typography">
                  <span className="cover-eyebrow">AUTONOMOUS KNOWLEDGE CENTER</span>
                  <h2 className="cover-main-title">KCT AI SMART LIBRARY</h2>
                  <span className="cover-sub-title">CENTRAL DIGITAL CATALOGUE</span>
                </div>

                <div className="cover-bottom-seal">
                  <span>KUMARAGURU COLLEGE OF TECHNOLOGY • EST. 1984</span>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURE 3: Words "KCT AI SMART LIBRARY" emerging from glowing open pages */}
          {((!isLogout && animStage >= 4) || (mode === 'login-transition' && animStage >= 3)) && (
            <div className="emerging-title-container">
              <div className="emerging-title-eyebrow">
                {mode === 'login-transition' ? (
                  role === 'student' ? 'STUDENT BORROWER PORTAL' : role === 'librarian' ? 'HEAD LIBRARIAN PORTAL' : 'ADMINISTRATOR CONSOLE'
                ) : (
                  'AUTONOMOUS ACADEMIC KNOWLEDGE CENTER'
                )}
              </div>
              <h1 className="emerging-title-text">KCT AI SMART LIBRARY</h1>
              <div className="emerging-title-sub">Kumaraguru College of Technology</div>
            </div>
          )}

        </div>
      </div>

      {/* Progress status caption */}
      <div className="cinematic-caption-box">
        <Sparkles size={14} className="text-teal-400 animate-spin-slow" />
        <span className="text-white small fw-medium">
          {mode === 'logout-transition' && (
            animStage < 2 ? 'Securing session & closing knowledge archive...' : 'Returning to KCT AI Smart Library Sign In...'
          )}
          {mode === 'login-transition' && (
            animStage < 4 ? `Authenticating ${role.toUpperCase()} credentials...` : `Accessing ${role.toUpperCase()} Workspace...`
          )}
          {mode === 'intro' && (
            animStage < 2 ? 'Opening Kumaraguru Autonomous Repository...' :
            animStage >= 2 && animStage < 4 ? 'Retrieving Curriculum Archives & AI Catalog...' :
            'Entering KCT AI Smart Library...'
          )}
        </span>
      </div>
    </div>
  );
}
