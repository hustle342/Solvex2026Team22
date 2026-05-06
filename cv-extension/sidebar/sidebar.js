const MESSAGE_TYPES = Object.freeze({
  PDF_FOUND: "RECRUITAI_PDF_FOUND",
  ANALYSIS_STARTED: "RECRUITAI_ANALYSIS_STARTED",
  ANALYSIS_RESULT: "RECRUITAI_ANALYSIS_RESULT",
  ANALYSIS_ERROR: "RECRUITAI_ANALYSIS_ERROR",
  GET_STATE: "RECRUITAI_GET_STATE",
  SAVE_SETTINGS: "RECRUITAI_SAVE_SETTINGS",
  RETRY_ANALYSIS: "RECRUITAI_RETRY_ANALYSIS",
  OPEN_DASHBOARD: "RECRUITAI_OPEN_DASHBOARD"
});

const state = {
  detected: [],
  results: [],
  errors: [],
  activeJobs: {},
  settings: {
    backendUrl: "http://127.0.0.1:8000",
    autoAnalyze: true
  }
};

const elements = {};

const logger = {
  info(event, context = {}) {
    console.info(JSON.stringify({ level: "info", scope: "sidebar", event, ...context }));
  },
  warn(event, context = {}) {
    console.warn(JSON.stringify({ level: "warn", scope: "sidebar", event, ...context }));
  },
  error(event, context = {}) {
    console.error(JSON.stringify({ level: "error", scope: "sidebar", event, ...context }));
  }
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindElements();
  bindEvents();
  loadInitialState();
}

function bindElements() {
  for (const id of [
    "connectionStatus",
    "backendUrl",
    "autoAnalyze",
    "saveSettings",
    "openDashboard",
    "detectedCount",
    "resultCount",
    "errorCount",
    "processingList",
    "resultsList",
    "detectedList",
    "errorsList",
    "emptyResults",
    "chatMessages",
    "chatForm",
    "chatInput"
  ]) {
    elements[id] = document.getElementById(id);
  }
}

function bindEvents() {
  elements.saveSettings.addEventListener("click", saveSettings);
  elements.openDashboard.addEventListener("click", openDashboard);
  elements.chatForm.addEventListener("submit", handleChatSubmit);

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.PDF_FOUND) {
      upsertDetected(message.payload);
    }
    if (message.type === MESSAGE_TYPES.ANALYSIS_STARTED) {
      state.activeJobs[message.payload.id] = message.payload;
      render();
    }
    if (message.type === MESSAGE_TYPES.ANALYSIS_RESULT) {
      delete state.activeJobs[message.payload.id];
      state.results = [message.payload, ...state.results.filter((item) => item.id !== message.payload.id)];
      render();
    }
    if (message.type === MESSAGE_TYPES.ANALYSIS_ERROR) {
      delete state.activeJobs[message.payload.id];
      state.errors = [message.payload, ...state.errors];
      render();
    }
  });
}

async function loadInitialState() {
  setStatus("Baglaniyor", "busy");
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATE });
    if (!response?.ok) {
      throw new Error(response?.error || "Eklenti durumu okunamadi.");
    }
    Object.assign(state, response.state || {});
    state.settings = response.settings || state.settings;
    elements.backendUrl.value = state.settings.backendUrl;
    elements.autoAnalyze.checked = state.settings.autoAnalyze;
    setStatus("Hazir", "idle");
    render();
  } catch (error) {
    setStatus("Hata", "error");
    state.errors.unshift({ id: `state-${Date.now()}`, filename: "Panel", message: error.message });
    render();
    logger.error("initial_state_failed", { error: error.message });
  }
}

async function saveSettings() {
  const backendUrl = elements.backendUrl.value.trim();
  if (!backendUrl) {
    setStatus("URL eksik", "error");
    return;
  }
  setStatus("Kaydediliyor", "busy");
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SAVE_SETTINGS,
      payload: {
        backendUrl,
        autoAnalyze: elements.autoAnalyze.checked
      }
    });
    if (!response?.ok) {
      throw new Error(response?.error || "Ayar kaydedilemedi.");
    }
    state.settings = response.settings;
    setStatus("Kaydedildi", "idle");
  } catch (error) {
    setStatus("Hata", "error");
    state.errors.unshift({ id: `settings-${Date.now()}`, filename: "Ayarlar", message: error.message });
    render();
  }
}

async function openDashboard() {
  const backendUrl = elements.backendUrl.value.trim() || state.settings.backendUrl;
  if (!backendUrl) {
    setStatus("URL eksik", "error");
    return;
  }
  setStatus("Aciliyor", "busy");
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.OPEN_DASHBOARD,
      payload: {
        backendUrl,
        autoAnalyze: elements.autoAnalyze.checked
      }
    });
    if (!response?.ok) {
      throw new Error(response?.error || "Ana uygulama acilamadi.");
    }
    setStatus("Acildi", "idle");
  } catch (error) {
    setStatus("Hata", "error");
    state.errors.unshift({ id: `dashboard-${Date.now()}`, filename: "Uygulama", message: error.message });
    render();
  }
}

function upsertDetected(pdf) {
  state.detected = [pdf, ...state.detected.filter((item) => item.id !== pdf.id)];
  render();
}

function render() {
  const activeJobs = Object.values(state.activeJobs || {});
  elements.detectedCount.textContent = String(state.detected.length);
  elements.resultCount.textContent = String(state.results.length);
  elements.errorCount.textContent = String(state.errors.length);

  elements.processingList.innerHTML = activeJobs.map(renderProcessingCard).join("");
  elements.resultsList.innerHTML = state.results.map(renderResultCard).join("");
  elements.detectedList.innerHTML = state.detected.map(renderDetectedCard).join("");
  elements.errorsList.innerHTML = state.errors.map(renderErrorCard).join("");
  elements.emptyResults.hidden = activeJobs.length + state.results.length > 0;

  elements.detectedList.querySelectorAll("[data-retry-id]").forEach((button) => {
    button.addEventListener("click", () => retryAnalysis(button.dataset.retryId));
  });

  renderChatIntro();
}

function renderProcessingCard(job) {
  return `
    <article class="item processing">
      <div class="item-head">
        <strong>${escapeHtml(job.filename)}</strong>
        <span>Analiz ediliyor</span>
      </div>
      <div class="progress"><span></span></div>
    </article>
  `;
}

function renderResultCard(item) {
  const analysis = item.result?.analysis || {};
  const score = Number(analysis.score || 0);
  const skills = Array.isArray(analysis.skills) ? analysis.skills.slice(0, 8) : [];
  const risks = Array.isArray(analysis.risks) ? analysis.risks.slice(0, 4) : [];
  return `
    <article class="item result">
      <div class="item-head">
        <strong>${escapeHtml(analysis.name || item.filename)}</strong>
        <span>${score}/100</span>
      </div>
      <p>${escapeHtml(analysis.summary || "Analiz sonucu alindi.")}</p>
      <dl>
        <div><dt>Dosya</dt><dd>${escapeHtml(item.filename)}</dd></div>
        <div><dt>Karar</dt><dd>${escapeHtml(analysis.recommendation || "Incele")}</dd></div>
        <div><dt>Deneyim</dt><dd>${escapeHtml(analysis.experience_years ?? "Belirsiz")} yil</dd></div>
      </dl>
      ${skills.length ? `<div class="chips">${skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}</div>` : ""}
      ${risks.length ? `<ul class="risks">${risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>` : ""}
    </article>
  `;
}

function renderDetectedCard(pdf) {
  return `
    <article class="item">
      <div class="item-head">
        <strong>${escapeHtml(pdf.filename)}</strong>
        <button type="button" data-retry-id="${escapeHtml(pdf.id)}">Analiz et</button>
      </div>
      <p>${escapeHtml(pdf.subject || "Gmail PDF eki")}</p>
    </article>
  `;
}

function renderErrorCard(error) {
  return `
    <article class="item error">
      <div class="item-head">
        <strong>${escapeHtml(error.filename || "Hata")}</strong>
        <span>Basarisiz</span>
      </div>
      <p>${escapeHtml(error.message || "Bilinmeyen hata")}</p>
    </article>
  `;
}

async function retryAnalysis(pdfId) {
  const pdf = state.detected.find((item) => item.id === pdfId);
  if (!pdf) {
    return;
  }
  setStatus("Gonderiliyor", "busy");
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RETRY_ANALYSIS, payload: pdf });
    if (!response?.ok) {
      throw new Error(response?.error || "Tekrar analiz baslatilamadi.");
    }
    setStatus("Analizde", "busy");
  } catch (error) {
    state.errors.unshift({ id: `retry-${Date.now()}`, filename: pdf.filename, message: error.message });
    setStatus("Hata", "error");
    render();
  }
}

function handleChatSubmit(event) {
  event.preventDefault();
  const question = elements.chatInput.value.trim();
  if (!question) {
    return;
  }
  const latest = state.results[0]?.result?.analysis;
  addChatMessage("user", question);
  elements.chatInput.value = "";

  if (!latest) {
    addChatMessage("assistant", "Once bir CV analizi tamamlanmali.");
    return;
  }

  const answer = buildLocalAnswer(question, latest);
  addChatMessage("assistant", answer);
}

function renderChatIntro() {
  if (elements.chatMessages.childElementCount > 0) {
    return;
  }
  addChatMessage("assistant", "Son analiz tamamlandiginda aday ozeti, riskler ve takip adimlari hakkinda soru sorabilirsin.");
}

function buildLocalAnswer(question, analysis) {
  const lower = question.toLocaleLowerCase("tr");
  if (lower.includes("risk")) {
    return (analysis.risks || ["Belirgin risk bulunmadi."]).join(" ");
  }
  if (lower.includes("neden") || lower.includes("skor")) {
    return `${analysis.name || "Aday"} icin skor ${analysis.score || 0}/100. ${analysis.summary || ""}`;
  }
  if (lower.includes("takip") || lower.includes("sonraki")) {
    return (analysis.next_steps || ["Adayla kisa bir teknik on gorusme planla."]).join(" ");
  }
  return analysis.summary || "Analiz ozeti henuz bos.";
}

function addChatMessage(role, text) {
  const message = document.createElement("div");
  message.className = `chat-message ${role}`;
  message.textContent = text;
  elements.chatMessages.appendChild(message);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function setActiveTab(tabName) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${tabName}View`);
  });
}

function setStatus(text, mode) {
  elements.connectionStatus.textContent = text;
  elements.connectionStatus.className = `status status-${mode}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
