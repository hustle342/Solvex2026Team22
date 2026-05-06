/* ── RecruitAI Frontend SPA ───────────────────────────────────── */
const API = '/api/v1';
const $ = (sel) => document.querySelector(sel);
const app = $('#app');

/* ── State ───────────────────────────────────────────────────── */
let state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  page: 'upload'
};

function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  render();
}

function authHeaders() {
  return { 'Authorization': `Bearer ${state.token}` };
}

/* ── Router ──────────────────────────────────────────────────── */
function render() {
  if (!state.token) {
    renderAuth();
  } else if (state.user.role === 'hr') {
    renderHRDashboard();
  } else {
    renderCandidateDashboard();
  }
}

/* ── Auth Page ───────────────────────────────────────────────── */
function renderAuth() {
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <h1>⚡ RecruitAI</h1>
          <p>Yapay Zeka Destekli İK Platformu</p>
        </div>
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login" onclick="switchTab('login')">Giriş Yap</button>
          <button class="auth-tab" id="tab-register" onclick="switchTab('register')">Kayıt Ol</button>
        </div>
        <div id="auth-alert"></div>
        <form id="auth-form" onsubmit="handleAuth(event)">
          <div class="form-group">
            <label for="email">E-posta</label>
            <input type="email" id="email" placeholder="ornek@email.com" required>
          </div>
          <div class="form-group">
            <label for="password">Şifre</label>
            <input type="password" id="password" placeholder="••••••••" required minlength="4">
          </div>
          <div class="form-group" id="role-group" style="display:none">
            <label for="role">Hesap Türü</label>
            <select id="role">
              <option value="candidate">Aday (Candidate)</option>
              <option value="hr">İnsan Kaynakları (HR)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" id="auth-btn">Giriş Yap</button>
        </form>
      </div>
    </div>`;
}

let authMode = 'login';
window.switchTab = function(mode) {
  authMode = mode;
  $('#tab-login').classList.toggle('active', mode === 'login');
  $('#tab-register').classList.toggle('active', mode === 'register');
  $('#role-group').style.display = mode === 'register' ? 'block' : 'none';
  $('#auth-btn').textContent = mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
  $('#auth-alert').innerHTML = '';
};

window.handleAuth = async function(e) {
  e.preventDefault();
  const btn = $('#auth-btn');
  const email = $('#email').value;
  const password = $('#password').value;
  const role = $('#role').value;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    if (authMode === 'register') {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Kayıt başarısız');
      $('#auth-alert').innerHTML = '<div class="alert alert-success">Kayıt başarılı! Şimdi giriş yapabilirsiniz.</div>';
      switchTab('login');
      $('#email').value = email;
      return;
    }

    // Login
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Giriş başarısız');
    saveAuth(data.access_token, data.user);
    render();
  } catch (err) {
    $('#auth-alert').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
  }
};

/* ── Candidate Dashboard ─────────────────────────────────────── */
function renderCandidateDashboard() {
  state.page = 'upload';
  app.innerHTML = `
    <div class="dashboard">
      ${sidebarHTML('candidate')}
      <div class="main-content">
        <div class="page-header">
          <h2>📄 CV Yükleme</h2>
          <p>PDF formatında CV'nizi yükleyin, yapay zeka otomatik olarak analiz etsin.</p>
        </div>
        <div class="upload-zone" id="upload-zone">
          <span class="upload-icon">📤</span>
          <div class="upload-title">CV'nizi buraya sürükleyin veya tıklayın</div>
          <div class="upload-subtitle">Yalnızca PDF dosyaları • Maksimum 20MB</div>
          <input type="file" class="upload-input" id="file-input" accept=".pdf,application/pdf">
        </div>
        <div id="upload-status"></div>
        <div id="my-cvs-section">
          <div class="table-container">
            <div class="table-header">
              <span class="table-title">📋 Yüklenen CV'lerim</span>
              <button class="btn btn-outline" onclick="loadMyCVs()" style="padding:8px 16px;font-size:13px">↻ Yenile</button>
            </div>
            <div id="my-cvs-body">
              <div class="loading-overlay"><span class="spinner"></span> Yükleniyor...</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  setupUploadZone();
  loadMyCVs();
}

function setupUploadZone() {
  const zone = $('#upload-zone');
  const input = $('#file-input');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files.length) uploadFile(input.files[0]); });
}

async function uploadFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    $('#upload-status').innerHTML = '<div class="alert alert-error">Yalnızca PDF dosyaları kabul edilir.</div>';
    return;
  }

  $('#upload-status').innerHTML = `
    <div class="alert alert-success" style="display:flex;align-items:center;gap:12px">
      <span class="spinner"></span>
      <span><strong>${file.name}</strong> yükleniyor...</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>`;
  
  // Simulate progress
  let pct = 0;
  const intv = setInterval(() => {
    pct = Math.min(pct + Math.random() * 15, 90);
    const el = $('#progress-fill');
    if (el) el.style.width = pct + '%';
  }, 200);

  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });
    clearInterval(intv);
    const pf = $('#progress-fill');
    if (pf) pf.style.width = '100%';

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Yükleme başarısız');

    $('#upload-status').innerHTML = `
      <div class="alert alert-success">
        ✅ <strong>${file.name}</strong> başarıyla yüklendi! Analiz arka planda devam ediyor.
      </div>`;
    setTimeout(loadMyCVs, 1000);
  } catch (err) {
    clearInterval(intv);
    $('#upload-status').innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
  }
}

window.loadMyCVs = async function() {
  try {
    const res = await fetch(`${API}/jobs`, { headers: authHeaders() });
    const jobs = await res.json();

    if (!jobs.length) {
      $('#my-cvs-body').innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <h3>Henüz CV yüklenmedi</h3>
          <p>Yukarıdaki alandan CV'nizi yükleyerek başlayın.</p>
        </div>`;
      return;
    }

    $('#my-cvs-body').innerHTML = `
      <table>
        <thead><tr><th>Dosya</th><th>Durum</th><th>Tarih</th></tr></thead>
        <tbody>
          ${jobs.map(j => `
            <tr>
              <td style="font-weight:500">📄 ${j.filename}</td>
              <td>${statusBadge(j.status)}</td>
              <td style="color:var(--text-muted);font-size:13px">${formatDate(j.created_at)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    $('#my-cvs-body').innerHTML = `<div class="empty-state"><p>Yüklenirken hata oluştu.</p></div>`;
  }
};

/* ── HR Dashboard ────────────────────────────────────────────── */
/* ── Chat State ───────────────────────────────────────────────── */
let chatHistory = [];
let chatOpen = false;
let chatCandidates = []; // all candidates for @mention
let selectedCandidates = []; // candidates added to conversation {id, name}
let mentionQuery = '';
let mentionActive = false;

function renderHRDashboard() {
  state.page = 'hr';
  app.innerHTML = `
    <div class="dashboard">
      ${sidebarHTML('hr')}
      <div class="main-content">
        <div class="page-header">
          <h2>📊 İK Kontrol Paneli</h2>
          <p>Tüm adayların CV'lerini ve AI puanlarını buradan takip edin.</p>
        </div>
        <div class="stats-grid" id="stats-grid">
          <div class="stat-card"><div class="stat-label">Toplam CV</div><div class="stat-value" id="stat-total">–</div></div>
          <div class="stat-card"><div class="stat-label">Analiz Tamamlanan</div><div class="stat-value" id="stat-done">–</div></div>
          <div class="stat-card"><div class="stat-label">Ortalama Puan</div><div class="stat-value" id="stat-avg">–</div></div>
          <div class="stat-card"><div class="stat-label">Bekleyen</div><div class="stat-value" id="stat-pending">–</div></div>
        </div>
        <div class="table-container">
          <div class="table-header">
            <span class="table-title">📋 Tüm Adaylar</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <button class="btn btn-primary" onclick="openEmailCvPlugin()" style="width:auto;padding:8px 16px;font-size:13px">Mailden CV tara</button>
              <button class="btn btn-outline" onclick="loadHRCVs()" style="padding:8px 16px;font-size:13px">↻ Yenile</button>
            </div>
          </div>
          <div id="hr-table-body">
            <div class="loading-overlay"><span class="spinner"></span> CV'ler yükleniyor...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chatbot FAB -->
    <button class="chat-fab" id="chat-fab" onclick="toggleChat()">
      <span class="chat-fab-icon" id="chat-fab-icon">🤖</span>
    </button>

    <!-- Chatbot Panel -->
    <div class="chat-panel" id="chat-panel">
      <div class="chat-panel-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🤖</span>
          <div>
            <div style="font-weight:700;font-size:15px">AI IK Asistani</div>
            <div style="font-size:11px;color:var(--text-muted)">@ ile aday ekleyin</div>
          </div>
        </div>
        <button class="chat-close" onclick="toggleChat()">✕</button>
      </div>
      <div class="chat-messages" id="chat-messages">
        <div class="chat-msg assistant">
          <div class="chat-msg-content">
            Merhaba! 👋 Ben RecruitAI IK asistaniyim.<br><br>
            <strong>@</strong> yazarak adaylari sohbete ekleyin, sonra sorularinizi sorun:<br>
            • <strong>Karsilastirma</strong> – "@Ahmet ile @Fatma'yi karsilastir"<br>
            • <strong>Yetenek</strong> – "@Ahmet'in Python tecrubesi var mi?"<br>
            • <strong>Puan</strong> – "@Fatma neden dusuk puan almis?"<br>
          </div>
        </div>
      </div>
      <div id="chat-selected-tags"></div>
      <div style="position:relative">
        <div class="mention-dropdown" id="mention-dropdown"></div>
        <div class="chat-input-area">
          <input type="text" class="chat-input" id="chat-input" placeholder="@ ile aday ekleyin, sonra sorunuzu yazin..." autocomplete="off">
          <button class="chat-send-btn" id="chat-send-btn" onclick="sendChat()">➤</button>
        </div>
      </div>
    </div>`;
  loadHRCVs();
  loadChatCandidates();
}

/* ── Load Candidates for @mention ────────────────────────────── */
async function loadChatCandidates() {
  try {
    const res = await fetch(`${API}/chatbot/candidates`, { headers: authHeaders() });
    if (res.ok) chatCandidates = await res.json();
  } catch(e) { console.warn('Failed to load chat candidates', e); }
}

/* ── Chat Functions ──────────────────────────────────────────── */
window.toggleChat = function() {
  chatOpen = !chatOpen;
  const panel = $('#chat-panel');
  const fab = $('#chat-fab-icon');
  if (chatOpen) {
    panel.classList.add('open');
    fab.textContent = '✕';
    setTimeout(() => {
      const input = $('#chat-input');
      if (input) {
        input.focus();
        setupMentionListener(input);
      }
    }, 300);
  } else {
    panel.classList.remove('open');
    fab.textContent = '🤖';
    hideMentionDropdown();
  }
};

function setupMentionListener(input) {
  if (input._mentionReady) return;
  input._mentionReady = true;

  input.addEventListener('input', (e) => {
    const val = input.value;
    const cursorPos = input.selectionStart;
    // Find the last @ before cursor
    const beforeCursor = val.substring(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');

    if (lastAt !== -1 && (lastAt === 0 || beforeCursor[lastAt - 1] === ' ')) {
      const query = beforeCursor.substring(lastAt + 1).toLowerCase();
      if (query.length >= 0 && !query.includes(' ')) {
        mentionActive = true;
        mentionQuery = query;
        showMentionDropdown(query, lastAt);
        return;
      }
    }
    hideMentionDropdown();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !mentionActive) {
      sendChat();
    } else if (e.key === 'Escape' && mentionActive) {
      hideMentionDropdown();
      e.preventDefault();
    } else if (mentionActive && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      navigateMention(e.key === 'ArrowDown' ? 1 : -1);
    } else if (mentionActive && e.key === 'Enter') {
      e.preventDefault();
      selectHighlightedMention();
    }
  });
}

let mentionHighlight = 0;

function showMentionDropdown(query, atPos) {
  const dropdown = $('#mention-dropdown');
  const alreadyIds = new Set(selectedCandidates.map(c => c.id));
  const filtered = chatCandidates.filter(c =>
    !alreadyIds.has(c.id) && c.name.toLowerCase().includes(query)
  ).slice(0, 6);

  if (!filtered.length) {
    dropdown.innerHTML = '<div class="mention-item" style="color:var(--text-muted)">Aday bulunamadi</div>';
    dropdown.classList.add('open');
    return;
  }

  mentionHighlight = 0;
  dropdown.innerHTML = filtered.map((c, i) => `
    <div class="mention-item ${i === 0 ? 'highlighted' : ''}" data-id="${c.id}" data-name="${c.name}" onclick="pickMention('${c.id}', '${c.name.replace(/'/g, "\\'")}')">
      <span class="mention-avatar">👤</span>
      <span class="mention-name">${c.name}</span>
      ${c.score !== null ? `<span class="mention-score">${Math.round(c.score * 100)}%</span>` : ''}
    </div>`).join('');
  dropdown.classList.add('open');
}

function hideMentionDropdown() {
  mentionActive = false;
  mentionQuery = '';
  const dd = $('#mention-dropdown');
  if (dd) dd.classList.remove('open');
}

function navigateMention(dir) {
  const items = document.querySelectorAll('.mention-item[data-id]');
  if (!items.length) return;
  items[mentionHighlight]?.classList.remove('highlighted');
  mentionHighlight = Math.max(0, Math.min(items.length - 1, mentionHighlight + dir));
  items[mentionHighlight]?.classList.add('highlighted');
  items[mentionHighlight]?.scrollIntoView({ block: 'nearest' });
}

function selectHighlightedMention() {
  const items = document.querySelectorAll('.mention-item[data-id]');
  const item = items[mentionHighlight];
  if (item) {
    pickMention(item.dataset.id, item.dataset.name);
  }
}

window.pickMention = function(id, name) {
  // Add to selected if not already there
  if (!selectedCandidates.find(c => c.id === id)) {
    selectedCandidates.push({ id, name });
    renderSelectedTags();
  }

  // Replace @query with @Name in input
  const input = $('#chat-input');
  const val = input.value;
  const cursorPos = input.selectionStart;
  const beforeCursor = val.substring(0, cursorPos);
  const lastAt = beforeCursor.lastIndexOf('@');
  const afterCursor = val.substring(cursorPos);

  input.value = val.substring(0, lastAt) + '@' + name + ' ' + afterCursor;
  input.focus();
  hideMentionDropdown();
};

window.removeChatCandidate = function(id) {
  selectedCandidates = selectedCandidates.filter(c => c.id !== id);
  renderSelectedTags();
};

function renderSelectedTags() {
  const el = $('#chat-selected-tags');
  if (!el) return;
  if (!selectedCandidates.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<div class="chat-tags-bar">${selectedCandidates.map(c =>
    `<span class="chat-tag">👤 ${c.name} <button onclick="removeChatCandidate('${c.id}')" class="chat-tag-x">✕</button></span>`
  ).join('')}</div>`;
}

window.sendChat = async function() {
  const input = $('#chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  hideMentionDropdown();
  const messagesEl = $('#chat-messages');

  // Show user message with highlighted @mentions
  const displayMsg = escapeHtml(msg).replace(/@(\S+)/g, '<span class="mention-highlight">@$1</span>');
  messagesEl.innerHTML += `<div class="chat-msg user"><div class="chat-msg-content">${displayMsg}</div></div>`;

  // Add typing indicator
  messagesEl.innerHTML += `<div class="chat-msg assistant" id="chat-typing"><div class="chat-msg-content"><span class="chat-typing-dots"><span>.</span><span>.</span><span>.</span></span> Dusunuyor...</div></div>`;
  messagesEl.scrollTop = messagesEl.scrollHeight;

  input.disabled = true;
  $('#chat-send-btn').disabled = true;

  try {
    const res = await fetch(`${API}/chatbot/chat`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        history: chatHistory,
        candidate_ids: selectedCandidates.map(c => c.id)
      })
    });

    const typing = document.getElementById('chat-typing');
    if (typing) typing.remove();

    if (!res.ok) {
      const err = await res.json();
      messagesEl.innerHTML += `<div class="chat-msg assistant"><div class="chat-msg-content chat-error">Hata: ${err.detail || 'Bilinmeyen hata'}</div></div>`;
    } else {
      const data = await res.json();
      const htmlReply = markdownToHtml(data.reply);
      messagesEl.innerHTML += `<div class="chat-msg assistant"><div class="chat-msg-content">${htmlReply}</div></div>`;

      chatHistory.push({ role: 'user', content: msg });
      chatHistory.push({ role: 'assistant', content: data.reply });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    }
  } catch (err) {
    const typing = document.getElementById('chat-typing');
    if (typing) typing.remove();
    messagesEl.innerHTML += `<div class="chat-msg assistant"><div class="chat-msg-content chat-error">Baglanti hatasi: ${err.message}</div></div>`;
  }

  input.disabled = false;
  $('#chat-send-btn').disabled = false;
  input.focus();
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function markdownToHtml(md) {
  if (!md) return '';
  let html = escapeHtml(md);
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 4px;font-size:14px">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="margin:14px 0 6px;font-size:15px">$1</h3>');
  // Bullet lists
  html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul style="margin:6px 0;padding-left:18px">$1</ul>');
  // Table support (simple)
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.every(c => /^[\s\-:]+$/.test(c))) return ''; // separator row
    const tag = 'td';
    return '<tr>' + cells.map(c => `<${tag} style="padding:4px 8px;border:1px solid var(--border)">${c.trim()}</${tag}>`).join('') + '</tr>';
  });
  if (html.includes('<tr>')) {
    html = html.replace(/(<tr>.*<\/tr>)/gs, '<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:13px">$1</table>');
  }
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;font-size:12px;overflow-x:auto"><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.3);padding:2px 5px;border-radius:3px;font-size:12px">$1</code>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  return html;
}

let emailCvItems = [];
let emailCvError = '';
let emailCvLoading = false;
let emailCvSavingId = null;

window.openEmailCvPlugin = function() {
  emailCvError = '';
  renderEmailCvModal();
  window.scanEmailCVs();
};

window.closeEmailCvPlugin = function() {
  const overlay = document.getElementById('email-cv-overlay');
  if (overlay) overlay.remove();
};

function renderEmailCvModal() {
  const existing = document.getElementById('email-cv-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'email-cv-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) window.closeEmailCvPlugin(); };

  const rows = emailCvItems.map(item => {
    const percent = Math.round((item.score || 0) * 100);
    const isSaved = item.status === 'saved' || item.saved_job_id;
    const isFailed = item.status === 'failed';
    const saveDisabled = isSaved || isFailed || emailCvSavingId === item.pending_id;
    const saveLabel = isSaved ? 'Kaydedildi' : (emailCvSavingId === item.pending_id ? 'Kaydediliyor...' : 'Kaydet');
    return `
      <div class="email-cv-row">
        <div class="email-cv-main">
          <strong>${escapeHtml(item.candidate_name || 'Bilinmiyor')}</strong>
          <span>${escapeHtml(item.file_name || '')}</span>
          <small>${escapeHtml(item.email_sender || '')} - ${escapeHtml(item.email_subject || '')}</small>
          ${item.error ? `<small class="email-cv-error">${escapeHtml(item.error)}</small>` : ''}
        </div>
        <div class="email-cv-actions">
          <span class="email-cv-score ${percent >= 70 ? 'score-high' : percent >= 40 ? 'score-mid' : 'score-low'}">${percent}/100</span>
          <button class="btn btn-primary" style="width:auto;padding:8px 14px;font-size:12px" onclick="saveEmailCV('${item.pending_id}')" ${saveDisabled ? 'disabled' : ''}>${saveLabel}</button>
        </div>
      </div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="modal email-cv-modal">
      <button class="modal-close" onclick="closeEmailCvPlugin()">×</button>
      <div class="modal-header-section">
        <h3>Mailden gelen CV'ler</h3>
        <p style="color:var(--text-secondary);font-size:13px;margin-top:6px">
          PDF ekleri once puanlanir; sadece Kaydet dediginiz adaylar veritabanina eklenir.
        </p>
      </div>

      <div class="email-cv-toolbar">
        <button class="btn btn-primary" style="width:auto" onclick="scanEmailCVs()" ${emailCvLoading ? 'disabled' : ''}>
          ${emailCvLoading ? '<span class="spinner"></span> Taraniyor...' : 'Tekrar tara'}
        </button>
      </div>

      ${emailCvError ? `<div class="alert alert-error">${escapeHtml(emailCvError)}</div>` : ''}
      ${emailCvLoading && !emailCvItems.length ? '<div class="loading-overlay"><span class="spinner"></span> Mail kutusu taraniyor...</div>' : ''}
      ${!emailCvLoading && !emailCvError && !emailCvItems.length ? '<div class="empty-state"><h3>Kaydedilecek CV bulunamadi</h3><p>IMAP aramasinda PDF eki olan yeni mail yok.</p></div>' : ''}
      ${rows ? `<div class="email-cv-list">${rows}</div>` : ''}
    </div>`;

  document.body.appendChild(overlay);
}

window.scanEmailCVs = async function() {
  emailCvLoading = true;
  emailCvError = '';
  renderEmailCvModal();

  try {
    const res = await fetch(`${API}/email-cv/scan`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 10 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Mail CV taramasi basarisiz');
    emailCvItems = data.items || [];
  } catch (err) {
    emailCvError = err.message;
  } finally {
    emailCvLoading = false;
    renderEmailCvModal();
  }
};

window.saveEmailCV = async function(pendingId) {
  emailCvSavingId = pendingId;
  renderEmailCvModal();

  try {
    const res = await fetch(`${API}/email-cv/pending/${pendingId}/save`, {
      method: 'POST',
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'CV kaydedilemedi');

    emailCvItems = emailCvItems.map(item =>
      item.pending_id === pendingId
        ? { ...item, status: 'saved', saved_job_id: data.cv_id }
        : item
    );
    loadHRCVs();
  } catch (err) {
    emailCvError = err.message;
  } finally {
    emailCvSavingId = null;
    renderEmailCvModal();
  }
};

window.loadHRCVs = async function() {
  try {
    const res = await fetch(`${API}/cvs`, { headers: authHeaders() });
    if (res.status === 403) {
      $('#hr-table-body').innerHTML = '<div class="empty-state"><p>Bu sayfaya erişim yetkiniz yok.</p></div>';
      return;
    }
    const cvs = await res.json();

    // Stats
    const total = cvs.length;
    const done = cvs.filter(c => c.overall_score !== null).length;
    const pending = cvs.filter(c => c.status === 'pending' || c.status === 'processing').length;
    const scores = cvs.filter(c => c.overall_score !== null).map(c => c.overall_score * 100);
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '–';

    $('#stat-total').textContent = total;
    $('#stat-done').textContent = done;
    $('#stat-avg').textContent = avg !== '–' ? avg + '%' : '–';
    $('#stat-pending').textContent = pending;

    if (!cvs.length) {
      $('#hr-table-body').innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <h3>Henüz CV yüklenmedi</h3>
          <p>Adaylar CV yüklediğinde burada görünecektir.</p>
        </div>`;
      return;
    }

    $('#hr-table-body').innerHTML = `
      <table>
        <thead><tr><th>Aday Ad Soyad</th><th>Yetenekler</th><th>AI Puani</th><th>Durum</th><th>Yukleme Tarihi</th><th></th></tr></thead>
        <tbody>
          ${cvs.map(cv => {
            const skills = cv.skills || [];
            const shown = skills.slice(0, 3);
            const extra = skills.length - 3;
            const skillsHtml = shown.map(s => `<span class="skill-chip">${s}</span>`).join('') + (extra > 0 ? `<span class="skill-chip skill-more">+${extra}</span>` : '');
            return `
            <tr>
              <td style="font-weight:600">👤 ${cv.candidate_name || 'Bilinmiyor'}</td>
              <td><div class="skills-cell">${skillsHtml || '<span style="color:var(--text-muted);font-size:12px">–</span>'}</div></td>
              <td>${cv.overall_score !== null ? `<span class="score-circle ${scoreClass(cv.overall_score * 100)}">${Math.round(cv.overall_score * 100)}</span>` : '<span style="color:var(--text-muted)">Bekleniyor</span>'}</td>
              <td>${statusBadge(cv.status)}</td>
              <td style="color:var(--text-muted);font-size:13px">${formatDate(cv.uploaded_at)}</td>
              <td>${cv.parse_quality ? `<button class="btn btn-outline" style="padding:6px 12px;font-size:12px" onclick='showDetail(${JSON.stringify(cv).replace(/'/g, "&#39;")})'>Detay</button>` : ''}</td>
            </tr>`}).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    $('#hr-table-body').innerHTML = `<div class="empty-state"><p>Yüklenirken hata oluştu: ${err.message}</p></div>`;
  }
};

window.showDetail = function(cv) {
  let parsed = {};
  try { parsed = typeof cv.parse_quality === 'string' ? JSON.parse(cv.parse_quality) : cv.parse_quality || {}; } catch(e) {}

  const contact = cv.contact || parsed.contact || {};
  const skills = cv.skills || parsed.skills || [];
  const education = parsed.education || [];
  const experience = parsed.experience || [];
  const languages = parsed.languages || [];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>

      <div class="modal-header-section">
        <h3>👤 ${cv.candidate_name || 'Bilinmiyor'}</h3>
        <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
          ${cv.overall_score !== null ? `<span class="score-circle ${scoreClass(cv.overall_score * 100)}" style="width:42px;height:42px;font-size:13px">${Math.round(cv.overall_score * 100)}</span>` : ''}
          ${statusBadge(cv.status)}
          <span style="color:var(--text-muted);font-size:12px">📄 ${cv.file_name}</span>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">📞 Iletisim Bilgileri</div>
        ${contact.email ? `<div class="detail-row"><span class="detail-label">✉️ E-posta</span><span class="detail-value">${contact.email}</span></div>` : ''}
        ${contact.phone ? `<div class="detail-row"><span class="detail-label">📱 Telefon</span><span class="detail-value">${contact.phone}</span></div>` : ''}
        ${contact.linkedin ? `<div class="detail-row"><span class="detail-label">🔗 LinkedIn</span><span class="detail-value" style="word-break:break-all">${contact.linkedin}</span></div>` : ''}
        ${contact.github ? `<div class="detail-row"><span class="detail-label">💻 GitHub</span><span class="detail-value" style="word-break:break-all">${contact.github}</span></div>` : ''}
        ${contact.location ? `<div class="detail-row"><span class="detail-label">📍 Konum</span><span class="detail-value">${contact.location}</span></div>` : ''}
        ${!contact.email && !contact.phone && !contact.linkedin && !contact.github ? '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">Iletisim bilgisi bulunamadi.</div>' : ''}
      </div>

      ${skills.length ? `
      <div class="modal-section">
        <div class="modal-section-title">🛠️ Yetenekler</div>
        <div class="section-chips">${skills.map(s => `<span class="chip skill-chip">${s}</span>`).join('')}</div>
      </div>` : ''}

      ${experience.length ? `
      <div class="modal-section">
        <div class="modal-section-title">💼 Deneyim</div>
        ${experience.map(exp => `
          <div class="exp-item">
            ${exp.company ? `<div style="font-weight:600;font-size:14px">${exp.company}</div>` : ''}
            ${exp.title ? `<div style="color:var(--accent-light);font-size:13px">${exp.title}</div>` : ''}
            ${exp.start_date || exp.end_date ? `<div style="color:var(--text-muted);font-size:12px">${exp.start_date || ''} – ${exp.end_date || 'Devam ediyor'}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}

      ${education.length ? `
      <div class="modal-section">
        <div class="modal-section-title">🎓 Egitim</div>
        ${education.map(edu => `
          <div class="exp-item">
            ${edu.institution ? `<div style="font-weight:600;font-size:14px">${edu.institution}</div>` : ''}
            ${edu.degree ? `<div style="color:var(--accent-light);font-size:13px">${edu.degree}</div>` : ''}
            ${edu.start_date || edu.end_date ? `<div style="color:var(--text-muted);font-size:12px">${edu.start_date || ''} – ${edu.end_date || ''}</div>` : ''}
            ${edu.gpa ? `<div style="color:var(--text-muted);font-size:12px">GPA: ${edu.gpa}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}

      ${languages.length ? `
      <div class="modal-section">
        <div class="modal-section-title">🌐 Diller</div>
        <div class="section-chips">${languages.map(l => `<span class="chip">${l}</span>`).join('')}</div>
      </div>` : ''}

    </div>`;
  document.body.appendChild(overlay);
};

/* ── Shared Components ───────────────────────────────────────── */
function sidebarHTML(role) {
  const initial = state.user.email ? state.user.email[0].toUpperCase() : '?';
  const navItems = role === 'hr'
    ? `<button class="nav-item active"><span class="nav-icon">📊</span> Kontrol Paneli</button>
       <button class="nav-item" onclick="toggleChat()"><span class="nav-icon">🤖</span> AI Asistan</button>`
    : `<button class="nav-item active"><span class="nav-icon">📤</span> CV Yükle</button>`;

  return `
    <aside class="sidebar">
      <div class="sidebar-logo">⚡ RecruitAI</div>
      <nav class="sidebar-nav">
        ${navItems}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">${initial}</div>
          <div class="user-details">
            <div class="user-name">${state.user.email}</div>
            <div class="user-role">${role === 'hr' ? 'İnsan Kaynakları' : 'Aday'}</div>
          </div>
        </div>
        <button class="btn btn-outline" style="width:100%;margin-top:12px;padding:8px" onclick="logout()">🚪 Çıkış Yap</button>
      </div>
    </aside>`;
}

function statusBadge(s) {
  const map = {
    pending: ['badge-pending', '⏳ Bekliyor'],
    processing: ['badge-processing', '⚙️ İşleniyor'],
    completed: ['badge-completed', '✅ Tamamlandı'],
    failed: ['badge-failed', '❌ Başarısız'],
    Ready: ['badge-completed', '✅ Hazır']
  };
  const [cls, label] = map[s] || ['badge-pending', s];
  return `<span class="badge ${cls}">${label}</span>`;
}

function scoreClass(score) {
  if (score >= 70) return 'score-high';
  if (score >= 40) return 'score-mid';
  return 'score-low';
}

function formatDate(iso) {
  if (!iso) return '–';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

/* ── Init ────────────────────────────────────────────────────── */
render();
