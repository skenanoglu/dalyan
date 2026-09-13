# DALYAN

Boğaz, Balık Avı ve Neon Rezonans'ın tek dünyada birleştiği oyun. Oyuncu DALYAN teknesinin sahibi:

**Liman → Yolculuk (Boğaz koşusu) → Av (olta) → Pazar (balık kasası bulmacası) → Liman**

Tek kayıt, tek para. Plan: `~/.claude/plans/dalyan-birlesik-oyun.md`

## Durum
- [x] Aşama 0: sahne sistemi, ortak kayıt, Liman (harita, bölge açma, defter), taslak sahnelerle uçtan uca sefer
- [x] Aşama 1: Balık Pazarı — kasa bulmacası, türe göre parça şekli, toptan/ihracat, çöp ve joker, kedi/takas/karıştır, akşam indirimi
- [ ] Aşama 2: Av (Balık Avı'nın dikey hâli)
- [ ] Aşama 3: Yolculuk (Boğaz koşusu)
- [ ] Aşama 4: Dükkân ve ekonomi dengesi
- [ ] Aşama 5: Cila

## Çalıştırma
```bash
npm install
npm run dev -- --port 5185
```
Telefondan aynı Wi-Fi'de terminalde yazan `Network` adresini aç.

```bash
npm test
npm run build
```

## Hata ayıklama adresleri
- `?sifirla` — kaydı sil
- `?debug=1&para=5000` — parayı ayarla
- `?sahne=liman|yolculuk|av|pazar` — tek sahneyi aç; sonucu ekranda gösterir
  - `bolge=kiyi|bogaz|cukur|marmara`, `hedef=5`, `bonus=15`, `yem=3`, `seed=42`
  - `kova=hamsi:8,lufer:3,cizme:1` (pazar için)

## Balık Pazarı kuralları (`src/scenes/market/core/rules.ts`)
- Kovadaki her balık bir parça; en az 20 parça (eksikse yarı fiyatına toptancı hamsisi).
- Balığın değeri parçanın kasalarına bölünür. Dolu sıra ×1, toptan (8+ kasa, en az 2 balık) ×2, ihracat (14+) ×3 ve çevresi ×1.
- Altın balık her türün kümesine katılır; çöp kümeye girmez, tahtada kalırsa ceza.
- Pazar kapanınca tahtada, elde ve bantta kalanlar yarı fiyata satılır.
- Geliştirme modunda konsolda `__market` (state, layout, act) vardır.

## Yapı
- `src/app/` — kabuk: sahne sözleşmesi (`scene.ts`), geçişler (`app.ts`), sefer akışı (`flow.ts`),
  kayıt (`save.ts`), tür/bölge/yükseltme tabloları, ilerleme hesapları (`progress.ts`).
- `src/scenes/<sahne>/scene.ts` — her sahne `(kök, girdi, app) → { done, destroy }` döner.
  Taslak sahneler aynı sözleşmeyle gerçek oyunlarla değiştirilecek.
- `tests/` — vitest.
