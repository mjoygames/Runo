/**
 * Runo! — runo.js
 * Modules:
 *  1. Navbar scroll state
 *  2. Fade-up reveal (IntersectionObserver)
 *  3. Showcase — scroll-driven text rotation + card highlight
 *     - Character-by-character title animation
 *     - Description fade
 *     - Progress bar fill
 *     - Dot indicators
 *     - Card active state + color theming
 *  4. Smooth scroll offset
 */

(() => {
  'use strict';

  /* ── Helpers ──────────────────────────────────────────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  /* ── 1. Navbar ─────────────────────────────────────────── */
  const navbar = $('#navbar');
  if (navbar) {
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── 2. Fade-up reveal ─────────────────────────────────── */
  const fadeEls = $$('.fade-up');
  if (fadeEls.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(el => io.observe(el));
  }

  /* ── 3. Showcase ───────────────────────────────────────── */
  const slots      = $$('.card-slot');
  const panelTitle = $('#panelTitle');
  const panelDesc  = $('#panelDesc');
  const progFill   = $('#progFill');
  const progLabel  = $('#progLabel');
  const dotNav     = $('#dotNav');
  const panelLine  = $('#panelLine');
  const cards      = $$('.feat-card');

  if (!slots.length || !panelTitle) return;

  /* Read data from DOM so HTML is the single source of truth */
  const slides = slots.map(slot => ({
    index: parseInt(slot.dataset.index, 10),
    color: slot.dataset.color || '#7C3AED',
    title: slot.dataset.title || '',
    desc:  slot.dataset.desc  || '',
  }));

  const total = slides.length;
  let current = -1;
  let titleTimer = null;

  /* Build dots */
  slides.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'dot';
    btn.setAttribute('aria-label', `Característica ${i + 1}`);
    btn.addEventListener('click', () => {
      /* Scroll the matching card into center view */
      slots[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    dotNav.appendChild(btn);
  });
  const dots = $$('.dot', dotNav);

  /* ── Char-by-char title animation ─────────────────────── */
  function animateTitle(text, color) {
    /* Cancel any pending timers from previous call */
    clearTimeout(titleTimer);

    /* Segment text (supports emoji / unicode) */
    const chars = typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? Array.from(new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(text), s => s.segment)
      : Array.from(text);

    /* Build spans */
    panelTitle.innerHTML = '';
    chars.forEach((ch, i) => {
      const span = document.createElement('span');
      if (ch === ' ') {
        span.className = 'c sp';
        span.innerHTML = '&nbsp;';
      } else {
        span.className = 'c';
        span.textContent = ch;
        /* Stagger: 26ms per char, capped at 360ms total */
        span.style.transitionDelay = `${Math.min(i * 26, 360)}ms`;
      }
      panelTitle.appendChild(span);
    });

    /* Apply color to accent elements */
    panelTitle.style.color = color;
    if (panelLine) {
      panelLine.style.background = color;
      panelLine.style.boxShadow = `0 0 12px ${color}88`;
      panelLine.style.width = '4rem';
    }
    if (progFill) {
      progFill.style.background = color;
      progFill.style.boxShadow = `0 0 10px ${color}88`;
    }

    /* Trigger entrance on next frame */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        $$('.c', panelTitle).forEach(s => s.classList.add('in'));
      });
    });
  }

  /* ── Update panel ─────────────────────────────────────── */
  function updatePanel(index) {
    if (index === current) return;
    current = index;

    const slide = slides[index];
    if (!slide) return;

    /* ① Title animation */
    animateTitle(slide.title, slide.color);

    /* ② Description fade */
    if (panelDesc) {
      panelDesc.classList.remove('in');
      /* swap text after short pause so fade-out is visible */
      setTimeout(() => {
        panelDesc.textContent = slide.desc;
        panelDesc.classList.add('in');
      }, 80);
    }

    /* ③ Progress bar */
    const pct = ((index + 1) / total) * 100;
    if (progFill) progFill.style.width = `${pct}%`;
    if (progLabel) progLabel.textContent = `${index + 1} / ${total}`;

    /* ④ Dots */
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === index);
      if (i === index) d.style.background = slide.color;
      else d.style.background = '';
    });

    /* ⑤ Cards — apply/remove active + dynamic glow */
    cards.forEach((card, i) => {
      const isActive = i === index;
      card.classList.toggle('active', isActive);
      /* Update glow color */
      const glow = card.querySelector('.feat-glow');
      if (glow) {
        const c = slides[i]?.color || '#7C3AED';
        glow.style.background = `radial-gradient(circle at 30% 30%, ${c}22, transparent 65%)`;
      }
      /* Update card border accent */
      if (isActive) {
        card.style.borderColor = `${slide.color}44`;
        card.style.boxShadow = `0 0 48px ${slide.color}22, 0 0 0 1px ${slide.color}22`;
      } else {
        card.style.borderColor = '';
        card.style.boxShadow = '';
      }
    });
  }

  /* ── IntersectionObserver for cards ───────────────────── */
  /*
   * rootMargin of -40% top/bottom creates a "trigger zone"
   * in the middle 20% of the viewport. When a card enters
   * that zone it becomes the active slide.
   * threshold:0 means it fires as soon as 1px is inside the zone.
   */
  const cardObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = parseInt(entry.target.dataset.index, 10);
        updatePanel(idx);
      }
    });
  }, {
    threshold: 0,
    rootMargin: '-40% 0px -40% 0px',
  });

  slots.forEach(slot => cardObserver.observe(slot));

  /* Initialise with first slide immediately */
  updatePanel(0);

  /* ── 4. Smooth scroll ─────────────────────────────────── */
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });

})();
