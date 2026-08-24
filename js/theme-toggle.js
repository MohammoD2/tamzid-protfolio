(() => {
    const storageKey = 'tamzid-portfolio-theme';
    const root = document.documentElement;
  
    const readSavedTheme = () => {
      try {
        return localStorage.getItem(storageKey);
      } catch (error) {
        return null;
      }
    };
  
    const saveTheme = (theme) => {
      try {
        localStorage.setItem(storageKey, theme);
      } catch (error) {
        // The theme still works if browser storage is unavailable.
      }
    };
  
    const applyTheme = (theme) => {
      const selectedTheme = theme === 'dark' ? 'dark' : 'light';
      const darkModeActive = selectedTheme === 'dark';
  
      root.setAttribute('data-theme', selectedTheme);
  
      document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        const label = button.querySelector('.theme-toggle-label');
  
        button.setAttribute('aria-pressed', String(darkModeActive));
        button.setAttribute(
          'aria-label',
          darkModeActive
            ? 'Switch to light mode'
            : 'Switch to dark mode'
        );
  
        button.title = darkModeActive
          ? 'Switch to light mode'
          : 'Switch to dark mode';
  
        if (label) {
          label.textContent = darkModeActive ? 'Light mode' : 'Dark mode';
        }
      });
    };
  
    const savedTheme = readSavedTheme();
    applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  
    const initializeThemeButtons = () => {
      document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
          const nextTheme =
            root.getAttribute('data-theme') === 'dark'
              ? 'light'
              : 'dark';
  
          applyTheme(nextTheme);
          saveTheme(nextTheme);
        });
      });
    };
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeThemeButtons);
    } else {
      initializeThemeButtons();
    }
  
    window.addEventListener('storage', (event) => {
      if (event.key !== storageKey) {
        return;
      }
  
      applyTheme(event.newValue === 'dark' ? 'dark' : 'light');
    });
  })();