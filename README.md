# DALYAN

Boğaz'da balıkçılık oyunu. **Oyna:** https://skenanoglu.github.io/dalyan/

**Liman → Olta ya da Martı → Balık Pazarı → Liman**

- 🎣 **Olta** (Balık Avı'ndan): tekneyle açıl, 90 saniye olta at. Küçük balıklar sığda, büyükler derinde.
  Daha iyi olta daha derine iner; yemler sevdiği türleri çeker. Bölgeler (Sarayburnu → Marmara Dibi) balığın fiyatını artırır.
  Gündüz ya da gece seçilir; hava her sefer değişir: güneşli, yağmurlu (su bulanık, balık hareketli) ya da fırtına
  (tekne sürüklenir, olta savrulur, şimşek çakar). Gece sadece fenerin çevresi görünür, fener balığı sığa çıkar.
- 🕊️ **Martı** (Boğaz'dan): dokun = yukarı, basılı tut = dal. Engellerden geç, suya dalıp balığı gagala.
  Dalış yükseldikçe derindeki büyük balıklara ulaşır (ulaşamadıkların soluk görünür); nefes su altı süresini,
  gaga menzili, can simidi çarpışma affını belirler. Sabah, gün batımı, gece ve fırtına sırayla gelir.
- 🐟 **Balık Pazarı:** her tür kendi fiyatıyla satılır, farklı tür sayısı arttıkça kazanç çarpanı büyür (×1.8'e kadar).
  Çöp ceza yazar. Pazar kedisi en pahalı balığa göz diker: dokunup kovalamazsan bir tane kapar.
- 🛒 **Dükkân:** oltalar, yemler, bölgeler ve martı yükseltmeleri (dalış, nefes, gaga, can simidi).

Plan: `~/.claude/plans/dalyan-birlesik-oyun.md`

## Çalıştırma
```bash
npm install
npm run dev -- --port 5185
```
Telefondan aynı Wi-Fi'de terminalde yazan `Network` adresini aç. `main` dalına her push GitHub Pages'e test + derleme + yayın yapar.

```bash
npm test
npm run build
```

## Hata ayıklama adresleri
- `?sifirla` — kaydı sil
- `?debug=1&para=5000` — parayı ayarla
- `?sahne=liman|olta|marti|pazar` — tek sahneyi aç; sonucu ekranda gösterir
  - `bolge=kiyi|bogaz|cukur|marmara`, `mod=olta|marti`, `hava=gunes|yagmur|firtina`, `gece=1`, `seed=42`
  - `kova=hamsi:8,lufer:3,cizme:1` (pazar için)
- Geliştirme modunda konsolda `__fishing` (`world`, `controls`) ve `__gull` (`game`): `update` ile adım adım oynatılabilir.

## Yapı
- `src/app/` — kabuk: sahne sözleşmesi (`scene.ts`), geçişler (`app.ts`), akış (`flow.ts`), kayıt (`save.ts`),
  tür/bölge/olta-yem/yükseltme tabloları, satış ve dükkân hesapları (`progress.ts`).
- `src/scenes/harbor` — Liman: oyna, dükkân, defter.
- `src/scenes/fishing` — olta oyunu: `world.ts` saf mantık (test edilir), `draw.ts` çizim, `controls.ts` dokunmatik/klavye.
- `src/scenes/gull` — martı: `bogaz/` Boğaz'ın modülleri (JS), `school.ts` balık sürüsü ve yakalama (test edilir), `game.ts`, `hud.ts`.
- `src/scenes/market` — pazar fişi ve kedi.
- `tests/` — vitest.
