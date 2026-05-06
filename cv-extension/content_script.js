const RECRUITAI_MESSAGE_TYPES = Object.freeze({
  PDF_FOUND: "RECRUITAI_PDF_FOUND"
});

const processedAttachments = new Set();

const logger = {
  info(event, context = {}) {
    console.info(JSON.stringify({ level: "info", scope: "content_script", event, ...context }));
  },
  warn(event, context = {}) {
    console.warn(JSON.stringify({ level: "warn", scope: "content_script", event, ...context }));
  },
  error(event, context = {}) {
    console.error(JSON.stringify({ level: "error", scope: "content_script", event, ...context }));
  }
};

boot();

function boot() {
  scanForPdfAttachments(document.body);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scanForPdfAttachments(node);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  logger.info("observer_started", { url: location.href });
}

function scanForPdfAttachments(root) {
  if (!root?.querySelectorAll) {
    return;
  }

  const candidates = [];
  addIfMatches(root, candidates, "a[href]");
  addIfMatches(root, candidates, "[role='link'][data-tooltip]");
  addIfMatches(root, candidates, "[aria-label*='.pdf' i]");
  addIfMatches(root, candidates, "[data-tooltip*='.pdf' i]");
  candidates.push(
    ...root.querySelectorAll("a[href]"),
    ...root.querySelectorAll("[role='link'][data-tooltip]"),
    ...root.querySelectorAll("[aria-label*='.pdf' i]"),
    ...root.querySelectorAll("[data-tooltip*='.pdf' i]")
  );

  for (const element of candidates) {
    const attachment = extractPdfAttachment(element);
    if (!attachment || processedAttachments.has(attachment.key)) {
      continue;
    }
    processedAttachments.add(attachment.key);
    markDetected(element);
    sendPdfFound(attachment);
  }
}

function addIfMatches(element, candidates, selector) {
  if (element.matches?.(selector)) {
    candidates.push(element);
  }
}

function extractPdfAttachment(element) {
  const link = element.closest("a[href]") || element.querySelector?.("a[href]");
  const href = link?.href || element.getAttribute("href") || "";
  const visibleText = compactText(element.textContent || "");
  const labels = [
    element.getAttribute("download"),
    element.getAttribute("aria-label"),
    element.getAttribute("data-tooltip"),
    element.getAttribute("title"),
    link?.getAttribute("download"),
    link?.getAttribute("aria-label"),
    link?.getAttribute("data-tooltip"),
    link?.getAttribute("title"),
    visibleText
  ].filter(Boolean);

  const filename = inferFilename(labels, href);
  if (!filename || !filename.toLowerCase().endsWith(".pdf")) {
    return null;
  }

  if (!href || href.startsWith("javascript:") || href.startsWith("#")) {
    return null;
  }

  return {
    key: `${href}|${filename}`,
    url: href,
    filename,
    pageUrl: location.href,
    subject: getOpenEmailSubject(),
    detectedAt: new Date().toISOString()
  };
}

function inferFilename(labels, href) {
  for (const label of labels) {
    const match = String(label).match(/[\wğüşöçıİĞÜŞÖÇ().,\-\s]+\.pdf/i);
    if (match) {
      return sanitizeFilename(match[0]);
    }
  }

  try {
    const url = new URL(href);
    const filenameParam = url.searchParams.get("filename") || url.searchParams.get("name");
    if (filenameParam?.toLowerCase().endsWith(".pdf")) {
      return sanitizeFilename(filenameParam);
    }
  } catch (_error) {
    return "";
  }

  return "";
}

function sanitizeFilename(filename) {
  return filename.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}

function compactText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function getOpenEmailSubject() {
  const subject =
    document.querySelector("h2.hP")?.textContent ||
    document.querySelector("[data-thread-perm-id] h2")?.textContent ||
    "";
  return compactText(subject);
}

function markDetected(element) {
  element.setAttribute("data-recruitai-detected", "true");
  element.style.outline = "2px solid #14b8a6";
  element.style.outlineOffset = "2px";
}

async function sendPdfFound(attachment) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: RECRUITAI_MESSAGE_TYPES.PDF_FOUND,
      payload: {
        url: attachment.url,
        filename: attachment.filename,
        pageUrl: attachment.pageUrl,
        subject: attachment.subject,
        detectedAt: attachment.detectedAt
      }
    });

    if (!response?.ok) {
      logger.warn("pdf_message_rejected", { filename: attachment.filename, error: response?.error });
      return;
    }

    logger.info("pdf_message_sent", { filename: attachment.filename, pdfId: response.pdfId });
  } catch (error) {
    logger.error("pdf_message_failed", { filename: attachment.filename, error: error.message });
  }
}
