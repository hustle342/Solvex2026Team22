# RecruitAI | Solvex 2026 Team 22

RecruitAI, PDF tabanli CV'leri analiz ederek IK sureclerini hizlandiran ve manuel on eleme eforunu azaltmayi hedefleyen AI destekli bir sistemdir.

## Vizyon

Hedefimiz, IK ekiplerinin tekrarlayan CV tarama islerini otomatiklestirip daha kaliteli adaylara daha hizli ulasmasini saglamaktir.

## Olculebilir Hedefler

| KPI | Hedef |
|---|---:|
| Manual screening effort reduction | >= 50% |
| CV parse critical field accuracy | >= 90% |
| Precision@10 | >= 0.75 |
| Median time-to-shortlist | <= 5 dakika |
| Recruiter acceptance rate | >= 60% |

## Neden RecruitAI?

- PDF CV'leri otomatik parse eder ve normalize eder.
- Job description ile aday profillerini semantic + rule-based yaklasimla eslestirir.
- Aciklanabilir skorlar uretir (neden shortlist/reject).
- Human-in-the-loop prensibiyle son karari IK uzmanina birakir.

## Mimari Bakis

```mermaid
flowchart LR
	A[PDF CV Upload] --> B[Ingestion API]
	B --> C[Queue]
	C --> D[Parsing Worker]
	D --> E[Normalization]
	E --> F[Scoring Engine]
	F --> G[IK Dashboard]
```

Detaylar icin: [ARCHITECTURE.md](ARCHITECTURE.md)

## Yol Haritasi

Sprint bazli plan, rol dagilimi ve KPI odakli teslim modeli burada:

- [ROADMAP.md](ROADMAP.md)

## Yonetim ve Kalite Dokumanlari

- [KPI_GOVERNANCE.md](KPI_GOVERNANCE.md)
- [KPI_WEEKLY_TRACKER.csv](KPI_WEEKLY_TRACKER.csv)
- [RELEASE_QUALITY_GATE.md](RELEASE_QUALITY_GATE.md)
- [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md)
- [STAGE1_PROBLEM_THEME.md](STAGE1_PROBLEM_THEME.md)
- [STAGE1_SCORING_CHECKLIST.md](STAGE1_SCORING_CHECKLIST.md)

## Hemen Basla

1. Sprint 1 dashboard akisini ac: [apps/dashboard/index.html](apps/dashboard/index.html)
2. KPI baseline verisini guncelle: [KPI_BASELINE_TIMESTUDY.csv](KPI_BASELINE_TIMESTUDY.csv)
3. Baseline ozetini uret:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\compute_kpi_baseline.ps1
```

4. Sonucu kontrol et: [KPI_BASELINE_SUMMARY.md](KPI_BASELINE_SUMMARY.md)

## Sprint 1 Frontend

Recruiter workflow ekranlari eklendi:

- Login ve Recruiter rol iskeleti
- PDF CV upload akisi
- Processing status takibi
- Parse quality monitoring paneli

Detayli dogrulama notu: [docs/sprint1-frontend-validation.md](docs/sprint1-frontend-validation.md)

## Takim

- Serdar - Lead Developer
- Samet - AI/Backend
- Cemilcan - Platform/Frontend

## Kisa Mesaj

RecruitAI, gercek dunyadaki IK darbozazini olculebilir KPI'larla hedefleyen, teknik olarak denetlenebilir ve yarismaya hazir bir AI cozumudur.
