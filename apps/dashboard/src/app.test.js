const {
  DEFAULT_PERFORMANCE_THRESHOLDS_MS,
  PROCESSING_UPDATES,
  authenticate,
  createPerformanceMonitor,
  createRecruiterWorkflow,
  defaultAuthService,
  escapeHtml,
  percentile,
  statusClass,
  validatePdfFile,
} = require("./app");

let generatedId = 0;
const TEST_PROCESSING_DELAY_MS = 25;

function makeRoot() {
  document.body.innerHTML = '<main id="app"></main>';
  return document.querySelector("#app");
}

function makeController(options = {}) {
  return createRecruiterWorkflow({
    root: makeRoot(),
    clock: () => "10:00",
    idFactory: () => `cv-test-${++generatedId}`,
    processingDelayMs: TEST_PROCESSING_DELAY_MS,
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
    generatedId = 0;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
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
    expect(controller.state.processing.id).toBe("cv-test-1");
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
    const totalProcessingMs = PROCESSING_UPDATES.length * TEST_PROCESSING_DELAY_MS;

    controller.startProcessing(makeFile("candidate.pdf"));
    jest.advanceTimersByTime(totalProcessingMs);

    expect(controller.state.processing.status).toBe("Ready");
    expect(controller.state.processing.progress).toBe(100);
    expect(controller.state.processing.parseQuality.overall).toBe(89);
    expect(controller.root.textContent).toContain("High confidence");
    expect(controller.root.textContent).toContain("Performance p95");
    expect(controller.state.performance.metrics.parse.p95Ms).toBe(totalProcessingMs);
  });

  test("cleared processing job ignores pending async timer updates", () => {
    const controller = makeController();
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.startProcessing(makeFile("candidate.pdf"));
    controller.state.processing = null;
    jest.advanceTimersByTime(PROCESSING_UPDATES.length * TEST_PROCESSING_DELAY_MS);

    expect(controller.state.processing).toBeNull();
  });

  test("processing schedule can be driven by an injected timer API", () => {
    const scheduled = [];
    const timerApi = {
      setTimeout: jest.fn((callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length;
      }),
    };
    const controller = makeController({ processingDelayMs: 25, timerApi });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };
    controller.render();

    controller.startProcessing(makeFile("manual-timer.pdf"));
    scheduled.slice().forEach((job) => job.callback());

    expect(timerApi.setTimeout).toHaveBeenCalledTimes(4);
    expect(scheduled.map((job) => job.delay)).toEqual([25, 50, 75, 100]);
    expect(controller.state.processing.status).toBe("Ready");
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

describe("RecruitAI performance instrumentation", () => {
  test("computes p95 using deterministic sample ordering", () => {
    expect(percentile([100, 5, 50, 25], 95)).toBe(100);
  });

  test("records upload, parse, and render metrics without relying on wall clock time", () => {
    let now = 0;
    const alerts = [];
    const performanceMonitor = createPerformanceMonitor({
      now: () => {
        now += 5;
        return now;
      },
      thresholds: { upload: 10, parse: 100, render: 10 },
      alertHandler: (alert) => alerts.push(alert),
    });
    const controller = makeController({
      performanceMonitor,
      timerApi: {
        setTimeout: (callback) => {
          now += 40;
          callback();
        },
      },
    });
    controller.state.session = { email: "recruiter@recruitai.local", role: "recruiter" };

    controller.render();
    controller.selectFile(makeFile("instrumented.pdf"));
    controller.startProcessing(makeFile("instrumented.pdf"));

    expect(controller.state.performance.metrics.render.count).toBeGreaterThan(0);
    expect(controller.state.performance.metrics.upload.p95Ms).toBeGreaterThan(10);
    expect(controller.state.performance.metrics.parse.p95Ms).toBeGreaterThan(100);
    expect(alerts.some((alert) => alert.metric === "upload")).toBe(true);
    expect(alerts.some((alert) => alert.metric === "parse")).toBe(true);
  });

  test("waits for async hotspot work before recording duration", async () => {
    let now = 0;
    const alerts = [];
    const performanceMonitor = createPerformanceMonitor({
      now: () => now,
      thresholds: { parse: 50 },
      alertHandler: (alert) => alerts.push(alert),
    });

    const result = performanceMonitor.measure("parse", async () => {
      now = 75;
      return "completed";
    }, { jobId: "async-parse" });

    expect(performanceMonitor.getSummary().metrics.parse).toBeUndefined();
    await expect(result).resolves.toBe("completed");
    expect(performanceMonitor.getSummary().metrics.parse.p95Ms).toBe(75);
    expect(alerts).toHaveLength(1);
  });

  test("uses documented default p95 thresholds for critical frontend hotspots", () => {
    expect(DEFAULT_PERFORMANCE_THRESHOLDS_MS).toEqual({
      upload: 250,
      parse: 4000,
      render: 120,
    });
  });
});
