# Stage 1 - Problem Tanimi ve Tema Uyumu

Bu dokuman, 1. asama degerlendirme tablosundaki su 4 kritere direkt cevap verir:
- Problem Tanimi
- Tema Uyumu
- Gercek Hayat Karsiligi
- Hedef Kullanici

## 1) Problem Tanimi (Acik, Anlasilir, Olculebilir)

### Problem
IK ekipleri, role uygun adayi bulmak icin PDF CV'leri manuel okuyor. Bu surec:
- zaman aliyor,
- tutarsiz karar uretebiliyor,
- aday kalitesini olumsuz etkileyebiliyor.

### Olculebilir hedef
RecruitAI ile manuel on eleme eforunu en az %50 azaltmak.

### Olcum metodu
- Baseline: AI kullanmadan manuel tarama suresi (dakika)
- Current: RecruitAI destekli tarama suresi (dakika)
- Formul: ((Baseline - Current) / Baseline) * 100

### Baslangic kaniti (Sprint 0)
- Baseline valid sample: 9
- Overall median manuel tarama suresi: 11 dakika
- Kaynak: KPI_BASELINE_SUMMARY.md

## 2) Tema Uyumu (Secilen tema ile dogrudan iliski)

### Tema ile iliski
Proje, AI-Augmented Development ve AI destekli karar otomasyonu temasina dogrudan uygundur.

### Neden dogrudan uyumlu?
- PDF CV parse + normalize sureci AI/NLP ile otomatiklestirilir.
- JD-CV eslesmesi semantik benzerlik + kural tabanli skorla yapilir.
- IK kararlari explainability kartlariyla desteklenir.
- Human-in-the-loop yaklasimiyla son karar insanda kalir.

### Teknik uyum kanitlari
- Mimari: ARCHITECTURE.md
- Yol haritasi ve KPI: ROADMAP.md
- Kalite kapisi: RELEASE_QUALITY_GATE.md

## 3) Gercek Hayat Karsiligi (Sahada cozdgu ihtiyac)

### Gercek sorun
Sahada IK ekipleri cok sayida CV'yi kisitli zamanda degerlendirir. Bu da:
- ise alim suresini uzatir,
- iyi adaylari kacirma riskini artirir,
- operasyonel maliyeti yukseltir.

### RecruitAI'nin pratik etkisi
- Tarama suresini kisaltir (hedef >= %50 efor azalmasi).
- Shortlist kalitesini artirir (Precision@10 hedefi >= 0.75).
- Karar izlenebilirligini artirir (audit + reason factors).

### Is degeri
- Daha hizli shortlist
- Daha az manuel efor
- Daha tutarli degerlendirme

## 4) Hedef Kullanici (Dogru ve net tanim)

### Birincil hedef kullanici
- Recruiter / IK uzmanlari
- Takim lideri / hiring manager

### Ikincil kullanici
- Reviewer / kalite-guvence rolu
- Teknik yonetim (KPI ve release gate takibi)

### Kullanici ihtiyaclari
- Hizli aday filtreleme
- Aciklanabilir skor ve gerekce
- Toplu aksiyon (shortlist/reject/review)
- Denetlenebilir karar kaydi

## Puan Artirma Icin Kisa Savunma Cumlesi
RecruitAI, gercek dunyada yuksek hacimli CV tarama sorununu olculebilir KPI'larla hedefleyen, AI destekli ama insan denetimli, dogrudan tema uyumlu bir IK otomasyon cozumudur.

## Juriye Sunulacak 30 Saniye Ozet
RecruitAI, PDF tabanli CV degerlendirmede manuel on eleme eforunu en az %50 azaltmayi hedefliyor. Sorunu net KPI'larla olcuyoruz, AI ile parse+eslesme+skorlama yapiyoruz, son karari IK'ya birakiyoruz. Hem gercek ihtiyaci cozuyoruz hem de olculebilir etki uretiyoruz.
