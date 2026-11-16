# Markflow

A fast, minimal Markdown editor with live preview, built with **Electron + Vite + CodeMirror 6**.

## Features

- Live preview with synchronised scrolling
- GitHub-flavoured Markdown (tables, task lists)
- Syntax highlighting (highlight.js) and math (KaTeX)
- Light / dark theme, autosaved draft
- Open / save files, export to PDF (`Ctrl+P` → *Save as PDF*)
- Secure Electron setup: `contextIsolation`, sandbox, sanitised HTML (DOMPurify)

## Getting started

```bash
npm install
npm run dev      # run in the browser (Vite dev server)
npm start        # build and run the desktop app
npm run dist     # package installers into ./release
```

Requires [Node.js](https://nodejs.org/) 18+.

## Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save file |
| `Ctrl+P` | Export PDF |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+K` | Bold / italic / link |

## Author

Serafima Kogan — [@SimaKogan](https://github.com/SimaKogan) · serafima.kogan@gmail.com

## License

[MIT](LICENSE)
