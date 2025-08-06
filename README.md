# LMRouter Core

**LMRouter Core** is the core routing component of [**LMRouter**](https://lmrouter.com/), an open-source alternative to OpenRouter.

Our vision is to provide a comprehensive routing solution for the entire AI ecosystem, supporting language models, image generation, video generation, and embedding models. We provide interfaces compatible with OpenAI's [**Chat Completions API**](https://platform.openai.com/docs/api-reference/chat/create), as well as the new [**Responses API**](https://platform.openai.com/docs/api-reference/responses/create) and [**Anthropic's Messages API**](https://docs.anthropic.com/en/api/messages), enabling effortless integration with any applications that use these APIs.

> **Note**: LMRouter Core focuses specifically on request routing and model proxying. Advanced features like comprehensive API key management, user administration, billing systems, and analytics are handled by separate projects in the LMRouter ecosystem (currently in active development).

## ⚡ Quick Start

### 🌐 Demo Server

Try out LMRouter Core instantly with our live demo server at **https://core.lmrouter.com/**.

This demo server simply proxies all requests to OpenRouter while exposing both OpenAI Chat Completions and Anthropic Messages APIs. It's perfect for connecting [**Claude Code**](https://www.anthropic.com/claude-code) to any OpenRouter model **without any additional setup on your side**. It's also running under BYOK (Bring Your Own Key) mode, so you need to provide your own API keys for OpenRouter.

To connect with **Claude Code**, run in your terminal:

```bash
ANTHROPIC_BASE_URL=https://core.lmrouter.com/v1/anthropic \
ANTHROPIC_AUTH_TOKEN=BYOK:<YOUR_OPENROUTER_API_KEY> \
ANTHROPIC_MODEL=<YOUR_MODEL_NAME> claude
```

Recently, it's popular to use `qwen/qwen3-coder`, `moonshotai/kimi-k2`, and `openai/gpt-oss-120b` as the model for **Claude Code**,
but feel free to use any model you want.

You can also use the `provider:model` format directly with the demo server:

```bash
ANTHROPIC_BASE_URL=https://core.lmrouter.com/v1/anthropic \
ANTHROPIC_AUTH_TOKEN=BYOK:<YOUR_PROVIDER_API_KEY> \
ANTHROPIC_MODEL=<YOUR_PROVIDER>:<YOUR_MODEL> claude
```

Examples include `cerebras:qwen-3-coder-480b` and `groq:moonshotai/kimi-k2-instruct` for fast inference.

### 🛠️ Local Development/Deployment

To setup LMRouter Core locally, make sure you have Node.js installed, then follow these steps:

```bash
git clone https://github.com/LMRouter/lmrouter-core
cd lmrouter-core
npm install
cp config/config.example.yaml config/config.yaml

# Edit `config/config.yaml` to set up your own provider and model configurations.

# Run the server in development mode
npm run dev

# Run the server in production mode
npm run build
npm start
```

## ✨ Features

### 🤖 Multi-Modal AI Support

- **💬 Language Models**: Chat Completions, Responses API, and Anthropic Messages API with real-time streaming
  - _Note: Responses API currently supports OpenAI models only; more providers will be supported in the future_
- **🎨 Image Generation**: DALL-E 2/3, GPT-Image-1, and other OpenAI image models
  - _Note: Expanded support for additional image generation providers coming soon_
- **🔍 Embeddings**: Text embedding models for semantic search and RAG applications
  - _Note: Expanded support for additional embeddings providers coming soon_
- **🎬 Video Generation**: Video generation models support
  - _Note: Video generation support coming soon_

### 🔗 API Compatibility

**🟢 OpenAI API**:

- `💬 /v1/openai/v1/chat/completions` — Chat Completions API
- `🖼️ /v1/openai/v1/images/generations` — Image generation API
- `✏️ /v1/openai/v1/images/edits` — Image editing API
- `🔍 /v1/openai/v1/embeddings` — Embeddings API
- `⚡ /v1/openai/v1/responses` — Responses API
- `📋 /v1/openai/v1/models` — List available models

**🟣 Anthropic API**:

- `💬 /v1/anthropic/v1/messages` — Messages API
- `📋 /v1/anthropic/v1/models` — List available models

### 🌐 Multi-Provider Support

Connect to the entire AI ecosystem with support for:

- **OpenAI** 🤖 — GPT models and beyond
- **Anthropic** 🧠 — Claude family models
- **Google** 🔍 — Gemini and other AI services
- **OpenRouter** 🔄 — Access to 100+ models
- **Custom Providers** ⚙️ — Any OpenAI/Anthropic-compatible API

### 🎯 Flexible Model Selection

**Two ways to specify models:**

1. **📋 Configuration-Based** — Define models in your `config.yaml`:

   ```yaml
   models:
     gpt-4o:
       providers:
         - provider: openai
           model: gpt-4o
   ```

   Then use: `"model": "gpt-4o"`

2. **⚡ Direct Provider Syntax** — Use the `provider:model` format for instant access:

   ```json
   {
     "model": "openai:gpt-4o",
     "messages": [...]
   }
   ```

   **Examples:**
   - `openai:gpt-4o` → OpenAI's GPT-4o
   - `anthropic:claude-sonnet-4-0` → Anthropic's Claude Sonnet 4
   - `openrouter:qwen/qwen3-coder` → Any OpenRouter model

   This syntax bypasses model configuration and routes directly to the specified provider, making it perfect for quick testing or dynamic model selection.

### 🔐 Authentication & Security

**Flexible Authentication Options:**

- **🔑 API Key Authentication** — Simple, secure key validation
- **🎒 BYOK (Bring Your Own Key)** — Use your provider keys with `BYOK:` prefix

### ⚡ Multi-Runtime Support

**Powered by Hono** — Deploy anywhere:

- **🟢 Node.js** — Traditional server deployment
- **☁️ Cloudflare Workers** — Edge computing at scale

## 🤝 Contributing

We love contributors! 💝 Help us make LMRouter even better:

1. **🍴 Fork** the repository
2. **🌿 Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **💻 Code** your improvements
4. **✅ Test** your changes
5. **📤 Submit** a pull request

Every contribution counts — from bug fixes to new features! 🚀

## 📄 License

LMRouter Core is licensed under the **MIT License**. see the [LICENSE](LICENSE) file for details.
