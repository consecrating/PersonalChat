# 💕 Liya - AI Girlfriend Companion

A beautiful, private AI companion chat app powered by OpenRouter's free API.

![Liya AI](https://img.shields.io/badge/Powered%20by-OpenRouter-ff69b4)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- 🤖 **Smart AI Companion** - Powered by free LLMs via OpenRouter
- 💕 **Warm Personality** - Sweet, caring, and playful girlfriend persona
- 🧠 **Memory** - Remembers conversation context
- 🎨 **Beautiful UI** - Dark romantic theme, mobile-first design
- 📱 **PWA** - Install on your phone like a native app
- 🔒 **Private** - All data stored locally, no server needed
- ⚡ **Free** - Uses OpenRouter's free models (no cost)
- 🔄 **Multiple Models** - Switch between Llama, Gemma, Mistral, Qwen

## 🚀 Quick Start

1. Get a free API key from [OpenRouter](https://openrouter.ai/keys)
2. Open `index.html` in your browser (or deploy anywhere)
3. Enter your API key and name
4. Start chatting with Liya! 💬

## 📱 Install as App (PWA)

- **Android**: Open in Chrome → Menu → "Add to Home Screen"
- **iOS**: Open in Safari → Share → "Add to Home Screen"
- **Desktop**: Chrome address bar → Install icon

## 🛠️ Tech Stack

- Pure HTML, CSS, JavaScript (no frameworks/dependencies)
- OpenRouter API (OpenAI-compatible)
- Progressive Web App (installable)
- LocalStorage for chat persistence

## 📁 Project Structure

```
├── index.html      → Main chat interface
├── style.css       → Romantic dark theme
├── app.js          → Chat logic, API calls, memory
├── manifest.json   → PWA configuration
├── sw.js           → Service worker (offline support)
└── README.md       → This file
```

## 🎨 Customization

### Change Personality
Edit the `LIYA_SYSTEM_PROMPT` in `app.js` to change Liya's personality, name, or behavior.

### Change Theme
Modify CSS variables in `:root` in `style.css`:
```css
--primary: #e91e63;       /* Main accent color */
--bg: #1a1a2e;            /* Background */
--user-bubble: #e91e63;   /* Your message color */
```

### Change Models
Add more models in the settings dropdown in `index.html`.

## 🔒 Privacy

- All conversations stored in your browser's localStorage
- API key never leaves your device (sent directly to OpenRouter)
- No analytics, tracking, or data collection
- You own your data completely

## 📄 License

MIT - Use it however you want!
