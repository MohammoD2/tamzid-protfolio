(() => {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = motionPreference.matches;
  const animatedItems = document.querySelectorAll([
    '.profile-card',
    '.hero-slider-card',
    '.featured-block',
    '.work-card',
    '.custom-text-box',
    '.stat-card',
    '.timeline-card',
    '.experience-summary-card',
    '.experience-metrics div',
    '.tag-cloud span',
    '.contact-panel',
    '.service-box',
    '.education-card',
    '.contact-card',
    '.contact-form',
    '.review-card',
    '.all-review-card',
    '.add-review-btn',
    '.patreon-cta',
    '.portfolio-cta-card',
    '.faq-card',
    '.game-library-card',
    '.game-card',
    '.game-2048-wrap',
    '.key-rush-wrap',
    '.key-rush-records span',
    '.game-stats div',
    '.skin-option',
    '.resume-sidebar',
    '.resume-item',
    '.resume-hero-card',
    '.resume-hero-card div',
    '.resume-sidebar-section',
    '.language-list span',
    '.section-image',
    '.about-visual-card',
    '.about-focus-list span',
    '.contact-photo',
    '.location-box'
  ].join(','));

  document.querySelectorAll('.review-card[role="button"]').forEach((card) => {
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      card.click();
    });
  });

  document.querySelectorAll('.work-card').forEach((card) => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      card.click();
    });
  });

  document.querySelectorAll('.service-detail-card').forEach((card) => {
    card.addEventListener('click', () => {
      if (reducedMotion) {
        return;
      }

      card.classList.add('is-zooming');
      window.setTimeout(() => card.classList.remove('is-zooming'), 260);
    });
  });

  document.querySelectorAll('.navbar-nav').forEach((nav) => {
    const links = Array.from(nav.querySelectorAll('.nav-link:not(.custom-btn)'));

    if (!links.length) {
      return;
    }

    const underline = document.createElement('span');
    underline.className = 'nav-underline';
    nav.appendChild(underline);

    let activeLink = links[0];
    const updateActiveLink = () => {
      const currentFile = window.location.pathname.split('/').pop() || 'index.html';
      const currentHash = window.location.hash;
      const matchesPage = (link) => {
        const url = new URL(link.getAttribute('href'), window.location.href);
        return (url.pathname.split('/').pop() || 'index.html') === currentFile;
      };
      // Prefer a matching section, then the page link for other homepage sections.
      activeLink = (currentHash && links.find((link) =>
        matchesPage(link) && new URL(link.href).hash === currentHash
      )) || links.find((link) => matchesPage(link) && !new URL(link.href).hash) || null;
      links.forEach((link) => {
        const active = link === activeLink;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    };

    const moveUnderline = (link) => {
      if (!link) { underline.style.opacity = '0'; return; }
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const width = Math.max(34, linkRect.width - 34);
      const left = linkRect.left - navRect.left + (linkRect.width - width) / 2;
      const top = link.offsetTop + link.offsetHeight - 5;

      underline.style.opacity = '1';
      underline.style.width = `${width}px`;
      underline.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };

    updateActiveLink();
    requestAnimationFrame(() => moveUnderline(activeLink));
    const updateNavigation = () => {
      updateActiveLink();
      moveUnderline(activeLink);
    };
    window.addEventListener('hashchange', updateNavigation);
    window.addEventListener('popstate', updateNavigation);

    links.forEach((link) => {
      link.addEventListener('mouseenter', () => moveUnderline(link));
      link.addEventListener('focus', () => moveUnderline(link));
    });

    nav.addEventListener('mouseleave', () => moveUnderline(activeLink));
    window.addEventListener('resize', () => moveUnderline(activeLink));
    window.addEventListener('load', () => moveUnderline(activeLink));

    document.querySelectorAll('.navbar-collapse').forEach((collapse) => {
      collapse.addEventListener('shown.bs.collapse', () => moveUnderline(activeLink));
    });
  });

  if (reducedMotion || !animatedItems.length) {
    animatedItems.forEach((item) => item.classList.add('is-revealed'));
    return;
  }

  // Reveal outer cards only; nested content moves with its parent.
  const itemSet = new Set(animatedItems);
  const outerItems = [...animatedItems].filter((item) => {
    for (let parent = item.parentElement; parent; parent = parent.parentElement) {
      if (itemSet.has(parent)) return false;
    }
    return true;
  });
  outerItems.forEach((item) => {
    item.classList.add('reveal-on-scroll');
  });

  if (!('IntersectionObserver' in window)) {
    outerItems.forEach((item) => item.classList.remove('reveal-on-scroll'));
    return;
  }

  const reveals = new Set();
  const observer = new IntersectionObserver((entries) => {
    let stagger = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.remove('reveal-on-scroll');
      if (!motionPreference.matches && entry.target.animate) {
        const animation = entry.target.animate([
          { opacity: 0, translate: '0 18px' },
          { opacity: 1, translate: '0 0' }
        ], {
          duration: 620,
          delay: Math.min(stagger++, 3) * 55,
          easing: 'cubic-bezier(.22,1,.36,1)',
          fill: 'backwards'
        });
        reveals.add(animation);
        animation.onfinish = () => reveals.delete(animation);
      }
      observer.unobserve(entry.target);
    });
  }, {
    rootMargin: '0px 0px 24px 0px',
    threshold: 0.01
  });

  outerItems.forEach((item) => observer.observe(item));
  motionPreference.addEventListener('change', () => {
    if (!motionPreference.matches) return;
    observer.disconnect();
    outerItems.forEach((item) => item.classList.remove('reveal-on-scroll'));
    reveals.forEach((animation) => animation.cancel());
    reveals.clear();
  });
})();
