# FAQ PEP e PrEP

Progressive Web App com perguntas frequentes sobre Profilaxia Pré-Exposição (PrEP) e Profilaxia Pós-Exposição (PEP) ao HIV.

## Visão Geral

Aplicação vanilla React (sem build step) com sistema de busca, audiodescrições e alternância de temas (claro/escuro).

## Estrutura

- **index.html** - Ponto de entrada, carrega React via CDN e Google Analytics
- **app.js** - Aplicação React com roteamento hash-based
- **data/faq.json** - Perguntas e respostas com metadados
- **data/presentation.json** - Conteúdo da página de apresentação
- **assets/** - CSS, áudio, imagens

## Rotas

- `#home` - Página inicial com cards de navegação
- `#faq` - Lista de FAQs com busca e audiodescrição
- `#bot` - Interface de busca estilo chatbot
- `#apresentacao` - Página de apresentação do projeto

## Analytics

O aplicativo utiliza Google Analytics 4 (GA4) para rastrear o engajamento dos usuários.

### Configuração

- **Measurement ID**: `G-4KXSKGC60N`
- **Implementação**: Google tag (gtag.js) no `index.html`
- **Utility**: `AnalyticsTracker` em `app.js`

### Eventos Rastreados

#### 1. Visualizações de Página (`page_view`)
Rastreado automaticamente quando o usuário navega entre páginas.

**Parâmetros:**
- `page_title` - Nome da página
- `page_location` - URL completa
- `page_path` - Caminho + hash

**Páginas rastreadas:**
- Home
- Perguntas Frequentes
- Bot
- Apresentação

#### 2. Visualizações de FAQ (`view_faq`)
Rastreado quando um usuário abre/expande uma pergunta FAQ.

**Parâmetros:**
- `event_category`: "engagement"
- `event_label` - Texto da pergunta
- `faq_id` - ID único da FAQ
- `faq_question` - Texto completo da pergunta

**Onde:** FAQ e Bot pages

#### 3. Reprodução de Áudio (`play_audio`)
Rastreado quando um usuário inicia a audiodescrição.

**Parâmetros:**
- `event_category`: "engagement"
- `event_label` - Título do conteúdo
- `audio_type` - Tipo do áudio ("faq", "bot", "presentation")
- `content_title` - Título do conteúdo

**Onde:** FAQ items, Bot results, Apresentação

#### 4. Buscas (`search`)
Rastreado após 1 segundo de inatividade quando o usuário digita na busca.

**Parâmetros:**
- `search_term` - Termo pesquisado
- `result_count` - Número de resultados encontrados

**Onde:** FAQ e Bot pages

#### 5. Alternância de Tema (`toggle_theme`)
Rastreado quando o usuário alterna entre tema claro e escuro.

**Parâmetros:**
- `event_category`: "engagement"
- `event_label` - Novo tema ("light" ou "dark")
- `theme` - Novo tema aplicado

### Visualizando os Dados

1. Acesse [Google Analytics](https://analytics.google.com/)
2. Selecione a propriedade "FAQ PEP e PrEP"
3. Use os seguintes relatórios:
   - **Realtime** → Overview: Atividade ao vivo
   - **Engagement** → Events: Todos os eventos customizados
   - **Engagement** → Pages and screens: Páginas mais visitadas

### Eventos Customizados no GA4

Para criar relatórios customizados:

1. **FAQs Mais Visualizadas**:
   - Event: `view_faq`
   - Dimensão: `faq_question`
   - Métrica: Event count

2. **Termos de Busca Mais Populares**:
   - Event: `search`
   - Dimensão: `search_term`
   - Métrica: Event count

3. **Audiodescrições Mais Ouvidas**:
   - Event: `play_audio`
   - Dimensão: `content_title`
   - Métrica: Event count

4. **Preferência de Tema**:
   - Event: `toggle_theme`
   - Dimensão: `theme`
   - Métrica: Event count

## Desenvolvimento

### Servidor Local

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```

Acesse: `http://localhost:8000`

### Estrutura de Dados

**faq.json:**
```json
[
  {
    "id": "prep-01",
    "question": "O que é PrEP?",
    "answerHtml": "<p>...</p>",
    "tags": ["prevenção", "prep"],
    "audioDescription": {
      "src": "./assets/audio/prep-01.mp3",
      "durationSec": 45
    }
  }
]
```

### Sistema de Temas

Alterna via `data-theme` no `<html>`:
- `data-theme="light"` - Tema claro
- `data-theme="dark"` - Tema escuro

Preferência salva em `localStorage` com chave `faq-pep-prep-theme`.

## PWA Features

- **Service Worker** (`sw.js`) - Cache offline
- **Manifest** (`manifest.json`) - Instalação
- **Áudio** - Howler.js para reprodução

## Tecnologias

- React 18 (CDN, sem JSX)
- Howler.js (áudio)
- Google Analytics 4
- CSS custom properties (temas)
- Service Worker API

## Atualizando Cache

Edite `VERSION` em `sw.js`:
```javascript
const VERSION = "v2"; // incrementar para limpar cache
```
