// Frontend Sprint 1: Recruiter Workflow

const DEFAULT_CREDENTIALS = {
  email: "recruiter@recruitai.local",
  password: "demo1234",
  role: "recruiter",
};

const PROCESSING_UPDATES = [
  ["Parsing", 32, { overall: 58, contact: 72, experience: 45, skills: 54, education: 51, confidence: "Low" }],
  ["Normalizing", 58, { overall: 76, contact: 86, experience: 69, skills: 78, education: 71, confidence: "Medium" }],
  ["Quality Check", 84, { overall: 87, contact: 94, experience: 82, skills: 89, education: 83, confidence: "High" }],
  ["Ready", 100, { overall: 89, contact: 95, experience: 84, skills: 91, education: 86, confidence: "High" }],
];

function createInitialState() {
  return {
    session: null,
    activeView: "login",
    selectedFile: null,
    error: null,
    processing: null,
    history: [
      {
        id: "cv-1842",
        fileName: "ayse-yilmaz-ai-engineer.pdf",
        status: "Ready",
        progress: 100,
        uploadedAt: "09:42",
        parseQuality: {
          overall: 91,
          contact: 96,
          experience: 88,
          skills: 93,
          education: 86,
          confidence: "High",
        },
      },
      {
        id: "cv-1839",
        fileName: "mehmet-kaya-frontend.pdf",
        status: "Needs Review",
        progress: 100,
        uploadedAt: "09:18",
        parseQuality: {
          overall: 74,
          contact: 83,
          experience: 69,
          skills: 76,
          education: 68,
          confidence: "Medium",
        },
      },
    ],
  };
}

function authenticate(credentials, authService = defaultAuthService) {
  return authService.login(credentials);
}

const defaultAuthService = {
  login(credentials) {
    const email = String(credentials.email || "").trim().toLowerCase();
    const password = String(credentials.password || "");
    const role = String(credentials.role || "");

    if (!email || !password) {
      return { ok: false, message: "Email and password are required." };
    }
    if (role !== DEFAULT_CREDENTIALS.role) {
      return { ok: false, message: "Only Recruiter role is enabled for Sprint 1." };
    }
    if (email !== DEFAULT_CREDENTIALS.email || password !== DEFAULT_CREDENTIALS.password) {
      return { ok: false, message: "Invalid recruiter credentials." };
    }
    return {
      ok: true,
      session: {
        email,
        role,
      },
    };
  },
};

function validatePdfFile(file, maxSizeBytes = 10 * 1024 * 1024) {
  if (!file) {
    return { valid: false, message: "Please select a PDF CV." };
  }

  const fileName = String(file.name || "");
  const mimeType = String(file.type || "");
  const isPdf = fileName.toLowerCase().endsWith(".pdf") || mimeType === "application/pdf";

  if (!isPdf) {
    return { valid: false, message: "Please upload a PDF CV." };
  }
  if (Number(file.size || 0) > maxSizeBytes) {
    return { valid: false, message: "PDF CV must be 10MB or smaller." };
  }
  return { valid: true, message: "" };
}

function createRecruiterWorkflow(options = {}) {
  const root = options.root || (typeof document !== "undefined" ? document.querySelector("#app") : null);
  const authService = options.authService || defaultAuthService;
  const timerApi = options.timerApi || (typeof window !== "undefined" ? window : globalThis);
  const clock = options.clock || (() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const state = options.state || createInitialState();

  const controller = {
    state,
    root,
    render() {
      if (!root) return;
      if (!state.session) {
        root.innerHTML = loginView(state);
        this.bindLogin();
        return;
      }

      root.innerHTML = dashboardView(state);
      this.bindDashboard();
    },
    bindLogin() {
      const form = root.querySelector("#loginForm");
      if (!form) return;
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        this.handleLogin({
          email: root.querySelector("#email").value,
          password: root.querySelector("#password").value,
          role: root.querySelector("#role").value,
        });
      });
    },
    bindDashboard() {
      const logoutButton = root.querySelector("#logoutButton");
      if (logoutButton) {
        logoutButton.addEventListener("click", () => this.logout());
      }

      const input = root.querySelector("#fileInput");
      if (input) {
        input.addEventListener("change", () => this.selectFile(input.files[0]));
      }

      const dropZone = root.querySelector("#dropZone");
      if (dropZone) {
        dropZone.addEventListener("dragover", (event) => {
          event.preventDefault();
          dropZone.classList.add("dragging");
        });
        dropZone.addEventListener("dragleave", () => {
          dropZone.classList.remove("dragging");
        });
        dropZone.addEventListener("drop", (event) => {
          event.preventDefault();
          dropZone.classList.remove("dragging");
          this.selectFile(event.dataTransfer.files[0]);
        });
      }

      const startButton = root.querySelector("#startProcessing");
      if (startButton) {
        startButton.addEventListener("click", () => {
          if (state.selectedFile) {
            this.startProcessing(state.selectedFile);
          }
        });
      }
    },
    handleLogin(credentials) {
      const result = authenticate(credentials, authService);
      if (!result.ok) {
        state.error = result.message;
        this.render();
        return false;
      }

      state.session = result.session;
      state.error = null;
      state.activeView = "dashboard";
      this.render();
      return true;
    },
    logout() {
      state.session = null;
      state.selectedFile = null;
      state.error = null;
      state.activeView = "login";
      this.render();
    },
    selectFile(file) {
      const result = validatePdfFile(file);
      if (!result.valid) {
        state.error = result.message;
        state.selectedFile = null;
        this.render();
        return false;
      }

      state.selectedFile = file;
      state.error = null;
      this.render();
      return true;
    },
    startProcessing(file) {
      const result = validatePdfFile(file);
      if (!result.valid) {
        state.error = result.message;
        this.render();
        return false;
      }

      state.processing = {
        id: `cv-${Date.now()}`,
        fileName: file.name,
        status: "Queued",
        progress: 8,
        uploadedAt: clock(),
        parseQuality: {
          overall: 42,
          contact: 48,
          experience: 36,
          skills: 44,
          education: 40,
          confidence: "Calculating",
        },
      };
      state.selectedFile = null;
      state.error = null;
      this.render();

      PROCESSING_UPDATES.forEach(([status, progress, quality], index) => {
        timerApi.setTimeout(() => {
          if (!state.processing) return;
          state.processing.status = status;
          state.processing.progress = progress;
          state.processing.parseQuality = quality;
          this.render();
        }, (index + 1) * 900);
      });
      return true;
    },
    seedDemoFromQuery(search) {
      const params = new URLSearchParams(search || (typeof window !== "undefined" ? window.location.search : ""));
      if (params.get("demo") !== "ready") return false;

      state.session = {
        email: DEFAULT_CREDENTIALS.email,
        role: DEFAULT_CREDENTIALS.role,
      };
      state.processing = {
        id: "cv-demo-ready",
        fileName: "demo-senior-ai-engineer.pdf",
        status: "Ready",
        progress: 100,
        uploadedAt: clock(),
        parseQuality: {
          overall: 89,
          contact: 95,
          experience: 84,
          skills: 91,
          education: 86,
          confidence: "High",
        },
      };
      return true;
    },
  };

  return controller;
}

function loginView(state) {
  return `
    <section class="login-layout">
      <div class="brand-panel">
        <div class="brand-mark">RA</div>
        <h1>RecruitAI</h1>
        <p>CV upload, parsing status, and quality monitoring for recruiter review.</p>
        <div class="metric-strip">
          <span><strong>50%</strong> workload target</span>
          <span><strong>90%</strong> parse quality goal</span>
        </div>
      </div>

      <form class="login-card" id="loginForm">
        <div>
          <p class="eyebrow">Recruiter Access</p>
          <h2>Sign in</h2>
        </div>

        ${state.error ? `<p class="error-banner" role="alert">${escapeHtml(state.error)}</p>` : ""}

        <label>
          Email
          <input id="email" type="email" value="recruiter@recruitai.local" autocomplete="email" required>
        </label>

        <label>
          Password
          <input id="password" type="password" value="demo1234" autocomplete="current-password" required>
        </label>

        <label>
          Role
          <select id="role">
            <option value="recruiter">Recruiter</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>

        <button type="submit" class="primary-action">Continue</button>
        <p class="form-note">Role-based routing is mocked for Sprint 1 and ready for API integration.</p>
      </form>
    </section>
  `;
}

function dashboardView(state) {
  const active = state.processing || state.history[0];
  return `
    <section class="dashboard-layout">
      <aside class="sidebar">
        <div class="brand-row">
          <div class="brand-mark compact">RA</div>
          <div>
            <strong>RecruitAI</strong>
            <span>Recruiter Console</span>
          </div>
        </div>
        <nav class="nav-list" aria-label="Dashboard sections">
          <button class="nav-item active" type="button">Upload Flow</button>
          <button class="nav-item" type="button">Processing</button>
          <button class="nav-item" type="button">Quality</button>
        </nav>
        <div class="user-card">
          <span>${escapeHtml(state.session.email)}</span>
          <strong>${capitalize(state.session.role)}</strong>
          <button id="logoutButton" type="button">Sign out</button>
        </div>
      </aside>

      <section class="content">
        <header class="topbar">
          <div>
            <p class="eyebrow">Sprint 1 Workflow</p>
            <h1>CV Intake and Parsing Monitor</h1>
          </div>
          <span class="role-pill">Recruiter</span>
        </header>

        ${state.error ? `<p class="error-banner" role="alert">${escapeHtml(state.error)}</p>` : ""}

        <section class="workflow-grid">
          ${uploadPanel(state)}
          ${statusPanel(active)}
          ${qualityPanel(active)}
        </section>

        ${historyPanel(state)}
      </section>
    </section>
  `;
}

function uploadPanel(state) {
  const selectedName = state.selectedFile ? state.selectedFile.name : "No PDF selected";
  return `
    <article class="panel upload-panel">
      <div class="panel-heading">
        <p class="eyebrow">Step 1</p>
        <h2>Upload CV</h2>
      </div>

      <label class="drop-zone" id="dropZone">
        <input id="fileInput" type="file" accept="application/pdf,.pdf">
        <span class="upload-icon">PDF</span>
        <strong>${escapeHtml(selectedName)}</strong>
        <small>Drop a PDF here or browse from your device.</small>
      </label>

      <button id="startProcessing" class="primary-action" type="button" ${state.selectedFile ? "" : "disabled"}>
        Start parsing
      </button>
    </article>
  `;
}

function statusPanel(item) {
  const steps = ["Queued", "Parsing", "Normalizing", "Quality Check", "Ready"];
  const currentIndex = Math.max(0, steps.indexOf(item.status));
  const progress = item.progress || 0;
  return `
    <article class="panel status-panel">
      <div class="panel-heading">
        <p class="eyebrow">Step 2</p>
        <h2>Processing Status</h2>
      </div>

      <div class="status-summary">
        <span class="status-badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
        <strong>${escapeHtml(item.fileName)}</strong>
        <small>Uploaded ${escapeHtml(item.uploadedAt)}</small>
      </div>

      <div class="progress-track" aria-label="Processing progress">
        <span style="width: ${progress}%"></span>
      </div>

      <ol class="step-list">
        ${steps
          .map((step, index) => {
            const stateClass = index < currentIndex ? "done" : index === currentIndex ? "current" : "";
            return `<li class="${stateClass}"><span>${index + 1}</span>${step}</li>`;
          })
          .join("")}
      </ol>
    </article>
  `;
}

function qualityPanel(item) {
  const quality = item.parseQuality;
  return `
    <article class="panel quality-panel">
      <div class="panel-heading">
        <p class="eyebrow">Step 3</p>
        <h2>Parse Quality</h2>
      </div>

      <div class="quality-score">
        <span>${quality.overall}</span>
        <div>
          <strong>${escapeHtml(quality.confidence)} confidence</strong>
          <small>Weighted extraction quality</small>
        </div>
      </div>

      <div class="quality-bars">
        ${qualityMetric("Contact", quality.contact)}
        ${qualityMetric("Experience", quality.experience)}
        ${qualityMetric("Skills", quality.skills)}
        ${qualityMetric("Education", quality.education)}
      </div>
    </article>
  `;
}

function historyPanel(state) {
  const rows = [state.processing, ...state.history].filter(Boolean);
  return `
    <section class="history-section">
      <div class="section-heading">
        <h2>Recent CV Jobs</h2>
        <span>${rows.length} records</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Status</th>
              <th>Quality</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.fileName)}</td>
                    <td><span class="status-badge ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
                    <td>${row.parseQuality.overall}%</td>
                    <td>${escapeHtml(row.uploadedAt)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function qualityMetric(label, value) {
  return `
    <div class="quality-row">
      <div>
        <span>${label}</span>
        <strong>${value}%</strong>
      </div>
      <div class="mini-track"><span style="width: ${value}%"></span></div>
    </div>
  `;
}

function statusClass(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* istanbul ignore next */
if (typeof module !== "undefined") {
  module.exports = {
    PROCESSING_UPDATES,
    authenticate,
    createInitialState,
    createRecruiterWorkflow,
    defaultAuthService,
    escapeHtml,
    statusClass,
    validatePdfFile,
  };
}

/* istanbul ignore next */
if (typeof module === "undefined") {
  const app = document.querySelector("#app");
  const workflow = createRecruiterWorkflow({ root: app });
  workflow.seedDemoFromQuery();
  workflow.render();
}
