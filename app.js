// Ensure asset paths work on GitHub Pages subpaths and locally
const toRelative = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;  // leave absolute URLs
  if (url.startsWith('/')) return `.${url}`;  // "/x" -> "./x"
  return url;                                 // already relative
};

(() => {
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    console.error('React 18 bundles are required for the FAQ app.');
    const el = document.getElementById('root');
    if (el) el.innerHTML = '<div class="app-error">Não foi possível carregar o aplicativo. Verifique sua conexão.</div>';
    return;
  }
  if (typeof Howl === 'undefined') {
    console.error('Howler.js is required for audio playback.');
    const el = document.getElementById('root');
    if (el) el.innerHTML = '<div class="app-error">Não foi possível carregar os áudios. Verifique sua conexão.</div>';
    return;
  }

  const { useState, useEffect, useRef, useCallback, useMemo } = React;
  const h = React.createElement;

  function formatDuration(totalSeconds) {
    if (typeof totalSeconds !== 'number' || Number.isNaN(totalSeconds) || totalSeconds < 0) return null;
    const rounded = Math.round(totalSeconds);
    if (rounded < 60) return rounded + 's';
    const minutes = Math.floor(rounded / 60);
    const seconds = String(rounded % 60).padStart(2, '0');
    return minutes + ' m ' + seconds + ' s';
  }

  function extractTextFromHtml(html) {
    if (typeof html !== 'string') return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || '').trim();
  }

  function normalizeFaqEntries(rawEntries) {
    if (!Array.isArray(rawEntries)) return [];
    return rawEntries.reduce((acc, rawEntry, index) => {
      if (!rawEntry || typeof rawEntry !== 'object') return acc;

      const question = typeof rawEntry.question === 'string' ? rawEntry.question.trim() : '';
      const answerHtml = typeof rawEntry.answerHtml === 'string' ? rawEntry.answerHtml.trim() : '';
      if (!question || !answerHtml) return acc;

      const baseId = (typeof rawEntry.id === 'string' && rawEntry.id.trim()) ? rawEntry.id.trim() : 'faq-' + (index + 1);
      const audioConfig = rawEntry.audioDescription || {};
      const fallbackSrc = `./assets/audio/faq${index + 1}.mp3`;
      const audioSrc = (typeof audioConfig.src === 'string' && audioConfig.src.trim()) ? audioConfig.src.trim() : fallbackSrc;
      const durationSec = (typeof audioConfig.durationSec === 'number') ? audioConfig.durationSec : null;

      const tags = Array.isArray(rawEntry.tags) ? rawEntry.tags.filter(Boolean).map(String).map(s => s.trim()) : [];
      const answerText = extractTextFromHtml(answerHtml);
      const searchText = (question + ' ' + answerText + ' ' + tags.join(' ')).toLowerCase();
      const audioDurationLabel = formatDuration(durationSec);

      acc.push({
        id: baseId,
        question,
        answerHtml,
        answerText,
        tags,
        audioSrc: toRelative(audioSrc),
        audioDurationSec: durationSec,
        audioDurationLabel,
        searchText,
        sources: Array.isArray(rawEntry.sources) ? rawEntry.sources : []
      });
      return acc;
    }, []);
  }

  function fetchFaqData(signal) {
    return fetch('./data/faq.json', { signal }).then((res) => {
      if (!res.ok) throw new Error('Não foi possível carregar a FAQ (' + res.status + ')');
      return res.json();
    });
  }
  function fetchPresentationData(signal) {
    return fetch('./data/presentation.json', { signal }).then((res) => {
      if (!res.ok) throw new Error('Não foi possível carregar a apresentação (' + res.status + ')');
      return res.json();
    });
  }

  function useHowlerAudio() {
    const [playingId, setPlayingId] = useState(null);
    const howlRef = useRef(null);
    const currentIdRef = useRef(null);

    const stopAll = useCallback(() => {
      if (howlRef.current) {
        try { howlRef.current.stop(); } catch {}
        try { howlRef.current.unload(); } catch {}
        howlRef.current = null;
      }
      currentIdRef.current = null;
      setPlayingId(null);
    }, []);

    const togglePlay = useCallback((id, src) => {
      if (!id || !src) return;

      // pause/unload if the same track is active
      if (currentIdRef.current === id && howlRef.current) {
        stopAll();
        return;
      }

      // stop any previous
      stopAll();

      const sound = new Howl({
        src: [toRelative(src)],
        html5: true,
        onend: stopAll,
        onstop: stopAll,
        onloaderror: stopAll,
        onplayerror: stopAll
      });

      howlRef.current = sound;
      currentIdRef.current = id;
      setPlayingId(id);
      sound.play();
    }, [stopAll]);

    useEffect(() => () => stopAll(), [stopAll]);

    return { playingId, togglePlay, stopAll };
  }

  function useFaqData(teardownAudio) {
    const [faqItems, setFaqItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const controllerRef = useRef(null);

    const loadFaq = useCallback(() => {
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      if (typeof teardownAudio === 'function') teardownAudio();

      fetchFaqData(controller.signal)
        .then(normalizeFaqEntries)
        .then((items) => { setFaqItems(items); setLoading(false); })
        .catch((err) => {
          if (err && err.name === 'AbortError') return;
          setError(err || new Error('Erro ao carregar FAQ'));
          setLoading(false);
        });
    }, [teardownAudio]);

    useEffect(() => {
      loadFaq();
      return () => { if (controllerRef.current) controllerRef.current.abort(); };
    }, [loadFaq]);

    return { faqItems, loading, error, reload: loadFaq };
  }

  function usePresentationData(teardownAudio) {
    const [presentation, setPresentation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const controllerRef = useRef(null);

    const loadPresentation = useCallback(() => {
      if (controllerRef.current) controllerRef.current.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      if (typeof teardownAudio === 'function') teardownAudio();

      fetchPresentationData(controller.signal)
        .then((data) => { setPresentation(data); setLoading(false); })
        .catch((err) => {
          if (err && err.name === 'AbortError') return;
          setError(err || new Error('Erro ao carregar apresentação'));
          setLoading(false);
        });
    }, [teardownAudio]);

    useEffect(() => {
      loadPresentation();
      return () => { if (controllerRef.current) controllerRef.current.abort(); };
    }, [loadPresentation]);

    return { presentation, loading, error, reload: loadPresentation };
  }

  function BackButton(props) {
    return h('button', {
      type: 'button',
      className: 'back-button',
      onClick: props.onClick,
      'aria-label': 'Voltar para página anterior'
    }, [
      h('span', { className: 'back-button-icon', 'aria-hidden': 'true' }, '←'),
      'Voltar'
    ]);
  }

  function AudioButton(props) {
    const isActive = props.isActive;
    const labelBase = props.labelBase || 'áudio';
    return h('button', {
      type: 'button',
      className: 'audio-button ' + (isActive ? 'is-playing' : ''),
      onClick: props.onClick,
      'aria-pressed': isActive ? 'true' : 'false',
      'aria-label': (isActive ? 'Pausar ' : 'Ouvir ') + labelBase
    }, [
      h('span', { className: 'audio-icon', 'aria-hidden': 'true' }, isActive ? '❚❚' : '▶'),
      isActive ? 'Pausar áudio' : 'Ouvir áudio'
    ]);
  }

  function TagList(props) {
    if (!props.tags || props.tags.length === 0) return null;
    return h('ul', { className: 'tag-list' },
      props.tags.map((tag) => h('li', { key: tag, className: 'tag-chip' }, tag))
    );
  }

  function SourceList(props) {
    if (!props.sources || props.sources.length === 0) return null;
    return h('div', { className: 'source-list' }, [
      h('h3', { className: 'source-title' }, 'Fontes'),
      h('ul', { className: 'source-items' },
        props.sources.map((source, i) => {
          if (!source || typeof source !== 'object') return null;
          const label = typeof source.label === 'string' ? source.label : 'Referência ' + (i + 1);
          const url = typeof source.url === 'string' ? source.url : '#';
          return h('li', { key: label + '-' + i },
            h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', className: 'source-link' }, label)
          );
        })
      )
    ]);
  }

  function HomePage() {
    return h('div', { className: 'page page-home' }, [
      h('section', { className: 'hero hero-home fade-in' }, [
        h('div', { className: 'hero-content' }, [
          h('h1', { className: 'hero-title text-gradient' }, 'Cuidados que acompanham você'),
          h('p', { className: 'hero-subtitle' },
            'Conheça a PrEP e a PEP: tecnologias seguras, gratuitas e acolhedoras disponibilizadas pelo SUS para cuidar de quem você é e de quem você ama.'
          )
        ])
      ]),
      h('section', { className: 'card-section' }, [
        h('div', { className: 'card-grid' }, [
          h('article', { className: 'info-card card-hover gradient-primary' }, [
            h('h2', { className: 'info-card-title' }, 'Apresentação'),
            h('p', { className: 'info-card-text' }, 'Conheça mais sobre PrEP e PEP, suas diferenças e importância na prevenção ao HIV'),
            h('a', { href: '#apresentacao', className: 'info-card-link button-modern button-primary' }, 'Explorar')
          ]),
          h('article', { className: 'info-card card-hover gradient-secondary' }, [
            h('h2', { className: 'info-card-title' }, 'Perguntas Frequentes'),
            h('p', { className: 'info-card-text' }, 'Mais de 40 perguntas e respostas sobre PrEP e PEP com busca inteligente'),
            h('a', { href: '#faq', className: 'info-card-link button-modern button-secondary' }, 'Explorar')
          ]),
          h('article', { className: 'info-card card-hover gradient-accent' }, [
            h('h2', { className: 'info-card-title' }, 'Pergunte ao Bot'),
            h('p', { className: 'info-card-text' }, 'Faça perguntas específicas e encontre respostas personalizadas sobre PrEP e PEP'),
            h('a', { href: '#bot', className: 'info-card-link button-modern button-primary' }, 'Explorar')
          ])
        ])
      ])
    ]);
  }

  function FaqPage(props) {
    const { faqItems, loading, error, reload } = useFaqData(props.stopAllAudio);
    const [query, setQuery] = useState('');
    const [openItems, setOpenItems] = useState({});

    const filteredItems = useMemo(() => {
      const normalized = (query || '').trim().toLowerCase();
      if (!normalized) return faqItems;

      function stripDiacritics(str) {
        try { return String(str).normalize('NFD').replace(/\p{Diacritic}/gu, ''); }
        catch { return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
      }

      const tokens = stripDiacritics(normalized).split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return faqItems;

      return faqItems.filter((item) => {
        const hay = stripDiacritics((item.searchText || '').toLowerCase());
        return tokens.every((t) => hay.indexOf(t) !== -1);
      });
    }, [faqItems, query]);

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function highlightText(text, tokens) {
      if (!tokens || tokens.length === 0) return escapeHtml(text);
      let out = escapeHtml(text);
      tokens.forEach((t) => {
        if (!t) return;
        try {
          const rx = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
          out = out.replace(rx, '<mark class="hl">$1</mark>');
        } catch {}
      });
      return out;
    }
    function highlightHtml(html, tokens) {
      if (!tokens || tokens.length === 0) return html || '';
      const container = document.createElement('div');
      container.innerHTML = html || '';
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      tokens.forEach((t) => {
        if (!t) return;
        const safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let re; try { re = new RegExp(safe, 'ig'); } catch { return; }
        nodes.forEach((textNode) => {
          if (!textNode || !textNode.nodeValue) return;
          if (!re.test(textNode.nodeValue)) return;
          const span = document.createElement('span');
          span.innerHTML = escapeHtml(textNode.nodeValue).replace(re, '<mark class="hl">$&</mark>');
          textNode.parentNode.replaceChild(span, textNode);
        });
      });
      return container.innerHTML;
    }

    const _tokensForHighlight = (query || '').trim()
      ? (query || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean)
      : [];

    useEffect(() => {
      if (!props.playingId) return;
      const stillVisible = filteredItems.some((item) => item.id === props.playingId);
      if (!stillVisible) props.stopAllAudio();
    }, [filteredItems, props.playingId, props.stopAllAudio]);

    const toggleOpenItem = useCallback((id) => {
      setOpenItems((prev) => {
        const next = { ...prev };
        if (next[id]) delete next[id];
        else next[id] = true;
        return next;
      });
    }, []);

    return h('div', { className: 'page page-faq' }, [
      h('header', { className: 'page-header glass-effect' }, [
        h(BackButton, { onClick: () => { window.location.hash = '#home'; props.stopAllAudio(); } }),
        h('div', { className: 'page-header-text' }, [
          h('span', { className: 'page-eyebrow' }, 'Perguntas frequentes'),
          h('h1', { className: 'page-title' }, 'PrEP e PEP sem mistérios')
        ])
      ]),
      h('section', { className: 'search-section' }, [
        h('label', { className: 'search-label', htmlFor: 'faq-search' }, 'Busque por tema ou palavra-chave'),
        h('div', { className: 'search-field' }, [
          h('input', {
            id: 'faq-search',
            className: 'search-input',
            type: 'search',
            value: query,
            placeholder: 'Buscar pergunta...',
            onChange: (e) => setQuery(e.target.value)
          }),
          query
            ? h('button', { type: 'button', className: 'clear-button', onClick: () => { setQuery(''); props.stopAllAudio(); }, 'aria-label': 'Limpar busca' }, 'Limpar')
            : null,
          h('span', { className: 'result-count', 'aria-live': 'polite' }, filteredItems.length + ' resultados')
        ])
      ]),
      loading && h('div', { className: 'status-card status-info glass-effect' }, 'Carregando perguntas...'),
      error && h('div', { className: 'status-card error-card glass-effect' }, [
        h('p', { className: 'status-text' }, 'Não foi possível carregar a FAQ.'),
        h('button', { type: 'button', className: 'button button-primary button-modern', onClick: () => reload() }, 'Tentar novamente')
      ]),
      (!loading && !error && filteredItems.length === 0) &&
        h('div', { className: 'status-card empty-card glass-effect' }, [
          h('p', { className: 'status-text' }, 'Nenhum resultado encontrado. Tente palavras diferentes ou revise a ortografia.')
        ]),
      h('section', { className: 'faq-list' },
        filteredItems.map((item) => {
          const isActive = props.playingId === item.id;
          const isOpen = !!openItems[item.id];
          return h('details', { key: item.id, className: 'faq-item glass-effect', open: isOpen }, [
            h('summary', { className: 'faq-summary', onClick: (e) => e.preventDefault() }, [
              h('button', {
                type: 'button',
                className: 'faq-audio-btn',
                onClick: (e) => { e.stopPropagation(); props.toggleAudio(item.id, item.audioSrc); },
                'aria-pressed': isActive ? 'true' : 'false',
                tabIndex: 0
              }, [ h('span', { className: 'faq-audio-icon', 'aria-hidden': 'true' }, isActive ? '❚❚' : '▶') ]),
              h('span', { className: 'faq-question', dangerouslySetInnerHTML: { __html: highlightText(item.question, _tokensForHighlight) } }),
              h('button', { type: 'button', className: 'faq-open-btn', onClick: (e) => { e.stopPropagation(); toggleOpenItem(item.id); } }, 'Ver resposta')
            ]),
            h('div', { className: 'faq-body' }, [
              h('div', { className: 'faq-answer', dangerouslySetInnerHTML: { __html: highlightHtml(item.answerHtml, _tokensForHighlight) } }),
              h(TagList, { tags: item.tags }),
              h(SourceList, { sources: item.sources })
            ])
          ]);
        })
      )
    ]);
  }

  function PresentationPage(props) {
    const { presentation, loading, error, reload } = usePresentationData(props.stopAllAudio);
    useEffect(() => () => props.stopAllAudio(), [props.stopAllAudio]);

    const title = presentation && presentation.title ? presentation.title : 'Apresentação';
    const descriptionHtml = presentation && presentation.introHtml ? presentation.introHtml : '';
    const disclaimerHtml = presentation && presentation.disclaimerHtml ? presentation.disclaimerHtml : '';
    const heroImage = toRelative(presentation && presentation.heroImage ? presentation.heroImage : './assets/img/hero.png');
    const audioSrc = toRelative((presentation && presentation.audioDescription && presentation.audioDescription.src) ? presentation.audioDescription.src : './assets/audio/presentation.mp3');
    const isActive = props.playingId === 'presentation-audio';

    return h('div', { className: 'page page-presentation' }, [
      h('header', { className: 'presentation-hero glass-effect' }, [
        h(BackButton, { onClick: () => { window.location.hash = '#home'; props.stopAllAudio(); } }),
        h('div', { className: 'presentation-hero-grid' }, [
          h('div', { className: 'presentation-hero-text' }, [
            h('span', { className: 'page-eyebrow' }, 'Apresentação'),
            h('h1', { className: 'page-title' }, title),
            h('p', { className: 'presentation-lead' }, 'Uma jornada informativa sobre PrEP e PEP, celebrando 40 anos de respostas coletivas ao HIV.')
          ]),
          h('div', { className: 'presentation-hero-media' }, [
            h('img', { src: heroImage, alt: 'Ilustração comemorativa da campanha PrEP e PEP', className: 'presentation-image' })
          ])
        ])
      ]),
      loading && h('div', { className: 'status-card status-info glass-effect' }, 'Carregando apresentação...'),
      error && h('div', { className: 'status-card error-card glass-effect' }, [
        h('p', { className: 'status-text' }, 'Não foi possível carregar as informações.'),
        h('button', { type: 'button', className: 'button button-primary button-modern', onClick: () => reload() }, 'Tentar novamente')
      ]),
      (!loading && !error) && h('section', { className: 'presentation-content glass-effect' }, [
        h(AudioButton, {
          isActive,
          onClick: () => props.toggleAudio('presentation-audio', audioSrc),
          labelBase: 'audiodescrição da apresentação'
        }),
        h('div', { className: 'presentation-copy', dangerouslySetInnerHTML: { __html: descriptionHtml } }),
        h('div', { className: 'presentation-disclaimer', dangerouslySetInnerHTML: { __html: disclaimerHtml } })
      ])
    ]);
  }

  function BotPage(props) {
    const { faqItems, loading, error, reload } = useFaqData(props.stopAllAudio);
    const [query, setQuery] = useState('');

    const filteredItems = useMemo(() => {
      const normalized = (query || '').trim().toLowerCase();
      if (!normalized) return faqItems;

      function stripDiacritics(str) {
        try { return String(str).normalize('NFD').replace(/\p{Diacritic}/gu, ''); }
        catch { return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
      }

      const tokens = stripDiacritics(normalized).split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return faqItems;

      return faqItems.filter((item) => {
        const hay = stripDiacritics((item.searchText || '').toLowerCase());
        return tokens.every((t) => hay.indexOf(t) !== -1);
      });
    }, [faqItems, query]);

    useEffect(() => {
      if (!props.playingId) return;
      const stillVisible = filteredItems.some((item) => item.id === props.playingId);
      if (!stillVisible) props.stopAllAudio();
    }, [filteredItems, props.playingId, props.stopAllAudio]);

    return h('div', { className: 'page page-bot' }, [
      h('header', { className: 'bot-hero glass-effect' }, [
        h(BackButton, { onClick: () => { window.location.hash = '#home'; props.stopAllAudio(); } }),
        h('div', { className: 'bot-hero-body' }, [
          h('div', { className: 'bot-hero-text' }, [
            h('span', { className: 'page-eyebrow' }, 'Assistente virtual'),
            h('h1', { className: 'page-title' }, 'Pergunte ao Bot'),
            h('p', { className: 'bot-lead' }, 'Digite sua dúvida e encontre respostas confiáveis sobre PrEP e PEP em segundos.')
          ])
        ])
      ]),
      h('section', { className: 'bot-search glass-effect' }, [
        h('label', { className: 'search-label', htmlFor: 'bot-search-input' }, 'O que você quer saber?'),
        h('div', { className: 'search-field' }, [
          h('input', {
            id: 'bot-search-input',
            className: 'search-input',
            type: 'search',
            value: query,
            placeholder: 'Ex.: Horário de uso, onde retirar, efeitos...',
            onChange: (e) => setQuery(e.target.value)
          }),
          query
            ? h('button', { type: 'button', className: 'clear-button', onClick: () => { setQuery(''); props.stopAllAudio(); }, 'aria-label': 'Limpar busca do bot' }, 'Limpar')
            : null
        ]),
        h('div', { className: 'bot-hint' }, [ h('p', null, 'As respostas são as mesmas da FAQ, mas organizadas para consulta rápida.') ])
      ]),
      loading && h('div', { className: 'status-card status-info glass-effect' }, 'Carregando respostas...'),
      error && h('div', { className: 'status-card error-card glass-effect' }, [
        h('p', { className: 'status-text' }, 'Não foi possível carregar as respostas.'),
        h('button', { type: 'button', className: 'button button-primary button-modern', onClick: () => reload() }, 'Tentar novamente')
      ]),
      (!loading && !error && filteredItems.length === 0) &&
        h('div', { className: 'status-card empty-card glass-effect' }, [
          h('p', { className: 'status-text' }, 'Nada encontrado. Ajuste os termos e tente novamente.')
        ]),
      h('section', { className: 'bot-results' },
        filteredItems.map((item) => {
          const isActive = props.playingId === item.id;
          return h('article', { key: item.id, className: 'bot-result glass-effect' }, [
            h('header', { className: 'bot-result-header' }, [
              h('h2', { className: 'bot-result-title' }, item.question),
              item.audioDurationLabel ? h('span', { className: 'faq-duration' }, item.audioDurationLabel) : null
            ]),
            h('div', { className: 'bot-result-body' }, [
              h(AudioButton, {
                isActive,
                onClick: () => props.toggleAudio(item.id, item.audioSrc),
                labelBase: 'áudio da resposta "' + item.question + '"'
              }),
              h('div', { className: 'faq-answer', dangerouslySetInnerHTML: { __html: item.answerHtml } }),
              h(TagList, { tags: item.tags })
            ]),
            h('footer', { className: 'bot-result-footer' }, [
              h('button', {
                type: 'button',
                className: 'button button-outline button-modern',
                onClick: () => { window.location.hash = '#faq'; }
              }, 'Abrir na FAQ')
            ])
          ]);
        })
      )
    ]);
  }

  function getRouteFromHash() {
    const value = (window.location.hash || '#home').replace('#', '').trim().toLowerCase();
    if (value === 'apresentacao' || value === 'apresentação') return 'apresentacao';
    if (value === 'faq') return 'faq';
    if (value === 'bot') return 'bot';
    return 'home';
  }

  function App() {
    const [currentRoute, setCurrentRoute] = useState(getRouteFromHash());
    const { playingId, togglePlay, stopAll } = useHowlerAudio();

    useEffect(() => {
      if (!window.location.hash) {
        window.location.hash = '#home';
        setCurrentRoute('home');
      }
    }, []);

    useEffect(() => {
      function handleHashChange() { stopAll(); setCurrentRoute(getRouteFromHash()); }
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }, [stopAll]);

    const routeProps = { playingId, toggleAudio: togglePlay, stopAllAudio: stopAll };

    let content;
    if (currentRoute === 'faq') content = h(FaqPage, routeProps);
    else if (currentRoute === 'apresentacao') content = h(PresentationPage, routeProps);
    else if (currentRoute === 'bot') content = h(BotPage, routeProps);
    else content = h(HomePage, routeProps);

    return h('main', { className: 'app-shell' }, content);
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) { console.error('Root element not found'); return; }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function registerServiceWorker() {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.error('Falha ao registrar o service worker:', err);
      });
    });
  }

  if ('createRoot' in ReactDOM) ReactDOM.createRoot(rootElement).render(h(App));
  else ReactDOM.render(h(App), rootElement);
})();