Browser extension to record web app flows and generate AI-ready `BEHAVIOR.md` files.

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Setup environment**:
   Create a `.env` file with your OpenRouter key:
   ```env
   PLASMO_PUBLIC_OPENROUTER_API_KEY=your_key_here
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   ```

4. **Load in Chrome**:
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select `build/chrome-mv3-dev`

## 🛠️ Tech Stack

- [Plasmo](https://www.plasmo.com/) - Extension Framework
- [React](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/)
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
- [OpenRouter](https://openrouter.ai/) - AI Enhancement (Nemotron)
