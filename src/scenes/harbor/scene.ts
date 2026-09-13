import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { CharacterId, HarborIn, HarborOut, TripSummary, ZoneId } from '../../app/types';
import type { Profile } from '../../app/save';
import { ZONES, ZONE_ORDER } from '../../app/zones';
import { SPECIES, SPECIES_ORDER } from '../../app/species';
import { GROUP_NAMES, UPGRADES, UPGRADE_ORDER, maxLevel, upgradeValue, type UpgradeGroup } from '../../app/upgrades';
import { buyZone, canBuyZone, voyageTarget } from '../../app/progress';
import { money } from '../../app/format';
import { SKYLINE_SVG } from './skyline';

type Tab = 'harita' | 'dukkan' | 'defter';

const TABS: [Tab, string][] = [
  ['harita', 'Harita'],
  ['dukkan', 'Dükkân'],
  ['defter', 'Defter'],
];

const CHARACTERS: [CharacterId, string][] = [
  ['balik', '🐟 Balık'],
  ['marti', '🕊️ Martı'],
];

export const harborScene: SceneFactory<HarborIn, HarborOut> = (root, input, app) => {
  const { promise, resolve } = deferred<HarborOut>();
  let tab: Tab = 'harita';
  let banner: TripSummary | null = input.lastTrip ?? null;
  let finished = false;

  const render = (): void => {
    const p = app.profile;
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
        <div class="tab-body">${tab === 'harita' ? mapView(p) : tab === 'dukkan' ? shopView(p) : logView(p)}</div>
      </div>`;
  };

  const off = onAction(root, (act, arg) => {
    if (finished) return;
    switch (act) {
      case 'tab':
        tab = arg as Tab;
        break;
      case 'char':
        app.commit({ ...app.profile, character: arg as CharacterId });
        break;
      case 'buy': {
        const next = buyZone(app.profile, arg as ZoneId);
        if (next) app.commit(next);
        break;
      }
      case 'go':
      case 'fast':
        finished = true;
        resolve({ zone: arg as ZoneId, fast: act === 'fast' });
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
  const fresh = t.newSpecies.length > 0 ? ` · Yeni tür: ${t.newSpecies.map((id) => SPECIES[id].name).join(', ')}` : '';
  return `
    <div class="banner">
      <div>
        <b>Sefer bitti: +${money(t.earned)}</b>
        <small>${ZONES[t.zone].name} · ${t.fish} balık${fresh}</small>
      </div>
      <button class="icon-btn" data-act="close-banner" aria-label="Kapat">✕</button>
    </div>`;
}

function mapView(p: Profile): string {
  const chars = CHARACTERS.map(
    ([id, label]) => `<button class="chip ${p.character === id ? 'on' : ''}" data-act="char" data-arg="${id}">${label}</button>`,
  ).join('');

  const cards = ZONE_ORDER.map((id, i) => {
    const z = ZONES[id];
    const open = p.zones[id];
    const prev = i > 0 ? ZONE_ORDER[i - 1] : null;
    let actions: string;
    if (open) {
      actions = `
        <button class="btn primary" data-act="go" data-arg="${id}">Sefere Çık</button>
        <button class="btn ghost" data-act="fast" data-arg="${id}" ${p.visited[id] ? '' : 'disabled'}>Hızlı Git</button>`;
    } else if (prev && !p.zones[prev]) {
      actions = `<p class="lock-note">🔒 Önce ${ZONES[prev].name}</p>`;
    } else {
      actions = `<button class="btn buy" data-act="buy" data-arg="${id}" ${canBuyZone(p, id) ? '' : 'disabled'}>Aç · ${money(z.price)}</button>`;
    }
    const hint = open && !p.visited[id] ? '<p class="hint">Hızlı Git için bir kez yolculukla var.</p>' : '';
    return `
      <article class="zone ${open ? '' : 'locked'}">
        <div class="zone-depth"><i style="height:${Math.round((z.depth / 110) * 100)}%"></i></div>
        <div class="zone-info">
          <h3>${z.name}</h3>
          <p>${z.depth} m · fiyat ×${z.priceMultiplier} · yolculuk ${voyageTarget(id, p.upgrades.motor)} geçiş</p>
          <div class="zone-actions">${actions}</div>
          ${hint}
        </div>
      </article>`;
  }).join('');

  return `
    <div class="row-label">Yolculukta kim?</div>
    <div class="chips">${chars}</div>
    <div class="zones">${cards}</div>`;
}

function shopView(p: Profile): string {
  const groups = (Object.keys(GROUP_NAMES) as UpgradeGroup[])
    .map((g) => {
      const rows = UPGRADE_ORDER.filter((id) => UPGRADES[id].group === g)
        .map((id) => {
          const u = UPGRADES[id];
          const lv = p.upgrades[id];
          return `
            <div class="upg">
              <div><b>${u.name}</b><small>${u.desc}</small></div>
              <span class="lvl">${u.format(upgradeValue(id, lv))}<small>Sv ${lv}/${maxLevel(id)}</small></span>
            </div>`;
        })
        .join('');
      return `<h4>${GROUP_NAMES[g]}</h4>${rows}`;
    })
    .join('');
  return `<p class="soon">Satın alma Aşama 4'te açılacak.</p>${groups}`;
}

function logView(p: Profile): string {
  const fish = SPECIES_ORDER.filter((id) => !SPECIES[id].junk);
  const found = fish.filter((id) => p.logbook[id]).length;
  const items = fish
    .map((id) => {
      const s = SPECIES[id];
      const entry = p.logbook[id];
      return entry
        ? `<li><i style="--c:${s.color}"></i><span>${s.name}</span><b>${entry.count}</b></li>`
        : '<li class="unknown"><i></i><span>???</span><b>—</b></li>';
    })
    .join('');
  return `
    <p class="log-head">${found}/${fish.length} tür · ${p.stats.trips} sefer · ${p.stats.totalFish} balık</p>
    <ul class="logbook">${items}</ul>`;
}
