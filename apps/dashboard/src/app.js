// Frontend Sprint 1: Recruiter Workflow

const demoState = {
  session: null,
  activeView: "login",
  selectedFile: null,
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

const app = document.querySelector("#app");

seedDemoFromQuery();

function render() {
  if (!demoState.session) {
    app.innerHTML = loginView();
    bindLogin();
    return;
  }

  app.innerHTML = dashboardView();
  bindDashboard();
}

function seedDemoFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") !== "ready") return;

  demoState.session = {
    email: "recruiter@recruitai.local",
    role: "recruiter",
  };
  demoState.processing = {
    id: "cv-demo-ready",
    fileName: "demo-senior-ai-engineer.pdf",
    status: "Ready",
    progress: 100,
    uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    parseQuality: {
      overall: 89,
      contact: 95,
      experience: 84,
      skills: 91,
      education: 86,
      confidence: "High",
    },
  };
}

function loginView() {
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

function dashboardView() {
  const active = demoState.processing || demoState.history[0];
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
          <span>${escapeHtml(demoState.session.email)}</span>
          <strong>${capitalize(demoState.session.role)}</strong>
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

        <section class="workflow-grid">
          ${uploadPanel()}
          ${statusPanel(active)}
          ${qualityPanel(active)}
        </section>

        ${historyPanel()}
      </section>
    </section>
  `;
}

function uploadPanel() {
  const selectedName = demoState.selectedFile ? demoState.selectedFile.name : "No PDF selected";
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

      <button id="startProcessing" class="primary-action" type="button" ${demoState.selectedFile ? "" : "disabled"}>
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

function historyPanel() {
  const rows = [demoState.processing, ...demoState.history].filter(Boolean);
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

function bindLogin() {
  document.querySelector("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const role = document.querySelector("#role").value;
    if (role !== "recruiter") {
      alert("Sprint 1 only enables the Recruiter role.");
      return;
    }
    demoState.session = {
      email: document.querySelector("#email").value,
      role,
    };
    demoState.activeView = "dashboard";
    render();
  });
}

function bindDashboard() {
  document.querySelector("#logoutButton").addEventListener("click", () => {
    demoState.session = null;
    demoState.selectedFile = null;
    render();
  });

  const input = document.querySelector("#fileInput");
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
      demoState.selectedFile = file;
      render();
    }
  });

  const dropZone = document.querySelector("#dropZone");
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
    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF CV.");
      return;
    }
    demoState.selectedFile = file;
    render();
  });

  document.querySelector("#startProcessing").addEventListener("click", () => {
    if (!demoState.selectedFile) return;
    startProcessing(demoState.selectedFile);
  });
}

function startProcessing(file) {
  demoState.processing = {
    id: `cv-${Date.now()}`,
    fileName: file.name,
    status: "Queued",
    progress: 8,
    uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    parseQuality: {
      overall: 42,
      contact: 48,
      experience: 36,
      skills: 44,
      education: 40,
      confidence: "Calculating",
    },
  };
  demoState.selectedFile = null;
  render();

  const updates = [
    ["Parsing", 32, { overall: 58, contact: 72, experience: 45, skills: 54, education: 51, confidence: "Low" }],
    ["Normalizing", 58, { overall: 76, contact: 86, experience: 69, skills: 78, education: 71, confidence: "Medium" }],
    ["Quality Check", 84, { overall: 87, contact: 94, experience: 82, skills: 89, education: 83, confidence: "High" }],
    ["Ready", 100, { overall: 89, contact: 95, experience: 84, skills: 91, education: 86, confidence: "High" }],
  ];

  updates.forEach(([status, progress, quality], index) => {
    window.setTimeout(() => {
      if (!demoState.processing) return;
      demoState.processing.status = status;
      demoState.processing.progress = progress;
      demoState.processing.parseQuality = quality;
      render();
    }, (index + 1) * 900);
  });
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

render();
