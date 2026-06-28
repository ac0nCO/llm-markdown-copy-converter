# Contributing

Thanks for helping improve LLM Markdown Copy Converter.

## Development Principles

- Preserve visible content first. Rich formatting is useful, but it must not come at the cost of missing text.
- Keep Word output stable, simple, editable, and predictable.
- Keep site-specific detection conservative. Inline buttons should attach only to assistant responses, not user prompts, code blocks, input boxes, attachments, or source areas.
- Keep all processing local. Do not add remote upload or telemetry logic.
- Prefer small, focused fixes over broad rewrites, because LLM sites change their DOM frequently.

## Reporting Issues

Please include as much of the following as possible:

- The affected website.
- Extension version.
- Whether you clicked `Word` or `Chat`.
- The target app you pasted into, such as Word, WPS, WeChat, email, or another editor.
- Screenshot of the original LLM answer.
- Screenshot of the pasted result.
- What you expected to happen.

## Pull Requests

Before making changes, run:

```bash
npm test
```

After making changes, run it again:

```bash
npm test
```

If you changed copy or formatting behavior, please manually test at least:

- Plain paragraphs
- Multiple heading levels
- Ordered and unordered lists
- Code blocks
- Tables
- A response with a few formulas or special symbols
- At least one ChatGPT page and one Gemini page, when possible

## Release Checklist

- Update `manifest.json`.
- Update `window.__mdccVersion` near the top of `content.js`.
- Update `package.json`.
- Update `CHANGELOG.md`.
- Run `npm test`.
- Reload the browser extension.
- Refresh supported LLM pages and do a quick manual copy test.
