# Payana CEP Extension

Chrome extension for consulting CEP (Comprobante Electrónico de Pago) from Banxico on Payana transaction detail pages.

## Features

- Appears automatically on `https://app.payana.cloud/transactions/detail/*` pages
- Auto-extracts transaction data from the page (clave de rastreo, fecha, monto, CLABE, bancos)
- Opens Banxico CEP validation page with pre-filled data
- No server required - works entirely in the browser

## Tech Stack

- **TypeScript** - Type-safe development
- **Bun** - Fast package manager and bundler
- **Biome** - Linting and formatting
- **cep-banxico** - Bank codes reference

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Build the extension
bun run build

# 3. Load in Chrome (see Installation below)
```

## Installation

1. Build the extension: `bun run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist` folder from this project

## Usage

1. Navigate to a Payana transaction detail page
2. Click the "CEP Banxico" button (next to "Descargar")
3. Review/edit the auto-filled transaction data
4. Click "Consultar en Banxico"
5. The Banxico CEP page opens in a new tab with all data pre-filled

## Development

```bash
# Install dependencies
bun install

# Build the extension
bun run build

# Lint and format
bun run check:fix
```

### Scripts

| Command | Description |
|---------|-------------|
| `bun run build` | Build the Chrome extension |
| `bun run check` | Run Biome linter |
| `bun run check:fix` | Auto-fix lint issues |
| `bun run format` | Format code |

## Project Structure

```
payana-cep/
├── dist/                    # Built extension (load this in Chrome)
│   ├── content.js
│   ├── manifest.json
│   └── icons/
├── src/
│   └── content.ts           # Content script (injected into page)
├── icons/
│   └── icon.png
├── biome.json               # Biome configuration
├── manifest.json            # Chrome extension manifest (v3)
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
