(function () {
  const appCardsContainer = document.querySelector('#apps .cards');
  const sampleCardsContainer = document.querySelector('#samples .sample-cards');
  const imageCardsContainer = document.querySelector('#gallery .image-cards');

  const configs = [];
  let lightbox;
  let lightboxImage;
  let lightboxTitle;
  let lightboxCloseButton;
  let lastFocusedElement;

  if (appCardsContainer) {
    configs.push({
      input: document.querySelector('#app-search'),
      container: appCardsContainer,
      url: 'apps.json',
      defaultEmptyMessage:
        appCardsContainer.dataset.emptyMessage || '找不到符合的 App，小王子仍在尋找中。',
      loadingMessage: '載入 App 清單中...',
      errorMessage: '無法載入 App 清單，請稍後再試。',
      build: createAppCard,
      extras: (item) => (item.github ? ['github'] : []),
      records: [],
      limit: parseLimit(appCardsContainer),
    });
  }

  if (sampleCardsContainer) {
    configs.push({
      input: document.querySelector('#sample-search'),
      container: sampleCardsContainer,
      url: 'samples.json',
      defaultEmptyMessage:
        sampleCardsContainer.dataset.emptyMessage || '找不到程式範例，小王子正在編排程式星塵。',
      loadingMessage: '載入程式範例中...',
      errorMessage: '無法載入程式範例，請稍後再試。',
      build: createSampleCard,
      extras: () => ['code', 'sample', '程式範例'],
      records: [],
      limit: parseLimit(sampleCardsContainer),
    });
  }

  if (imageCardsContainer) {
    configs.push({
      input: document.querySelector('#image-search'),
      container: imageCardsContainer,
      url: 'images.json',
      defaultEmptyMessage:
        imageCardsContainer.dataset.emptyMessage || '找不到圖片，小王子正在整理相冊。',
      loadingMessage: '載入圖片中...',
      errorMessage: '無法載入圖片，請稍後再試。',
      build: createImageCard,
      extras: (item) => ['image', 'picture', ...(item.tags || [])],
      records: [],
      limit: parseLimit(imageCardsContainer),
    });
  }

  if (configs.length === 0) return;

  configs.forEach((config) => {
    installSearch(config);
    loadDataset(config);
  });

  function normalise(text) {
    return (text || '').toLowerCase().replace(/\s+/g, '');
  }

  function parseLimit(container) {
    if (!container) return null;
    const value = parseInt(container.dataset.limit ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function showEmptyMessage(container, message, visible) {
    let emptyState = container.querySelector('.empty-state');
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      container.appendChild(emptyState);
    }
    emptyState.textContent = message;
    emptyState.style.display = visible ? 'block' : 'none';
  }

  function renderList(config, records) {
    config.container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const limited = config.limit ? records.slice(0, config.limit) : records;
    limited.forEach((item) => {
      fragment.appendChild(config.build(item));
    });
    config.container.appendChild(fragment);
    showEmptyMessage(config.container, config.defaultEmptyMessage, records.length === 0);
  }

  function showStatus(config, message) {
    config.container.innerHTML = '';
    showEmptyMessage(config.container, message, true);
  }

  function prepareRecords(data, extrasFn = () => []) {
    return data.map((item) => {
      const extras = extrasFn(item) || [];
      return {
        ...item,
        searchIndex: normalise([item.title, ...(item.tags || []), ...extras].join(' ')),
      };
    });
  }

  function filterRecords(config, keyword) {
    const query = normalise(keyword);
    if (query === '') return config.records;
    return config.records.filter((item) => item.searchIndex.includes(query));
  }

  function installSearch(config) {
    if (!config.input) return;
    config.input.addEventListener('input', (event) => {
      if (!config.records) return;
      const filtered = filterRecords(config, event.target.value);
      renderList(config, filtered);
    });
  }

  async function loadDataset(config) {
    if (!config.container) return;
    if (config.input) {
      config.input.disabled = true;
    }
    showStatus(config, config.loadingMessage);
    try {
      const response = await fetch(config.url);
      if (!response.ok) throw new Error(`Failed to load ${config.url}`);

      const data = await response.json();
      config.records = prepareRecords(data, config.extras);
      renderList(config, config.records);
      if (config.input) {
        config.input.disabled = false;
      }
    } catch (error) {
      console.error(`Unable to load data from ${config.url}`, error);
      showStatus(config, config.errorMessage);
    }
  }

  function createAppCard(app) {
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.title = app.title;
    article.dataset.tags = (app.tags || []).join(' ');

    const title = document.createElement('h3');
    title.textContent = app.title;

    const primaryLink = document.createElement('a');
    primaryLink.className = 'card-link';
    primaryLink.href = app.url;
    primaryLink.target = '_blank';
    primaryLink.rel = 'noopener';
    primaryLink.textContent = '前往 App';

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.appendChild(primaryLink);

    if (app.github) {
      const githubLink = document.createElement('a');
      githubLink.className = 'card-link';
      githubLink.href = app.github;
      githubLink.target = '_blank';
      githubLink.rel = 'noopener';
      githubLink.textContent = '前往 GitHub';
      actions.appendChild(githubLink);
    }

    article.append(title, actions);
    return article;
  }

  function createSampleCard(sample) {
    const article = document.createElement('article');
    article.className = 'card sample-card';
    article.dataset.title = sample.title;
    article.dataset.tags = (sample.tags || []).join(' ');

    if (sample.previewImage) {
      const figure = document.createElement('div');
      figure.className = 'sample-visual';

      const img = document.createElement('img');
      img.className = 'sample-thumb';
      img.src = sample.previewImage;
      img.alt = `${sample.title} 預覽圖`;
      img.loading = 'lazy';
      img.decoding = 'async';

      figure.appendChild(img);
      article.appendChild(figure);
    }

    const title = document.createElement('h3');
    title.textContent = sample.title;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const codeLink = document.createElement('a');
    codeLink.className = 'card-link';
    codeLink.href = sample.url;
    codeLink.target = '_blank';
    codeLink.rel = 'noopener';
    codeLink.textContent = '檢視程式碼';

    actions.appendChild(codeLink);
    article.append(title, actions);

    return article;
  }

  function createImageCard(image) {
    const article = document.createElement('article');
    article.className = 'card image-card';
    article.dataset.title = image.title;
    article.dataset.tags = (image.tags || []).join(' ');
    article.tabIndex = 0;
    article.setAttribute('role', 'button');
    article.setAttribute('aria-label', `${image.title} - 點擊放大檢視`);

    if (image.image) {
      const frame = document.createElement('div');
      frame.className = 'image-visual';

      const img = document.createElement('img');
      img.src = image.image;
      img.alt = image.title;
      img.loading = 'lazy';
      img.decoding = 'async';

      frame.appendChild(img);
      article.appendChild(frame);
    }

    const title = document.createElement('h3');
    title.textContent = image.title;
    article.appendChild(title);

    article.addEventListener('click', () => openLightbox(image));
    article.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(image);
      }
    });

    return article;
  }

  function ensureLightbox() {
    if (lightbox) return;

    lightbox = document.createElement('div');
    lightbox.className = 'image-lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-backdrop" data-close="true"></div>
      <div class="lightbox-panel">
        <button class="lightbox-close" type="button" aria-label="關閉圖片" data-close="true">×</button>
        <img class="lightbox-image" alt="" />
        <p class="lightbox-title"></p>
      </div>
    `;

    document.body.appendChild(lightbox);

    lightboxImage = lightbox.querySelector('.lightbox-image');
    lightboxTitle = lightbox.querySelector('.lightbox-title');
    lightboxCloseButton = lightbox.querySelector('.lightbox-close');

    lightbox.addEventListener('click', (event) => {
      if (event.target instanceof HTMLElement && event.target.dataset.close === 'true') {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
        closeLightbox();
      }
    });
  }

  function openLightbox(image) {
    ensureLightbox();

    lastFocusedElement = document.activeElement;

    if (lightboxImage) {
      lightboxImage.src = image.image;
      lightboxImage.alt = image.title;
    }
    if (lightboxTitle) {
      lightboxTitle.textContent = image.title;
    }

    lightbox.classList.add('is-open');

    if (lightboxCloseButton) {
      lightboxCloseButton.focus();
    }
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');

    if (lightboxImage) {
      lightboxImage.src = '';
      lightboxImage.alt = '';
    }

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }
})();
