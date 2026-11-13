(() => {
  const filterButtons = [...document.querySelectorAll('[data-product-filter]')];
  const freeFilter = document.querySelector('[data-free-filter]');
  const products = [...document.querySelectorAll('[data-product-category]')];
  const emptyState = document.querySelector('[data-products-empty]');

  if (!filterButtons.length || !freeFilter || !products.length || !emptyState) return;

  let activeCategory = 'all';

  const updateProducts = () => {
    let visibleCount = 0;

    products.forEach((product) => {
      const matchesCategory = activeCategory === 'all' || product.dataset.productCategory === activeCategory;
      const matchesFree = !freeFilter.checked || product.dataset.productFree === 'true';
      const isVisible = matchesCategory && matchesFree;

      product.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    emptyState.hidden = visibleCount !== 0;
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.productFilter;

      filterButtons.forEach((filterButton) => {
        const isActive = filterButton === button;
        filterButton.classList.toggle('is-active', isActive);
        filterButton.setAttribute('aria-pressed', String(isActive));
      });

      updateProducts();
    });
  });

  freeFilter.addEventListener('change', updateProducts);
})();
