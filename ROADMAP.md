# RecruitAI Roadmap

## 1) Success Metrics (Competition-Focused)
- Manual screening effort reduction: >= 50%
- CV parse critical field accuracy: >= 90%
- Precision@10 on shortlist recommendations: >= 0.75
- Median time-to-shortlist: <= 5 minutes per role
- Recruiter acceptance rate of AI suggestions: >= 60%

## 2) Delivery Model
- Cadence: 2-week sprint
- Team roles:
  - Serdar: Lead Developer + architecture owner + final technical approvals
  - Samet: AI/Backend execution owner
  - Cemilcan: Platform/Frontend execution owner
- Method: AI-Augmented Development with mandatory eval and guardrail gates

## 3) Sprint Plan (10 Weeks)

### Sprint 0 (Week 1) - Foundation and Planning
Goal: Scope lock, baseline, and project skeleton.

Samet:
- Define CV/JD canonical schema
- Build parser spike with 20 sample PDF
- Prepare first eval dataset format

Cemilcan:
- Setup monorepo, branching strategy, CI baseline
- Initialize dashboard shell and design system primitives
- Setup logging + environment strategy (dev/stage/prod)

Exit criteria:
- Architecture accepted
- Repo conventions and CI pipeline active

### Sprint 1 (Week 2-3) - Ingestion + Parsing MVP
Goal: Reliable PDF intake and normalized candidate profile.

Samet:
- Implement upload API + queue worker contract
- Implement parser + OCR fallback
- Persist parsed output with confidence score

Cemilcan:
- Build upload and processing status screens
- Add auth skeleton (login + recruiter role)
- Add parse quality monitoring panel (basic)

Exit criteria:
- 100 PDF batch processable
- Parse critical field accuracy >= 80% on internal set

### Sprint 2 (Week 4-5) - Matching Engine v1
Goal: Generate explainable ranking from CV-JD pairs.

Samet:
- Implement hard-filter rules + weighted scoring
- Add embedding similarity pipeline (pgvector)
- Emit explainability factors per score

Cemilcan:
- Candidate ranking table + filter UX
- Explainability card UI
- API integration for shortlist/reject actions

Exit criteria:
- End-to-end shortlist flow in staging
- Precision@10 baseline measured

### Sprint 3 (Week 6-7) - Human-in-the-Loop + Audit
Goal: Make decisions traceable and recruiter-friendly.

Samet:
- Decision audit event schema and APIs
- Reviewer override and feedback capture endpoint
- Add model/prompt version tagging in outputs

Cemilcan:
- Audit timeline UI + decision detail pages
- Bulk action UX + conflict handling
- Role-based access control completion

Exit criteria:
- Every recommendation has reason + trace
- Full action history visible in dashboard

### Sprint 4 (Week 8-9) - Quality Gates and Optimization
Goal: Reach competition KPIs and reduce operational risk.

Samet:
- Build offline eval pipeline (200+ anonymized pairs)
- Tune scoring weights and threshold calibration
- Regression suite for parser + ranking quality

Cemilcan:
- Performance tuning (list/filter response)
- Observability dashboards (latency, error, throughput)
- Compliance screens (retention/delete flow)

Exit criteria:
- Parse accuracy >= 90%
- Precision@10 >= 0.75
- No open P1 issue

### Sprint 5 (Week 10) - Demo Readiness and Final Packaging
Goal: Competition-ready narrative + stable product.

Samet:
- Freeze model/prompt versions and publish model card
- Final KPI report automation
- Prepare technical demo scenarios

Cemilcan:
- UX polish + edge-case handling
- Production-like deployment rehearsal
- Final dashboard exports for jury presentation

Exit criteria:
- KPI targets met or justified with mitigation plan
- Full demo flow passes without manual patching

## 4) Plan Agent Execution Framework
Plan Agent, sprint backlog'lari teknik alt gorevlere otomatik boler ve atar.

### Assignment policy
- AI/Backend tagged tasks -> Samet (primary)
- Platform/Frontend/DevOps tagged tasks -> Cemilcan (primary)
- Cross-cutting tasks -> shared with explicit owner and reviewer

### Task template (mandatory)
- Objective
- Inputs/Dependencies
- Implementation steps
- Acceptance criteria
- Test plan
- Risk and rollback plan
- Owner + Reviewer

### WIP limits
- Max 2 active high-complexity task per developer
- Blocked tasks escalated to Serdar within 24h

## 5) AI-Augmented Development Operating Rules

### 5.1 Prompt-to-PR workflow
1. Requirement card written by Serdar
2. Plan Agent creates technical subtasks
3. Developer uses AI pair session to draft code/tests
4. Human review + security check + eval check
5. Merge only if all gates pass

### 5.2 Required checks before merge
- Unit tests pass
- Integration smoke test pass
- Eval delta non-negative (or approved exception)
- Security scan clean for critical findings
- Logging and audit fields present

### 5.3 Evidence for scoring/jury
- Before/after time study proving >= 50% manual effort reduction
- Eval report (accuracy, precision, false-positive analysis)
- Architecture decision records
- Demo script with real scenario walkthrough

## 6) Risk Register (Top 5)
1. Low parse quality on non-standard CV templates
Mitigation: OCR fallback + template-agnostic parsing + confidence threshold.

2. Ranking bias and explainability gaps
Mitigation: bias audit set, transparent factors, recruiter override.

3. Scope creep before competition deadline
Mitigation: strict MVP boundary and weekly scope review.

4. Environment instability
Mitigation: staged deployment, infra as code, rollback scripts.

5. Weak KPI evidence
Mitigation: instrument metrics from Sprint 1 and keep continuous dashboard tracking.

## 7) Weekly Governance Cadence
- Monday: Sprint planning + task decomposition (Plan Agent)
- Wednesday: KPI and risk review
- Friday: Demo, retrospective, and roadmap adjustment

Owner of final go/no-go decision: Serdar.
