const source = document.getElementById("source");
const preview = document.getElementById("preview");
const statusEl = document.getElementById("status");
const copyRich = document.getElementById("copyRich");
const copyPlain = document.getElementById("copyPlain");
const clearBtn = document.getElementById("clear");

const sample = `# 示例标题

这是一段 **加粗**、*斜体*、\`行内代码\`，复制到 Word 会尽量保留接近 Markdown 的层级、字号和行距。

## 常见结构

- 要点一：列表会有更自然的缩进
- 要点二：段落之间会留出阅读间距

> 引用内容会以左侧竖线和柔和底色呈现。

| 场景 | 建议 |
| --- | --- |
| Word | 复制富文本 |
| 微信 | 复制干净文本 |

\`\`\`
console.log("代码块会使用等宽字体和浅色背景");
\`\`\``;

source.value = localStorage.getItem("markdown-copy-source") || sample;
render();

source.addEventListener("input", () => {
  localStorage.setItem("markdown-copy-source", source.value);
  render();
});

copyRich.addEventListener("click", async () => {
  const html = buildWordHtml(source.value);
  const text = markdownToPlain(source.value);
  await writeClipboard(html, text);
  setStatus("已复制 Word 富文本");
});

copyPlain.addEventListener("click", async () => {
  const text = markdownToPlain(source.value);
  await navigator.clipboard.writeText(text);
  setStatus("已复制干净文本");
});

clearBtn.addEventListener("click", () => {
  source.value = "";
  localStorage.removeItem("markdown-copy-source");
  render();
  source.focus();
});

function render() {
  preview.innerHTML = markdownToHtml(source.value);
}

async function writeClipboard(html, text) {
  if (window.ClipboardItem) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" })
      })
    ]);
    return;
  }
  await navigator.clipboard.writeText(text);
}

function setStatus(message) {
  statusEl.textContent = message;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => {
    statusEl.textContent = "";
  }, 1800);
}

function buildWordHtml(input) {
  const body = markdownToHtml(stripLeadingSpeakerLabel(input), "word");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: "Microsoft YaHei", "DengXian", "Segoe UI", Arial, sans-serif;
        color: #111827;
        font-size: 11pt;
        line-height: 20pt; mso-line-height-rule: exactly;
        text-align: left;
        letter-spacing: normal;
        word-spacing: normal;
        text-justify: none;
      }
      h1, h2, h3, h4 {
        font-family: "Microsoft YaHei", "DengXian", "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        font-weight: 700;
        page-break-after: avoid;
      }
      h1 { font-size: 19pt; line-height: 20pt; mso-line-height-rule: exactly; margin: 9pt 0 4pt; padding-bottom: 2pt; border-bottom: 1pt solid #d9e2ef; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      h2 { font-size: 15pt; line-height: 20pt; mso-line-height-rule: exactly; margin: 8pt 0 3pt; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      h3 { font-size: 12.5pt; line-height: 20pt; mso-line-height-rule: exactly; margin: 6pt 0 2pt; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      h4 { font-size: 11.5pt; line-height: 20pt; mso-line-height-rule: exactly; margin: 5pt 0 2pt; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      p { margin: 0 0 1pt; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      ul, ol { margin: 0 0 1pt 13pt; padding-left: 0; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      li { margin: 0; padding-left: 1pt; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      blockquote {
        margin: 3pt 0 4pt;
        padding: 3pt 7pt;
        border-left: 3pt solid #94a3b8;
        background: #f8fafc;
        color: #334155;
        line-height: 20pt; mso-line-height-rule: exactly;
        text-align: left;
        letter-spacing: normal;
        word-spacing: normal;
        text-justify: none;
      }
      pre {
        margin: 4pt 0 5pt;
        padding: 5pt 7pt;
        border: 1pt solid #d9e2ef;
        background: #f6f8fb;
        white-space: pre-wrap;
        line-height: 20pt; mso-line-height-rule: exactly;
        text-align: left;
        letter-spacing: normal;
        word-spacing: normal;
        text-justify: none;
      }
      code {
        font-family: Consolas, "Cascadia Mono", "Courier New", monospace;
        font-size: 10pt;
        background: #eef2f7;
        color: #0f172a;
      }
      pre code {
        background: transparent;
        font-size: 10pt;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 4pt 0 5pt;
        font-size: 10.5pt;
        line-height: 20pt; mso-line-height-rule: exactly;
        text-align: left;
        letter-spacing: normal;
        word-spacing: normal;
        text-justify: none;
      }
      th, td {
        border: 1pt solid #cbd5e1;
        padding: 4pt 6pt;
        vertical-align: top;
      }
      th {
        background: #eef2f7;
        color: #0f172a;
        font-weight: 700;
      }
      a { color: #1d4ed8; text-decoration: underline; }
      strong { font-weight: 700; }
      em { font-style: italic; }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

function markdownToHtml(input, mode = "preview") {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^```/.test(line.trim())) {
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        code.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push(tag("pre", tag("code", escapeHtml(code.join("\n")), mode), mode));
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(tag(`h${level}`, inline(heading[2], mode), mode));
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(tag("blockquote", markdownToHtml(quote.join("\n"), mode), mode));
      continue;
    }

    if (isTableStart(lines, i)) {
      const tableLines = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push(tableToHtml(tableLines, mode));
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const listTag = ordered ? "ol" : "ul";
      const items = [];
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(tag("li", inline(lines[i].replace(pattern, ""), mode), mode));
        i++;
      }
      blocks.push(tag(listTag, items.join(""), mode));
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i].trim()) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(tag("p", inline(para.join(" "), mode), mode));
  }

  return blocks.join("\n");
}

function tag(name, content, mode) {
  if (mode !== "word") return `<${name}>${content}</${name}>`;
  const styles = {
    h1: "font-size:19pt;line-height:20pt;mso-line-height-rule:exactly;margin:9pt 0 4pt;padding-bottom:2pt;border-bottom:1pt solid #d9e2ef;color:#0f172a;font-weight:700;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    h2: "font-size:15pt;line-height:20pt;mso-line-height-rule:exactly;margin:8pt 0 3pt;color:#0f172a;font-weight:700;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    h3: "font-size:12.5pt;line-height:20pt;mso-line-height-rule:exactly;margin:6pt 0 2pt;color:#0f172a;font-weight:700;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    h4: "font-size:11.5pt;line-height:20pt;mso-line-height-rule:exactly;margin:5pt 0 2pt;color:#0f172a;font-weight:700;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    p: "font-size:11pt;line-height:20pt;mso-line-height-rule:exactly;margin:0 0 1pt;color:#111827;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    ul: "font-size:11pt;line-height:20pt;mso-line-height-rule:exactly;margin:0 0 1pt 13pt;padding-left:0;color:#111827;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    ol: "font-size:11pt;line-height:20pt;mso-line-height-rule:exactly;margin:0 0 1pt 13pt;padding-left:0;color:#111827;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    li: "margin:0;padding-left:1pt;line-height:20pt;mso-line-height-rule:exactly;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    blockquote: "font-size:10.8pt;line-height:20pt;mso-line-height-rule:exactly;margin:3pt 0 4pt;padding:3pt 7pt;border-left:3pt solid #94a3b8;background:#f8fafc;color:#334155;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    pre: "font-size:9.8pt;line-height:20pt;mso-line-height-rule:exactly;margin:4pt 0 5pt;padding:5pt 7pt;border:1pt solid #d9e2ef;background:#f6f8fb;white-space:pre-wrap;font-family:Consolas,'Cascadia Mono','Courier New',monospace;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
    code: "font-family:Consolas,'Cascadia Mono','Courier New',monospace;font-size:10pt;background:#eef2f7;color:#0f172a;"
  };
  return `<${name} style="${styles[name] || ""}">${content}</${name}>`;
}

function inline(value, mode) {
  let html = escapeHtml(normalizeLatexText(value));
  html = html.replace(/`([^`]+)`/g, (_, code) => tag("code", code, mode));
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function isTableStart(lines, index) {
  return (
    index + 1 < lines.length &&
    /\|/.test(lines[index]) &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
  );
}

function tableToHtml(tableLines, mode) {
  const rows = tableLines
    .filter((_, index) => index !== 1)
    .map((row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => inline(cell.trim(), mode)));
  if (!rows.length) return "";

  if (mode !== "word") {
    const header = `<thead><tr>${rows[0].map((cell) => `<th>${cell}</th>`).join("")}</tr></thead>`;
    const bodyRows = rows.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`);
    return `<table>${header}<tbody>${bodyRows.join("")}</tbody></table>`;
  }

  const tableStyle = "border-collapse:collapse;width:100%;margin:4pt 0 5pt;font-size:10.5pt;line-height:20pt;mso-line-height-rule:exactly;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;";
  const thStyle = "border:1pt solid #cbd5e1;padding:4pt 6pt;vertical-align:top;background:#eef2f7;color:#0f172a;font-weight:700;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;";
  const tdStyle = "border:1pt solid #cbd5e1;padding:4pt 6pt;vertical-align:top;color:#111827;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;";
  const header = `<thead><tr>${rows[0].map((cell) => `<th style="${thStyle}">${cell}</th>`).join("")}</tr></thead>`;
  const bodyRows = rows.slice(1).map((row) => `<tr>${row.map((cell) => `<td style="${tdStyle}">${cell}</td>`).join("")}</tr>`);
  return `<table style="${tableStyle}">${header}<tbody>${bodyRows.join("")}</tbody></table>`;
}

function markdownToPlain(input) {
  let text = input.replace(/\r\n/g, "\n");
  text = normalizeLatexText(text);
  text = stripLeadingSpeakerLabel(text);
  text = text.replace(/^```[^\n]*\n?/gm, "");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s*>\s?/gm, "");
  text = text.replace(/^\s*[-*+]\s+/gm, "• ");
  text = text.replace(/^\s*\d+\.\s+/gm, (match) => match.trim() + " ");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1（$2）");
  text = text.replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, "");
  text = text.replace(/[ \t]{2,}/g, " ");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function stripLeadingSpeakerLabel(value) {
  return value.replace(/^\s*(Gemini|ChatGPT|Claude|DeepSeek|Kimi|豆包|通义|腾讯元宝|元宝|智谱清言)\s*(说|says)?\s*[\r\n]+/i, "");
}

function normalizeLatexText(value) {
  return value
    .replace(/\\rightarrow/g, "→")
    .replace(/\\to/g, "→")
    .replace(/\\leftarrow/g, "←")
    .replace(/\\leftrightarrow/g, "↔")
    .replace(/\\Rightarrow/g, "⇒")
    .replace(/\\Leftarrow/g, "⇐")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\div/g, "÷")
    .replace(/\\pm/g, "±")
    .replace(/\\leq?/g, "≤")
    .replace(/\\geq?/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "δ")
    .replace(/\\theta/g, "θ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\mu/g, "μ")
    .replace(/\\pi/g, "π")
    .replace(/\\omega/g, "ω")
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2")
    .replace(/[{}]/g, "");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
