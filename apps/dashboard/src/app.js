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

const CANDIDATE_ACTIONS = {
  shortlist: "shortlisted",
  reject: "rejected",
};

function getApiBaseUrl() {
  if (typeof window === "undefined" || !window.location) {
    return "http://127.0.0.1:8000";
  }

  if (window.RECRUITAI_API_BASE_URL) {
    return String(window.RECRUITAI_API_BASE_URL).replace(/\/$/, "");
  }

  if (window.location.port === "8000") {
    return window.location.origin;
  }

  return "http://127.0.0.1:8000";
}

const DEMO_CANDIDATES = [
  {
    id: "cand-001",
    name: "Ayse Yilmaz",
    title: "Senior AI Engineer",
    score: 94,
    experienceYears: 6.5,
    appliedAt: "2026-05-05",
    skills: ["Python", "FastAPI", "NLP", "LLM", "PostgreSQL"],
    recommendation: "Shortlist",
    status: "new",
    factors: [
      {
        label: "Python competency",
        value: "90% match",
        impact: "positive",
        detail: "Must-have backend and AI skill is strongly evidenced in recent projects.",
      },
      {
        label: "Experience duration",
        value: "+1.5 years",
        impact: "positive",
        detail: "Experience exceeds the role baseline of 5 years.",
      },
      {
        label: "Project relevance",
        value: "High",
        impact: "positive",
        detail: "Built LLM matching and extraction flows similar to RecruitAI scope.",
      },
    ],
  },
  {
    id: "cand-002",
    name: "Cemocan Demir",
    title: "Frontend Platform Developer",
    score: 88,
    experienceYears: 4.2,
    appliedAt: "2026-05-04",
    skills: ["JavaScript", "CSS", "Dashboard UX", "Testing", "API Integration"],
    recommendation: "Review",
    status: "new",
    factors: [
      {
        label: "Dashboard delivery",
        value: "Strong",
        impact: "positive",
        detail: "Built recruiter workflow screens with upload, status, and quality monitoring.",
      },
      {
        label: "Testing coverage",
        value: "98%+ statements",
        impact: "positive",
        detail: "Added automated frontend coverage for login and PDF upload workflows.",
      },
      {
        label: "Backend depth",
        value: "Needs follow-up",
        impact: "negative",
        detail: "Backend API ownership is not the primary evidence in the current profile.",
      },
    ],
  },
  {
    id: "cand-003",
    name: "Mehmet Kaya",
    title: "Full Stack Engineer",
    score: 79,
    experienceYears: 5.1,
    appliedAt: "2026-05-03",
    skills: ["React", "Node.js", "PostgreSQL", "Docker"],
    recommendation: "Review",
    status: "new",
    factors: [
      {
        label: "Full stack coverage",
        value: "Good",
        impact: "positive",
        detail: "Matches API, dashboard, and data persistence expectations.",
      },
      {
        label: "AI specialization",
        value: "Moderate",
        impact: "negative",
        detail: "CV has fewer direct NLP or LLM project signals.",
      },
    ],
  },
  {
    id: "cand-004",
    name: "Elif Arslan",
    title: "Data Analyst",
    score: 71,
    experienceYears: 3.8,
    appliedAt: "2026-05-01",
    skills: ["SQL", "Python", "Power BI", "Analytics"],
    recommendation: "Review",
    status: "new",
    factors: [
      {
        label: "Data analysis",
        value: "Strong",
        impact: "positive",
        detail: "Good evidence for KPI dashboards and reporting workflows.",
      },
      {
        label: "Product engineering",
        value: "Gap",
        impact: "negative",
        detail: "Less evidence for production frontend or API implementation.",
      },
    ],
  },
  {
    id: "cand-005",
    name: "Burak Sen",
    title: "Junior Developer",
    score: 52,
    experienceYears: 1.4,
    appliedAt: "2026-04-29",
    skills: ["JavaScript", "HTML", "CSS"],
    recommendation: "Reject",
    status: "new",
    factors: [
      {
        label: "Experience duration",
        value: "Below baseline",
        impact: "negative",
        detail: "Current profile is below the minimum experience level for this role.",
      },
      {
        label: "Skill match",
        value: "Partial",
        impact: "negative",
        detail: "Frontend basics are present but AI/dashboard production evidence is limited.",
      },
    ],
  },
];

function createInitialState() {
  return {
    session: null,
    activeView: "login",
    selectedFile: null,
    error: null,
    processing: null,
    selectedCandidateId: "cand-001",
    candidateFilters: {
      skill: "all",
      sortBy: "score",
      sortDir: "desc",
    },
    actionStatus: {},
    candidates: DEMO_CANDIDATES.map((candidate) => ({ ...candidate, factors: [...candidate.factors] })),
    chat: {
      isOpen: true,
      isLoading: false,
      input: "",
      messages: [
        {
          role: "assistant",
          content: "Select a candidate, then ask why the score looks high or low.",
        },
      ],
    },
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

async function defaultCandidateActionApi(candidateId, action) {
  const endpoint = `${getApiBaseUrl()}/api/v1/candidates/${encodeURIComponent(candidateId)}/${action}`;
  const isStaticDemo =
    typeof window !== "undefined" && window.location && ["file:", ""].includes(window.location.protocol);

  if (isStaticDemo || typeof fetch === "undefined") {
    return { ok: true, endpoint, demo: true };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidateId,
      action,
      source: "recruiter-dashboard",
    }),
  });

  if (!response.ok) {
    throw new Error(`Candidate action failed with ${response.status}`);
  }
  return { ok: true, endpoint };
}

async function defaultAskAiApi(payload) {
  const endpoint = "/api/v1/match/explain";
  const isStaticDemo =
    typeof window !== "undefined" && window.location && ["file:", ""].includes(window.location.protocol);

  if (isStaticDemo || typeof fetch === "undefined") {
    return {
      answer: buildLocalScoreExplanation(payload.candidate, payload.question),
      endpoint,
      demo: true,
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ask AI failed with ${response.status}`);
  }
  return response.json();
}

function buildLocalScoreExplanation(candidate, question = "") {
  const topPositive = candidate.factors.find((factor) => factor.impact === "positive");
  const topConcern = candidate.factors.find((factor) => factor.impact === "negative");
  const concernLine = topConcern
    ? `- Concern: ${topConcern.label} - ${topConcern.detail}`
    : "- Concern: No major negative factor is currently flagged.";
  return [
    `### ${candidate.name} score explanation`,
    `Score: ${candidate.score}/100. Recommendation: ${candidate.recommendation}.`,
    "",
    `- Strongest signal: ${topPositive ? `${topPositive.label} - ${topPositive.detail}` : "No positive factor found."}`,
    concernLine,
    `- Recruiter action: ${candidate.score >= 85 ? "Prioritize interview scheduling." : "Review the highlighted gaps before deciding."}`,
    "",
    question ? `Question interpreted: ${question}` : "Question interpreted: Explain this score.",
  ].join("\n");
}

function getSkillOptions(candidates) {
  return Array.from(new Set(candidates.flatMap((candidate) => candidate.skills))).sort((a, b) => a.localeCompare(b));
}

function getVisibleCandidates(state) {
  const { skill, sortBy, sortDir } = state.candidateFilters;
  const direction = sortDir === "asc" ? 1 : -1;
  const filtered = state.candidates.filter((candidate) => {
    return skill === "all" || candidate.skills.includes(skill);
  });

  return filtered.sort((a, b) => {
    const left = candidateSortValue(a, sortBy);
    const right = candidateSortValue(b, sortBy);
    if (left === right) return a.name.localeCompare(b.name);
    return left > right ? direction : -direction;
  });
}

function candidateSortValue(candidate, sortBy) {
  if (sortBy === "experience") return candidate.experienceYears;
  if (sortBy === "appliedAt") return new Date(candidate.appliedAt).getTime();
  return candidate.score;
}

function createRecruiterWorkflow(options = {}) {
  const root = options.root || (typeof document !== "undefined" ? document.querySelector("#app") : null);
  const authService = options.authService || defaultAuthService;
  const candidateActionApi = options.candidateActionApi || defaultCandidateActionApi;
  const askAiApi = options.askAiApi || defaultAskAiApi;
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

      const skillFilter = root.querySelector("#skillFilter");
      if (skillFilter) {
        skillFilter.addEventListener("change", () => this.updateSkillFilter(skillFilter.value));
      }

      root.querySelectorAll("[data-sort]").forEach((button) => {
        button.addEventListener("click", () => this.updateSort(button.dataset.sort));
      });

      root.querySelectorAll("[data-candidate-id]").forEach((row) => {
        row.addEventListener("click", () => this.selectCandidate(row.dataset.candidateId));
      });

      root.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.handleCandidateAction(button.dataset.candidateId, button.dataset.action);
        });
      });

      root.querySelectorAll("[data-ask-ai]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.askAI(button.dataset.question || "Explain this score", button.dataset.candidateId);
        });
      });

      const chatForm = root.querySelector("#aiChatForm");
      if (chatForm) {
        chatForm.addEventListener("submit", (event) => {
          event.preventDefault();
          const input = root.querySelector("#aiChatInput");
          this.askAI(input.value);
        });
      }

      const chatToggle = root.querySelector("#chatToggle");
      if (chatToggle) {
        chatToggle.addEventListener("click", () => this.toggleChat());
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
    getVisibleCandidates() {
      return getVisibleCandidates(state);
    },
    getSelectedCandidate() {
      return state.candidates.find((candidate) => candidate.id === state.selectedCandidateId) || this.getVisibleCandidates()[0];
    },
    updateSkillFilter(skill) {
      state.candidateFilters.skill = skill;
      const visible = this.getVisibleCandidates();
      state.selectedCandidateId = visible[0] ? visible[0].id : null;
      this.render();
    },
    updateSort(sortBy) {
      if (state.candidateFilters.sortBy === sortBy) {
        state.candidateFilters.sortDir = state.candidateFilters.sortDir === "desc" ? "asc" : "desc";
      } else {
        state.candidateFilters.sortBy = sortBy;
        state.candidateFilters.sortDir = "desc";
      }
      const visible = this.getVisibleCandidates();
      if (visible.length > 0 && !visible.some((candidate) => candidate.id === state.selectedCandidateId)) {
        state.selectedCandidateId = visible[0].id;
      }
      this.render();
    },
    selectCandidate(candidateId) {
      if (!state.candidates.some((candidate) => candidate.id === candidateId)) return false;
      state.selectedCandidateId = candidateId;
      this.render();
      return true;
    },
    toggleChat() {
      state.chat.isOpen = !state.chat.isOpen;
      this.render();
    },
    async askAI(question, candidateId = state.selectedCandidateId) {
      // Interactive Logic: Explainability Chat Engine
      const candidate = state.candidates.find((item) => item.id === candidateId);
      const prompt = String(question || "").trim() || "Explain this score";
      if (!candidate || state.chat.isLoading) return false;

      state.selectedCandidateId = candidate.id;
      state.chat.isOpen = true;
      state.chat.isLoading = true;
      state.chat.input = "";
      state.chat.messages.push({
        role: "user",
        content: prompt,
      });
      this.render();

      try {
        const response = await askAiApi({
          question: prompt,
          candidate: buildCandidateExplainPayload(candidate),
          source: "recruiter-dashboard",
        });
        state.chat.messages.push({
          role: "assistant",
          content: normalizeAiAnswer(response),
        });
        state.chat.isLoading = false;
        this.render();
        return true;
      } catch (error) {
        state.chat.messages.push({
          role: "assistant",
          content: `### Unable to explain score\n${error.message || "The AI explanation service is unavailable."}`,
        });
        state.chat.isLoading = false;
        this.render();
        return false;
      }
    },
    async handleCandidateAction(candidateId, action) {
      if (!CANDIDATE_ACTIONS[action]) return false;
      const candidate = state.candidates.find((item) => item.id === candidateId);
      if (!candidate) return false;

      state.actionStatus[candidateId] = `${action}:loading`;
      state.error = null;
      this.render();

      try {
        await candidateActionApi(candidateId, action);
        candidate.status = CANDIDATE_ACTIONS[action];
        state.actionStatus[candidateId] = `${action}:success`;
        this.render();
        return true;
      } catch (error) {
        state.actionStatus[candidateId] = `${action}:error`;
        state.error = error.message || "Candidate action failed.";
        this.render();
        return false;
      }
    },
    seedDemoFromQuery(search) {
      const params = new URLSearchParams(search || (typeof window !== "undefined" ? window.location.search : ""));
      if (!["ready", "ranking"].includes(params.get("demo"))) return false;

      state.session = {
        email: DEFAULT_CREDENTIALS.email,
        role: DEFAULT_CREDENTIALS.role,
      };
      state.selectedCandidateId = "cand-002";
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
            <p class="eyebrow">Recruiter Efficiency Engine</p>
            <h1>Recruiter Dashboard</h1>
            <span class="topbar-note">CV Intake and Parsing Monitor</span>
          </div>
          <span class="role-pill">Recruiter</span>
        </header>

        ${state.error ? `<p class="error-banner" role="alert">${escapeHtml(state.error)}</p>` : ""}

        ${candidateManagementView(state)}

        <section class="workflow-grid">
          ${uploadPanel(state)}
          ${statusPanel(active)}
          ${qualityPanel(active)}
        </section>

        ${historyPanel(state)}
        ${chatPanel(state)}
      </section>
    </section>
  `;
}

function candidateManagementView(state) {
  // Dashboard Logic: Recruiter Efficiency Engine
  const candidates = getVisibleCandidates(state);
  const selectedCandidate =
    state.candidates.find((candidate) => candidate.id === state.selectedCandidateId) || candidates[0];
  const skillOptions = getSkillOptions(state.candidates);
  return `
    <section class="candidate-workspace">
      <article class="ranking-panel">
        <div class="section-heading ranking-heading">
          <div>
            <p class="eyebrow">AI Candidate Ranking</p>
            <h2>Candidate Pipeline</h2>
          </div>
          <span>${candidates.length} shown</span>
        </div>

        <div class="toolbar">
          <label>
            Skill filter
            <select id="skillFilter">
              <option value="all">All skills</option>
              ${skillOptions
                .map(
                  (skill) =>
                    `<option value="${escapeHtml(skill)}" ${
                      state.candidateFilters.skill === skill ? "selected" : ""
                    }>${escapeHtml(skill)}</option>`
                )
                .join("")}
            </select>
          </label>
          <div class="sort-controls" aria-label="Sort candidates">
            ${sortButton("score", "Score", state)}
            ${sortButton("experience", "Experience", state)}
            ${sortButton("appliedAt", "Applied", state)}
          </div>
        </div>

        <div class="table-wrap">
          <table class="candidate-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Score</th>
                <th>Experience</th>
                <th>Applied</th>
                <th>Skills</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              ${
                candidates.length
                  ? candidates.map((candidate) => candidateRow(candidate, state)).join("")
                  : `<tr><td colspan="6" class="empty-state">No candidates match this skill filter.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </article>

      ${explainabilityCard(selectedCandidate)}
    </section>
  `;
}

function sortButton(sortBy, label, state) {
  const active = state.candidateFilters.sortBy === sortBy;
  const direction = active ? state.candidateFilters.sortDir : "desc";
  const suffix = active ? (direction === "desc" ? "↓" : "↑") : "";
  return `<button class="sort-button ${active ? "active" : ""}" type="button" data-sort="${sortBy}">${label} ${suffix}</button>`;
}

function candidateRow(candidate, state) {
  const selected = state.selectedCandidateId === candidate.id;
  const status = state.actionStatus[candidate.id] || candidate.status;
  const actionBusy = status.includes(":loading");
  return `
    <tr class="${selected ? "selected" : ""}" data-candidate-id="${candidate.id}" tabindex="0">
      <td>
        <strong>${escapeHtml(candidate.name)}</strong>
        <span>${escapeHtml(candidate.title)}</span>
      </td>
      <td>
        <div class="score-cell">
          <strong>${candidate.score}</strong>
          <span class="score-bar"><span style="width: ${candidate.score}%"></span></span>
        </div>
      </td>
      <td>${candidate.experienceYears.toFixed(1)} yrs</td>
      <td>${formatDate(candidate.appliedAt)}</td>
      <td>${candidate.skills.slice(0, 3).map((skill) => `<span class="skill-chip">${escapeHtml(skill)}</span>`).join("")}</td>
      <td>
        <div class="decision-actions">
          ${decisionBadge(candidate.status)}
          <button class="small-action shortlist" type="button" data-action="shortlist" data-candidate-id="${
            candidate.id
          }" ${actionBusy ? "disabled" : ""}>${status === "shortlist:loading" ? "Saving..." : "Shortlist"}</button>
          <button class="small-action reject" type="button" data-action="reject" data-candidate-id="${
            candidate.id
          }" ${actionBusy ? "disabled" : ""}>${status === "reject:loading" ? "Saving..." : "Reject"}</button>
          <button class="small-action ask-ai" type="button" data-ask-ai data-question="Why this candidate score?" data-candidate-id="${
            candidate.id
          }">Ask AI</button>
        </div>
      </td>
    </tr>
  `;
}

function explainabilityCard(candidate) {
  if (!candidate) {
    return `
      <article class="explain-card">
        <p class="eyebrow">Explainability</p>
        <h2>No candidate selected</h2>
      </article>
    `;
  }

  return `
    <article class="explain-card">
      <div class="explain-header">
        <div>
          <p class="eyebrow">Explainability Card</p>
          <h2>${escapeHtml(candidate.name)}</h2>
          <span>${escapeHtml(candidate.title)}</span>
        </div>
        <div class="score-ring">${candidate.score}</div>
      </div>

      <div class="recommendation-line">
        ${decisionBadge(candidate.status)}
        <strong>${escapeHtml(candidate.recommendation)}</strong>
        <button class="small-action ask-ai" type="button" data-ask-ai data-question="Explain this score" data-candidate-id="${
          candidate.id
        }">Explain this score</button>
      </div>

      <div class="factor-list">
        ${candidate.factors
          .map(
            (factor) => `
              <section class="factor-item ${factor.impact}">
                <div>
                  <strong>${escapeHtml(factor.label)}</strong>
                  <span>${escapeHtml(factor.value)}</span>
                </div>
                <p>${escapeHtml(factor.detail)}</p>
              </section>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function chatPanel(state) {
  const candidate = state.candidates.find((item) => item.id === state.selectedCandidateId);
  const candidateLabel = candidate ? `${candidate.name} - ${candidate.score}/100` : "No candidate";
  const collapsed = !state.chat.isOpen;
  return `
    <aside class="ai-chat ${collapsed ? "collapsed" : ""}" aria-label="Ask AI score explanation panel">
      <button id="chatToggle" class="chat-toggle" type="button" aria-expanded="${state.chat.isOpen}">
        Ask AI
      </button>
      ${
        collapsed
          ? ""
          : `
            <div class="chat-surface">
              <header class="chat-header">
                <div>
                  <p class="eyebrow">Ask AI</p>
                  <strong>${escapeHtml(candidateLabel)}</strong>
                </div>
                <span class="chat-status">${state.chat.isLoading ? "Thinking" : "Ready"}</span>
              </header>
              <div class="chat-messages" role="log" aria-live="polite">
                ${state.chat.messages.map((message) => chatMessage(message)).join("")}
                ${state.chat.isLoading ? `<div class="chat-loading"><span></span>AI is thinking...</div>` : ""}
              </div>
              <form id="aiChatForm" class="chat-form">
                <input id="aiChatInput" type="text" value="${escapeHtml(
                  state.chat.input
                )}" placeholder="Neden? Ask about this score" ${state.chat.isLoading ? "disabled" : ""}>
                <button class="primary-action" type="submit" ${state.chat.isLoading ? "disabled" : ""}>Send</button>
              </form>
            </div>
          `
      }
    </aside>
  `;
}

function chatMessage(message) {
  return `
    <article class="chat-message ${message.role}">
      <span>${message.role === "user" ? "You" : "AI"}</span>
      <div>${renderMarkdown(message.content)}</div>
    </article>
  `;
}

function decisionBadge(status) {
  const labelMap = {
    new: "New",
    shortlisted: "Shortlisted",
    rejected: "Rejected",
  };
  const label = labelMap[status] || "New";
  return `<span class="decision-badge ${status}">${label}</span>`;
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

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(value));
}

function buildCandidateExplainPayload(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    title: candidate.title,
    score: candidate.score,
    experienceYears: candidate.experienceYears,
    skills: candidate.skills,
    recommendation: candidate.recommendation,
    factors: candidate.factors,
  };
}

function normalizeAiAnswer(response) {
  if (typeof response === "string") return response;
  if (response && typeof response.answer === "string") return response.answer;
  return "### Score explanation\nThe AI service returned an empty explanation.";
}

function renderMarkdown(value) {
  const escaped = escapeHtml(value);
  const lines = escaped.split("\n");
  const output = [];
  let listOpen = false;

  lines.forEach((line) => {
    if (line.startsWith("### ")) {
      if (listOpen) {
        output.push("</ul>");
        listOpen = false;
      }
      output.push(`<h3>${line.slice(4)}</h3>`);
      return;
    }
    if (line.startsWith("- ")) {
      if (!listOpen) {
        output.push("<ul>");
        listOpen = true;
      }
      output.push(`<li>${line.slice(2)}</li>`);
      return;
    }
    if (listOpen) {
      output.push("</ul>");
      listOpen = false;
    }
    if (line.trim()) {
      output.push(`<p>${line}</p>`);
    }
  });

  if (listOpen) output.push("</ul>");
  return output.join("");
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
    defaultAskAiApi,
    defaultAuthService,
    defaultCandidateActionApi,
    escapeHtml,
    formatDate,
    buildCandidateExplainPayload,
    getSkillOptions,
    getVisibleCandidates,
    normalizeAiAnswer,
    renderMarkdown,
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
