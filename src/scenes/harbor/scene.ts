import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { BaitId, HarborIn, HarborOut, ModeId, RodId, TripSummary, UpgradeId, WeatherId, ZoneId } from '../../app/types';
import type { Profile } from '../../app/save';
import { ZONES, ZONE_ORDER } from '../../app/zones';
import { SPECIES, SPECIES_ORDER, gullReach } from '../../app/species';
import { UPGRADES, UPGRADE_ORDER, maxLevel, upgradeCost, upgradeValue } from '../../app/upgrades';
import { BAITS, BAIT_ORDER, RODS, ROD_ORDER } from '../../app/gear';
import { MODE_ICON, MODE_NAMES } from '../../app/modes';
import { NIGHT, WEATHER } from '../../app/weather';
import { buyBait, buyRod, buyUpgrade, buyZone, canBuyBait, canBuyRod, canBuyUpgrade, canBuyZone } from '../../app/progress';
import { money } from '../../app/format';
import { SKYLINE_SVG } from './skyline';

type Tab = 'oyna' | 'dukkan' | 'defter';

const TABS: [Tab, string][] = [
  ['oyna', 'Oyna'],
  ['dukkan', 'Dükkân'],
  ['defter', 'Defter'],
];

export const harborScene: SceneFactory<HarborIn, HarborOut> = (root, input, app) => {
  const { promise, resolve } = deferred<HarborOut>();
  let tab: Tab = 'oyna';
  let zone: ZoneId = app.profile.lastZone;
  let banner: TripSummary | null = input.lastTrip ?? null;
  let finished = false;

  const render = (): void => {
    const p = app.profile;
    const scroll = root.scrollTop;
    root.innerHTML = `
      <div class="harbor">
        <header class="harbor-top">
          <div>
            <h1 class="logo">DALYAN</h1>
            <p class="sub">Karaköy Limanı</p>
          </div>
          <div class="money">${money(p.money)}</div>
        </header>
        <div class="skyline">${SKYLINE_SVG}</div>
        ${banner ? bannerView(banner) : ''}
        <nav class="tabs">
          ${TABS.map(([id, label]) => `<button class="tab ${tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}">${label}</button>`).join('')}
        </nav>
        <div class="tab-body">${tab === 'oyna' ? playView(p, zone, input.weather) : tab === 'dukkan' ? shopView(p) : logView(p)}</div>
      </div>`;
    root.scrollTop = scroll;
  };

  const commit = (next: Profile | null): boolean => {
    if (!next) return false;
    app.commit(next);
    return true;
  };

  const off = onAction(root, (act, arg) => {
    if (finished) return;
    const p = app.profile;
    switch (act) {
      case 'tab':
        tab = arg as Tab;
        root.scrollTop = 0;
        break;
      case 'zone':
        zone = arg as ZoneId;
        break;
      case 'use-rod':
        if (p.rods[arg as RodId]) commit({ ...p, rod: arg as RodId });
        break;
      case 'night':
        commit({ ...p, night: arg === '1' });
        break;
      case 'use-bait':
        if (p.baits[arg as BaitId]) commit({ ...p, bait: arg as BaitId });
        break;
      case 'buy-zone':
        if (commit(buyZone(p, arg as ZoneId))) zone = arg as ZoneId;
        break;
      case 'buy-rod':
        commit(buyRod(p, arg as RodId));
        break;
      case 'buy-bait':
        commit(buyBait(p, arg as BaitId));
        break;
      case 'upgrade':
        commit(buyUpgrade(p, arg as UpgradeId));
        break;
      case 'play':
        finished = true;
        resolve({ mode: arg as ModeId, zone, night: app.profile.night });
        return;
      case 'close-banner':
        banner = null;
        break;
      default:
        return;
    }
    render();
  });

  render();
  return { done: promise, destroy: off };
};

function bannerView(t: TripSummary): string {
  const where = t.zone ? ZONES[t.zone].name : 'Boğaz';
  const fresh = t.newSpecies.length > 0 ? ` · Yeni tür: ${t.newSpecies.map((id) => SPECIES[id].name).join(', ')}` : '';
  return `
    <div class="banner">
      <div>
        <b>${MODE_ICON[t.mode]} +${money(t.earned)}</b>
        <small>${where} · ${t.fish} balık${fresh}</small>
      </div>
      <button class="icon-btn" data-act="close-banner" aria-label="Kapat">✕</button>
    </div>`;
}

function zoneChips(p: Profile, selected: ZoneId): string {
  return ZONE_ORDER.map((id, i) => {
    const z = ZONES[id];
    if (p.zones[id]) return `<button class="chip ${id === selected ? 'on' : ''}" data-act="zone" data-arg="${id}">${z.name}</button>`;
    const prevOpen = i === 0 || p.zones[ZONE_ORDER[i - 1]];
    if (!prevOpen) return `<span class="chip locked">🔒 ${z.name}</span>`;
    return `<button class="chip buy" data-act="buy-zone" data-arg="${id}" ${canBuyZone(p, id) ? '' : 'disabled'}>🔓 ${z.name} · ${money(z.price)}</button>`;
  }).join('');
}

function playView(p: Profile, zone: ZoneId, weatherId: WeatherId): string {
  const weather = WEATHER[weatherId];
  const z = ZONES[zone];
  const rod = RODS[p.rod];
  const bait = BAITS[p.bait];
  const rods = ROD_ORDER.filter((id) => p.rods[id])
    .map((id) => `<button class="chip ${id === p.rod ? 'on' : ''}" data-act="use-rod" data-arg="${id}">${RODS[id].name}</button>`)
    .join('');
  const baits = BAIT_ORDER.filter((id) => p.baits[id])
    .map((id) => `<button class="chip ${id === p.bait ? 'on' : ''}" data-act="use-bait" data-arg="${id}">${BAITS[id].name}</button>`)
    .join('');
  const reach = Math.min(rod.depth, z.depth);
  const depthNote = rod.depth < z.depth ? ` · daha derini için daha iyi olta` : '';

  const dive = upgradeValue('dalis', p.upgrades.dalis);
  const gullFish = gullReach(dive).filter((s) => !s.junk);
  const nextFish = SPECIES_ORDER.map((id) => SPECIES[id]).find((s) => s.gullDepth !== null && s.gullDepth > dive && !s.junk);

  return `
    <section class="mode mode-olta">
      <div class="mode-head">
        <span class="mode-icon">${MODE_ICON.olta}</span>
        <div><h3>Olta</h3><p>Tekneyle açıl. Küçük balıklar sığda, büyükler derinde.</p></div>
      </div>
      <div class="row-label">Bölge</div>
      <div class="chips wrap">${zoneChips(p, zone)}</div>
      <div class="row-label">Olta</div>
      <div class="chips wrap">${rods}</div>
      <div class="row-label">Yem</div>
      <div class="chips wrap">${baits}</div>
      <div class="row-label">Zaman</div>
      <div class="chips">
        <button class="chip ${p.night ? '' : 'on'}" data-act="night" data-arg="0">☀️ Gündüz</button>
        <button class="chip ${p.night ? 'on' : ''}" data-act="night" data-arg="1">${NIGHT.icon} Gece</button>
      </div>
      <p class="forecast ${weather.id}">${weather.icon} Hava: <b>${weather.name}</b>. ${weather.desc}${p.night ? `<br>${NIGHT.icon} ${NIGHT.desc}` : ''}</p>
      <p class="mode-meta">${reach} m'ye kadar inersin${depthNote}. ${bait.name}: ${bait.desc.toLowerCase()}.</p>
      <button class="btn primary" data-act="play" data-arg="olta">Oltayı At</button>
    </section>
    <section class="mode mode-marti">
      <div class="mode-head">
        <span class="mode-icon">${MODE_ICON.marti}</span>
        <div><h3>Martı</h3><p>Boğaz'da uç, pike yapıp suya dal, balığı kap.</p></div>
      </div>
      <p class="mode-meta">Dalışınla yakalayabildiklerin: ${gullFish.map((s) => s.name).join(', ')}${
        nextFish ? `. Dalışı geliştirirsen sırada: ${nextFish.name}.` : '.'
      }</p>
      <button class="btn primary" data-act="play" data-arg="marti">Uçmaya Başla</button>
    </section>`;
}

function shopRow(title: string, lines: string[], action: string): string {
  return `
    <div class="upg">
      <div><b>${title}</b>${lines.map((l) => `<small>${l}</small>`).join('')}</div>
      ${action}
    </div>`;
}

function shopView(p: Profile): string {
  const rods = ROD_ORDER.map((id) => {
    const r = RODS[id];
    const action = p.rods[id]
      ? `<span class="maxed">${p.rod === id ? 'Elinde' : 'Sende'}</span>`
      : `<button class="btn buy" data-act="buy-rod" data-arg="${id}" ${canBuyRod(p, id) ? '' : 'disabled'}>${money(r.price)}</button>`;
    return shopRow(r.name, [r.desc, `${r.depth} m · çekiş ×${r.reel}`], action);
  }).join('');

  const baits = BAIT_ORDER.map((id) => {
    const b = BAITS[id];
    const action = p.baits[id]
      ? `<span class="maxed">${p.bait === id ? 'Takılı' : 'Sende'}</span>`
      : `<button class="btn buy" data-act="buy-bait" data-arg="${id}" ${canBuyBait(p, id) ? '' : 'disabled'}>${money(b.price)}</button>`;
    return shopRow(b.name, [b.desc], action);
  }).join('');

  const zones = ZONE_ORDER.slice(1)
    .map((id) => {
      const z = ZONES[id];
      const action = p.zones[id]
        ? '<span class="maxed">Açık</span>'
        : `<button class="btn buy" data-act="buy-zone" data-arg="${id}" ${canBuyZone(p, id) ? '' : 'disabled'}>${money(z.price)}</button>`;
      return shopRow(z.name, [`${z.depth} m · fiyat ×${z.priceMultiplier}`], action);
    })
    .join('');

  const gull = UPGRADE_ORDER.map((id) => {
    const u = UPGRADES[id];
    const lv = p.upgrades[id];
    const cost = upgradeCost(id, lv);
    const now = u.format(upgradeValue(id, lv));
    const after = cost === null ? '' : ` → ${u.format(upgradeValue(id, lv + 1))}`;
    const action =
      cost === null
        ? '<span class="maxed">En üstte</span>'
        : `<button class="btn buy" data-act="upgrade" data-arg="${id}" ${canBuyUpgrade(p, id) ? '' : 'disabled'}>${money(cost)}</button>`;
    return shopRow(`${u.name} <em>Sv ${lv}/${maxLevel(id)}</em>`, [u.desc, `${now}${after}`], action);
  }).join('');

  return `
    <h4>${MODE_ICON.olta} Oltalar</h4>${rods}
    <h4>🪱 Yemler</h4>${baits}
    <h4>🗺️ Bölgeler</h4>${zones}
    <h4>${MODE_ICON.marti} ${MODE_NAMES.marti}</h4>${gull}`;
}

function logView(p: Profile): string {
  const fish = SPECIES_ORDER.filter((id) => !SPECIES[id].junk);
  const found = fish.filter((id) => p.logbook[id]).length;
  const items = fish
    .map((id) => {
      const s = SPECIES[id];
      const entry = p.logbook[id];
      const how = s.gullDepth !== null ? `${MODE_ICON.olta}${MODE_ICON.marti}` : MODE_ICON.olta;
      return entry
        ? `<li><i style="--c:${s.color}"></i><span>${s.name}<small>${how} · ${money(s.price)}</small></span><b>${entry.count}</b></li>`
        : `<li class="unknown"><i></i><span>???<small>${how}</small></span><b>—</b></li>`;
    })
    .join('');
  return `
    <p class="log-head">${found}/${fish.length} tür · ${p.stats.trips} av · ${p.stats.totalFish} balık</p>
    <ul class="logbook">${items}</ul>`;
}
