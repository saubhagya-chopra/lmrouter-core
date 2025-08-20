# LMRouter Core

**LMRouter** is an open-source, all-in-one API router that gives AI developers a single, unified way to connect to the best model providers.

With LMRouter, you don’t need to create accounts on multiple platforms or juggle different API keys. A **single API key** unlocks access to **any provider, any model, any service**, all through one interface.

It’s an **open-source alternative to OpenRouter**, but goes far beyond language models. LMRouter supports multiple modalities and services out of the box:

- **Language**: Chat Completions, Responses API, Anthropic Messages
- **Image**: Image generation and editing
- **Audio**: Speech-to-text and audio models (coming soon)
- **Video**: Video generation (coming soon)
- **Embeddings**: Semantic search and RAG
- **Search**: Jina, Exa, and other web search APIs (coming soon)
- **Code**: Execution with interpreters such as e2b (coming soon)

At the center of this ecosystem is **LMRouter Core**, the high-performance routing engine that handles request forwarding and model proxying.

## Quick Start

LMRouter is still under active development. When the full service is launched, it will be available at [lmrouter.com](https://lmrouter.com).

For now, you can try out LMRouter Core by connecting **Claude Code** to the demo server. This allows Claude Code to run on any model available through OpenRouter, not just Claude itself.

The demo environment proxies requests to OpenRouter and supports both the **OpenAI Chat Completions API** and the **Anthropic Messages API**. It runs in **BYOK (Bring Your Own Key)** mode, which means you’ll need to supply your own OpenRouter API key.

**Connect Claude Code to LMRouter Core**

```bash
ANTHROPIC_BASE_URL=https://core.lmrouter.com/v1/anthropic \
ANTHROPIC_AUTH_TOKEN=BYOK:<YOUR_OPENROUTER_API_KEY> \
ANTHROPIC_MODEL=<YOUR_MODEL_NAME> claude
```

### 🛠️ Local Development/Deployment

To setup LMRouter Core locally, make sure you have Node.js installed, then follow these steps:

```bash
git clone https://github.com/LMRouter/lmrouter-core
cd lmrouter-core
npm install
cp config/config.example.yaml config/config.yaml
```

Edit `config/config.yaml` to set up your own provider and model configurations.

```bash
# Run the server in development mode
npm run dev

# Run the server in production mode
npm run build
npm start
```

## Features

### API Compatibility

LMRouter Core provides drop-in compatibility with existing APIs, so applications that already work with OpenAI or Anthropic can integrate without changes:

```
OpenAI API
  /v1/openai/v1/chat/completions   — Chat Completions
  /v1/openai/v1/images/generations — Image generation
  /v1/openai/v1/images/edits       — Image editing
  /v1/openai/v1/embeddings         — Embeddings
  /v1/openai/v1/responses          — Responses
  /v1/openai/v1/models             — List available models

Anthropic API
  /v1/anthropic/v1/messages        — Messages
  /v1/anthropic/v1/models          — List available models
```

### Multi-Provider Support

LMRouter connects to the broader AI ecosystem, with built-in support for:

- **OpenAI-compatible** — OpenAI, Google, Perplexity, Fireworks, Groq, Cerebras, etc.
- **Anthropic-compatible** — Anthropic, Amazon Bedrock, etc.
- **Fireworks** — FLUX.1 [schnell] FP8, FLUX.1 Kontext Pro, FLUX.1 Kontext Max
- **Google** — Imagen, Gemini image generation, etc.

### Multi-Runtime Deployment

LMRouter Core is built on [Hono](https://hono.dev/) and runs in multiple environments:

- **Node.js** — Standard server deployment
- **Cloudflare Workers** — Lightweight edge deployment at scale

## Contributing

We believe LMRouter should be built **by the community, for the community**. Every contribution, whether it’s fixing a bug, adding a feature, improving documentation, or sharing feedback, helps make LMRouter stronger.

### Roadmap

Checkout our [Kanban](https://github.com/orgs/LMRouter/projects/1) for the latest roadmap.

### How to Get Started

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/my-feature`)
3. **Build** your changes, code, docs, or tests
4. **Verify** everything works as expected
5. **Submit** a pull request and join the conversation

No contribution is too small, even a typo fix helps. And if you have big ideas, we’d love to hear them.

> **Tip:** If you’re not sure where to start, check out the open issues labeled `good first issue`.

## License

LMRouter Core is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
