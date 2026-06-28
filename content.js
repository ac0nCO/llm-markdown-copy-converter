(() => {
  if (window.__mdccContentLoaded) {
    window.__mdccScan?.();
    return;
  }
  window.__mdccContentLoaded = true;
  window.__mdccVersion = "2.9.8";
  document.documentElement.dataset.mdccVersion = window.__mdccVersion;

  const TOOL_CLASS = "mdcc-inline-tools";
  const COPY_MARK = "data-mdcc-copy-hooked";
  const buttonMessages = new WeakMap();
  const MESSAGE_SELECTORS = [
    ".markdown",
    "[class*='markdown']",
    "[data-message-id]",
    '[data-message-author-role="assistant"]',
    '[data-testid*="assistant"]',
    '[data-testid*="conversation-turn"]',
    '[data-testid*="message"]',
    '[class*="assistant"]',
    '[class*="message"]',
    "article"
  ];
  const ASSISTANT_ROOT_SELECTOR = [
    '[data-testid*="conversation-turn"]',
    '[data-message-author-role="assistant"]',
    "model-response",
    "[class*='model-response' i]",
    "[class*='assistant-message' i]",
    "[class*='assistant_response' i]",
    "[class*='bot-message' i]",
    "[class*='response-container' i]",
    "article"
  ].join(",");

  const COPY_LABELS = [
    "copy",
    "复制",
    "拷贝",
    "copied",
    "复制文本",
    "copy text",
    "copy response",
    "copy answer"
  ];

  scan();
  new MutationObserver(() => queueScan()).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  let scanTimer = 0;
  function queueScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 500);
  }

  function scan() {
    removeOrphanTools();
    scanAssistantMessages();
  }

  window.__mdccScan = scan;

  function removeOrphanTools() {
    document.querySelectorAll(`.${TOOL_CLASS}`).forEach((tools) => {
      if (
        isInsideUserMessage(tools) ||
        isInsideUserTurn(tools) ||
        isOutsideChatGptTurn(tools) ||
        isForbiddenArea(tools) ||
        isUiChromeArea(tools)
      ) tools.remove();
    });
  }

  function scanAssistantMessages() {
    const roots = uniqueElements(Array.from(document.querySelectorAll(ASSISTANT_ROOT_SELECTOR)));
    roots.forEach((root) => {
      if (!isValidAssistantRoot(root)) return;
      const toolbar = findAssistantToolbar(root);
      if (!toolbar) return;
      if (toolbar.querySelector(`.${TOOL_CLASS}`)) return;

      const controls = Array.from(toolbar.querySelectorAll("button, [role='button']"));
      const anchor = findToolbarAnchor(toolbar, controls);
      if (!anchor || anchor.getAttribute(COPY_MARK) === "1") return;

      anchor.setAttribute(COPY_MARK, "1");
      buttonMessages.set(anchor, root);
      addToolsNearCopyButton(anchor, root);
    });
  }

  function isValidAssistantRoot(root) {
    if (isInsideUserMessage(root)) return false;
    if (isForbiddenArea(root)) return false;
    if (root.matches?.("nav, aside, header, form")) return false;
    if (root.closest?.("nav, aside, header, form")) return false;
    if (root.querySelector?.("textarea, [contenteditable='true']")) return false;
    if (root.matches?.('[data-testid*="conversation-turn"]') && !root.querySelector?.('[data-message-author-role="assistant"]')) return false;
    if (isInsideUserTurn(root)) return false;
    return usefulText(root) && findContainedResponseContent(root);
  }

  function isChatGptPage() {
    return /(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/.test(location.hostname);
  }

  function getConversationTurn(node) {
    return node.closest?.('[data-testid*="conversation-turn"]');
  }

  function isAssistantTurn(turn) {
    return Boolean(turn?.querySelector?.('[data-message-author-role="assistant"]'));
  }

  function isInsideUserTurn(node) {
    if (!isChatGptPage()) return false;
    const turn = getConversationTurn(node);
    if (!turn) return false;
    return !isAssistantTurn(turn) && Boolean(turn.querySelector?.('[data-message-author-role="user"]'));
  }

  function isOutsideChatGptTurn(node) {
    return isChatGptPage() && !getConversationTurn(node);
  }

  function isUiChromeArea(node) {
    const shell = node.closest?.("nav, aside, header, form, dialog, [role='dialog'], textarea, [contenteditable='true']");
    if (!shell) return false;
    const assistant = node.closest?.(ASSISTANT_ROOT_SELECTOR);
    return !assistant || !shell.contains(assistant);
  }

  function isForbiddenArea(node) {
    return Boolean(node.closest?.("pre, code, .code-block, [class*='code-block' i]"));
  }

  function findAssistantToolbar(root) {
    const containedToolbar = chooseToolbar(root, Array.from(root.querySelectorAll("div, span, footer, menu, [class*='toolbar' i], [class*='action' i], [class*='actions' i]")), root);
    if (containedToolbar) return containedToolbar;
    if (isChatGptPage() && root.matches?.('[data-testid*="conversation-turn"]')) return null;

    const candidates = collectAdjacentToolbarCandidates(root);
    return chooseToolbar(root, candidates, null);
  }

  function chooseToolbar(root, candidates, preferredOwner) {
    const toolbars = candidates.filter((candidate) => {
      if (candidate.classList?.contains(TOOL_CLASS) || candidate.closest?.(`.${TOOL_CLASS}`)) return false;
      if (candidate.querySelector?.(`.${TOOL_CLASS}`)) return false;
      if (isForbiddenArea(candidate)) return false;
      if (isUiChromeArea(candidate)) return false;
      if (!isToolbarNearRoot(candidate, root)) return false;
      const controls = Array.from(candidate.querySelectorAll(":scope button, :scope [role='button'], :scope > * > button, :scope > * > [role='button']"));
      return controls.length >= 2 && controls.length <= 12 && looksLikeAssistantToolbar(candidate, controls);
    });

    if (!toolbars.length) return null;
    toolbars.sort((a, b) => {
      const aContained = preferredOwner?.contains(a) ? 1 : 0;
      const bContained = preferredOwner?.contains(b) ? 1 : 0;
      if (aContained !== bContained) return bContained - aContained;
      return b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom;
    });
    return toolbars[0];
  }

  function collectAdjacentToolbarCandidates(root) {
    const selector = "div, span, footer, menu, [class*='toolbar' i], [class*='action' i], [class*='actions' i]";
    const candidates = [];
    const addCandidate = (node) => {
      if (node?.matches?.(selector)) candidates.push(node);
      node?.querySelectorAll?.(selector).forEach((child) => candidates.push(child));
    };

    let node = root;
    for (let depth = 0; node && depth < 4; depth++) {
      let sibling = node.nextElementSibling;
      for (let hops = 0; sibling && hops < 5; hops++) {
        addCandidate(sibling);
        sibling = sibling.nextElementSibling;
      }
      addCandidate(node.parentElement);
      node = node.parentElement;
    }

    return uniqueElements(candidates);
  }

  function isToolbarNearRoot(toolbar, root) {
    if (root.contains(toolbar)) return true;
    const rootRect = root.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    if (!rootRect.width || !rootRect.height || !toolbarRect.width || !toolbarRect.height) return true;
    const verticalGap = toolbarRect.top - rootRect.bottom;
    const overlapsHorizontally = toolbarRect.right >= rootRect.left - 80 && toolbarRect.left <= rootRect.right + 80;
    return verticalGap >= -20 && verticalGap <= 120 && overlapsHorizontally;
  }

  function looksLikeAssistantToolbar(toolbar, controls) {
    const toolbarText = cleanText(toolbar.innerText || toolbar.textContent || "");
    if (toolbarText.length > 80) return false;

    const labels = controls.map(controlLabel).join(" ").toLowerCase();
    if (/edit|编辑|修改/.test(labels) && !/thumb|like|dislike|赞|踩|regenerate|重新|more|更多|share|分享|copy|复制/.test(labels)) {
      return false;
    }

    if (/thumb|like|dislike|赞|踩|regenerate|重新|more|更多|share|分享|copy|复制/.test(labels)) return true;
    return controls.length >= 3 && Boolean(findNearbyAssistantContent(toolbar));
  }

  function findToolbarAnchor(toolbar, controls) {
    const labelledCopy = controls.find((control) => {
      const label = controlLabel(control).toLowerCase();
      return COPY_LABELS.some((word) => label.includes(word)) || /copy/.test(label);
    });
    if (labelledCopy) return labelledCopy;

    const smallControls = controls.filter((control) => {
      const rect = control.getBoundingClientRect();
      return rect.width <= 48 && rect.height <= 48;
    });

    return smallControls[smallControls.length - 1] || controls[controls.length - 1] || toolbar;
  }

  function uniqueElements(elements) {
    return elements.filter((element, index) => elements.indexOf(element) === index);
  }

  function isCopyButton(button) {
    if (button.getAttribute(COPY_MARK) === "1") return false;
    if (button.closest(`.${TOOL_CLASS}`)) return false;
    if (button.closest("pre, code, .code-block, [class*='code-block' i], [class*='highlight' i], [class*='source' i], [class*='citation' i], [class*='reference' i]")) return false;

    const label = controlLabel(button).trim().toLowerCase();

    if (!label) return false;
    return COPY_LABELS.some((word) => label.includes(word)) || /copy-turn|copy-button|copy_response|copyresponse/.test(label);
  }

  function hasInsertedTools(button) {
    if (button.nextElementSibling?.classList?.contains(TOOL_CLASS)) return true;
    if (button.parentElement?.nextElementSibling?.classList?.contains(TOOL_CLASS)) return true;
    return false;
  }

  function getAssistantMessageForCopyButton(button) {
    if (isInsideUserMessage(button)) return null;
    if (isLikelyCodeCopyButton(button)) return null;
    if (isGeminiPage()) return getGeminiMessageForCopyButton(button);
    if (isLikelyUserToolbar(button) && !isAssistantActionToolbar(button)) return null;

    const explicitAssistant = button.closest([
      '[data-message-author-role="assistant"]',
      "model-response",
      "[class*='model-response' i]",
      "[class*='assistant-message' i]",
      "[class*='assistant_response' i]",
      "[class*='bot-message' i]",
      "[class*='response-container' i]"
    ].join(","));
    if (explicitAssistant && usefulText(explicitAssistant) && !isInsideUserMessage(explicitAssistant)) {
      return explicitAssistant;
    }

    if (isAssistantActionToolbar(button)) {
      const nearby = findNearbyAssistantContent(button);
      if (nearby) return nearby;
    }

    const fallback = findNearbyAssistantContent(button);
    if (fallback) return fallback;

    let node = button.parentElement;
    for (let depth = 0; node && depth < 8; depth++) {
      if (isInsideUserMessage(node)) return null;
      if (looksLikeAssistantResponse(node, button)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function getGeminiMessageForCopyButton(button) {
    const explicit = button.closest("model-response, [class*='model-response' i], [class*='response' i], [class*='answer' i]");
    if (explicit && usefulText(explicit) && !isInsideUserMessage(explicit)) return explicit;

    let node = button.parentElement;
    for (let depth = 0; node && depth < 10; depth++) {
      const previous = findPreviousContentSibling(node);
      if (previous) return previous;

      const content = node.querySelector?.(".markdown, [class*='markdown' i], [class*='prose' i], p, h1, h2, h3, ul, ol");
      if (content && usefulText(node) && !isInsideUserMessage(node)) return node;

      node = node.parentElement;
    }
    return null;
  }

  function isAssistantActionToolbar(button) {
    let node = button.parentElement;
    for (let depth = 0; node && depth < 5; depth++) {
      const labels = Array.from(node.querySelectorAll("button, [role='button']")).map(controlLabel).join(" ").toLowerCase();
      const hasAssistantActions = /thumb|like|dislike|赞|踩|regenerate|重新|share|分享|more|更多/.test(labels);
      const hasCopy = COPY_LABELS.some((word) => labels.includes(word));
      if (hasCopy && hasAssistantActions) return true;
      node = node.parentElement;
    }
    return false;
  }

  function findNearbyAssistantContent(button) {
    let node = button.parentElement;
    for (let depth = 0; node && depth < 10; depth++) {
      const previousContent = findPreviousContentSibling(node);
      if (previousContent) return previousContent;

      const containedContent = findContainedResponseContent(node);
      if (containedContent) return containedContent;

      if (usefulText(node) && !isInsideUserMessage(node) && !looksLikeToolbarOnly(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function findPreviousContentSibling(node) {
    let sibling = node.previousElementSibling;
    for (let hops = 0; sibling && hops < 10; hops++) {
      const contained = findContainedResponseContent(sibling);
      if (contained) return contained;
      if (!isInsideUserMessage(sibling) && usefulText(sibling) && !looksLikeToolbarOnly(sibling)) return sibling;
      sibling = sibling.previousElementSibling;
    }
    return null;
  }

  function findContainedResponseContent(node) {
    if (isInsideUserMessage(node)) return null;
    if (
      node.matches?.([
        '[data-message-author-role="assistant"]',
        "model-response",
        "[class*='model-response' i]",
        "[class*='assistant-message' i]",
        "[class*='assistant_response' i]",
        "[class*='bot-message' i]",
        "[class*='response-content' i]",
        "[class*='message-content' i]"
      ].join(",")) &&
      usefulText(node)
    ) {
      return node;
    }
    const candidates = Array.from(node.querySelectorAll?.([
      ".markdown",
      "[class*='markdown' i]",
      "[class*='prose' i]",
      "[data-message-author-role='assistant']",
      "[class*='response-content' i]",
      "[class*='message-content' i]"
    ].join(",")) || []).filter((candidate) => usefulText(candidate) && !isInsideUserMessage(candidate));
    if (!candidates.length) return null;
    candidates.sort((a, b) => cleanText(b.innerText || b.textContent || "").length - cleanText(a.innerText || a.textContent || "").length);
    return candidates[0];
  }

  function looksLikeToolbarOnly(node) {
    const controls = node.querySelectorAll?.("button, [role='button']") || [];
    const text = cleanText(node.innerText || node.textContent || "");
    return controls.length >= 2 && text.length < 40;
  }

  function isInsideUserMessage(node) {
    return Boolean(node.closest?.([
      '[data-message-author-role="user"]',
      "[class*='user-message' i]",
      "[class*='human-message' i]",
      "[class*='query' i]",
      "[class*='prompt-content' i]"
    ].join(",")));
  }

  function isLikelyCodeCopyButton(button) {
    let node = button.parentElement;
    for (let depth = 0; node && depth < 5; depth++) {
      if (node.matches?.("pre, code, .code-block, [class*='code-block' i], [class*='code-container' i], [class*='highlight' i]")) return true;
      if (node.querySelector?.("pre, code") && cleanText(node.textContent || "").length < 800) return true;
      node = node.parentElement;
    }
    return false;
  }

  function isLikelyUserToolbar(button) {
    let node = button.parentElement;
    for (let depth = 0; node && depth < 5; depth++) {
      const controls = Array.from(node.querySelectorAll("button, [role='button']"));
      const labels = controls.map(controlLabel).join(" ").toLowerCase();
      const hasEdit = /edit|编辑|修改/.test(labels);
      const hasFeedback = /thumb|like|dislike|赞|踩|重新|regenerate|share|分享/.test(labels);
      if (hasEdit && !hasFeedback) return true;
      node = node.parentElement;
    }
    return false;
  }

  function controlLabel(control) {
    const descendantLabels = Array.from(control.querySelectorAll?.("[aria-label], [title], [data-testid]") || [])
      .map((node) => [
        node.getAttribute("aria-label"),
        node.getAttribute("title"),
        node.getAttribute("data-testid")
      ].filter(Boolean).join(" "))
      .join(" ");

    return [
      control.getAttribute("aria-label"),
      control.getAttribute("title"),
      control.getAttribute("data-testid"),
      control.textContent,
      descendantLabels
    ].filter(Boolean).join(" ");
  }

  function looksLikeAssistantResponse(node, button) {
    const text = cleanText(node.innerText || node.textContent || "");
    if (text.length < 40) return false;
    if (node.querySelector?.("textarea, [contenteditable='true']")) return false;

    const buttonRect = button.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    if (nodeRect.height > 0 && buttonRect.top < nodeRect.top + nodeRect.height * 0.35) return false;

    const hasAssistantContent = Boolean(node.querySelector?.(".markdown, [class*='markdown' i], [class*='prose' i], p, h1, h2, h3, ul, ol"));
    const hasFeedbackControl = /thumb|like|dislike|赞|踩|regenerate|重新|share|分享/.test(controlLabel(node).toLowerCase());
    return hasAssistantContent || hasFeedbackControl;
  }

  function addToolsNearCopyButton(copyButton, messageOverride) {
    copyButton.setAttribute(COPY_MARK, "1");
    if (copyButton.nextElementSibling?.classList?.contains(TOOL_CLASS)) return;

    const tools = document.createElement("span");
    tools.className = isGeminiPage() ? `${TOOL_CLASS} mdcc-gemini-tools` : TOOL_CLASS;

    const wordBtn = createButton("Word", "复制为 Word 文章格式", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await copyFromPage(copyButton, "word");
    });

    const plainBtn = createButton("聊天", "复制为干净聊天文本", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await copyFromPage(copyButton, "plain");
    });

    tools.append(wordBtn, plainBtn);
    if (messageOverride) buttonMessages.set(copyButton, messageOverride);
    insertTools(copyButton, tools);
  }

  function createButton(text, title, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mdcc-copy-btn";
    button.textContent = text;
    button.setAttribute("aria-label", title);
    button.dataset.tooltip = title;
    button.addEventListener("click", onClick);
    button.addEventListener("mouseenter", () => showTooltip(button));
    button.addEventListener("focus", () => showTooltip(button));
    button.addEventListener("mouseleave", hideTooltip);
    button.addEventListener("blur", hideTooltip);
    return button;
  }

  function isGeminiPage() {
    return location.hostname === "gemini.google.com";
  }

  function insertTools(copyButton, tools) {
    if (!isGeminiPage()) {
      copyButton.insertAdjacentElement("afterend", tools);
      return;
    }

    const anchor = findGeminiToolbarItem(copyButton);
    if (anchor.nextElementSibling?.classList?.contains(TOOL_CLASS)) return;
    anchor.insertAdjacentElement("afterend", tools);
  }

  function findGeminiToolbarItem(copyButton) {
    let node = copyButton;
    for (let depth = 0; node.parentElement && depth < 5; depth++) {
      const parent = node.parentElement;
      const buttons = Array.from(parent.querySelectorAll(":scope > button, :scope > [role='button'], :scope > * > button, :scope > * > [role='button']"));
      if (buttons.length >= 3) return node;

      const siblings = Array.from(parent.children);
      const siblingButtons = siblings.filter((child) => child.matches?.("button,[role='button']") || child.querySelector?.("button,[role='button']"));
      if (siblingButtons.length >= 3) return node;

      if (parent.children.length === 1) {
        node = parent;
        continue;
      }

      const style = getComputedStyle(parent);
      if (style.display.includes("flex") || style.display.includes("grid")) return node;
      node = parent;
    }
    return copyButton;
  }

  async function copyFromPage(anchor, mode) {
    const content = findContentElement(anchor);
    if (!content) {
      showToast("没有找到这条回复正文");
      return;
    }

    // Keep a plain-text snapshot before DOM cleanup, so rich-copy fallback never drops user-visible content.
    const sourceText = extractSourcePlainText(content);
    const cleanNode = cleanMessageClone(content);
    const text = domToPlainText(cleanNode) || sourceText;

    if (mode === "plain") {
      await navigator.clipboard.writeText(text);
      showToast("已复制干净文本");
      return;
    }

    const html = buildWordHtmlFromNode(cleanNode, sourceText);
    await writeClipboard(html, text);
    showToast("已复制 Word 格式");
  }

  function findContentElement(anchor) {
    const message = buttonMessages.get(anchor) || findMessageElement(anchor);
    if (!message) return null;

    const contentSelectors = [
      ".markdown",
      "[class*='markdown']",
      "[data-message-author-role='assistant'] .markdown",
      "[data-message-author-role='assistant']",
      "[data-testid*='message-content']",
      "[class*='message-content']",
      "[class*='response-content']",
      "[class*='answer-content']",
      "[class*='prose']"
    ];

    const candidates = contentSelectors
      .flatMap((selector) => Array.from(message.querySelectorAll(selector)))
      .filter((node) => usefulText(node));

    if (candidates.length) {
      candidates.sort((a, b) => cleanText(b.innerText || b.textContent || "").length - cleanText(a.innerText || a.textContent || "").length);
      return candidates[0];
    }

    return message;
  }

  function findMessageElement(anchor) {
    for (const selector of MESSAGE_SELECTORS) {
      const found = anchor.closest(selector);
      if (found && usefulText(found)) return found;
    }

    let node = anchor.parentElement;
    for (let depth = 0; node && depth < 8; depth++) {
      if (usefulText(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function usefulText(node) {
    const text = cleanText(node.innerText || node.textContent || "");
    return text.length > 6;
  }

  function cleanMessageClone(message) {
    const clone = message.cloneNode(true);
    materializeMathNodes(clone);

    clone.querySelectorAll([
      "button",
      "[role='button']",
      "script",
      "style",
      "textarea",
      "input",
      "svg",
      "img",
      "hr",
      "picture",
      "figure",
      "figcaption",
      "sup",
      `.${TOOL_CLASS}`,
      "[contenteditable='true']",
      "[data-testid*='copy']",
      "[data-testid*='source']",
      "[data-testid*='citation']",
      "[data-testid*='reference']",
      "[aria-label*='来源']",
      "[aria-label*='引用']",
      "[aria-label*='source' i]",
      "[aria-label*='citation' i]",
      "[class*='source' i]",
      "[class*='citation' i]",
      "[class*='reference' i]",
      "[class*='footnote' i]",
      "[class*='popover' i]"
    ].join(",")).forEach((node) => node.remove());

    removeLeadingSpeakerLabel(clone);

    clone.querySelectorAll("a").forEach((link) => {
      const text = cleanText(link.textContent || "");
      const href = link.getAttribute("href") || "";
      if (isCitationLike(text, href)) {
        link.remove();
        return;
      }
      const span = document.createElement("span");
      span.textContent = text;
      link.replaceWith(span);
    });

    materializeMathNodes(clone);

    clone.querySelectorAll("*").forEach((node) => {
      if (node.children.length > 0) return;
      const text = cleanText(node.textContent || "");
      if (isCitationLike(text, "")) node.remove();
    });

    clone.querySelectorAll("[class], [style], [data-testid], [aria-label], [title]").forEach((node) => {
      node.removeAttribute("class");
      node.removeAttribute("style");
      node.removeAttribute("data-testid");
      node.removeAttribute("aria-label");
      node.removeAttribute("title");
    });

    trimEmptyNodes(clone);
    return clone;
  }

  function trimEmptyNodes(root) {
    Array.from(root.querySelectorAll("*")).reverse().forEach((node) => {
      const tag = node.tagName.toLowerCase();
      if (["br", "img", "td", "th"].includes(tag)) return;
      if (!cleanText(node.textContent || "") && node.children.length === 0) node.remove();
    });
  }

  function removeLeadingSpeakerLabel(root) {
    const labels = /^(Gemini|ChatGPT|Claude|DeepSeek|Kimi|豆包|通义|腾讯元宝|元宝|智谱清言)\s*(说|says)?$/i;
    for (const node of Array.from(root.querySelectorAll("h1,h2,h3,h4,p,div,span"))) {
      const text = cleanText(node.textContent || "");
      if (!text) continue;
      if (labels.test(text)) node.remove();
      break;
    }
  }

  function isCitationLike(text, href) {
    if (!text && href) return true;
    if (/^\[?\d+\]?$/.test(text)) return true;
    if (/^\d+\.$/.test(text)) return true;
    if (/^\+?\d+$/.test(text)) return true;
    if (/^[\w.-]+\.(com|cn|org|net|edu|gov)(\s*\+\d+)?$/i.test(text)) return true;
    if (/^来源$|^source$/i.test(text)) return true;
    if (/utm_|citation|source|reference/i.test(href)) return true;
    return false;
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

  function buildWordHtmlFromText(text) {
    const body = textToWordHtml(text);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>${wordCss()}</style>
  </head>
  <body>${body}</body>
</html>`;
  }

  function buildWordHtmlFromNode(node, fallbackText = "") {
    const normalized = normalizeForWord(node);
    const sourceText = cleanText(fallbackText) || domToPlainText(node) || cleanText(node.innerText || node.textContent || "");
    const normalizedText = domToPlainText(normalized) || cleanText(normalized.textContent || "");
    const convertedBody = normalized.innerHTML.trim();
    const body = convertedBody && !isClearlyMissingContent(sourceText, normalizedText)
      ? convertedBody
      : textToWordHtml(sourceText);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>${wordCss()}</style>
  </head>
  <body>${body}</body>
</html>`;
  }

  function domToPlainText(root) {
    const blocks = [];
    collectPlainBlocks(root, blocks, 0);
    const text = blocks
      .map((block) => cleanText(block))
      .filter(Boolean)
      .join("\n\n");
    return cleanText(text).replace(/\n{3,}/g, "\n\n");
  }

  function collectPlainBlocks(node, blocks, depth) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = cleanText(child.textContent || "");
        if (text) blocks.push(text);
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const tag = child.tagName.toLowerCase();
      if (tag === "br") {
        blocks.push("");
        return;
      }

      if (tag === "li") {
        const marker = child.closest("ol") ? `${indexInList(child)}. ` : "• ";
        const text = inlinePlainText(child);
        if (text) blocks.push(`${"  ".repeat(depth)}${marker}${text}`);
        Array.from(child.children)
          .filter((el) => /^(ul|ol)$/i.test(el.tagName))
          .forEach((list) => collectPlainBlocks(list, blocks, depth + 1));
        return;
      }

      if (/^(h1|h2|h3|h4|p|blockquote|pre|td|th)$/i.test(tag)) {
        const text = inlinePlainText(child);
        if (text) blocks.push(text);
        return;
      }

      if (/^(ul|ol)$/i.test(tag)) {
        collectPlainBlocks(child, blocks, depth);
        return;
      }

      if (/^(table|thead|tbody|tr)$/i.test(tag)) {
        collectPlainBlocks(child, blocks, depth);
        return;
      }

      collectPlainBlocks(child, blocks, depth);
    });
  }

  function inlinePlainText(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("ul,ol").forEach((list) => list.remove());
    return cleanText(clone.textContent || "");
  }

  function extractSourcePlainText(node) {
    const clone = node.cloneNode(true);
    materializeMathNodes(clone);
    clone.querySelectorAll([
      "button",
      "[role='button']",
      "script",
      "style",
      "textarea",
      "input",
      "svg",
      "img",
      `.${TOOL_CLASS}`,
      "[data-testid*='copy']",
      "[data-testid*='source']",
      "[data-testid*='citation']",
      "[data-testid*='reference']",
      "[class*='source' i]",
      "[class*='citation' i]",
      "[class*='reference' i]",
      "[class*='footnote' i]",
      "[class*='popover' i]"
    ].join(",")).forEach((item) => item.remove());
    removeLeadingSpeakerLabel(clone);
    return domToPlainText(clone) || cleanText(clone.textContent || "");
  }

  function indexInList(li) {
    const siblings = Array.from(li.parentElement?.children || []).filter((el) => el.tagName?.toLowerCase() === "li");
    return siblings.indexOf(li) + 1;
  }

  function textToWordHtml(text) {
    const blocks = cleanText(text)
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    return blocks.map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return "";

      if (lines.every((line) => /^(\d+\.|[•\-*])\s+/.test(line))) {
        const ordered = lines.every((line) => /^\d+\.\s+/.test(line));
        const tagName = ordered ? "ol" : "ul";
        const items = lines
          .map((line) => line.replace(/^(\d+\.|[•\-*])\s+/, ""))
          .map((line) => `<li style="${inlineWordStyle("li")}">${escapeHtml(line)}</li>`)
          .join("");
        return `<${tagName} style="${inlineWordStyle(tagName)}">${items}</${tagName}>`;
      }

      if (lines.length === 1 && looksLikeHeading(lines[0])) {
        const tagName = headingTag(lines[0]);
        return `<${tagName} style="${inlineWordStyle(tagName)}">${escapeHtml(lines[0])}</${tagName}>`;
      }

      if (block.startsWith(">")) {
        const quote = lines.map((line) => line.replace(/^>\s?/, "")).join("<br>");
        return `<blockquote style="${inlineWordStyle("blockquote")}">${escapeHtmlWithBreaks(quote)}</blockquote>`;
      }

      return `<p style="${inlineWordStyle("p")}">${escapeHtmlWithBreaks(lines.join("<br>"))}</p>`;
    }).join("\n");
  }

  function looksLikeHeading(line) {
    if (line.length > 90) return false;
    if (/^(page|chapter|section)\s+\d+/i.test(line)) return true;
    if (/^第.{1,12}[章节页题]/.test(line)) return true;
    if (/[:：]$/.test(line) && line.length < 50) return true;
    if (/^[A-Z][\w\s—–-]+$/.test(line) && line.length < 70) return true;
    return false;
  }

  function headingTag(line) {
    if (/^(page|chapter)\s+\d+/i.test(line) || /^第.{1,8}[章节页]/.test(line)) return "h2";
    return "h3";
  }

  function normalizeForWord(node) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = node.innerHTML;

    materializeMathNodes(wrapper);
    normalizeChildren(wrapper, true);
    trimEmptyNodes(wrapper);
    return wrapper;
  }

  function normalizeChildren(parent, isRoot = false) {
    Array.from(parent.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = cleanText(child.textContent || "");
        if (!text) {
          child.remove();
          return;
        }

        if (isRoot) {
          const p = document.createElement("p");
          p.textContent = text;
          p.setAttribute("style", inlineWordStyle("p"));
          child.replaceWith(p);
        } else {
          child.textContent = child.textContent.replace(/\s+/g, " ");
        }
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }

      const el = child;
      const tag = el.tagName.toLowerCase();
      const text = cleanText(el.innerText || el.textContent || "");

      el.removeAttribute("class");
      el.removeAttribute("style");
      el.removeAttribute("id");
      el.removeAttribute("data-testid");
      el.removeAttribute("aria-label");
      el.removeAttribute("title");

      if (!text && !["br", "td", "th"].includes(tag)) {
        el.remove();
        return;
      }

      if (isCitationLike(text, el.getAttribute("href") || "")) {
        el.remove();
        return;
      }

      normalizeChildren(el, false);

      if (tag === "div" || tag === "section" || tag === "article") {
        if (!hasBlockChild(el)) {
          const p = document.createElement("p");
          p.innerHTML = el.innerHTML;
          p.setAttribute("style", inlineWordStyle("p"));
          el.replaceWith(p);
          return;
        }
        unwrap(el);
        return;
      }

      if (tag === "span") {
        unwrap(el);
        return;
      }

      if (tag === "br") return;

      if (tag === "li") {
        flattenListItem(el);
        const style = inlineWordStyle(tag);
        if (style) el.setAttribute("style", style);
        return;
      }

      if (!isAllowedWordTag(tag)) {
        if (hasBlockChild(el)) {
          unwrap(el);
          return;
        }
        if (!isRoot && isInlineContext(parent)) {
          unwrap(el);
          return;
        }
        const p = document.createElement("p");
        p.innerHTML = el.innerHTML || escapeHtml(text);
        p.setAttribute("style", inlineWordStyle("p"));
        el.replaceWith(p);
        return;
      }

      const style = inlineWordStyle(tag);
      if (style) el.setAttribute("style", style);
    });
  }

  function unwrap(el) {
    const fragment = document.createDocumentFragment();
    while (el.firstChild) fragment.appendChild(el.firstChild);
    el.replaceWith(fragment);
  }

  function flattenListItem(li) {
    const fragment = document.createDocumentFragment();
    Array.from(li.childNodes).forEach((child) => appendListItemChild(fragment, child));
    li.textContent = "";
    li.appendChild(fragment);
    removeTrailingBreaks(li);
  }

  function appendListItemChild(fragment, node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, " ").trim();
      if (text) fragment.appendChild(document.createTextNode(text + " "));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();

    if (tag === "ul" || tag === "ol") {
      fragment.appendChild(node);
      return;
    }

    if (/^(p|div|section|article|h[1-6]|blockquote)$/i.test(tag)) {
      Array.from(node.childNodes).forEach((child) => appendListItemChild(fragment, child));
      fragment.appendChild(document.createElement("br"));
      return;
    }

    if (tag === "br") {
      fragment.appendChild(document.createElement("br"));
      return;
    }

    if (/^(strong|b|em|i|code|a)$/i.test(tag)) {
      const copy = document.createElement(tag);
      Array.from(node.childNodes).forEach((child) => appendListItemChild(copy, child));
      const style = inlineWordStyle(tag);
      if (style) copy.setAttribute("style", style);
      fragment.appendChild(copy);
      fragment.appendChild(document.createTextNode(" "));
      return;
    }

    const text = cleanText(node.textContent || "");
    if (text) fragment.appendChild(document.createTextNode(text + " "));
  }

  function removeTrailingBreaks(el) {
    while (el.lastChild && el.lastChild.nodeType === Node.ELEMENT_NODE && el.lastChild.tagName.toLowerCase() === "br") {
      el.lastChild.remove();
    }
    if (el.lastChild && el.lastChild.nodeType === Node.TEXT_NODE) {
      el.lastChild.textContent = el.lastChild.textContent.trimEnd();
    }
  }

  function isInlineContext(parent) {
    if (!parent || !parent.tagName) return false;
    return /^(p|li|strong|b|em|i|code|a|span|td|th)$/i.test(parent.tagName);
  }

  function extractMathText(node) {
    const annotation = node.querySelector?.("annotation[encoding*='tex' i], annotation");
    if (annotation && cleanText(annotation.textContent || "")) return normalizeMathText(annotation.textContent || "");

    const aria = node.getAttribute?.("aria-label");
    if (aria && cleanText(aria)) return normalizeMathText(aria);

    const dataLatex = node.getAttribute?.("data-latex") || node.getAttribute?.("data-value") || node.getAttribute?.("alt");
    if (dataLatex && cleanText(dataLatex)) return normalizeMathText(dataLatex);

    const clone = node.cloneNode(true);
    clone.querySelectorAll?.(".katex-html, [aria-hidden='true'], svg").forEach((hidden) => hidden.remove());
    const cloneText = cleanText(clone.textContent || "");
    if (cloneText) return normalizeMathText(cloneText);

    const text = cleanText(node.textContent || "");
    return normalizeMathText(text);
  }

  function materializeMathNodes(root) {
    const nodes = Array.from(root.querySelectorAll(".katex, mjx-container, math, .math-inline, .math-display"))
      .filter((node, index, all) => !all.some((other, otherIndex) => otherIndex !== index && other.contains(node)));

    nodes.forEach((mathNode) => {
      const text = extractMathText(mathNode);
      if (!text) {
        mathNode.remove();
        return;
      }
      const span = document.createElement("span");
      span.textContent = text;
      span.setAttribute("data-mdcc-math", "true");
      mathNode.replaceWith(span);
    });
  }

  function isClearlyMissingContent(sourceText, normalizedText) {
    const source = cleanText(sourceText || "");
    const normalized = cleanText(normalizedText || "");
    if (source.length < 40) return false;
    if (!normalized) return true;
    if (normalized.length < source.length * 0.72) return true;
    const sourceLines = source.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 12);
    const normalizedFlat = normalized.replace(/\s+/g, " ");
    return sourceLines.some((line) => {
      const probe = line.replace(/\s+/g, " ").slice(0, 32);
      return probe.length > 16 && !normalizedFlat.includes(probe);
    });
  }

  function normalizeMathText(text) {
    return normalizeLatexText(cleanText(text))
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeLatexText(value) {
    return value
      .replace(/\\(?:mathbb|mathcal|mathbf|mathrm|mathit|text|operatorname)\s*\{([^{}]+)\}/g, "$1")
      .replace(/\\([{}])/g, "$1")
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
      .replace(/\\in/g, "∈")
      .replace(/\\notin/g, "∉")
      .replace(/\\subseteq/g, "⊆")
      .replace(/\\subset/g, "⊂")
      .replace(/\\cup/g, "∪")
      .replace(/\\cap/g, "∩")
      .replace(/\\emptyset/g, "∅")
      .replace(/\\forall/g, "∀")
      .replace(/\\exists/g, "∃")
      .replace(/\\,/g, " ")
      .replace(/\\;/g, " ")
      .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2")
      .replace(/[{}]/g, "");
  }

  function isAllowedWordTag(tag) {
    return /^(h1|h2|h3|h4|p|ul|ol|li|blockquote|pre|code|table|thead|tbody|tr|th|td|strong|b|em|i|a|br)$/i.test(tag);
  }

  function hasBlockChild(el) {
    return Array.from(el.children).some((child) => /^(p|div|h[1-6]|ul|ol|li|pre|blockquote|table)$/i.test(child.tagName));
  }

  function inlineWordStyle(tag) {
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
      code: "font-family:Consolas,'Cascadia Mono','Courier New',monospace;font-size:10pt;background:#eef2f7;color:#0f172a;",
      table: "border-collapse:collapse;width:100%;margin:4pt 0 5pt;font-size:10.5pt;line-height:20pt;mso-line-height-rule:exactly;font-family:'Microsoft YaHei','DengXian','Segoe UI',Arial,sans-serif;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
      th: "border:1pt solid #cbd5e1;padding:4pt 6pt;vertical-align:top;background:#eef2f7;color:#0f172a;font-weight:700;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
      td: "border:1pt solid #cbd5e1;padding:4pt 6pt;vertical-align:top;color:#111827;text-align:left;letter-spacing:normal;word-spacing:normal;text-justify:none;",
      a: "color:#1d4ed8;text-decoration:underline;"
    };
    return styles[tag] || "";
  }

  function wordCss() {
    return `
      body { font-family: "Microsoft YaHei", "DengXian", "Segoe UI", Arial, sans-serif; color: #111827; font-size: 11pt; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      h1, h2, h3, h4 { color: #0f172a; font-weight: 700; page-break-after: avoid; }
      h1 { font-size: 19pt; line-height: 20pt; mso-line-height-rule: exactly; margin: 9pt 0 4pt; padding-bottom: 2pt; border-bottom: 1pt solid #d9e2ef; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      h2 { font-size: 15pt; line-height: 20pt; mso-line-height-rule: exactly; margin: 8pt 0 3pt; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      h3 { font-size: 12.5pt; line-height: 20pt; mso-line-height-rule: exactly; margin: 6pt 0 2pt; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      h4 { font-size: 11.5pt; line-height: 20pt; mso-line-height-rule: exactly; margin: 5pt 0 2pt; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      p { margin: 0 0 1pt; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      ul, ol { margin: 0 0 1pt 13pt; padding-left: 0; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      li { margin: 0; padding-left: 1pt; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      blockquote { margin: 3pt 0 4pt; padding: 3pt 7pt; border-left: 3pt solid #94a3b8; background: #f8fafc; color: #334155; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      pre { margin: 4pt 0 5pt; padding: 5pt 7pt; border: 1pt solid #d9e2ef; background: #f6f8fb; white-space: pre-wrap; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      code { font-family: Consolas, "Cascadia Mono", "Courier New", monospace; font-size: 10pt; background: #eef2f7; color: #0f172a; }
      pre code { background: transparent; font-size: 10pt; }
      table { border-collapse: collapse; width: 100%; margin: 4pt 0 5pt; font-size: 10.5pt; line-height: 20pt; mso-line-height-rule: exactly; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      th, td { border: 1pt solid #cbd5e1; padding: 4pt 6pt; vertical-align: top; text-align: left; letter-spacing: normal; word-spacing: normal; text-justify: none; }
      th { background: #eef2f7; color: #0f172a; font-weight: 700; }
      a { color: #1d4ed8; text-decoration: underline; }
      strong { font-weight: 700; }
      em { font-style: italic; }
    `;
  }

  function cleanText(text) {
    let cleaned = normalizeLatexText(text)
      .replace(/\u00a0/g, " ")
      .replace(/已思考\s*\d+\s*m\s*\d+\s*s\s*›?/gi, "")
      .replace(/^\s*(Gemini|ChatGPT|Claude|DeepSeek|Kimi|豆包|通义|腾讯元宝|元宝|智谱清言)\s*(说|says)?\s*[\r\n]+/i, "")
      .replace(/^\s*(Word|聊天|来源|source|PDF)\s*$/gim, "")
      .replace(/[ \t]+PDF\s*$/gim, "")
      .replace(/^\s*[\w.-]+\.(com|cn|org|net|edu|gov)(\s*\+\d+)?\s*$/gim, "")
      .replace(/^\s*\+?\d+\s*$/gm, "")
      .replace(/^\s*\d+\.\s*$/gm, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return cleaned;
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtmlWithBreaks(value) {
    return escapeHtml(value).replace(/&lt;br&gt;/g, "<br>");
  }

  function showToast(message) {
    document.querySelectorAll(".mdcc-toast").forEach((node) => node.remove());
    const toast = document.createElement("div");
    toast.className = "mdcc-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1600);
  }

  function showTooltip(anchor) {
    hideTooltip();
    const message = anchor.dataset.tooltip;
    if (!message) return;

    const tip = document.createElement("div");
    tip.className = "mdcc-tooltip";
    tip.textContent = message;
    document.body.appendChild(tip);

    const rect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.left + window.scrollX + rect.width / 2 - tipRect.width / 2;

    tip.style.top = `${Math.min(top, window.scrollY + window.innerHeight - tipRect.height - 8)}px`;
    tip.style.left = `${Math.max(8, Math.min(left, window.scrollX + window.innerWidth - tipRect.width - 8))}px`;
  }

  function hideTooltip() {
    document.querySelectorAll(".mdcc-tooltip").forEach((node) => node.remove());
  }
})();
