// DALYAN: Boğaz oyunundan (Oyun/bogaz/src/config.js) kopyalandı. Can sistemi çıkarıldı.
// Tüm ayar sabitleri tek yerde. Oynayarak ince ayar yapmak için burayı değiştir.

export const W = 360;
export const H = 640;
export const STEP = 1 / 120;

export const WORLD = {
  waterBase: 350,     // gelgit ortalamasındaki su seviyesi (y)
  seabed: 600,        // deniz tabanı (y)
  playerX: 100,
  speedMin: 160,
  speedMax: 280,
  rampScore: 60,      // bu skora ulaşınca zorluk tavan yapar
  spacingMin: 190,    // engeller arası boşluk (px), zorlukla azalır
  spacingMax: 270,
  splashDamp: 0.6,    // suya girerken hız çarpanı
  maxRise: -650,
  maxFall: 750,
  invuln: 2,          // inci/simit dokunulmazlık süresi (sn)
};

export const CHARACTERS = {
  // Kontrol ikisinde de aynı: dokun = yukarı (tap), basılı tut = dal (dive ivmesi eklenir).
  // Karakterler bu fizik değerleriyle ayrışır.
  balik: {
    id: 'balik',
    name: 'Balık',
    desc: ['Suyun çocuğu.', 'Derinden fırlar, uçar;', 'havada çabuk kurur.'],
    hint: 'Derine dal, bırak: sudan fırla!',
    home: 'water',
    outsideLimit: 2.5,
    deathOutside: 'Kurudun!',
    air: { gravity: 1500, tap: -400, dive: 1800 },
    // Güçlü kaldırma + az direnç: derine dalıp bırakınca hızlanıp sudan fırlar.
    water: { buoyancy: -1400, tap: -300, dive: 2300, drag: 1.2, maxFall: 420 },
    splashDamp: 0.75,
    radius: 13,
    collectible: 'inci',
    gapBias: { air: 0.25, surface: 0.25, water: 0.5 },
    diveDepth: [70, 150],
  },
  marti: {
    id: 'marti',
    name: 'Martı',
    desc: ['Göklerin sahibi.', 'Pike yapıp dalar,', 'suda nefesi kısa.'],
    hint: 'Yüksekten pike yap, suya dal!',
    home: 'air',
    outsideLimit: 1.5,
    deathOutside: 'Boğuldun!',
    air: { gravity: 1300, tap: -420, dive: 2200 },
    // Pikeyle hızlı girer ve derine dalar; suda dokununca kanat çırpıp çıkar.
    water: { buoyancy: -1000, tap: -380, dive: 1500, drag: 2.5, maxFall: 600 },
    splashDamp: 0.8,
    radius: 13,
    collectible: 'simit',
    gapBias: { air: 0.55, surface: 0.3, water: 0.15 },
    diveDepth: [30, 70],
  },
};

export const TIDE = { period: 20, ampMin: 30, ampMax: 50 };

export const WIND = {
  warn: 1,
  duration: 1.5,
  force: 600,
  gapMin: 8,
  gapMax: 16,
};

export const PHASE_EVERY = 25;
export const PHASE_BLEND = 2;

// Renkler hex, sayılar evreler arası yumuşak geçişte lerp edilir.
export const PHASES = [
  {
    id: 'sabah', name: 'Sabah',
    skyTop: '#6ec6ff', skyBottom: '#d8f1ff',
    waterTop: '#2a9fd6', waterBottom: '#0b3d6b',
    silhouette: '#7fa9c6', far: '#a5c6dc', cloud: '#ffffff',
    sun: '#fff3b0', sand: '#e8d39a',
    sunY: 110, dark: 0, rain: 0, wave: 3, tideSpeed: 1, windRate: 1,
  },
  {
    id: 'gunbatimi', name: 'Gün Batımı',
    skyTop: '#3b2a6b', skyBottom: '#ff9e5e',
    waterTop: '#d9735a', waterBottom: '#2b1d4d',
    silhouette: '#4a2f5e', far: '#6b4a7a', cloud: '#ffc9a3',
    sun: '#ffcf6b', sand: '#c79a6e',
    sunY: 285, dark: 0.1, rain: 0, wave: 3, tideSpeed: 1, windRate: 1,
  },
  {
    id: 'gece', name: 'Gece',
    skyTop: '#050b1f', skyBottom: '#1a2a55',
    waterTop: '#12325a', waterBottom: '#040c1c',
    silhouette: '#0f1a33', far: '#18264a', cloud: '#2a3a66',
    sun: '#f4f1d0', sand: '#3a3a4a',
    sunY: 90, dark: 0.82, rain: 0, wave: 3, tideSpeed: 1, windRate: 1,
  },
  {
    id: 'firtina', name: 'Fırtına',
    skyTop: '#2c3440', skyBottom: '#6b7a88',
    waterTop: '#3d5f6e', waterBottom: '#0f1f28',
    silhouette: '#3a4550', far: '#4d5a66', cloud: '#556270',
    sun: '#9aa5ad', sand: '#7d7a6a',
    sunY: 120, dark: 0.35, rain: 1, wave: 8, tideSpeed: 1.7, windRate: 2.2,
  },
];

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
