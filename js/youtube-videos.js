(() => {
  const isHostedPage = () => window.location.protocol === 'http:' || window.location.protocol === 'https:';
  let activeLightbox;

  const createLightbox = () => {
    const lightbox = document.createElement('div');
    lightbox.className = 'video-lightbox';
    lightbox.innerHTML = `
      <div class="video-lightbox-backdrop" data-video-close></div>
      <button class="video-lightbox-close" type="button" data-video-close aria-label="Close video">
        <i class="bi-x-lg"></i>
      </button>
      <div class="video-lightbox-panel" role="dialog" aria-modal="true" aria-label="Portfolio video viewer">
        <div class="video-lightbox-frame">
          <div class="video-lightbox-stage"></div>
        </div>
        <div class="video-lightbox-details">
          <span class="video-lightbox-category">Portfolio Preview</span>
          <h3 class="video-lightbox-title">Video</h3>
          <p class="video-lightbox-description"></p>
          <div class="video-lightbox-patreon" hidden>
            <div>
              <strong>Course and Project file available on Patreon</strong>
              <span class="video-lightbox-patreon-text">Want to explore the scene setup, files, and extra creative resources?</span>
            </div>
            <a href="https://patreon.com/10MinuteEditing" target="_blank" rel="noopener">Visit Patreon <i class="bi-box-arrow-up-right"></i></a>
          </div>
          <div class="video-lightbox-actions">
            <a href="#" target="_blank" rel="noopener" class="video-lightbox-external">Open on YouTube <i class="bi-box-arrow-up-right"></i></a>
            <a href="contact.html" class="custom-btn btn">Hire Me</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(lightbox);
    return lightbox;
  };

  const closeLightbox = () => {
    if (!activeLightbox) {
      return;
    }

    const closingLightbox = activeLightbox;
    closingLightbox.classList.remove('is-visible');
    document.body.classList.remove('video-lightbox-open');
    activeLightbox = null;

    window.setTimeout(() => {
      closingLightbox.remove();
    }, 260);
  };

  const createFallbackLink = (videoId, title, thumbnailSrc, watchUrl = `https://www.youtube.com/watch?v=${videoId}`) => {
    const fallback = document.createElement('div');
    fallback.className = 'youtube-fallback youtube-fallback-large';
    fallback.style.backgroundImage = `linear-gradient(135deg, rgba(16,32,51,0.82), rgba(47,74,100,0.78)), url("${thumbnailSrc}")`;
    fallback.innerHTML = `
      <i class="bi-youtube"></i>
      <strong>This video opens on YouTube</strong>
      <span>${title}</span>
      <a href="${watchUrl}" target="_blank" rel="noopener" class="custom-btn btn">Watch on YouTube</a>
    `;

    return fallback;
  };

  const openLightbox = ({ videoId, title, category, description, hasPatreonFiles, directOnly, thumbnailSrc, watchUrl, sourceFrame }) => {
    closeLightbox();

    const lightbox = createLightbox();
    const stage = lightbox.querySelector('.video-lightbox-stage');
    const titleEl = lightbox.querySelector('.video-lightbox-title');
    const categoryEl = lightbox.querySelector('.video-lightbox-category');
    const descriptionEl = lightbox.querySelector('.video-lightbox-description');
    const patreonEl = lightbox.querySelector('.video-lightbox-patreon');
    const patreonTextEl = lightbox.querySelector('.video-lightbox-patreon-text');
    const externalLink = lightbox.querySelector('.video-lightbox-external');
    const frameRect = sourceFrame.getBoundingClientRect();

    activeLightbox = lightbox;
    titleEl.textContent = title;
    categoryEl.textContent = category || 'Portfolio Preview';
    descriptionEl.textContent = description || 'Selected 3D animation work with polished motion and presentation.';
    patreonEl.hidden = !hasPatreonFiles;
    patreonTextEl.textContent = sourceFrame.dataset.patreonText || 'Want to explore the scene setup, files, and extra creative resources?';
    externalLink.href = watchUrl;
    lightbox.style.setProperty('--origin-x', `${frameRect.left + frameRect.width / 2}px`);
    lightbox.style.setProperty('--origin-y', `${frameRect.top + frameRect.height / 2}px`);

    if (directOnly || !isHostedPage()) {
      stage.appendChild(createFallbackLink(videoId, title, thumbnailSrc, watchUrl));
    } else {
      const params = new URLSearchParams({
        autoplay: '1',
        controls: '1',
        fs: '1',
        iv_load_policy: '3',
        modestbranding: '1',
        playsinline: '1',
        rel: '0',
        origin: window.location.origin,
        widget_referrer: window.location.href
      });
      const iframe = document.createElement('iframe');

      iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
      iframe.title = title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.loading = 'eager';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.addEventListener('error', () => {
        stage.replaceChildren(createFallbackLink(videoId, title, thumbnailSrc, watchUrl));
      }, { once: true });

      stage.appendChild(iframe);
    }

    document.body.classList.add('video-lightbox-open');
    requestAnimationFrame(() => {
      lightbox.classList.add('is-visible');
    });
  };

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-video-close]')) {
      closeLightbox();
      return;
    }

    const card = event.target.closest('.work-card');

    if (!card) {
      return;
    }

    const frame = card.querySelector('.video-frame[data-youtube-id]');
    const thumbnail = card.querySelector('.youtube-thumbnail');

    if (!frame || !thumbnail) {
      return;
    }

    const videoId = frame.dataset.youtubeId;
    const cardCategory = card?.querySelector('span')?.textContent?.trim() || 'Portfolio Preview';
    const cardTitle = card?.querySelector('h5')?.textContent?.trim();
    const cardDescription = card?.querySelector('p')?.textContent?.trim() || '';
    const title = frame.dataset.videoTitle || cardTitle || 'YouTube portfolio video';
    const watchUrl = frame.dataset.youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailImage = thumbnail.querySelector('img');

    openLightbox({
      videoId,
      title,
      category: cardCategory,
      description: cardDescription,
      hasPatreonFiles: frame.dataset.patreonFiles === 'true',
      directOnly: frame.dataset.youtubeDirect === 'true',
      thumbnailSrc: thumbnailImage?.src || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      watchUrl,
      sourceFrame: frame
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLightbox();
    }
  });
})();
