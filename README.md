KAPTANI OLDUĞUM BU PROJE SAYESINDE SOLVEX2026 YARIŞMASINDA DERECEYE GIRIP TOPLULUK OZEL ODULU KAZANDIK, EKIP ARKADAŞLARIM CEMİL CAN OZ VE SAMET TANAY'A TEŞEKKURLERİMLE!




# RecruitAI

RecruitAI, ise alim sureclerini daha hizli, daha gorunur ve daha aciklanabilir hale getirmek icin gelistirilmis yapay zeka destekli bir ise alim panelidir. Sistem; aday CV'lerinin yuklenmesi, ayristirilmasi, ayristirma kalitesinin izlenmesi, adaylarin puanlanarak siralanmasi ve ise alim uzmaninin bu puanlari yorumlayabilmesi icin aciklanabilir karar destegi sunar. Boylece kullanici yalnizca aday listesini gormekle kalmaz, ayni zamanda adayin neden one ciktigini veya neden daha dusuk degerlendirildigini de anlayabilir.

## Panel

Sprint kapsaminda hazirlanan ise alim panelini acmak icin:

```text
apps/dashboard/index.html
```

Aday siralama demosunu dogrudan acmak icin:

```text
apps/dashboard/index.html?demo=ranking
```

## Mevcut Arayuz Kapsami

- Giris ekrani ve ise alim uzmani rolu icin temel kullanici akisı
- PDF formatindaki CV'lerin yuklenmesi ve islenme durumunun adim adim izlenmesi
- CV ayristirma kalitesini gosteren kalite paneli
- Yapay zeka destekli aday puanlama ve siralama tablosu
- Yetenek filtresi ile adaylari filtreleme
- Puan, deneyim ve basvuru tarihine gore siralama
- Secilen aday icin aciklanabilirlik karti
- `Shortlist` ve `Reject` aksiyonlarinin API ile baglantili sekilde calismasi
- Aday puanini aciklamak icin yapay zeka destekli yorumlama akisi

## Testler

Projede yer alan frontend testlerini calistirmak icin:

```bash
npm test
```

