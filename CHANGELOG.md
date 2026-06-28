# Changelog

## 2.9.9

- Tightened the rich-copy fallback trigger so inline `Word` copy keeps the same rich formatting path as popup copy in normal cases.
- Kept the source-text fallback only for obvious large content loss, instead of switching too eagerly to plain-text reconstruction.

## 2.9.8

- Fixed a case where Word copy could drop visible text around small formula fragments.
- Narrowed formula detection to explicit KaTeX, MathJax, MathML, and known inline/display math nodes.
- Added a source-text fallback before DOM cleanup, so rich-text conversion can rebuild from visible content when needed.

## 2.9.7

- Improved conversion from web-rendered formula nodes to inline plain text.
- Added missing-content detection for Word rich-text conversion.
- Filtered attachment-like labels such as `PDF` from copied output.

## 2.9.6

- Changed Word/WPS output to fixed `20pt` line height.
- Kept inline-page copy and popup copy aligned to the same Word style rules.

## 2.7.0 - 2.9.x

- Improved ChatGPT and Gemini toolbar detection.
- Prevented inline buttons from being inserted into user prompts, code blocks, input boxes, attachments, and source areas.
- Improved plain-text copy so headings, paragraphs, and list breaks are preserved.
- Updated hover tooltip styling to better match native LLM app tooltips.
