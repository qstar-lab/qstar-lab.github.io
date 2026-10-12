(() => {
  const languageKey = "qstar-preferred-language";
  const pageClass = [...document.body.classList].find((name) => name.startsWith("page-")) || "page-home";
  const koreanTemplate = document.getElementById("qstar-korean-page");
  if (!koreanTemplate) return;

  const koreanPage = {
    body: koreanTemplate.innerHTML,
    title: koreanTemplate.dataset.title,
    description: koreanTemplate.dataset.description,
  };
  koreanTemplate.remove();
  const pages = {
    en: {
      body: document.body.innerHTML,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || "",
    },
    kr: koreanPage,
  };
  const activeNewsFilters = Object.create(null);
  const description = document.querySelector('meta[name="description"]');
  let header;
  let menuToggle;
  let navigation;
  let languageSwitch;
  let newsButtons;
  let newsRows;
  let headerScrolled;
  let headerFrame = 0;
  let languageFrame = 0;
  let savedScrollBehavior = null;

  // Cache body elements once per render, and refresh after a language swap.
  const refreshPageElements = () => {
    header = document.querySelector("[data-header]");
    menuToggle = document.querySelector(".menu-toggle");
    navigation = menuToggle && document.getElementById(menuToggle.getAttribute("aria-controls"));
    languageSwitch = document.querySelector(".language-switch");
    newsButtons = document.querySelectorAll(".news-section [data-news-filter]");
    newsRows = document.querySelectorAll(".news-section [data-news-kind]");
    newsButtons.forEach((button) => {
      const kind = button.dataset.newsFilter;
      if (!(kind in activeNewsFilters)) activeNewsFilters[kind] = true;
    });
    headerScrolled = undefined;
  };

  const readPreferredLanguage = () => {
    try { return localStorage.getItem(languageKey); } catch { return null; }
  };

  const savePreferredLanguage = (language) => {
    try { localStorage.setItem(languageKey, language); } catch { /* Storage can be unavailable. */ }
  };

  const currentLanguage = () => document.documentElement.lang === "ko" ? "kr" : "en";

  const closeMenu = () => {
    if (!menuToggle || !navigation) return;
    menuToggle.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
  };

  const updateHeader = () => {
    const scrolled = window.scrollY > 8;
    if (scrolled === headerScrolled) return;
    header?.classList.toggle("is-scrolled", scrolled);
    headerScrolled = scrolled;
  };

  const toggleMenu = (toggle) => {
    if (!navigation) return;
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    navigation.classList.toggle("is-open", !isOpen);
  };

  const updateNewsFilters = () => {
    newsButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(activeNewsFilters[button.dataset.newsFilter]));
    });

    let visibleCount = 0;
    newsRows.forEach((row) => {
      const visible = activeNewsFilters[row.dataset.newsKind];
      row.hidden = !visible;
      row.classList.toggle("is-first-visible", visible && visibleCount === 0);
      if (visible) visibleCount += 1;
    });
  };

  const replacePageLanguage = (language, focusSwitch = false) => {
    const nextPage = pages[language];
    const scrollPosition = window.scrollY;
    cancelAnimationFrame(languageFrame);
    if (savedScrollBehavior === null) savedScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.classList.add("language-swapping");
    document.documentElement.style.scrollBehavior = "auto";
    document.body.innerHTML = nextPage.body;
    document.body.className = `${pageClass} language-${language}`;
    document.documentElement.lang = language === "kr" ? "ko" : "en";
    document.title = nextPage.title;

    if (description) description.content = nextPage.description;

    refreshPageElements();
    updateHeader();
    updateNewsFilters();
    if (focusSwitch) languageSwitch?.focus({ preventScroll: true });
    window.scrollTo(0, scrollPosition);
    languageFrame = requestAnimationFrame(() => {
      window.scrollTo(0, scrollPosition);
      languageFrame = requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
        document.documentElement.style.scrollBehavior = savedScrollBehavior;
        savedScrollBehavior = null;
        document.documentElement.classList.remove("language-swapping");
        languageFrame = 0;
      });
    });
  };

  const showLanguage = (language, rememberChoice = false, focusSwitch = false) => {
    if (language === currentLanguage()) {
      if (rememberChoice) savePreferredLanguage(language);
      return;
    }
    if (!pages[language]) return;
    replacePageLanguage(language, focusSwitch);
    if (rememberChoice) savePreferredLanguage(language);
  };

  const detectLanguage = () => {
    const savedLanguage = readPreferredLanguage();
    if (savedLanguage === "kr" || savedLanguage === "en") {
      showLanguage(savedLanguage);
      return;
    }
    const browserLanguage = navigator.languages?.[0] || navigator.language || "";
    showLanguage(/^ko(?:[-_]|$)/i.test(browserLanguage) ? "kr" : "en");
  };

  // Delegate once: controls keep working when language switching replaces the body.
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest(".language-switch") && !event.defaultPrevented) {
      showLanguage(currentLanguage() === "kr" ? "en" : "kr", true, event.detail === 0);
      return;
    }

    const toggle = target.closest(".menu-toggle");
    if (toggle) {
      toggleMenu(toggle);
      return;
    }

    const filter = target.closest(".news-section [data-news-filter]");
    if (filter && filter.dataset.newsFilter in activeNewsFilters) {
      const kind = filter.dataset.newsFilter;
      activeNewsFilters[kind] = !activeNewsFilters[kind];
      updateNewsFilters();
    }

    if (target.closest(".site-nav a") || !target.closest("[data-header]")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (menuToggle?.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuToggle.focus();
    }
  });

  window.addEventListener("resize", () => { if (window.innerWidth > 900) closeMenu(); });
  window.addEventListener("scroll", () => {
    if (headerFrame) return;
    headerFrame = requestAnimationFrame(() => {
      headerFrame = 0;
      updateHeader();
    });
  }, { passive: true });
  refreshPageElements();
  updateHeader();
  updateNewsFilters();
  detectLanguage();
})();
