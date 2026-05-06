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

const TR_TRANSLATIONS = {
  "CV upload, parsing status, and quality monitoring for recruiter review.": "CV yukleme, ayrıştırma durumu ve kalite takibi ile işe alım incelemesini hızlandırır.",
  "workload target": "iş yükü hedefi",
  "parse quality goal": "ayrıştırma kalite hedefi",
  "Recruiter Access": "İşe Alım Girişi",
  "Sign in": "Giriş Yap",
  "Email": "E-posta",
  "Password": "Şifre",
  "Role": "Rol",
  "Continue": "Devam Et",
  "Viewer": "Görüntüleyici",
  "Role-based routing is mocked for Sprint 1 and ready for API integration.": "Rol bazlı yönlendirme Sprint 1 için mock durumdadır ve API entegrasyonuna hazırdır.",
  "Recruiter Console": "İşe Alım Konsolu",
  "Upload Flow": "Yükleme Akışı",
  "Processing": "İşlem",
  "Quality": "Kalite",
  "Sign out": "Çıkış Yap",
  "Recruiter Efficiency Engine": "İşe Alım Verimlilik Motoru",
  "Recruiter Dashboard": "İşe Alım Paneli",
  "CV Intake and Parsing Monitor": "CV Alımı ve Ayrıştırma İzleme",
  "Recruiter": "İşe Alım Uzmanı",
  "AI Candidate Ranking": "YZ Aday Sıralaması",
  "Candidate Pipeline": "Aday Hattı",
  "shown": "gösterilen",
  "Skill filter": "Yetenek filtresi",
  "All skills": "Tüm yetenekler",
  "Score": "Puan",
  "Experience": "Deneyim",
  "Applied": "Başvuru",
  "Candidate": "Aday",
  "Skills": "Yetenekler",
  "Decision": "Karar",
  "Shortlist": "Listeye Al",
  "Reject": "Reddet",
  "Review": "İncele",
  "New": "Yeni",
  "Shortlisted": "Listeye Alındı",
  "Rejected": "Reddedildi",
  "Saving...": "Kaydediliyor...",
  "yrs": "yıl",
  "Explainability": "Açıklanabilirlik",
  "Explainability Card": "Açıklanabilirlik Kartı",
  "No candidate selected": "Aday seçilmedi",
  "Ask AI": "YZ'ye Sor",
  "Explain this score": "Bu puanı açıkla",
  "Upload CV": "CV Yükle",
  "Step 1": "Adım 1",
  "Step 2": "Adım 2",
  "Step 3": "Adım 3",
  "No PDF selected": "PDF seçilmedi",
  "Drop a PDF here or browse from your device.": "PDF dosyasını buraya bırakın veya cihazınızdan seçin.",
  "Start parsing": "Ayrıştırmayı başlat",
  "Processing Status": "İşlem Durumu",
  "Uploaded": "Yüklendi",
  "Processing progress": "İşlem ilerlemesi",
  "Queued": "Kuyrukta",
  "Parsing": "Ayrıştırılıyor",
  "Normalizing": "Normalize ediliyor",
  "Quality Check": "Kalite Kontrol",
  "Parse Quality": "Ayrıştırma Kalitesi",
  "Weighted extraction quality": "Ağırlıklı çıkarım kalitesi",
  "Contact": "İletişim",
  "Education": "Eğitim",
  "Recent CV Jobs": "Son CV İşleri",
  "records": "kayıt",
  "File": "Dosya",
  "Status": "Durum",
  "Ready": "Hazır",
  "Needs Review": "İnceleme Gerekli",
  "Low": "Düşük",
  "Medium": "Orta",
  "High": "Yüksek",
  "Thinking": "Düşünüyor",
  "Send": "Gönder",
  "Why? Ask about this score": "Neden? Bu puan hakkında sor",
  "AI is thinking...": "YZ düşünüyor...",
  "You": "Siz",
  "Select a candidate, then ask why the score looks high or low.": "Bir aday seçin, sonra puanın neden yüksek veya düşük olduğunu sorun.",
  "Unable to explain score": "Puan açıklanamadı",
  "Score explanation": "Puan açıklaması",
  "score explanation": "puan açıklaması",
  "Score:": "Puan:",
  "Recommendation:": "Öneri:",
  "Strongest signal:": "En güçlü sinyal:",
  "Main concern:": "Temel risk:",
  "Experience:": "Deneyim:",
  "Recruiter action:": "İK aksiyonu:",
  "Question interpreted:": "Yorumlanan soru:",
  "Move to interview quickly.": "Hızlıca mülakata ilerletin.",
  "Review the concern before final decision.": "Nihai karar öncesi temel riski gözden geçirin.",
  "No blocking concern is currently flagged.": "Şu anda kritik bir engel işaretlenmedi.",
  "Senior AI Engineer": "Kıdemli YZ Mühendisi",
  "Frontend Platform Developer": "Frontend Platform Geliştiricisi",
  "Full Stack Engineer": "Full Stack Mühendisi",
  "Data Analyst": "Veri Analisti",
  "Junior Developer": "Junior Geliştirici",
  "Python competency": "Python yetkinliği",
  "90% match": "%90 eşleşme",
  "Must-have backend and AI skill is strongly evidenced in recent projects.": "Olmazsa olmaz backend ve YZ becerisi son projelerde güçlü şekilde görülüyor.",
  "Experience duration": "Deneyim süresi",
  "+1.5 years": "+1.5 yıl",
  "Experience exceeds the role baseline of 5 years.": "Deneyim, rol için belirlenen 5 yıl tabanının üstünde.",
  "Project relevance": "Proje uygunluğu",
  "Built LLM matching and extraction flows similar to RecruitAI scope.": "RecruitAI kapsamına benzer LLM eşleştirme ve çıkarım akışları geliştirmiş.",
  "Dashboard delivery": "Panel teslimatı",
  "Strong": "Güçlü",
  "Built recruiter workflow screens with upload, status, and quality monitoring.": "Yükleme, durum ve kalite takibi içeren işe alım ekranlarını geliştirmiş.",
  "Testing coverage": "Test kapsamı",
  "98%+ statements": "%98+ satır kapsamı",
  "Added automated frontend coverage for login and PDF upload workflows.": "Giriş ve PDF yükleme akışları için otomatik frontend kapsamı eklemiş.",
  "Backend depth": "Backend derinliği",
  "Needs follow-up": "Takip gerekli",
  "Backend API ownership is not the primary evidence in the current profile.": "Mevcut profilde backend API sahipliği ana kanıt değil.",
  "Full stack coverage": "Full stack kapsama",
  "Good": "İyi",
  "Matches API, dashboard, and data persistence expectations.": "API, panel ve veri kalıcılığı beklentileriyle uyumlu.",
  "AI specialization": "YZ uzmanlığı",
  "Moderate": "Orta",
  "CV has fewer direct NLP or LLM project signals.": "CV içinde doğrudan NLP veya LLM proje sinyali daha az.",
  "Data analysis": "Veri analizi",
  "Good evidence for KPI dashboards and reporting workflows.": "KPI panelleri ve raporlama akışları için iyi kanıt var.",
  "Product engineering": "Ürün mühendisliği",
  "Gap": "Eksik",
  "Less evidence for production frontend or API implementation.": "Prod frontend veya API geliştirme için daha az kanıt var.",
  "Below baseline": "Tabanın altında",
  "Current profile is below the minimum experience level for this role.": "Mevcut profil bu rol için minimum deneyim seviyesinin altında.",
  "Skill match": "Yetenek uyumu",
  "Partial": "Kısmi",
  "Frontend basics are present but AI/dashboard production evidence is limited.": "Frontend temelleri mevcut ancak YZ/panel üretim kanıtı sınırlı."
};

function translateContent(value, locale) {
  if (locale !== "tr") return value;

  let output = String(value);
  Object.entries(TR_TRANSLATIONS)
    .sort((left, right) => right[0].length - left[0].length)
    .forEach(([source, target]) => {
    output = output.replaceAll(source, target);
    });
  return output;
}

function applyLocale(root, state) {
  if (!root) return;

  const locale = state?.locale || "en";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach((node) => {
    if (!node.nodeValue || !node.nodeValue.trim()) return;
    node.nodeValue = translateContent(node.nodeValue, locale);
  });

  root.querySelectorAll("input[placeholder]").forEach((input) => {
    input.placeholder = translateContent(input.placeholder, locale);
  });
}

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
    locale: "en",
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

async function defaultUploadApi(file) {
  const endpoint = `${getApiBaseUrl()}/api/v1/upload`;
  const isStaticDemo =
    typeof window !== "undefined" && window.location && ["file:", ""].includes(window.location.protocol);

  if (isStaticDemo || typeof fetch === "undefined" || typeof FormData === "undefined") {
    return {
      job_id: `demo-${Date.now()}`,
      filename: file?.name || "upload.pdf",
      status: "pending",
      message: "Demo upload accepted.",
      demo: true,
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with ${response.status}`);
  }

  return response.json();
}

async function defaultJobStatusApi(jobId) {
  const endpoint = `${getApiBaseUrl()}/api/v1/jobs/${encodeURIComponent(jobId)}`;
  const isStaticDemo =
    typeof window !== "undefined" && window.location && ["file:", ""].includes(window.location.protocol);

  if (isStaticDemo || typeof fetch === "undefined") {
    return {
      job_id: jobId,
      filename: "demo-upload.pdf",
      status: "completed",
      confidence_score: 89,
      parsed_result: {
        contact: { name: "Demo Candidate" },
        summary: "Frontend, dashboard ve RecruitAI is akislari konusunda guclu deneyim.",
        skills: ["JavaScript", "Dashboard UX", "API Integration"],
        experience: [{ title: "Frontend Engineer" }, { title: "UI Developer" }],
        confidence_score: 89,
      },
    };
  }

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Job status failed with ${response.status}`);
  }

  return response.json();
}

function normalizeJobStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "pending") return "Queued";
  if (normalized === "processing") return "Parsing";
  if (normalized === "completed") return "Ready";
  if (normalized === "failed") return "Needs Review";
  return "Queued";
}

function normalizePercentageScore(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const scaled = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(0, Math.min(99, Math.round(scaled)));
}

function parseExperienceYears(experienceEntries = []) {
  if (!Array.isArray(experienceEntries)) return 0;
  const count = experienceEntries.filter(Boolean).length;
  return Number((count * 1.5).toFixed(1));
}

function inferCandidateTitle(parsedResult = {}, fileName = "") {
  const firstExperience = Array.isArray(parsedResult.experience) ? parsedResult.experience.find((item) => item?.title) : null;
  if (firstExperience?.title) return firstExperience.title;
  return String(fileName || "Candidate").replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
}

function buildCandidateFromParsedResult(job) {
  const parsed = job?.parsed_result || {};
  const contact = parsed.contact || {};
  const name = contact.name || String(job?.filename || "Candidate").replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
  const score = normalizePercentageScore(parsed.confidence_score ?? job?.confidence_score, 65);
  const skills = Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean).slice(0, 5) : [];
  const summary = parsed.summary || "Ayrıştırılan CV sonucu temel alınarak aday profili oluşturuldu.";

  return {
    id: `cand-${job.job_id}`,
    name,
    title: inferCandidateTitle(parsed, job?.filename),
    score,
    experienceYears: parseExperienceYears(parsed.experience),
    appliedAt: new Date().toISOString().slice(0, 10),
    skills,
    recommendation: score >= 85 ? "Shortlist" : "Review",
    status: "new",
    factors: [
      {
        label: "Parse confidence",
        value: `${score}%`,
        impact: score >= 75 ? "positive" : "negative",
        detail: summary,
      },
      {
        label: "Detected skills",
        value: skills.length ? `${skills.length} skills` : "No skills",
        impact: skills.length >= 3 ? "positive" : "negative",
        detail: skills.length ? `CV icinden cikarilan beceriler: ${skills.join(", ")}.` : "CV icinde yeterli beceri sinyali bulunamadi.",
      },
    ],
  };
}

function upsertCandidate(candidates, candidate) {
  const next = candidates.filter((item) => item.id !== candidate.id);
  next.unshift(candidate);
  return next;
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
  const endpoint = `${getApiBaseUrl()}/api/v1/match/explain`;
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
  const uploadApi = options.uploadApi || defaultUploadApi;
  const jobStatusApi = options.jobStatusApi || defaultJobStatusApi;
  const timerApi = options.timerApi || (typeof window !== "undefined" ? window : globalThis);
  const clock = options.clock || (() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const state = options.state || createInitialState();

  const controller = {
    state,
    root,
    render() {
      if (!root) return;
      if (typeof window !== "undefined") {
        window.__recruitAiLocale = state.locale;
      }
      if (!state.session) {
        root.innerHTML = loginView(state);
        this.bindLogin();
        applyLocale(root, state);
        return;
      }

      root.innerHTML = dashboardView(state);
      this.bindDashboard();
      applyLocale(root, state);
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

      const localeToggle = root.querySelector("#localeToggle");
      if (localeToggle) {
        localeToggle.addEventListener("click", () => this.toggleLocale());
      }
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

      const localeToggle = root.querySelector("#localeToggle");
      if (localeToggle) {
        localeToggle.addEventListener("click", () => this.toggleLocale());
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
        _token: `proc-${Date.now()}`,
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

      const processingToken = state.processing._token;

      const pollJob = async (jobId) => {
        try {
          const job = await jobStatusApi(jobId);
          if (!state.processing || state.processing._token !== processingToken) return;

          const statusLabel = normalizeJobStatus(job.status);
          const overallScore = normalizePercentageScore(job.confidence_score, 0);
          const fallbackFieldScore = overallScore || 42;
          state.processing.status = statusLabel;
          state.processing.fileName = job.filename || state.processing.fileName;
          state.processing.progress = statusLabel === "Ready" ? 100 : statusLabel === "Parsing" ? 58 : statusLabel === "Needs Review" ? 100 : 32;
          state.processing.parseQuality = {
            overall: overallScore,
            contact: normalizePercentageScore(job.parsed_result?.field_confidences?.contact, fallbackFieldScore),
            experience: normalizePercentageScore(job.parsed_result?.field_confidences?.experience, fallbackFieldScore),
            skills: normalizePercentageScore(job.parsed_result?.field_confidences?.skills, fallbackFieldScore),
            education: normalizePercentageScore(job.parsed_result?.field_confidences?.education, fallbackFieldScore),
            confidence: overallScore >= 85 ? "High" : overallScore >= 65 ? "Medium" : "Low",
          };

          if (String(job.status).toLowerCase() === "completed" && job.parsed_result) {
            const candidate = buildCandidateFromParsedResult(job);
            state.candidates = upsertCandidate(state.candidates, candidate);
            state.selectedCandidateId = candidate.id;
            state.history = [state.processing, ...state.history].slice(0, 8);
            state.processing = {
              ...state.processing,
              id: job.job_id,
            };
            this.render();
            return;
          }

          if (String(job.status).toLowerCase() === "failed") {
            state.error = job.error || "PDF parse failed.";
            this.render();
            return;
          }

          this.render();
          timerApi.setTimeout(() => {
            void pollJob(jobId);
          }, 1200);
        } catch (error) {
          if (!state.processing || state.processing._token !== processingToken) return;
          state.error = error.message || "Upload polling failed.";
          this.render();
        }
      };

      void uploadApi(file)
        .then((upload) => {
          if (!state.processing || state.processing._token !== processingToken) return;
          state.processing.id = upload.job_id || state.processing.id;
          state.processing.fileName = upload.filename || state.processing.fileName;
          state.processing.status = normalizeJobStatus(upload.status);
          state.processing.progress = 18;
          this.render();
          return pollJob(state.processing.id);
        })
        .catch((error) => {
          if (!state.processing || state.processing._token !== processingToken) return;
          state.error = error.message || "Upload failed.";
          state.processing.status = "Needs Review";
          state.processing.progress = 100;
          this.render();
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
    toggleLocale() {
      state.locale = state.locale === "en" ? "tr" : "en";
      if (state.chat.messages.length === 1) {
        state.chat.messages[0].content = state.locale === "tr"
          ? translateContent("Select a candidate, then ask why the score looks high or low.", "tr")
          : "Select a candidate, then ask why the score looks high or low.";
      }
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
          content: normalizeAiAnswer(response, state.locale),
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

        <button id="localeToggle" type="button" class="primary-action">${state.locale === "en" ? "TR" : "EN"}</button>
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
          <div>
            <button id="localeToggle" type="button" class="primary-action">${state.locale === "en" ? "TR" : "EN"}</button>
            <span class="role-pill">Recruiter</span>
          </div>
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
  const locale = typeof window !== "undefined" ? window.__recruitAiLocale || "en" : "en";
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en", { month: "short", day: "2-digit" }).format(new Date(value));
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

function normalizeAiAnswer(response, locale = "en") {
  if (typeof response === "string") return response;
  if (response && typeof response.answer === "string") return translateContent(response.answer, locale);
  return translateContent("### Score explanation\nThe AI service returned an empty explanation.", locale);
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
    defaultJobStatusApi,
    defaultUploadApi,
    escapeHtml,
    buildCandidateFromParsedResult,
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
