(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    const currentHash = window.location.hash;
    const activeLink = links.find((link) => {
      const linkUrl = new URL(link.getAttribute('href'), window.location.href);
      const linkFile = linkUrl.pathname.split('/').pop() || 'index.html';

      if (currentHash && linkUrl.hash === currentHash) {
        return true;
      }

      return !currentHash && linkFile === currentFile && !linkUrl.hash;
    }) || links[0];

    links.forEach((link) => link.classList.toggle('active', link === activeLink));

    const moveUnderline = (link) => {
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const width = Math.max(34, linkRect.width - 34);
      const left = linkRect.left - navRect.left + (linkRect.width - width) / 2;
      const top = link.offsetTop + link.offsetHeight - 5;

      underline.style.opacity = '1';
      underline.style.width = `${width}px`;
      underline.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };

    requestAnimationFrame(() => moveUnderline(activeLink));

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

  animatedItems.forEach((item, index) => {
    item.classList.add('reveal-on-scroll');
    item.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 90}ms`);
  });

  if (!('IntersectionObserver' in window)) {
    animatedItems.forEach((item) => item.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1
  });

  animatedItems.forEach((item) => observer.observe(item));
})();
