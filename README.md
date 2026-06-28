# LLM Markdown Copy Converter

A local Chrome/Edge extension that copies LLM answers as Word-friendly rich text or clean plain text.

Most LLM apps answer in Markdown-like formatting. That is convenient on the web, but it often becomes messy when pasted into Word, WPS, WeChat, email clients, or other editors. This extension adds two small copy buttons to supported LLM pages:

- `Word`: copy the current assistant answer as rich text for Word/WPS.
- `Chat`: copy the current assistant answer as clean plain text.

The extension also includes a popup converter. You can paste Markdown or an LLM answer into the popup and copy it from there.

## Features

- Runs fully locally. No remote API, no upload, no conversation storage.
- Adds inline copy buttons near the native assistant-message toolbar on supported LLM sites.
- Copies Word/WPS-friendly rich text with headings, paragraphs, lists, tables, code blocks, blockquotes, bold, and italic formatting.
- Uses fixed `20pt` line height for Word output, left alignment, normal letter spacing, and normal word spacing.
- Filters source cards, citation badges, image badges, action buttons, and unrelated page UI.
- Converts common KaTeX/MathJax/MathML formula nodes into conservative inline plain text.
- Keeps a source-text fallback before DOM cleanup, reducing the risk of losing visible content during rich-text conversion.
- Copies chat-friendly plain text while preserving useful paragraph and list breaks.
- Uses the same Word style rules for inline-page copying and popup copying.

## Supported Sites

The default `manifest.json` currently matches:

- `chatgpt.com`
- `chat.openai.com`
- `claude.ai`
- `gemini.google.com`
- `perplexity.ai`
- `poe.com`
- `chat.deepseek.com`
- `doubao.com`
- `kimi.moonshot.cn`
- `tongyi.aliyun.com`
- `yuanbao.tencent.com`
- `chatglm.cn`

LLM websites change their DOM frequently. If buttons disappear or attach to the wrong message, please open an issue with the site, extension version, screenshots, and the expected/actual copied output.

## Installation

1. Download or clone this repository.
2. Open the Chrome or Edge extensions page.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `markdown-copy-converter` folder.
6. Refresh your LLM page.

If the inline buttons do not appear, reload the extension and refresh the target page.

## Usage

### Inline Buttons

On supported LLM pages, the extension adds two buttons near the assistant response toolbar:

- `Word`: copies the current assistant answer as Word/WPS-friendly rich text.
- `Chat`: copies the current assistant answer as clean plain text.

### Popup Converter

Click the extension icon in the browser toolbar, paste Markdown or an LLM answer, then choose:

- Copy to Word
- Copy to Chat

## Local Checks

This project has no runtime dependencies. Before opening a PR or publishing a release, run:

```bash
npm test
```

The smoke check verifies:

- Required files exist.
- `manifest.json` is valid enough for the extension layout.
- `manifest.json` and `content.js` use the same version.
- Main JavaScript files pass syntax checks.

On Windows PowerShell, if script execution policy blocks `npm`, use:

```powershell
npm.cmd test
```

## Project Structure

```text
markdown-copy-converter/
  manifest.json       # Chrome MV3 extension manifest
  background.js       # Injects content scripts on supported pages
  content.js          # Inline buttons, message detection, copy conversion
  content.css         # Inline button and tooltip styles
  popup.html          # Popup converter UI
  popup.js            # Popup Markdown conversion logic
  styles.css          # Popup styles
  tests/              # Smoke checks
```

## Privacy

The extension processes page content locally in your browser and writes to the system clipboard. It does not include network upload logic and does not send conversation content to any server.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

[MIT](LICENSE)
