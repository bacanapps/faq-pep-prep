/* global React, ReactDOM, Howl */
(function () {
  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const h = React.createElement;

  // ---- APP VERSION --------------------------------------------
  // Update this manually when deploying to reflect last GitHub update
  const APP_VERSION = '11/12/2025, 13:13';
  const getAppVersion = () => {
    return `(v. ${APP_VERSION})`;
  };

  // ---- ROUTES -------------------------------------------------
  const Routes = {
    HOME: "home",
    FAQ: "faq",
    ABOUT: "apresentacao",
    BOT: "bot",
  };

  // ---- ANALYTICS TRACKER --------------------------------------
  const AnalyticsTracker = {
    // Check if gtag is available
    isAvailable() {
      return typeof window.gtag === 'function';
    },

    // Track page views
    trackPageView(pageName, pageTitle) {
      if (!this.isAvailable()) return;
      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.hash
      });
    },

    // Track FAQ views
    trackFaqView(faqId, faqQuestion) {
      if (!this.isAvailable()) return;
      window.gtag('event', 'view_faq', {
        event_category: 'engagement',
        event_label: faqQuestion,
        faq_id: faqId,
        faq_question: faqQuestion
      });
    },

    // Track audio plays
    trackAudioPlay(audioType, contentTitle) {
      if (!this.isAvailable()) return;
      window.gtag('event', 'play_audio', {
        event_category: 'engagement',
        event_label: contentTitle,
        audio_type: audioType,
        content_title: contentTitle
      });
    },

    // Track search queries
    trackSearch(searchTerm, resultCount) {
      if (!this.isAvailable()) return;
      window.gtag('event', 'search', {
        search_term: searchTerm,
        result_count: resultCount
      });
    },

    // Track theme toggles
    trackThemeToggle(newTheme) {
      if (!this.isAvailable()) return;
      window.gtag('event', 'toggle_theme', {
        event_category: 'engagement',
        event_label: newTheme,
        theme: newTheme
      });
    },

    // Track language toggle
    trackLanguageToggle(newLanguage) {
      if (!this.isAvailable()) return;
      window.gtag('event', 'language_toggle', {
        language: newLanguage,
        event_category: 'user_preference'
      });
    }
  };

  // ---- TRANSLATIONS -------------------------------------------
  const TRANSLATIONS = {
    'pt-br': {
      nav: {
        home: 'Home',
        apresentacao: 'Apresentação',
        faqs: 'Perguntas Frequentes',
        voltar: 'Voltar'
      },
      home: {
        heroTitle: 'TIRA-DÚVIDAS SOBRE PEP E PrEP',
        heroDesc: 'Saiba mais sobre as profilaxias pós e pré-exposição de risco ao HIV.',
        cardApresentacao: {
          title: 'Apresentação',
          button: 'Explorar'
        },
        cardFaq: {
          title: 'Perguntas Frequentes',
          button: 'Explorar'
        }
      },
      apresentacao: {
        title: 'Apresentação',
        subtitle: 'FAQ sobre PEP e PrEP',
        loading: 'Carregando…',
        audioBtnPlay: '▶️ Audiodescrição',
        audioBtnPause: '⏸️ Pausar'
      },
      faq: {
        title: 'Perguntas Frequentes',
        subtitle: 'PrEP & PEP FAQ',
        searchPlaceholder: 'Buscar por palavra-chave…',
        clearBtn: 'Limpar busca',
        loading: 'Carregando perguntas…',
        noResults: 'Nenhuma pergunta encontrada para esse termo.',
        retry: 'Tentar novamente',
        audioBtnPlay: '▶️ Audiodescrição',
        audioBtnPause: '⏸️ Pausar'
      },
      common: {
        themeToggleAria: 'Alternar tema',
        languageToggleAria: 'Alternar idioma',
        footer: '© 2025 Dezembro Vermelho • Ministério da Saúde'
      }
    },
    'en': {
      nav: {
        home: 'Home',
        apresentacao: 'Presentation',
        faqs: 'FAQs',
        voltar: 'Back'
      },
      home: {
        heroTitle: 'FAQs ABOUT PrEP AND PrEP',
        heroDesc: 'Learn more about post- and pre-exposure prophylaxis for HIV risk.',
        cardApresentacao: {
          title: 'Presentation',
          button: 'Explore'
        },
        cardFaq: {
          title: 'Frequently Asked Questions',
          button: 'Explore'
        }
      },
      apresentacao: {
        title: 'Presentation',
        subtitle: 'FAQ about PEP and PrEP',
        loading: 'Loading…',
        audioBtnPlay: '▶️ Audio Description',
        audioBtnPause: '⏸️ Pause'
      },
      faq: {
        title: 'Frequently Asked Questions',
        subtitle: 'PrEP & PEP FAQ',
        searchPlaceholder: 'Search by keyword…',
        clearBtn: 'Clear search',
        loading: 'Loading questions…',
        noResults: 'No questions found for that term.',
        retry: 'Try again',
        audioBtnPlay: '▶️ Audio Description',
        audioBtnPause: '⏸️ Pause'
      },
      common: {
        themeToggleAria: 'Toggle theme',
        languageToggleAria: 'Toggle language',
        footer: '© 2025 Red December • Ministry of Health'
      }
    }
  };

  /**
   * Translation helper function
   * @param {string} language - The current language ('en' or 'pt-br')
   * @param {string} key - The translation key path (e.g., 'home.heroTitle')
   * @returns {string} The translated string
   */
  function t(language, key) {
    const keys = key.split('.');
    let value = TRANSLATIONS[language];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Fallback to Portuguese if key not found
        value = TRANSLATIONS['pt-br'];
        for (const k2 of keys) {
          if (value && typeof value === 'object') {
            value = value[k2];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }

    return value || key;
  }

  // ---- UTIL ---------------------------------------------------
  function toRelative(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `.${url}`;
    return url;
  }

  function stripHtml(value = "") {
    return String(value)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatDuration(seconds) {
    const total = Number(seconds);
    if (!Number.isFinite(total) || total <= 0) return "";
    const mins = Math.floor(total / 60);
    const secs = Math.round(total % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  }

  // ---- FETCH + NORMALIZE FAQ ---------------------------------
  function normalizeFaqEntries(data) {
    if (!Array.isArray(data)) return [];
    return data
      .map((item, idx) => {
        const question = item.question || item.q || item.title || "";
        const rawHtml = item.answerHtml || "";
        const fallbackText = item.answer || item.a || "";
        const baseHtml = rawHtml || (fallbackText ? `<p>${fallbackText}</p>` : "");
        const answerText = stripHtml(rawHtml || fallbackText || baseHtml);
        if (!question || (!baseHtml && !answerText)) return null;

        const tags = Array.isArray(item.tags) ? item.tags : [];
        const audioDescription = item.audioDescription || {};
        const audioSrc = toRelative(
          audioDescription.src ||
            item.audioSrc ||
            item.audio ||
            `./assets/audio/faq${idx + 1}.mp3`
        );
        const durationSec =
          audioDescription.durationSec ??
          audioDescription.durationSeconds ??
          audioDescription.duration ??
          null;

        // Include English translations if available
        const questionEn = item.questionEn || '';
        const answerHtmlEn = item.answerHtmlEn || '';
        const answerTextEn = answerHtmlEn ? stripHtml(answerHtmlEn) : '';

        // Build searchText with both Portuguese and English content
        const searchParts = [question, answerText, ...tags];
        if (questionEn) searchParts.push(questionEn);
        if (answerTextEn) searchParts.push(answerTextEn);

        return {
          id: item.id || item.slug || question,
          question,
          questionEn,
          answerHtml: baseHtml || `<p>${answerText}</p>`,
          answerHtmlEn,
          answerText,
          tags,
          audioSrc,
          audioDurationLabel: formatDuration(durationSec),
          searchText: searchParts.join(' ').toLowerCase(),
        };
      })
      .filter(Boolean);
  }

  function fetchFaqData(signal) {
    return fetch("./data/faq.json", { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Falha ao carregar FAQs (${res.status})`);
        return res.json();
      })
      .then((data) => normalizeFaqEntries(data));
  }

  // ---- FETCH PRESENTATION COPY (optional, but used in ABOUT) --
  async function fetchPresentation(signal) {
    const res = await fetch("./data/presentation.json", { signal });
    if (!res.ok) throw new Error("Falha ao carregar apresentação");
    return res.json();
  }

  // ---- AUDIO HOOK (Howler wrapper) ---------------------------
  function useHowlerAudio() {
    const [playingId, setPlayingId] = useState(null);
    const audioRef = useRef({ id: null, howl: null });

    const teardown = useCallback((opts = {}) => {
      const { stop = true, updateState = true } = opts;
      const current = audioRef.current;
      if (current && current.howl) {
        if (stop) {
          try {
            current.howl.stop();
          } catch (_) {}
        }
        try {
          current.howl.unload();
        } catch (_) {}
      }
      audioRef.current = { id: null, howl: null };
      if (updateState) setPlayingId(null);
    }, []);

    const toggle = useCallback(
      (id, src) => {
        if (!id || !src) return;

        const HowlCtor = window.Howl || (window.Howler && window.Howler.Howl);
        if (!HowlCtor) {
          console.warn("Biblioteca de áudio não carregada.");
          return;
        }

        const current = audioRef.current;

        // same item? pause/unpause
        if (current.id === id && current.howl) {
          if (current.howl.playing()) {
            current.howl.pause();
            setPlayingId(null);
          } else {
            current.howl.play();
            setPlayingId(id);
          }
          return;
        }

        // otherwise stop previous
        if (current.howl) teardown();

        const nextHowl = new HowlCtor({
          src: [toRelative(src)],
          html5: true,
          preload: true,
          format: ["mp3"],
          onplayerror: (howlId, err) => {
            console.error("Howler play error:", err);
            try {
              nextHowl.once("unlock", () => nextHowl.play());
            } catch (_) {}
          },
          onloaderror: (howlId, err) => {
            console.error("Howler load error for", src, err);
          },
          onend: () => {
            if (audioRef.current.id === id) {
              teardown({ stop: false });
            }
          },
          onstop: () => {
            if (audioRef.current.id === id) {
              teardown({ stop: false });
            }
          },
        });

        audioRef.current = { id, howl: nextHowl };
        nextHowl.play();
        setPlayingId(id);
      },
      [teardown]
    );

    // cleanup on unmount
    useEffect(() => {
      return () => {
        teardown({ updateState: false });
      };
    }, [teardown]);

    return {
      playingId,
      toggle,
      stop: () => teardown(),
      teardown,
    };
  }

  // ---- DATA HOOK FOR FAQ -------------------------------------
  function useFaqData(teardownAudio) {
    const [faqItems, setFaqItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const controllerRef = useRef(null);

    const load = useCallback(() => {
      // abort in-flight
      if (controllerRef.current) controllerRef.current.abort();

      if (teardownAudio) teardownAudio();

      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);

      fetchFaqData(controller.signal)
        .then((normalized) => {
          if (controller.signal.aborted) return;
          setFaqItems(normalized);
          setLoading(false);
          if (controllerRef.current === controller) controllerRef.current = null;
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(err.message || "Erro desconhecido ao carregar FAQs");
          setFaqItems([]);
          setLoading(false);
          if (controllerRef.current === controller) controllerRef.current = null;
        });

      return controller;
    }, [teardownAudio]);

    // initial load
    useEffect(() => {
      const c = load();
      return () => {
        if (controllerRef.current) {
          controllerRef.current.abort();
          controllerRef.current = null;
        } else if (c) {
          c.abort();
        }
      };
    }, [load]);

    return { faqItems, loading, error, reload: load };
  }

  // ---- ROUTER HOOK -------------------------------------------
  function useRoute() {
    // evaluate the initial hash when mounting
    function getRouteFromHash() {
      const hash = (window.location.hash || "").replace("#", "");
      return Object.values(Routes).includes(hash) ? hash : Routes.HOME;
    }

    const [route, setRoute] = useState(getRouteFromHash);

    useEffect(() => {
      function onHash() {
        setRoute(getRouteFromHash());
      }
      window.addEventListener("hashchange", onHash);
      return () => window.removeEventListener("hashchange", onHash);
    }, []);

    function navigate(r) {
      // update hash without losing ?theme=...
      const params = window.location.search || "";
      window.location.hash = r;
      // keep ?theme as-is (no additional work needed here, browser keeps search)
      // (if you wanted to also rewrite ?theme=..., you'd do history.replaceState)
    }

    return [route, navigate];
  }

  // ---- LANGUAGE HOOK -----------------------------------------
  function useLanguage() {
    const [language, setLanguage] = useState(() => {
      // 1. Check URL parameter first (?lang=en)
      const urlParams = new URLSearchParams(window.location.search);
      const langParam = urlParams.get('lang');
      if (langParam === 'en' || langParam === 'pt-br' || langParam === 'pt') {
        return langParam === 'en' ? 'en' : 'pt-br';
      }

      // 2. Check localStorage
      const saved = localStorage.getItem('faq-pep-prep-language');
      if (saved === 'en' || saved === 'pt-br') {
        return saved;
      }

      // 3. Browser language detection (default)
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang && browserLang.toLowerCase().startsWith('en')) {
        return 'en';
      }

      // 4. Default to Portuguese
      return 'pt-br';
    });

    const toggleLanguage = useCallback(() => {
      setLanguage(current => {
        const next = current === 'en' ? 'pt-br' : 'en';
        localStorage.setItem('faq-pep-prep-language', next);
        document.documentElement.setAttribute('lang', next);

        // Update URL parameter
        const url = new URL(window.location);
        url.searchParams.set('lang', next);
        window.history.pushState({}, '', url);

        // Track language change
        AnalyticsTracker.trackLanguageToggle(next);

        return next;
      });
    }, []);

    // Apply language on mount
    useEffect(() => {
      document.documentElement.setAttribute('lang', language);
    }, [language]);

    return { language, toggleLanguage };
  }

  // ---- HEADER HERO -------------------------------------------
  const HeaderHero = ({ title, subtitle, rightSlot }) =>
    h(
      "section",
      { className: "hero hero-gradient glass-card" },
      h(
        "div",
        { className: "hero-header" },
        h(
          "div",
          { className: "hero-content" },
          h("h1", { className: "hero-title" }, title),
          subtitle
            ? h(
                "p",
                { className: "hero-lede" },
                subtitle
              )
            : null
        )
      )
    );

  // ---- CARD ---------------------------------------------------
  function Card({ icon, title, desc, cta, color, onClick }) {
    return h(
      "article",
      {
        className: "card-neo theme-transition",
        style: { cursor: "pointer" },
        onClick,
      },
      h("div", { className: "card-icon", "aria-hidden": "true" }, icon),
      h("h2", { className: "card-title" }, title),
      h("p", { className: "card-desc muted body-copy" }, desc),
      h(
        "button",
        {
          type: "button",
          onClick: onToggleTheme,
          className: "theme-toggle-btn",
          "aria-label": "Alternar tema visual"
        },
          "🎨"
      )
    );
  }

  // ---- PAGE: HOME --------------------------------------------
  function Home({ onNavigate, onToggleTheme, currentTheme, language, toggleLanguage }) {
    return h(
      "div",
      { className: "page fade-in" },

      // Theme toggle button (fixed position)
      h(
        "button",
        {
          className: "theme-toggle-btn",
          onClick: onToggleTheme,
          "aria-label": t(language, 'common.themeToggleAria')
        },
        currentTheme === "light" ? "🌙" : "☀️"
      ),

      // Language toggle button (fixed position)
      h(
        "button",
        {
          className: "language-toggle-btn",
          onClick: toggleLanguage,
          "aria-label": t(language, 'common.languageToggleAria')
        },
        language === 'en' ? '🇧🇷 PT' : '🇬🇧 EN'
      ),

      // Hero section with gradient glass card
      h(
        "section",
        { className: "hero hero-gradient glass-card" },
        h(
          "div",
          { className: "hero-header" },
          h(
            "div",
            { className: "hero-content" },
            h(
              "h1",
              { className: "hero-title" },
              t(language, 'home.heroTitle')
            ),
            h(
              "p",
              { className: "hero-lede" },
              t(language, 'home.heroDesc')
            )
          )
        )
      ),

      // Two-column cards section
      h(
        "section",
        { className: "home-cards" },
        h(
          "div",
          { className: "cards-2col" },

          // Card 1: Apresentação
          h(
            "article",
            {
              className: "choice-card glass-card card-hover",
              onClick: () => onNavigate(Routes.ABOUT)
            },
            h("div", { className: "choice-icon" }, "📘"),
            h("h2", { className: "choice-title" }, t(language, 'home.cardApresentacao.title')),
            h(
              "p",
              { className: "choice-desc" },
              ""
            ),
            h(
              "div",
              { className: "actions" },
              h("button", { className: "btn btn-primary" }, t(language, 'home.cardApresentacao.button'))
            )
          ),

          // Card 2: PERGUNTAS E RESPOSTAS SOBRE PREP
          h(
            "article",
            {
              className: "choice-card glass-card card-hover",
              onClick: () => onNavigate(Routes.FAQ)
            },
            h("div", { className: "choice-icon" }, "❓"),
            h("h2", { className: "choice-title" }, t(language, 'home.cardFaq.title')),
            h(
              "p",
              { className: "choice-desc" },
              ""
            ),
            h(
              "div",
              { className: "actions" },
              h("button", { className: "btn btn-green" }, t(language, 'home.cardFaq.button'))
            )
          )
        )
      ),

      React.createElement("div", { className: "app-footer-line" },
        h("span", null, `${t(language, 'common.footer')} • ${getAppVersion()}`),
        h("button", {
          className: "footer-lang-toggle",
          onClick: toggleLanguage,
          "aria-label": t(language, 'common.languageToggleAria'),
          style: { marginLeft: '12px', fontSize: '0.875rem', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }
        }, language === 'en' ? '🇧🇷 PT' : '🇬🇧 EN')
      )
    );
  }

  // ---- PAGE: FAQ ---------------------------------------------
  function Faq({ onBack, onToggleTheme, currentTheme, language, toggleLanguage }) {
    const [term, setTerm] = useState("");
    const { playingId, toggle: toggleAudio, teardown: teardownAudio } =
      useHowlerAudio();
    const { faqItems, loading, error, reload } = useFaqData(teardownAudio);

    const list = useMemo(() => {
      const needle = term.trim().toLowerCase();
      if (!needle) return faqItems;
      return faqItems.filter(({ searchText = "" }) =>
        searchText.includes(needle)
      );
    }, [faqItems, term]);

    // stop audio if the visible list no longer includes the playing item
    useEffect(() => {
      if (!playingId) return;
      const stillVisible = list.some(({ id }) => id === playingId);
      if (!stillVisible) teardownAudio();
    }, [list, playingId, teardownAudio]);

    // Track search queries with debounce
    useEffect(() => {
      const searchTerm = term.trim();
      if (!searchTerm) return;
      const timer = setTimeout(() => {
        AnalyticsTracker.trackSearch(searchTerm, list.length);
      }, 1000);
      return () => clearTimeout(timer);
    }, [term, list.length]);

    const handleAudioToggle = useCallback(
      (faq, questionText) => {
        const wasPlaying = playingId === faq.id;
        if (!wasPlaying) {
          AnalyticsTracker.trackAudioPlay('faq', questionText || faq.question);
        }
        toggleAudio(faq.id, faq.audioSrc);
      },
      [toggleAudio, playingId]
    );

    const handleBack = useCallback(() => {
      teardownAudio();
      onBack();
    }, [teardownAudio, onBack]);

    // Hide audio buttons when English selected (audio files not ready)
    const showAudioButtons = language === 'pt-br';

    let listContent;
    if (loading) {
      listContent = h(
        "div",
        { className: "state-message muted" },
        t(language, 'faq.loading')
      );
    } else if (error) {
      listContent = h(
        "div",
        { className: "state-message state-error" },
        h("span", null, error),
        h(
          "button",
          {
            type: "button",
            className: "btn btn-primary btn-retry",
            onClick: () => {
              setTerm("");
              reload();
            },
          },
          t(language, 'faq.retry')
        )
      );
    } else if (list.length === 0) {
      listContent = h(
        "div",
        { className: "state-message muted" },
        t(language, 'faq.noResults')
      );
    } else {
      listContent = list.map((faq) => {
        const isPlaying = playingId === faq.id;
        const audioLabel = isPlaying
          ? t(language, 'faq.audioBtnPause')
          : t(language, 'faq.audioBtnPlay');

        // Select language-appropriate content
        const displayQuestion = language === 'en' && faq.questionEn ? faq.questionEn : faq.question;
        const displayAnswer = language === 'en' && faq.answerHtmlEn ? faq.answerHtmlEn : faq.answerHtml;

        return h(
          "details",
          {
            key: faq.id || faq.question,
            className: "faq-item",
            onToggle: (event) => {
              if (event.target.open) {
                AnalyticsTracker.trackFaqView(faq.id, displayQuestion);
              }
            }
          },
          h(
            "summary",
            { className: "faq-question" },
            h(
              "span",
              { className: "faq-question-text" },
              displayQuestion || ""
            ),
            showAudioButtons && faq.audioSrc
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "audio-btn",
                    onClick: (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      // Open the details element to reveal the answer
                      const detailsElement = event.currentTarget.closest('details');
                      if (detailsElement && !isPlaying) {
                        detailsElement.open = true;
                      }
                      handleAudioToggle(faq, displayQuestion);
                    },
                    "aria-pressed": isPlaying ? "true" : "false",
                    "aria-label": audioLabel,
                  },
                  isPlaying ? t(language, 'faq.audioBtnPause') : t(language, 'faq.audioBtnPlay')
                )
              : null
          ),
          h("div", {
            className: "faq-answer muted",
            dangerouslySetInnerHTML: { __html: displayAnswer },
          })
        );
      });
    }

    return h(
      "div",
      { className: "fade-in theme-transition" },
      h(HeaderHero, {
        title: t(language, 'faq.title'),
        subtitle: t(language, 'faq.subtitle')
      }),
      h(
        "section",
        { className: "faq-section" },
        h(
          "div",
          { className: "faq-controls" },
          h(
            "button",
            {
              type: "button",
              className: "btn btn-green",
              onClick: handleBack,
            },
            t(language, 'nav.voltar')
          ),
          h(
            "div",
            { className: "search-input-wrapper" },
            h("input", {
              className: "faq-search",
              placeholder: t(language, 'faq.searchPlaceholder'),
              value: term,
              onChange: (e) => setTerm(e.target.value),
            }),
            term && h("button", {
              className: "search-clear-btn",
              onClick: () => setTerm(""),
              "aria-label": t(language, 'faq.clearBtn')
            }, "✕")
          )
        ),
        h("div", { className: "faq-list" }, listContent)
      ),
      h(
        "button",
        {
          className: "theme-toggle-btn",
          onClick: onToggleTheme,
          "aria-label": t(language, 'common.themeToggleAria')
        },
        currentTheme === "light" ? "🌙" : "☀️"
      ),

      h(
        "button",
        {
          className: "language-toggle-btn",
          onClick: toggleLanguage,
          "aria-label": t(language, 'common.languageToggleAria')
        },
        language === 'en' ? '🇧🇷 PT' : '🇬🇧 EN'
      ),

      React.createElement("div", { className: "app-footer-line" },
        h("span", null, `${t(language, 'common.footer')} • ${getAppVersion()}`),
        h("button", {
          className: "footer-lang-toggle",
          onClick: toggleLanguage,
          "aria-label": t(language, 'common.languageToggleAria'),
          style: { marginLeft: '12px', fontSize: '0.875rem', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }
        }, language === 'en' ? '🇧🇷 PT' : '🇬🇧 EN')
      )
    );
  }

  // ---- PAGE: BOT ---------------------------------------------
  function Bot({ onBack, onToggleTheme, currentTheme }) {
    const [term, setTerm] = useState("");
    const { playingId, toggle: toggleAudio, teardown: teardownAudio } =
      useHowlerAudio();
    const { faqItems, loading, error, reload } = useFaqData(teardownAudio);

    const list = useMemo(() => {
      const t = term.trim().toLowerCase();
      if (!t) return faqItems;
      return faqItems.filter(({ searchText = "" }) =>
        searchText.includes(t)
      );
    }, [faqItems, term]);

    // stop audio if filtered out
    useEffect(() => {
      if (!playingId) return;
      const stillVisible = list.some(({ id }) => id === playingId);
      if (!stillVisible) teardownAudio();
    }, [list, playingId, teardownAudio]);

    // Track search queries with debounce
    useEffect(() => {
      const searchTerm = term.trim();
      if (!searchTerm) return;
      const timer = setTimeout(() => {
        AnalyticsTracker.trackSearch(searchTerm, list.length);
      }, 1000);
      return () => clearTimeout(timer);
    }, [term, list.length]);

    const handleAudioToggle = useCallback(
      (faq, questionText) => {
        const wasPlaying = playingId === faq.id;
        if (!wasPlaying) {
          AnalyticsTracker.trackAudioPlay('bot', questionText || faq.question);
        }
        toggleAudio(faq.id, faq.audioSrc);
      },
      [toggleAudio, playingId]
    );

    const handleBack = useCallback(() => {
      teardownAudio();
      onBack();
    }, [teardownAudio, onBack]);

    // Hide audio buttons when English selected (audio files not ready)
    const showAudioButtons = language === 'pt-br';

    const hasQuery = term.trim().length > 0;
    const hasResults = list.length > 0;

    let resultContent;
    if (loading) {
      resultContent = h(
        "div",
        { className: "state-message muted" },
        "Carregando sugestões…"
      );
    } else if (error) {
      resultContent = h(
        "div",
        { className: "state-message state-error" },
        h("span", null, error),
        h(
          "button",
          {
            type: "button",
            className: "btn btn-primary btn-retry",
            onClick: () => {
              setTerm("");
              reload();
            },
          },
          "Tentar novamente"
        )
      );
    } else {
      const sections = [];

      if (!hasQuery && hasResults) {
        sections.push(
          h(
            "div",
            { key: "info", className: "bot-info-card" },
            h(
              "span",
              { className: "bot-info-icon", "aria-hidden": "true" },
              "💡"
            ),
            h(
              "div",
              { className: "bot-info-copy" },
              h(
                "p",
                { className: "bot-info-title" },
                "Sugestão: explore todas as perguntas"
              ),
              h(
                "p",
                { className: "bot-info-text" },
                'Use palavras-chave como “prevenção”, “tratamento” ou “testes”.'
              )
            )
          )
        );
      }

      if (!hasResults) {
        sections.push(
          h(
            "div",
            { key: "empty", className: "bot-empty-card" },
            h(
              "span",
              { className: "bot-empty-icon", "aria-hidden": "true" },
              "🔍"
            ),
            h(
              "div",
              null,
              h(
                "p",
                { className: "bot-empty-title" },
                "Nenhuma resposta encontrada"
              ),
              h(
                "p",
                { className: "bot-empty-text" },
                "Tente termos diferentes ou mais gerais para ampliar a busca."
              )
            )
          )
        );
      }

      if (hasResults) {
        sections.push(
          ...list.map((faq) => {
            const isPlaying = playingId === faq.id;
            const audioLabel = isPlaying
              ? "Pausar audiodescrição"
              : "Ouvir audiodescrição";

            // Select language-appropriate content
            const displayQuestion = language === 'en' && faq.questionEn ? faq.questionEn : faq.question;
            const displayAnswer = language === 'en' && faq.answerHtmlEn ? faq.answerHtmlEn : faq.answerHtml;

            return h(
              "article",
              { key: faq.id || faq.question, className: "bot-result" },
              h(
                "div",
                { className: "bot-result-header" },
                h(
                  "h3",
                  { className: "bot-result-title" },
                  displayQuestion || ""
                ),
                showAudioButtons && faq.audioSrc
                  ? h(
                      "button",
                      {
                        type: "button",
                        className: "audio-btn",
                        onClick: () => handleAudioToggle(faq, displayQuestion),
                        "aria-pressed": isPlaying ? "true" : "false",
                        "aria-label": audioLabel,
                      },
                      isPlaying ? "⏸️ Pausar" : "▶️ Audiodescrição"
                    )
                  : null
              ),
              faq.tags && faq.tags.length
                ? h(
                    "div",
                    {
                      className: "bot-tags",
                      "aria-label": "Palavras-chave relacionadas",
                    },
                    ...faq.tags.map((tag, idx) =>
                      h(
                        "span",
                        {
                          key: `${faq.id}-tag-${idx}`,
                          className: "bot-tag",
                        },
                        tag
                      )
                    )
                  )
                : null,
              h("div", {
                className: "bot-result-body muted",
                dangerouslySetInnerHTML: { __html: displayAnswer },
              })
            );
          })
        );
      }

      resultContent = h("div", { className: "bot-results" }, ...sections);
    }

    return h(
      "div",
      { className: "bot-page fade-in theme-transition" },
      h(
        "section",
        { className: "bot-hero" },
        h(
          "div",
          { className: "bot-hero-inner" },
          h(
            "div",
            { className: "bot-hero-copy" },
            h(
              "button",
              { type: "button", className: "bot-back", onClick: handleBack },
              h("span", { "aria-hidden": "true" }, "←"),
              h("span", null, "Voltar")
            ),
            h(
              "span",
              { className: "bot-hero-eyebrow" },
              "Pergunte ao Bot"
            ),
            h(
              "h2",
              { className: "bot-hero-title" },
              "Encontre respostas instantâneas sobre HIV e aids"
            ),
            h(
              "p",
              { className: "bot-hero-description" },
              "Digite a sua dúvida ou explore o acervo completo de perguntas verificadas. As respostas são baseadas em evidências e atualizadas pelo Ministério da Saúde."
            ),
            h(
              "div",
              { className: "bot-hero-highlights" },
              h("span", null, "Busca inteligente"),
              h("span", null, "Audiodescrição em todas as respostas"),
              h("span", null, "Conteúdo sem estigmas")
            )
          ),
          h(
            "div",
            { className: "bot-hero-figure", "aria-hidden": "true" },
            h("img", { src: "./assets/img/hero.png", alt: "" })
          )
        )
      ),
      h(
        "section",
        { className: "bot-content" },
        h(
          "div",
          { className: "bot-search-card" },
          h(
            "h3",
            { className: "bot-search-title" },
            "Faça sua pergunta"
          ),
          h(
            "p",
            { className: "bot-search-description" },
            "Use palavras-chave como “profilaxia”, “transmissão” ou “tratamento”."
          ),
          h(
            "div",
            { className: "bot-search-bar" },
            h(
              "span",
              { className: "bot-search-icon", "aria-hidden": "true" },
              "🔍"
            ),
            h("input", {
              className: "bot-search-input",
              type: "search",
              value: term,
              placeholder: "Ex: Quais são as formas de prevenção?",
              onChange: (e) => setTerm(e.target.value),
            }),
            term.trim()
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "bot-search-clear",
                    onClick: () => setTerm(""),
                  },
                  h("span", { "aria-hidden": "true" }, "✕"),
                  h(
                    "span",
                    { className: "bot-search-clear-label" },
                    "Limpar"
                  )
                )
              : null
          )
        ),
        resultContent
      ),
      h(
        "button",
        {
          className: "theme-toggle-btn",
          onClick: onToggleTheme,
          "aria-label": "Alternar tema"
        },
        currentTheme === "light" ? "🌙" : "☀️"
      )
    );
  }

  // ---- PAGE: PRESENTATION / APRESENTAÇÃO ---------------------
  function Presentation({ onBack, onToggleTheme, currentTheme, language, toggleLanguage }) {
  const { playingId, toggle: toggleAudio, teardown: teardownAudio } =
    useHowlerAudio();

  const [state, setState] = React.useState({
    loading: true,
    error: null,

    eyebrow: "",
    eyebrowEn: "",
    title: "",
    titleEn: "",
    lede: "",
    ledeEn: "",
    language: "",

    paragraphsHtml: "",     // string of HTML for body paragraphs
    paragraphsArray: [],    // array of paragraphs (legacy fallback)
    paragraphsHtmlEn: "",   // English version
    paragraphsArrayEn: [],  // English array version

    disclaimerHtml: "",

    audioSrc: null,
    audioDurationSec: null,

    heroImage: "./assets/img/hero.png"
  });

  // fetch presentation.json on mount
  React.useEffect(() => {
    const controller = new AbortController();

    fetch("./data/presentation.json", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Falha ao carregar apresentação");
        }
        return res.json();
      })
      .then((json) => {
        // paragraphs may come as HTML string OR array
        let paragraphsHtml = "";
        let paragraphsArray = [];
        if (typeof json.paragraphs === "string") {
          paragraphsHtml = json.paragraphs;
        } else if (Array.isArray(json.paragraphs)) {
          paragraphsArray = json.paragraphs;
        }

        // English paragraphs
        let paragraphsHtmlEn = "";
        let paragraphsArrayEn = [];
        if (typeof json.paragraphsEn === "string") {
          paragraphsHtmlEn = json.paragraphsEn;
        } else if (Array.isArray(json.paragraphsEn)) {
          paragraphsArrayEn = json.paragraphsEn;
        }

        const audioObj = json.audioDescription || {};

        setState({
          loading: false,
          error: null,

          eyebrow: json.eyebrow || "Apresentação",
          eyebrowEn: json.eyebrowEn || "Presentation",
          title: json.title || "",
          titleEn: json.titleEn || "",
          lede: json.lede || "",
          ledeEn: json.ledeEn || "",
          language: json.language || "",

          paragraphsHtml,
          paragraphsArray,
          paragraphsHtmlEn,
          paragraphsArrayEn,

          disclaimerHtml: json.disclaimerHtml || "",

          audioSrc: audioObj.src || null,
          audioDurationSec:
            audioObj.durationSec ??
            audioObj.durationSeconds ??
            audioObj.duration ??
            null,

          heroImage: toRelative(json.heroImage || "./assets/img/hero.png")
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            err && err.message
              ? err.message
              : "Erro ao carregar apresentação"
        }));
      });

    return () => controller.abort();
  }, []);

  // stop audio if we navigate away
  React.useEffect(() => {
    return () => teardownAudio({ updateState: false });
  }, [teardownAudio]);

  const audioId = "presentation-intro";
  const isPlaying = playingId === audioId;

  const handleAudio = React.useCallback(() => {
    if (!state.audioSrc) return;
    const wasPlaying = playingId === audioId;
    if (!wasPlaying) {
      AnalyticsTracker.trackAudioPlay('presentation', state.title || t(language, 'apresentacao.title'));
    }
    toggleAudio(audioId, state.audioSrc);
  }, [toggleAudio, state.audioSrc, state.title, playingId, language]);

  const handleBack = React.useCallback((e) => {
    e.preventDefault();
    teardownAudio();
    onBack();
  }, [teardownAudio, onBack]);

  // Hide audio button when English selected (audio not ready yet)
  const showAudioButton = language === 'pt-br';

  // helper to render duration like "50s" or "1m 02s"
  function renderDurationLabel(sec) {
    if (!sec || !Number.isFinite(sec)) return null;
    const total = Number(sec);
    const mins = Math.floor(total / 60);
    const secs = Math.round(total % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  }

  //
  // Loading state
  //
  if (state.loading) {
    return React.createElement(
      "div",
      { className: "page fade-in" },
      React.createElement(
        "header",
        { className: "page-header" },
        React.createElement(
          "a",
          {
            href: "#",
            className: "back-link",
            onClick: handleBack
          },
          `← ${t(language, 'nav.voltar')}`
        ),
        React.createElement("div", { className: "page-header-content" },
          React.createElement("h1", { className: "page-title" }, t(language, 'apresentacao.title')),
          React.createElement("p", { className: "page-subtle" }, t(language, 'apresentacao.subtitle'))
        ),
        React.createElement(
          "button",
          {
            className: "theme-toggle-btn",
            onClick: onToggleTheme,
            "aria-label": t(language, 'common.themeToggleAria')
          },
          currentTheme === "light" ? "🌙" : "☀️"
        ),
        React.createElement(
          "button",
          {
            className: "language-toggle-btn",
            onClick: toggleLanguage,
            "aria-label": t(language, 'common.languageToggleAria')
          },
          language === 'en' ? '🇧🇷 PT' : '🇬🇧 EN'
        )
      ),
      React.createElement(
        "div",
        { className: "presentation-card" },
        React.createElement("p", null, t(language, 'apresentacao.loading'))
      )
    );
  }

  //
  // Error state
  //
  if (state.error) {
    return React.createElement(
      "div",
      { className: "page fade-in" },
      React.createElement(
        "header",
        { className: "page-header" },
        React.createElement(
          "a",
          {
            href: "#",
            className: "back-link",
            onClick: handleBack
          },
          `← ${t(language, 'nav.voltar')}`
        ),
        React.createElement("div", { className: "page-header-content" },
          React.createElement("h1", { className: "page-title" }, t(language, 'apresentacao.title')),
          React.createElement("p", { className: "page-subtle" }, t(language, 'apresentacao.subtitle'))
        ),
        React.createElement(
          "button",
          {
            className: "theme-toggle-btn",
            onClick: onToggleTheme,
            "aria-label": t(language, 'common.themeToggleAria')
          },
          currentTheme === "light" ? "🌙" : "☀️"
        ),
        React.createElement(
          "button",
          {
            className: "language-toggle-btn",
            onClick: toggleLanguage,
            "aria-label": t(language, 'common.languageToggleAria')
          },
          language === 'en' ? '🇧🇷 PT' : '🇬🇧 EN'
        )
      ),
      React.createElement(
        "div",
        { className: "presentation-card" },
        React.createElement("p", null, state.error)
      )
    );
  }

  //
  // Build the presentation text block based on language
  //
  let presentationHtml = "";
  if (language === 'en') {
    // Use English content
    if (state.paragraphsHtmlEn) {
      presentationHtml = state.paragraphsHtmlEn;
    } else if (state.paragraphsArrayEn.length) {
      presentationHtml = state.paragraphsArrayEn.map(p => `<p>${p}</p>`).join("");
    } else if (state.paragraphsHtml) {
      // Fallback to Portuguese if English not available
      presentationHtml = state.paragraphsHtml;
    } else if (state.paragraphsArray.length) {
      presentationHtml = state.paragraphsArray.map(p => `<p>${p}</p>`).join("");
    }
  } else {
    // Use Portuguese content
    if (state.paragraphsHtml) {
      presentationHtml = state.paragraphsHtml;
    } else if (state.paragraphsArray.length) {
      presentationHtml = state.paragraphsArray.map(p => `<p>${p}</p>`).join("");
    }
  }

  if (state.disclaimerHtml) {
    presentationHtml += state.disclaimerHtml;
  }

  //
  // Main rendered page - card-based layout
  //
  return React.createElement(
    "div",
    { className: "page fade-in" },
    // Header
    React.createElement(
      "header",
      { className: "page-header" },
      React.createElement(
        "a",
        {
          href: "#",
          className: "back-link",
          onClick: handleBack
        },
        `← ${t(language, 'nav.voltar')}`
      ),
      React.createElement("div", { className: "page-header-content" },
          React.createElement("h1", { className: "page-title" }, t(language, 'apresentacao.title')),
          React.createElement("p", { className: "page-subtle" }, t(language, 'apresentacao.subtitle'))
        ),
      React.createElement(
        "button",
        {
          className: "theme-toggle-btn",
          onClick: onToggleTheme,
          "aria-label": t(language, 'common.themeToggleAria')
        },
        currentTheme === "light" ? "🌙" : "☀️"
      ),
      React.createElement(
        "button",
        {
          className: "language-toggle-btn",
          onClick: toggleLanguage,
          "aria-label": t(language, 'common.languageToggleAria')
        },
        language === 'en' ? '🇧🇷 PT' : '🇬🇧 EN'
      )
    ),

    // Presentation card
    React.createElement(
      "div",
      { className: "presentation-card" },
      React.createElement(
        "div",
        { className: "presentation-heroimg-wrapper" },
        React.createElement("img", {
          src: state.heroImage,
          alt: t(language, 'apresentacao.subtitle')
        })
      ),
      React.createElement("div", {
        className: "presentation-textblock",
        dangerouslySetInnerHTML: { __html: presentationHtml }
      }),
      showAudioButton && state.audioSrc &&
        React.createElement(
          "div",
          { className: "audio-row" },
          React.createElement(
            "button",
            {
              className: "audio-btn",
              type: "button",
              "aria-pressed": isPlaying ? "true" : "false",
              onClick: handleAudio
            },
            isPlaying ? t(language, 'apresentacao.audioBtnPause') : t(language, 'apresentacao.audioBtnPlay')
          )
        )
    ),

    React.createElement("div", { className: "app-footer-line" },
      h("span", null, `${t(language, 'common.footer')} • ${getAppVersion()}`),
      h("button", {
        className: "footer-lang-toggle",
        onClick: toggleLanguage,
        "aria-label": t(language, 'common.languageToggleAria'),
        style: { marginLeft: '12px', fontSize: '0.875rem', cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }
      }, language === 'en' ? '🇧🇷 PT' : '🇬🇧 EN')
    )
  );
}


  // ---- APP (ROUTER SWITCH + THEME) ---------------------------
  function App() {
    const [route, navigate] = useRoute();
    const { language, toggleLanguage } = useLanguage();

    // Track page views on route change
    useEffect(() => {
      const pageNames = {
        [Routes.HOME]: 'Home',
        [Routes.FAQ]: t(language, 'faq.title'),
        [Routes.BOT]: 'Bot',
        [Routes.ABOUT]: t(language, 'apresentacao.title')
      };
      const pageName = pageNames[route] || 'Home';
      AnalyticsTracker.trackPageView(route, pageName);
    }, [route, language]);

    // theme state: "light" or "dark"
    const [theme, setTheme] = useState(() => {
      // Check URL parameter first
      const params = new URLSearchParams(window.location.search);
      const themeParam = params.get("theme");
      if (themeParam === "light" || themeParam === "dark") {
        return themeParam;
      }
      // Then check localStorage
      const saved = localStorage.getItem('faq-pep-prep-theme');
      return saved === "dark" ? "dark" : "light"; // Default to light
    });

    // apply theme to <html data-theme="...">
    useEffect(() => {
      document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    function toggleTheme() {
      setTheme((t) => {
        const next = t === "light" ? "dark" : "light";
        localStorage.setItem('faq-pep-prep-theme', next);
        // Update URL parameter
        const url = new URL(window.location);
        url.searchParams.set('theme', next);
        window.history.pushState({}, '', url);
        AnalyticsTracker.trackThemeToggle(next);
        return next;
      });
    }

    // render route
    let screen;
    if (route === Routes.FAQ) {
      screen = h(Faq, {
        onBack: () => navigate(Routes.HOME),
        onToggleTheme: toggleTheme,
        currentTheme: theme,
        language,
        toggleLanguage
      });
    } else if (route === Routes.BOT) {
      screen = h(Bot, {
        onBack: () => navigate(Routes.HOME),
        onToggleTheme: toggleTheme,
        currentTheme: theme
      });
    } else if (route === Routes.ABOUT) {
      screen = h(Presentation, {
        onBack: () => navigate(Routes.HOME),
        onToggleTheme: toggleTheme,
        currentTheme: theme,
        language,
        toggleLanguage
      });
    } else {
      screen = h(Home, {
        onNavigate: (nextRoute) => navigate(nextRoute),
        onToggleTheme: toggleTheme,
        currentTheme: theme,
        language,
        toggleLanguage
      });
    }

    return h(
      "main",
      {
        className:
          "app-shell app-root theme-transition bg-page text-primary",
      },
      screen
    );
  }

  // ---- MOUNT REACT ROOT --------------------------------------
  const container = document.getElementById("root");
  const root = ReactDOM.createRoot(container);
  root.render(h(App));
})();
