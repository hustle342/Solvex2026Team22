const MESSAGE_TYPES = Object.freeze({
  PDF_FOUND: "RECRUITAI_PDF_FOUND",
  ANALYSIS_STARTED: "RECRUITAI_ANALYSIS_STARTED",
  ANALYSIS_RESULT: "RECRUITAI_ANALYSIS_RESULT",
  ANALYSIS_ERROR: "RECRUITAI_ANALYSIS_ERROR",
  GET_STATE: "RECRUITAI_GET_STATE",
  STATE_RESPONSE: "RECRUITAI_STATE_RESPONSE",
  SAVE_SETTINGS: "RECRUITAI_SAVE_SETTINGS",
  SETTINGS_UPDATED: "RECRUITAI_SETTINGS_UPDATED",
  RETRY_ANALYSIS: "RECRUITAI_RETRY_ANALYSIS",
  OPEN_DASHBOARD: "RECRUITAI_OPEN_DASHBOARD"
});

const DEFAULT_SETTINGS = Object.freeze({
  backendUrl: "http://127.0.0.1:8000",
  autoAnalyze: true
});

const STATE_KEY = "recruitaiState";
const SETTINGS_KEY = "recruitaiSettings";

const memoryState = {
  detected: [],
  results: [],
  errors: [],
  activeJobs: {}
};

const logger = {
  info(event, context = {}) {
    console.info(JSON.stringify({ level: "info", scope: "background", event, ...context }));
  },
  warn(event, context = {}) {
    console.warn(JSON.stringify({ level: "warn", scope: "background", event, ...context }));
  },
  error(event, context = {}) {
    console.error(JSON.stringify({ level: "error", scope: "background", event, ...context }));
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  logger.info("installed", { backendUrl: settings.backendUrl });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) {
    return;
  }
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) => {
      logger.error("message_failed", { messageType: message?.type, error: error.message });
      sendResponse({ ok: false, error: error.message });
    });
  return true;
});

async function handleMessage(message, sender) {
  if (!message?.type) {
    return { ok: false, error: "Mesaj tipi eksik." };
  }

  if (message.type === MESSAGE_TYPES.GET_STATE) {
    return { ok: true, type: MESSAGE_TYPES.STATE_RESPONSE, state: await loadState(), settings: await getSettings() };
  }

  if (message.type === MESSAGE_TYPES.SAVE_SETTINGS) {
    const settings = normalizeSettings(message.payload || {});
    await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
    await broadcast({ type: MESSAGE_TYPES.SETTINGS_UPDATED, payload: settings });
    return { ok: true, settings };
  }

  if (message.type === MESSAGE_TYPES.OPEN_DASHBOARD) {
    const settings = normalizeSettings(message.payload || (await getSettings()));
    const dashboardUrl = dashboardUrlFromBackend(settings.backendUrl);
    await chrome.tabs.create({ url: dashboardUrl });
    return { ok: true, url: dashboardUrl };
  }

  if (message.type === MESSAGE_TYPES.RETRY_ANALYSIS) {
    const pdf = message.payload;
    await analyzePdf(pdf, sender.tab?.id);
    return { ok: true };
  }

  if (message.type === MESSAGE_TYPES.PDF_FOUND) {
    const pdf = normalizePdfPayload(message.payload, sender);
    await addDetected(pdf);
    await broadcast({ type: MESSAGE_TYPES.PDF_FOUND, payload: pdf });

    const settings = await getSettings();
    if (settings.autoAnalyze) {
      await analyzePdf(pdf, sender.tab?.id);
    }
    return { ok: true, pdfId: pdf.id };
  }

  return { ok: false, error: `Bilinmeyen mesaj tipi: ${message.type}` };
}

async function analyzePdf(pdf, tabId) {
  const settings = await getSettings();
  const startedAt = new Date().toISOString();
  const job = { ...pdf, status: "processing", startedAt };
  memoryState.activeJobs[pdf.id] = job;
  await persistState();
  await broadcast({ type: MESSAGE_TYPES.ANALYSIS_STARTED, payload: job });

  try {
    const pdfBytes = await downloadPdf(pdf.url);
    const pdfBase64 = arrayBufferToBase64(pdfBytes);
    const response = await fetch(`${settings.backendUrl.replace(/\/$/, "")}/api/v1/extension/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filename: pdf.filename,
        pdf_base64: pdfBase64,
        source_url: pdf.url,
        gmail_message_url: pdf.pageUrl,
        metadata: {
          detected_at: pdf.detectedAt,
          sender_tab_id: tabId ?? null,
          gmail_subject: pdf.subject || null
        }
      })
    });

    if (!response.ok) {
      const errorText = await readErrorResponse(response);
      throw new Error(`Backend ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const completed = {
      id: pdf.id,
      filename: pdf.filename,
      pageUrl: pdf.pageUrl,
      completedAt: new Date().toISOString(),
      result
    };
    delete memoryState.activeJobs[pdf.id];
    memoryState.results = [completed, ...memoryState.results.filter((item) => item.id !== pdf.id)].slice(0, 25);
    await persistState();
    await broadcast({ type: MESSAGE_TYPES.ANALYSIS_RESULT, payload: completed });
    logger.info("analysis_completed", { pdfId: pdf.id, filename: pdf.filename, candidateId: result.candidate_id });
  } catch (error) {
    const failed = {
      id: pdf.id,
      filename: pdf.filename,
      pageUrl: pdf.pageUrl,
      url: pdf.url,
      message: error.message,
      occurredAt: new Date().toISOString()
    };
    delete memoryState.activeJobs[pdf.id];
    memoryState.errors = [failed, ...memoryState.errors].slice(0, 25);
    await persistState();
    await broadcast({ type: MESSAGE_TYPES.ANALYSIS_ERROR, payload: failed });
    logger.error("analysis_failed", { pdfId: pdf.id, filename: pdf.filename, error: error.message });
  }
}

async function downloadPdf(url) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`PDF indirilemedi. HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
    logger.warn("unexpected_pdf_content_type", { contentType });
  }

  return response.arrayBuffer();
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function readErrorResponse(response) {
  try {
    const data = await response.json();
    return data.detail || data.message || JSON.stringify(data);
  } catch (_error) {
    return response.text();
  }
}

function normalizePdfPayload(payload, sender) {
  const url = String(payload?.url || "");
  if (!url) {
    throw new Error("PDF URL bulunamadi.");
  }
  const filename = cleanFilename(payload?.filename || "gmail-cv.pdf");
  const pageUrl = payload?.pageUrl || sender.tab?.url || "";
  const rawId = `${url}|${filename}`;
  return {
    id: stableId(rawId),
    url,
    filename,
    pageUrl,
    subject: payload?.subject || "",
    detectedAt: payload?.detectedAt || new Date().toISOString()
  };
}

function cleanFilename(value) {
  const filename = String(value).replace(/\s+/g, " ").trim();
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename || "gmail-cv"}.pdf`;
}

function stableId(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `pdf-${Math.abs(hash)}`;
}

async function getSettings() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY] || DEFAULT_SETTINGS);
}

function normalizeSettings(input) {
  const backendUrl = String(input.backendUrl || DEFAULT_SETTINGS.backendUrl).trim().replace(/\/$/, "");
  return {
    backendUrl,
    autoAnalyze: Boolean(input.autoAnalyze ?? DEFAULT_SETTINGS.autoAnalyze)
  };
}

function dashboardUrlFromBackend(backendUrl) {
  try {
    return new URL("/dashboard/", backendUrl).toString();
  } catch (_error) {
    throw new Error("Ana uygulama URL'si olusturulamadi. Backend URL'yi kontrol et.");
  }
}

async function addDetected(pdf) {
  await loadState();
  memoryState.detected = [pdf, ...memoryState.detected.filter((item) => item.id !== pdf.id)].slice(0, 25);
  await persistState();
  logger.info("pdf_detected", { pdfId: pdf.id, filename: pdf.filename });
}

async function loadState() {
  const stored = await chrome.storage.local.get(STATE_KEY);
  const saved = stored[STATE_KEY] || {};
  memoryState.detected = Array.isArray(saved.detected) ? saved.detected : [];
  memoryState.results = Array.isArray(saved.results) ? saved.results : [];
  memoryState.errors = Array.isArray(saved.errors) ? saved.errors : [];
  memoryState.activeJobs = saved.activeJobs && typeof saved.activeJobs === "object" ? saved.activeJobs : {};
  return memoryState;
}

async function persistState() {
  await chrome.storage.local.set({ [STATE_KEY]: memoryState });
}

async function broadcast(message) {
  try {
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    logger.warn("broadcast_skipped", { messageType: message.type, error: error.message });
  }
}
