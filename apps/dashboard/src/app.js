const API_BASE = "http://127.0.0.1:8000/api/v1";

let state = {
  session: null,
  activeView: "login", // 'login', 'register', 'dashboard'
  selectedFile: null,
  error: null,
  processing: null,
  history: [], // For HR: all CVs, For Candidate: their own CVs (if we implement it)
};

const root = document.querySelector("#app");

function render() {
  if (!root) return;
  if (!state.session) {
    if (state.activeView === "register") {
      root.innerHTML = registerView(state);
      bindRegister();
    } else {
      root.innerHTML = loginView(state);
      bindLogin();
    }
    return;
  }

  root.innerHTML = dashboardView(state);
  bindDashboard();
}

async function apiCall(endpoint, method = "GET", body = null) {
  const headers = {};
  if (state.session && state.session.token) {
    headers["Authorization"] = `Bearer ${state.session.token}`;
  }

  let options = { method, headers };
  
  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else if (body instanceof URLSearchParams) {
        options.body = body;
        headers["Content-Type"] = "application/x-www-form-urlencoded";
    } else {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail || "API request failed");
    }
    return await response.json();
  } catch (err) {
    state.error = err.message;
    render();
    throw err;
  }
}

function bindLogin() {
  const form = root.querySelector("#loginForm");
  if (!form) return;
  
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.error = null;
    render(); // Clear previous error
    
    const formData = new URLSearchParams();
    formData.append("username", document.querySelector("#email").value);
    formData.append("password", document.querySelector("#password").value);

    try {
      const data = await apiCall("/auth/login", "POST", formData);
      state.session = {
        token: data.access_token,
        user: data.user
      };
      state.activeView = "dashboard";
      if (data.user.role === "hr") {
        fetchCVs();
      }
      render();
    } catch (e) {
      console.error(e);
    }
  });

  const btnRegister = root.querySelector("#btnGoRegister");
  if (btnRegister) {
    btnRegister.addEventListener("click", () => {
      state.activeView = "register";
      state.error = null;
      render();
    });
  }
}

function bindRegister() {
  const form = root.querySelector("#registerForm");
  if (!form) return;
  
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.error = null;
    
    const payload = {
      email: document.querySelector("#email").value,
      password: document.querySelector("#password").value,
      role: document.querySelector("#role").value
    };

    try {
      await apiCall("/auth/register", "POST", payload);
      state.activeView = "login";
      state.error = "Kayıt başarılı, lütfen giriş yapın."; // Use error bar for success msg briefly
      render();
    } catch (e) {
      console.error(e);
    }
  });

  const btnLogin = root.querySelector("#btnGoLogin");
  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      state.activeView = "login";
      state.error = null;
      render();
    });
  }
}

function bindDashboard() {
  const logoutButton = root.querySelector("#logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      state.session = null;
      state.history = [];
      state.processing = null;
      state.activeView = "login";
      render();
    });
  }

  if (state.session.user.role === "candidate") {
    const input = root.querySelector("#fileInput");
    if (input) {
      input.addEventListener("change", () => {
        state.selectedFile = input.files[0];
        render();
      });
    }

    const startButton = root.querySelector("#startProcessing");
    if (startButton) {
      startButton.addEventListener("click", async () => {
        if (state.selectedFile) {
          const formData = new FormData();
          formData.append("file", state.selectedFile);
          
          state.processing = {
             status: "Queued",
             fileName: state.selectedFile.name,
             progress: 10
          };
          render();

          try {
            const result = await apiCall("/upload", "POST", formData);
            pollJob(result.job_id);
          } catch (e) {
            console.error(e);
            state.processing = null;
            render();
          }
        }
      });
    }
  }
}

async function pollJob(job_id) {
  try {
    const job = await apiCall(`/jobs/${job_id}`);
    state.processing = {
      id: job.job_id,
      fileName: job.filename,
      status: job.status,
      confidenceScore: job.confidence_score,
      progress: job.status === "completed" ? 100 : (job.status === "processing" ? 50 : 20),
      parseQuality: job.parsed_result ? job.parsed_result.parse_quality : null,
      uploadedAt: job.created_at
    };
    
    render();

    if (job.status !== "completed" && job.status !== "failed") {
      setTimeout(() => pollJob(job_id), 2000);
    }
  } catch (e) {
    console.error(e);
  }
}

async function fetchCVs() {
  try {
    const cvs = await apiCall("/cvs");
    state.history = cvs;
    render();
  } catch (e) {
    console.error(e);
  }
}

function loginView(state) {
  return `
    <section class="login-layout">
      <div class="brand-panel">
        <div class="brand-mark">RA</div>
        <h1>RecruitAI</h1>
        <p>Adaylar için CV yükleme, İK için otomatik ön eleme.</p>
      </div>

      <form class="login-card" id="loginForm">
        <div>
          <h2>Giriş Yap</h2>
        </div>

        ${state.error ? `<p class="error-banner" role="alert">${escapeHtml(state.error)}</p>` : ""}

        <label>
          Email
          <input id="email" type="email" required>
        </label>

        <label>
          Şifre
          <input id="password" type="password" required>
        </label>

        <button type="submit" class="primary-action">Giriş</button>
        <button type="button" id="btnGoRegister" style="background:none; border:none; color:var(--primary); text-decoration:underline;">Hesabınız yok mu? Kayıt Olun</button>
      </form>
    </section>
  `;
}

function registerView(state) {
  return `
    <section class="login-layout">
      <div class="brand-panel">
        <div class="brand-mark">RA</div>
        <h1>RecruitAI</h1>
        <p>Adaylar için CV yükleme, İK için otomatik ön eleme.</p>
      </div>

      <form class="login-card" id="registerForm">
        <div>
          <h2>Kayıt Ol</h2>
        </div>

        ${state.error ? `<p class="error-banner" role="alert">${escapeHtml(state.error)}</p>` : ""}

        <label>
          Email
          <input id="email" type="email" required>
        </label>

        <label>
          Şifre
          <input id="password" type="password" required>
        </label>

        <label>
          Rol
          <select id="role">
            <option value="candidate">Aday (Sadece CV Yükler)</option>
            <option value="hr">İnsan Kaynakları</option>
          </select>
        </label>

        <button type="submit" class="primary-action">Kayıt Ol</button>
        <button type="button" id="btnGoLogin" style="background:none; border:none; color:var(--primary); text-decoration:underline;">Zaten hesabınız var mı? Giriş Yapın</button>
      </form>
    </section>
  `;
}

function dashboardView(state) {
  const isHR = state.session.user.role === "hr";
  
  return `
    <section class="dashboard-layout">
      <aside class="sidebar">
        <div class="brand-row">
          <div class="brand-mark compact">RA</div>
          <div>
            <strong>RecruitAI</strong>
            <span>${isHR ? "IK Paneli" : "Aday Paneli"}</span>
          </div>
        </div>
        <div class="user-card">
          <span>${escapeHtml(state.session.user.email)}</span>
          <strong>${isHR ? "İnsan Kaynakları" : "Aday"}</strong>
          <button id="logoutButton" type="button">Çıkış Yap</button>
        </div>
      </aside>

      <section class="content">
        <header class="topbar">
          <div>
            <h1>${isHR ? "Tüm CV'ler ve Puanlar" : "CV Yükle"}</h1>
          </div>
        </header>

        ${state.error ? `<p class="error-banner" role="alert">${escapeHtml(state.error)}</p>` : ""}

        ${isHR ? hrPanel(state) : candidatePanel(state)}
      </section>
    </section>
  `;
}

function candidatePanel(state) {
  const selectedName = state.selectedFile ? state.selectedFile.name : "PDF Seçilmedi";
  
  let statusHtml = "";
  if (state.processing) {
    statusHtml = `
      <article class="panel status-panel" style="margin-top: 20px;">
        <div class="panel-heading">
          <h2>İşlem Durumu: ${escapeHtml(state.processing.status)}</h2>
        </div>
        <div class="progress-track" aria-label="Processing progress">
          <span style="width: ${state.processing.progress}%"></span>
        </div>
        ${state.processing.status === "completed" ? `
          <div class="quality-score">
            <span>${Math.round(state.processing.confidenceScore * 100) || 0}%</span>
            <div><strong>Başarı Puanı</strong></div>
          </div>
        ` : ""}
      </article>
    `;
  }

  return `
    <article class="panel upload-panel">
      <div class="panel-heading">
        <h2>CV Yükle</h2>
      </div>

      <label class="drop-zone" id="dropZone">
        <input id="fileInput" type="file" accept="application/pdf,.pdf">
        <span class="upload-icon">PDF</span>
        <strong>${escapeHtml(selectedName)}</strong>
        <small>PDF dosyasını buraya sürükleyin veya seçin.</small>
      </label>

      <button id="startProcessing" class="primary-action" type="button" ${state.selectedFile ? "" : "disabled"}>
        Yükle ve Analiz Et
      </button>
    </article>
    ${statusHtml}
  `;
}

function hrPanel(state) {
  return `
    <section class="history-section">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Dosya Adı</th>
              <th>Durum</th>
              <th>Puan (0-100)</th>
              <th>Yüklenme Tarihi</th>
            </tr>
          </thead>
          <tbody>
            ${state.history.map(row => `
              <tr>
                <td>${escapeHtml(row.file_name)}</td>
                <td><span class="status-badge ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
                <td><strong>${row.overall_score ? Math.round(row.overall_score * 100) : "-"}</strong></td>
                <td>${new Date(row.uploaded_at).toLocaleString()}</td>
              </tr>
            `).join("")}
            ${state.history.length === 0 ? '<tr><td colspan="4">Henüz CV yüklenmemiş.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function statusClass(status) {
  return String(status).toLowerCase().replace(/\s+/g, "-");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Initial Render
render();
