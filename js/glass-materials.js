(() => {
  const initialize = () => {
    const palette = ['blue', 'violet', 'mint', 'coral'];
    const groups = [
      { selector: '.profile-card,.work-card,.featured-block,.custom-text-box,.stat-card,.experience-summary-card,.timeline-card,.resume-sidebar,.resume-item,.resume-hero-card,.service-box,.education-card,.contact-card,.contact-form,.review-card,.all-review-card,.faq-card,.contact-panel,.portfolio-cta-card,.patreon-cta,.about-visual-card,.about-stat-card,.location-box,.game-library-card,.game-card,.game-2048-wrap,.key-rush-wrap,.game-stats > div,.review-summary,.review-score-card,.review-count-card', surface: 'panel' },
      { selector: '.quick-actions-toggle,.quick-action,.footer-menu-link,.video-lightbox-external,.video-lightbox-patreon > a,.video-lightbox-close,.custom-btn,.theme-menu-trigger,.portfolio-hire-btn,.review-filter-btn,.add-review-btn,.skin-option,.game-2048-controls button,.game-library-icon,.theme-picker-close,.theme-picker-option,button[type="submit"],.social-icon-link,.hero-slider-control', surface: 'control' },
      { selector: '.tag-cloud span,.about-focus-list span,.language-list span,.game-2048-status,.key-rush-bottom-bar', surface: 'chip' },
      { selector: '.service-breakdown-grid > div,.experience-metrics > div,.video-lightbox-patreon', surface: 'tile' },
      { selector: 'input.form-control,textarea.form-control,select.form-control', surface: 'field' },
      { selector: '.modal-content,.video-lightbox-panel,.theme-picker', surface: 'window' },
      { selector: '.portfolio-floating-navbar > .container', surface: 'bar' },
      { selector: '.nav-link:not(.portfolio-hire-btn)', surface: 'nav' },
      { selector: '.review-avatar', surface: 'avatar' }
    ];
    const avatarTints = new Map();
    let counter = 0;
    const decorate = (node) => {
      if (!(node instanceof Element) && node !== document) return;
      groups.forEach(({ selector, surface }) => {
        const elements = [...node.querySelectorAll(selector)];
        if (node instanceof Element && node.matches(selector)) elements.unshift(node);
        elements.forEach((element) => {
          if (element.dataset.glassSurface) return;
          element.dataset.glassSurface = surface;
          const clear = ['bar', 'field', 'window', 'nav'].includes(surface) || element.matches('.profile-card,.about-visual-card');
          element.dataset.glassTint = clear ? 'clear' : palette[counter++ % palette.length];
          // Keep the palette sequence stable while footer links use plain text.
          if (element.matches('.footer-menu-link')) element.dataset.glassSurface = 'link';
          if (surface === 'avatar') {
            const identity = (element.closest('.review-header')?.querySelector('h5')?.textContent || element.textContent).trim().toLowerCase();
            if (!avatarTints.has(identity)) avatarTints.set(identity, palette[avatarTints.size % palette.length]);
            element.dataset.glassTint = avatarTints.get(identity);
          }
          if (element.matches('.theme-picker-option')) element.dataset.glassTint = element.dataset.themeChoice === 'glass' ? 'violet' : 'clear';
        });
      });
      // The four service cards form a deliberately balanced set of glass finishes.
      document.querySelectorAll('.feature-section .featured-block').forEach((card, index) => { card.dataset.glassTint = palette[index % palette.length]; });
    };
    decorate(document);
    new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(decorate));
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
