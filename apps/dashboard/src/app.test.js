const {
  authenticate,
  buildCandidateExplainPayload,
  buildLocalChatResponse,
  createRecruiterWorkflow,
  defaultAskAiApi,
  defaultAuthService,
  defaultCandidateActionApi,
  defaultMentionApi,
  escapeHtml,
  getActiveMentionQuery,
  getSkillOptions,
  getVisibleCandidates,
  localCandidateSearch,
  localMentionSearch,
  normalizeAiAnswer,
  renderMarkdown,
  replaceActiveMention,
  statusClass,
  validatePdfFile,
} = require("./app");

function makeRoot() {
  document.body.innerHTML = '<main id="app"></main>';
  return document.querySelector("#app");
}

function makeController(options = {}) {
  return createRecruiterWorkflow({
    root: makeRoot(),
    clock: () => "10:00",
    ...options,
  });
}

function makeFile(name, type = "application/pdf", size = 1200) {
  return new File(["x".repeat(Math.min(size, 1024))], name, { type });
}

function submitLogin(root, overrides = {}) {
  root.querySelector("#email").value = overrides.email ?? "recruiter@recruitai.local";
  root.querySelector("#password").value = overrides.password ?? "demo1234";
  root.querySelector("#role").value = overrides.role ?? "recruiter";
  root.querySelector("#loginForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

describe("RecruitAI login flow", () => {
  test("renders the default recruiter login screen", () => {
    const controller = makeController();

    controller.render();

    expect(controller.root.textContent).toContain("Recruiter Access");
    expect(controller.root.querySelector("#email").value).toBe("recruiter@recruitai.local");
  });

  test("accepts valid recruiter credentials and opens dashboard", () => {
    const controller = makeController();
    controller.render();

    submitLogin(controller.root);

    expect(controller.state.session).toEqual({
      email: "recruiter@recruitai.local",
      role: "recruiter",
    });
    expect(controller.root.textContent).toContain("CV Intake and Parsing Monitor");
  });

  test("rejects wrong email and keeps user on login", () => {
    const controller = makeController();
    controller.render();

    submitLogin(controller.root, { email: "wrong@recruitai.local" });

    expect(controller.state.session).toBeNull();
    expect(controller.root.textContent).toContain("Invalid recruiter credentials.");
  });

  test("rejects wrong password", () => {
    const controller = makeController();
    controller.render();

    submitLogin(controller.root, { password: "bad-password" });

    expect(controller.state.session).toBeNull();
    expect(controller.root.querySelector('[role="alert"]').textContent).toContain("Invalid recruiter credentials.");
  });

  test("rejects non-recruiter role", () => {
    const controller = makeController();
    controller.render();

    submitLogin(controller.root, { role: "viewer" });

    expect(controller.state.session).toBeNull();
    expect(controller.root.textContent).toContain("Only Recruiter role is enabled");
  });

  test("requires email", () => {
    const result = authenticate({ email: "", password: "demo1234", role: "recruiter" }, defaultAuthService);

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Email and password are required.");
  });

  test("requires password", () => {
    const result = authenticate(
      { email: "recruiter@recruitai.local", password: "", role: "recruiter" },
      defaultAuthService
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Email and password are required.");
  });

  test("handles missing credential object fields", () => {
    const result = authenticate({}, defaultAuthService);

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Email and password are required.");
  });

  test("normalizes email casing and whitespace", () => {
    const result = authenticate(
      { email: "  RECRUITER@RECRUITAI.LOCAL ", password: "demo1234", role: "recruiter" },
      defaultAuthService
    );

    expect(result.ok).toBe(true);
    expect(result.session.email).toBe("recruiter@recruitai.local");
  });

  test("supports mocked authentication success", () => {
    const authService = {
      login: jest.fn(() => ({ ok: true, session: { email: "mock@local", role: "recruiter" } })),
    };
    const controller = makeController({ authService });
    controller.render();

    submitLogin(controller.root);

    expect(authService.login).toHaveBeenCalledWith({
      email: "recruiter@recruitai.local",
      password: "demo1234",
      role: "recruiter",
    });
    expect(controller.state.session.email).toBe("mock@local");
  });

  test("supports mocked authentication failure", () => {
    const authService = {
      login: jest.fn(() => ({ ok: false, message: "Mock auth rejected." })),
    };
    const controller = makeController({ authService });
    controller.render();

    submitLogin(controller.root);

    expect(controller.state.session).toBeNull();
    expect(controller.root.textContent).toContain("Mock auth rejected.");
  });

  test("logout clears session and returns to login screen", () => {
    const controller = makeController();
    controller.render();
    submitLogin(controller.root);

    controller.root.querySelector("#logoutButton").click();

    expect(controller.state.session).toBeNull();
    expect(controller.root.textContent).toContain("Sign in");
  });

  test("demo query seeds a ready dashboard session", () => {
    const controller = makeController();

    const seeded = controller.seedDemoFromQuery("?demo=ready");
    controller.render();

    expect(seeded).toBe(true);
    expect(controller.state.processing.status).toBe("Ready");
    expect(controller.root.textContent).toContain("demo-senior-ai-engineer.pdf");
  });

  test("demo query ignores non-ready modes", () => {
    const controller = makeController();

    const seeded = controller.seedDemoFromQuery("?demo=login");

    expect(seeded).toBe(false);
    expect(controller.state.session).toBeNull();
  });

  test("controller can use default DOM options", () => {
    makeRoot();

    const controller = createRecruiterWorkflow();
    controller.render();

    expect(controller.root.textContent).toContain("Recruiter Access");
  });

  test("controller safely renders without a root", () => {
    const controller = createRecruiterWorkflow({ root: null });

    expect(() => controller.render()).not.toThrow();
  });

  test("bind methods tolerate missing DOM sections", () => {
    const root = makeRoot();
    const controller = createRecruiterWorkflow({ root });

    expect(() => controller.bindLogin()).not.toThrow();
    expect(() => controller.bindDashboard()).not.toThrow();
  });
});

describe("RecruitAI PDF upload workflow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("validates a PDF by mime type", () => {
    const result = validatePdfFile(makeFile("candidate.bin", "application/pdf"));

    expect(result.valid).toBe(true);
  });

  test("validates a PDF by file extension", () => {
    const result = validatePdfFile(makeFile("candidate.pdf", "application/octet-stream"));

    expect(result.valid).toBe(true);
  });

  test("rejects missing file", () => {
    const result = validatePdfFile(null);

    expect(result.valid).toBe(false);
    expect(result.message).toBe("Please select a PDF CV.");
  });

  test("rejects non-PDF file", () => {
    const result = validatePdfFile(makeFile("candidate.txt", "text/plain"));

    expect(result.valid).toBe(false);
    expect(result.message).toBe("Please upload a PDF CV.");
  });

  test("rejects PDFs over 10MB", () => {
    const file = makeFile("huge.pdf", "application/pdf");
    Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });

    const result = validatePdfFile(file);

    expect(result.valid).toBe(false);
    expect(result.message).toBe("PDF CV must be 10MB or smaller.");
  });

  test("handles file-like objects with missing metadata", () => {
    const result = validatePdfFile({});

    expect(result.valid).toBe(false);
    expect(result.message).toBe("Please upload a PDF CV.");
  });

  test("selecting a valid PDF enables parsing", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    const selected = controller.selectFile(makeFile("candidate.pdf"));

    expect(selected).toBe(true);
    expect(controller.state.selectedFile.name).toBe("candidate.pdf");
    expect(controller.root.querySelector("#startProcessing").disabled).toBe(false);
  });

  test("selecting a non-PDF shows validation error", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    const selected = controller.selectFile(makeFile("candidate.docx", "application/vnd.openxmlformats"));

    expect(selected).toBe(false);
    expect(controller.state.selectedFile).toBeNull();
    expect(controller.root.textContent).toContain("Please upload a PDF CV.");
  });

  test("input change stores the selected PDF", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();
    const input = controller.root.querySelector("#fileInput");
    Object.defineProperty(input, "files", { value: [makeFile("from-input.pdf")], configurable: true });

    input.dispatchEvent(new Event("change", { bubbles: true }));

    expect(controller.state.selectedFile.name).toBe("from-input.pdf");
    expect(controller.root.textContent).toContain("from-input.pdf");
  });

  test("dragover marks the drop zone as active", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();
    const dropZone = controller.root.querySelector("#dropZone");

    dropZone.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));

    expect(dropZone.classList.contains("dragging")).toBe(true);
  });

  test("dragleave removes the active drop zone state", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();
    const dropZone = controller.root.querySelector("#dropZone");

    dropZone.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
    dropZone.dispatchEvent(new Event("dragleave", { bubbles: true }));

    expect(dropZone.classList.contains("dragging")).toBe(false);
  });

  test("drop event selects a valid PDF", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();
    const dropZone = controller.root.querySelector("#dropZone");
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: { files: [makeFile("dropped.pdf")] } });

    dropZone.dispatchEvent(event);

    expect(controller.state.selectedFile.name).toBe("dropped.pdf");
  });

  test("start button triggers processing for a selected PDF", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();
    controller.selectFile(makeFile("button-start.pdf"));

    controller.root.querySelector("#startProcessing").click();

    expect(controller.state.processing.fileName).toBe("button-start.pdf");
    expect(controller.state.processing.status).toBe("Queued");
  });

  test("start button does nothing when no file is selected", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.root.querySelector("#startProcessing").click();

    expect(controller.state.processing).toBeNull();
  });

  test("starting processing creates queued status and clears selected file", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();
    const file = makeFile("candidate.pdf");

    const started = controller.startProcessing(file);

    expect(started).toBe(true);
    expect(controller.state.selectedFile).toBeNull();
    expect(controller.state.processing.status).toBe("Queued");
    expect(controller.state.processing.progress).toBe(8);
  });

  test("processing timers advance status to ready and update quality", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.startProcessing(makeFile("candidate.pdf"));
    jest.advanceTimersByTime(3600);

    expect(controller.state.processing.status).toBe("Ready");
    expect(controller.state.processing.progress).toBe(100);
    expect(controller.state.processing.parseQuality.overall).toBe(89);
    expect(controller.root.textContent).toContain("High confidence");
  });

  test("processing timer exits if job is cleared", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.startProcessing(makeFile("candidate.pdf"));
    controller.state.processing = null;
    jest.advanceTimersByTime(900);

    expect(controller.state.processing).toBeNull();
  });

  test("start processing blocks invalid files", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    const started = controller.startProcessing(makeFile("notes.txt", "text/plain"));

    expect(started).toBe(false);
    expect(controller.state.processing).toBeNull();
    expect(controller.root.textContent).toContain("Please upload a PDF CV.");
  });

  test("status panel falls back to zero progress", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.state.processing = {
      id: "cv-no-progress",
      fileName: "no-progress.pdf",
      status: "Queued",
      uploadedAt: "10:00",
      parseQuality: {
        overall: 50,
        contact: 50,
        experience: 50,
        skills: 50,
        education: 50,
        confidence: "Low",
      },
    };

    controller.render();

    expect(controller.root.querySelector(".progress-track span").getAttribute("style")).toBe("width: 0%");
  });

  test("status class normalizes multi-word labels", () => {
    expect(statusClass("Quality Check")).toBe("quality-check");
    expect(statusClass("Needs Review")).toBe("needs-review");
  });

  test("escapes HTML before rendering dynamic text", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});

describe("RecruitAI candidate ranking dashboard", () => {
  test("renders candidates ordered by AI score by default", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    const names = Array.from(controller.root.querySelectorAll(".candidate-table tbody tr td:first-child strong")).map(
      (node) => node.textContent
    );

    expect(names[0]).toBe("Ayse Yilmaz");
    expect(names[names.length - 1]).toBe("Burak Sen");
  });

  test("skill options are unique and sorted", () => {
    const controller = makeController();

    const skills = getSkillOptions(controller.state.candidates);

    expect(skills).toContain("Python");
    expect(skills).toContain("Dashboard UX");
    expect(skills).toEqual([...skills].sort((a, b) => a.localeCompare(b)));
  });

  test("filters candidates by selected skill", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.updateSkillFilter("Python");

    expect(controller.getVisibleCandidates().map((candidate) => candidate.name)).toEqual(["Ayse Yilmaz", "Elif Arslan"]);
    expect(controller.root.querySelector("#skillFilter").value).toBe("Python");
  });

  test("shows empty state when skill filter has no matches", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };

    controller.updateSkillFilter("Rust");

    expect(controller.getVisibleCandidates()).toHaveLength(0);
    expect(controller.root.textContent).toContain("No candidates match this skill filter.");
  });

  test("sorts candidates by experience through controller method", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };

    controller.updateSort("experience");

    expect(controller.state.candidateFilters.sortBy).toBe("experience");
    expect(controller.getVisibleCandidates()[0].name).toBe("Ayse Yilmaz");
  });

  test("toggles sort direction when same sort is clicked", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };

    controller.updateSort("score");

    expect(controller.state.candidateFilters.sortDir).toBe("asc");
    expect(controller.getVisibleCandidates()[0].name).toBe("Burak Sen");
  });

  test("sort button click updates applied date sorting", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.root.querySelector('[data-sort="appliedAt"]').click();

    expect(controller.state.candidateFilters.sortBy).toBe("appliedAt");
    expect(controller.root.textContent).toContain("Applied ↓");
  });

  test("selecting a candidate updates explainability card", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    const selected = controller.selectCandidate("cand-002");

    expect(selected).toBe(true);
    expect(controller.state.selectedCandidateId).toBe("cand-002");
    expect(controller.root.textContent).toContain("Cemocan Demir");
    expect(controller.root.textContent).toContain("Testing coverage");
  });

  test("clicking a table row selects candidate for explainability", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.root.querySelector('[data-candidate-id="cand-003"]').click();

    expect(controller.state.selectedCandidateId).toBe("cand-003");
    expect(controller.root.textContent).toContain("Full stack coverage");
  });

  test("rejects selecting an unknown candidate", () => {
    const controller = makeController();

    expect(controller.selectCandidate("missing")).toBe(false);
  });

  test("shortlist action calls API and updates candidate status", async () => {
    const candidateActionApi = jest.fn(() => Promise.resolve({ ok: true }));
    const controller = makeController({ candidateActionApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    await controller.handleCandidateAction("cand-002", "shortlist");

    expect(candidateActionApi).toHaveBeenCalledWith("cand-002", "shortlist");
    expect(controller.state.candidates.find((candidate) => candidate.id === "cand-002").status).toBe("shortlisted");
    expect(controller.root.textContent).toContain("Shortlisted");
  });

  test("reject action button calls API and updates candidate status", async () => {
    const candidateActionApi = jest.fn(() => Promise.resolve({ ok: true }));
    const controller = makeController({ candidateActionApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.root.querySelector('[data-action="reject"][data-candidate-id="cand-004"]').click();
    await Promise.resolve();

    expect(candidateActionApi).toHaveBeenCalledWith("cand-004", "reject");
    expect(controller.state.candidates.find((candidate) => candidate.id === "cand-004").status).toBe("rejected");
  });

  test("candidate action shows error on API failure", async () => {
    const candidateActionApi = jest.fn(() => Promise.reject(new Error("API unavailable")));
    const controller = makeController({ candidateActionApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    const result = await controller.handleCandidateAction("cand-002", "shortlist");

    expect(result).toBe(false);
    expect(controller.state.actionStatus["cand-002"]).toBe("shortlist:error");
    expect(controller.root.textContent).toContain("API unavailable");
  });

  test("candidate action rejects unknown action and unknown candidate", async () => {
    const controller = makeController();

    await expect(controller.handleCandidateAction("cand-001", "archive")).resolves.toBe(false);
    await expect(controller.handleCandidateAction("missing", "shortlist")).resolves.toBe(false);
  });

  test("default candidate action API posts to candidate endpoint", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));

    const result = await defaultCandidateActionApi("cand-001", "shortlist");

    expect(result.endpoint).toBe("/api/candidates/cand-001/shortlist");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/candidates/cand-001/shortlist",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          candidateId: "cand-001",
          action: "shortlist",
          source: "recruiter-dashboard",
        }),
      })
    );
    global.fetch = originalFetch;
  });

  test("default candidate action API throws when backend rejects", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));

    await expect(defaultCandidateActionApi("cand-001", "reject")).rejects.toThrow("Candidate action failed with 500");
    global.fetch = originalFetch;
  });

  test("getVisibleCandidates supports applied date sorting", () => {
    const controller = makeController();
    controller.state.candidateFilters.sortBy = "appliedAt";

    const candidates = getVisibleCandidates(controller.state);

    expect(candidates[0].name).toBe("Ayse Yilmaz");
  });
});

describe("RecruitAI Ask AI explainability chat", () => {
  test("renders chat panel with manual input and explain score button", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };

    controller.render();

    expect(controller.root.textContent).toContain("Ask AI");
    expect(controller.root.querySelector("#aiChatInput").placeholder).toContain("@Cemocan");
    expect(controller.root.querySelector('[data-question="Explain this score"]')).not.toBeNull();
  });

  test("Ask AI sends mention context and removes loading state after response", async () => {
    let resolveRequest;
    const askAiApi = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );
    const controller = makeController({ askAiApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    const pending = controller.askAI("Neden bu puan?", "cand-002");

    expect(controller.state.chat.isLoading).toBe(true);
    expect(controller.root.textContent).toContain("AI is thinking...");
    expect(askAiApi).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Neden bu puan?",
        source: "recruiter-dashboard",
        mentions: ["cand-002"],
        candidates: expect.any(Array),
      })
    );

    resolveRequest({
      answer: "### Cemocan score explanation\n- Strong frontend evidence\n- Review backend depth",
      sources: ["storage/markdown/candidates/cand-002-cemocan-demir.md"],
    });
    await pending;

    expect(controller.state.chat.isLoading).toBe(false);
    expect(controller.root.textContent).not.toContain("AI is thinking...");
    expect(controller.root.textContent).toContain("Cemocan score explanation");
    expect(controller.root.textContent).toContain("Strong frontend evidence");
    expect(controller.root.textContent).toContain("cand-002-cemocan-demir.md");
  });

  test("Explain this score button opens chat for the selected candidate", async () => {
    const askAiApi = jest.fn(() => Promise.resolve({ answer: "### Explained\n- Score is driven by skill fit." }));
    const controller = makeController({ askAiApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.root.querySelector('[data-question="Explain this score"]').click();
    await Promise.resolve();

    expect(askAiApi).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Explain this score",
        mentions: ["cand-001"],
      })
    );
    expect(controller.root.textContent).toContain("Score is driven by skill fit.");
  });

  test("manual chat submit sends typed natural language query without implicit mention", async () => {
    const askAiApi = jest.fn(() => Promise.resolve({ answer: "### Candidate recommendations\n- Ayse Yilmaz fits." }));
    const controller = makeController({ askAiApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.root.querySelector("#aiChatInput").value = "Neden?";
    controller.root.querySelector("#aiChatForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(askAiApi).toHaveBeenCalledWith(expect.objectContaining({ message: "Neden?", mentions: [] }));
    expect(controller.root.textContent).toContain("Candidate recommendations");
  });

  test("@ opens mention suggestions near chat input", async () => {
    const mentionApi = jest.fn(() =>
      Promise.resolve([{ id: "cand-002", label: "Cemocan Demir", type: "candidate", path: "storage/cand-002.md" }])
    );
    const controller = makeController({ mentionApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.root.querySelector("#aiChatInput").value = "@cem";
    controller.root.querySelector("#aiChatInput").dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(mentionApi).toHaveBeenCalledWith("cem");
    expect(controller.root.querySelector(".mention-menu").textContent).toContain("Cemocan Demir");
  });

  test("selecting a mention updates input and mention state", async () => {
    const mentionApi = jest.fn(() =>
      Promise.resolve([{ id: "cand-002", label: "Cemocan Demir", type: "candidate", path: "storage/cand-002.md" }])
    );
    const controller = makeController({ mentionApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    await controller.updateChatInput("@cem");
    controller.root.querySelector('[data-mention-id="cand-002"]').click();

    expect(controller.state.chat.input).toBe("@Cemocan Demir ");
    expect(controller.state.chat.mentions).toEqual(["cand-002"]);
    expect(controller.root.querySelector(".mention-tokens").textContent).toContain("@cand-002");
  });

  test("natural language candidate search response renders in chat panel", async () => {
    const askAiApi = jest.fn(() =>
      Promise.resolve({
        answer: "### Candidate recommendations\n- 1. Ayse Yilmaz - Python, FastAPI, NLP.",
        candidates: [{ id: "cand-001", label: "Ayse Yilmaz" }],
      })
    );
    const controller = makeController({ askAiApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    await controller.askAI("Bana Python, FastAPI ve NLP bilen 5+ yil deneyimli biri lazim", null);

    expect(controller.root.textContent).toContain("Candidate recommendations");
    expect(controller.root.textContent).toContain("Ayse Yilmaz");
  });

  test("chat shows service errors as assistant messages", async () => {
    const askAiApi = jest.fn(() => Promise.reject(new Error("AI timeout")));
    const controller = makeController({ askAiApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    const result = await controller.askAI("Explain this score", "cand-001");

    expect(result).toBe(false);
    expect(controller.state.chat.isLoading).toBe(false);
    expect(controller.root.textContent).toContain("Unable to explain score");
    expect(controller.root.textContent).toContain("AI timeout");
  });

  test("chat toggle collapses and reopens panel", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.root.querySelector("#chatToggle").click();

    expect(controller.state.chat.isOpen).toBe(false);
    expect(controller.root.querySelector("#aiChatInput")).toBeNull();
  });

  test("default Ask AI API posts to chat endpoint", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ answer: "### API answer" }),
      })
    );

    const response = await defaultAskAiApi({
      message: "Explain this score",
      mentions: ["cand-001"],
      source: "recruiter-dashboard",
    });

    expect(response.answer).toBe("### API answer");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/chat/query",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Explain this score"),
      })
    );
    global.fetch = originalFetch;
  });

  test("default Ask AI API throws when backend rejects", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));

    await expect(
      defaultAskAiApi({
        message: "Explain this score",
        mentions: ["cand-001"],
      })
    ).rejects.toThrow("Ask AI failed with 500");
    global.fetch = originalFetch;
  });

  test("default mention API calls knowledge mentions endpoint", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: "cand-002", label: "Cemocan Demir" }]),
      })
    );

    const response = await defaultMentionApi("cem");

    expect(response[0].label).toBe("Cemocan Demir");
    expect(global.fetch).toHaveBeenCalledWith("/api/v1/knowledge/mentions?q=cem");
    global.fetch = originalFetch;
  });

  test("local mention and search helpers rank demo candidates", () => {
    expect(localMentionSearch("cem")[0].label).toBe("Cemocan Demir");
    expect(localCandidateSearch("Python FastAPI NLP 5+ yil")[0].name).toBe("Ayse Yilmaz");
    expect(buildLocalChatResponse({ message: "@cem", mentions: ["cand-002"] }).sources[0]).toContain("cand-002");
  });

  test("mention query helpers parse and replace active token", () => {
    expect(getActiveMentionQuery("hello @cem")).toBe("cem");
    expect(getActiveMentionQuery("hello @cem test")).toBeNull();
    expect(replaceActiveMention("hello @cem", "Cemocan Demir")).toBe("hello @Cemocan Demir ");
  });

  test("markdown renderer escapes unsafe content and renders bullets", () => {
    const html = renderMarkdown("### Title\n- <script>alert(1)</script>");

    expect(html).toContain("<h3>Title</h3>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  test("normalizes empty AI responses", () => {
    expect(normalizeAiAnswer({})).toContain("empty explanation");
  });
});
