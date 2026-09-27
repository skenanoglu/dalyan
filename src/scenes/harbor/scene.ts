import { deferred, onAction, type SceneFactory } from '../../app/scene';
import type { BaitId, BoatId, HarborIn, HarborOut, HookId, LineId, RodId, TripSummary, WeatherId, ZoneId } from '../../app/types';
import type { Profile } from '../../app/save';
import { FISH_SECONDS_OPTIONS } from '../../app/save';
import { authErrorMessage, firebaseReady, signIn, signInWithGoogle, signOutUser, signUp, type User } from '../../app/cloud';
import { ZONES, ZONE_ORDER } from '../../app/zones';
import { SPECIES, SPECIES_ORDER } from '../../app/species';
import { BAITS, BAIT_ORDER, BOATS, BOAT_ORDER, HOOKS, HOOK_ORDER, LINES, LINE_ORDER, RODS, ROD_ORDER } from '../../app/gear';
import { NIGHT, WEATHER } from '../../app/weather';
import {
  buyBait,
  buyBoat,
  buyHook,
  buyHookSlot,
  buyLine,
  buyRod,
  buyZone,
  canBuyBait,
  canBuyBoat,
  canBuyHook,
  canBuyHookSlot,
  canBuyLine,
  canBuyRod,
  canBuyZone,
  nextHookSlotPrice,
  rodHookCapacity,
  setBaitSlot,
} from '../../app/progress';
import { money } from '../../app/format';
import { SKYLINE_SVG } from './skyline';
import { bindBaitDrag } from './dnd';

type Tab = 'oyna' | 'donanim' | 'dukkan' | 'defter';

const TABS: [Tab, string][] = [
  ['oyna', 'Oyna'],
  ['donanim', 'Donanım'],
  ['dukkan', 'Dükkân'],
  ['defter', 'Defter'],
];

export const harborScene: SceneFactory<HarborIn, HarborOut> = (root, input, app) => {
  const { promise, resolve } = deferred<HarborOut>();
  let tab: Tab = 'oyna';
  let zone: ZoneId = app.profile.lastZone;
  let banner: TripSummary | null = input.lastTrip ?? null;
  let finished = false;
  let accountOpen = false;
  let authMode: 'signin' | 'signup' = 'signin';
  let authBusy = false;
  let authError: string | null = null;
  let rodInfoOpen = false;

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
          <div class="top-right">
            <div class="money">${money(p.money)}</div>
            <button class="icon-btn account-btn" data-act="account-open" aria-label="Hesap">${accountIcon(app.user)}</button>
          </div>
        </header>
        <div class="skyline">${SKYLINE_SVG}</div>
        ${banner ? bannerView(banner) : ''}
        ${accountOpen ? accountView(app.user, { authMode, authBusy, authError }) : ''}
        <nav class="tabs">
          ${TABS.map(([id, label]) => `<button class="tab ${tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}">${label}</button>`).join('')}
        </nav>
        <div class="tab-body">${tab === 'oyna' ? playView(p, zone, input.weather, rodInfoOpen) : tab === 'donanim' ? donanimView(p) : tab === 'dukkan' ? shopView(p) : logView(p)}</div>
      </div>`;
    root.scrollTop = scroll;
  };

  const commit = (next: Profile | null): boolean => {
    if (!next) return false;
    app.commit(next);
    return true;
  };

  const submitAuth = async (): Promise<void> => {
    const email = root.querySelector<HTMLInputElement>('#auth-email')?.value.trim() ?? '';
    const password = root.querySelector<HTMLInputElement>('#auth-pass')?.value ?? '';
    if (!email || !password) {
      authError = 'E-posta ve şifre gerekli.';
      render();
      return;
    }
    authBusy = true;
    authError = null;
    render();
    try {
      if (authMode === 'signin') await signIn(email, password);
      else await signUp(email, password);
      accountOpen = false;
    } catch (e) {
      authError = authErrorMessage(e);
    }
    authBusy = false;
    render();
  };

  const submitGoogle = async (): Promise<void> => {
    authBusy = true;
    authError = null;
    render();
    try {
      await signInWithGoogle();
      accountOpen = false;
    } catch (e) {
      authError = authErrorMessage(e);
    }
    authBusy = false;
    render();
  };

  const offAuth = app.onAuth(() => render());

  const offDrag = bindBaitDrag(root, (slot, baitId) => {
    if (commit(setBaitSlot(app.profile, slot, baitId))) render();
  });

  const off = onAction(root, (act, arg) => {
    if (finished) return;
    const p = app.profile;
    switch (act) {
      case 'account-open':
        accountOpen = true;
        authError = null;
        break;
      case 'account-close':
        accountOpen = false;
        break;
      case 'account-mode':
        authMode = arg as 'signin' | 'signup';
        authError = null;
        break;
      case 'account-submit':
        void submitAuth();
        return;
      case 'account-google':
        void submitGoogle();
        return;
      case 'account-signout':
        accountOpen = false;
        void signOutUser();
        break;
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
      case 'use-line':
        if (p.lines[arg as LineId]) commit({ ...p, line: arg as LineId });
        break;
      case 'use-hook':
        if (p.hooks[arg as HookId]) commit({ ...p, hook: arg as HookId });
        break;
      case 'use-boat':
        if (p.boats[arg as BoatId]) commit({ ...p, boat: arg as BoatId });
        break;
      case 'night':
        commit({ ...p, night: arg === '1' });
        break;
      case 'duration':
        commit({ ...p, fishSeconds: Number(arg) });
        break;
      case 'rod-info':
        rodInfoOpen = !rodInfoOpen;
        break;
      case 'buy-zone':
        if (commit(buyZone(p, arg as ZoneId))) zone = arg as ZoneId;
        break;
      case 'buy-rod':
        commit(buyRod(p, arg as RodId));
        break;
      case 'buy-line':
        commit(buyLine(p, arg as LineId));
        break;
      case 'buy-hook':
        commit(buyHook(p, arg as HookId));
        break;
      case 'buy-boat':
        commit(buyBoat(p, arg as BoatId));
        break;
      case 'buy-bait':
        commit(buyBait(p, arg as BaitId));
        break;
      case 'buy-hookslot':
        commit(buyHookSlot(p));
        break;
      case 'play':
        finished = true;
        resolve({ zone, night: app.profile.night });
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
  return {
    done: promise,
    destroy: () => {
      off();
      offAuth();
      offDrag();
    },
  };
};

function accountIcon(user: User | null): string {
  if (!user) return '👤';
  const letter = (user.email ?? user.displayName ?? '?').trim().charAt(0).toUpperCase();
  return letter || '👤';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

interface AuthState {
  authMode: 'signin' | 'signup';
  authBusy: boolean;
  authError: string | null;
}

function accountView(user: User | null, state: AuthState): string {
  const body = user ? loggedInView(user) : firebaseReady ? authFormView(state) : notConfiguredView();
  return `
    <div class="modal">
      <div class="modal-head">
        <b>Hesap</b>
        <button class="icon-btn" data-act="account-close" aria-label="Kapat">✕</button>
      </div>
      ${body}
    </div>`;
}

function loggedInView(user: User): string {
  return `
    <p class="auth-note">${escapeHtml(user.email ?? 'Google hesabı')} ile giriş yaptın. İlerlemen buluta kaydediliyor, başka cihazdan aynı hesapla girip devam edebilirsin.</p>
    <button class="btn" data-act="account-signout">Çıkış Yap</button>`;
}

function notConfiguredView(): string {
  return `<p class="auth-note">Bu oyun kopyasında bulut girişi henüz ayarlanmamış.</p>`;
}

function authFormView(state: AuthState): string {
  const { authMode, authBusy, authError } = state;
  return `
    <div class="chips">
      <button class="chip ${authMode === 'signin' ? 'on' : ''}" data-act="account-mode" data-arg="signin">Giriş</button>
      <button class="chip ${authMode === 'signup' ? 'on' : ''}" data-act="account-mode" data-arg="signup">Kayıt Ol</button>
    </div>
    <label class="field">E-posta<input type="email" id="auth-email" autocomplete="email" placeholder="ornek@mail.com"></label>
    <label class="field">Şifre<input type="password" id="auth-pass" autocomplete="${authMode === 'signin' ? 'current-password' : 'new-password'}" placeholder="En az 6 karakter"></label>
    ${authError ? `<p class="auth-error">${escapeHtml(authError)}</p>` : ''}
    <button class="btn primary" data-act="account-submit" ${authBusy ? 'disabled' : ''}>${authBusy ? '…' : authMode === 'signin' ? 'Giriş Yap' : 'Kayıt Ol'}</button>
    <button class="btn" data-act="account-google" ${authBusy ? 'disabled' : ''}>Google ile devam et</button>
    <p class="auth-note">İlerlemen bu hesaba kaydedilir; başka cihazdan aynı hesapla girip devam edebilirsin.</p>`;
}

function bannerView(t: TripSummary): string {
  const fresh = t.newSpecies.length > 0 ? ` · Yeni tür: ${t.newSpecies.map((id) => SPECIES[id].name).join(', ')}` : '';
  return `
    <div class="banner">
      <div>
        <b>🎣 +${money(t.earned)}</b>
        <small>${ZONES[t.zone].name} · ${t.fish} balık${fresh}</small>
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

function rodInfoView(p: Profile): string {
  const rows = ROD_ORDER.map((id) => {
    const r = RODS[id];
    const dropX = (r.drop / RODS.kamis.drop).toFixed(1);
    const owned = p.rods[id] ? '' : ` · ${money(r.price)}`;
    return `<li><b>${r.name}</b><small>iniş ×${dropX} · çekiş ×${r.reel} · ${r.hookCapacity} iğne${r.sharkReady ? ' · köpekbalığına hazır' : ''}${owned}</small></li>`;
  }).join('');
  return `<ul class="rod-info">${rows}</ul>`;
}

function playView(p: Profile, zone: ZoneId, weatherId: WeatherId, rodInfoOpen: boolean): string {
  const weather = WEATHER[weatherId];
  const z = ZONES[zone];
  const line = LINES[p.line];
  const boat = BOATS[p.boat];
  const rods = ROD_ORDER.filter((id) => p.rods[id])
    .map((id) => `<button class="chip ${id === p.rod ? 'on' : ''}" data-act="use-rod" data-arg="${id}">${RODS[id].name}</button>`)
    .join('');
  const lines = LINE_ORDER.filter((id) => p.lines[id])
    .map((id) => `<button class="chip ${id === p.line ? 'on' : ''}" data-act="use-line" data-arg="${id}">${LINES[id].name}</button>`)
    .join('');
  const hooks = HOOK_ORDER.filter((id) => p.hooks[id])
    .map((id) => `<button class="chip ${id === p.hook ? 'on' : ''}" data-act="use-hook" data-arg="${id}">${HOOKS[id].name}</button>`)
    .join('');
  const boats = BOAT_ORDER.filter((id) => p.boats[id])
    .map((id) => `<button class="chip ${id === p.boat ? 'on' : ''}" data-act="use-boat" data-arg="${id}">${BOATS[id].name}</button>`)
    .join('');
  const durations = FISH_SECONDS_OPTIONS.map(
    (s) => `<button class="chip ${s === p.fishSeconds ? 'on' : ''}" data-act="duration" data-arg="${s}">${s} sn</button>`,
  ).join('');
  const reach = Math.min(line.depth, z.depth);
  const depthNote = line.depth < z.depth ? ` · daha derini için daha uzun misina` : '';

  return `
    <section class="mode mode-olta">
      <div class="mode-head">
        <span class="mode-icon">🎣</span>
        <div><h3>Olta</h3><p>Tekneyle açıl. Küçük balıklar sığda, büyükler derinde.</p></div>
      </div>
      <div class="row-label">Bölge</div>
      <div class="chips wrap">${zoneChips(p, zone)}</div>
      <div class="row-label row-label-info">
        Olta
        <button class="icon-btn tiny" data-act="rod-info" aria-label="Olta özellikleri">ℹ️</button>
      </div>
      ${rodInfoOpen ? rodInfoView(p) : ''}
      <div class="chips wrap">${rods}</div>
      <div class="row-label">Misina</div>
      <div class="chips wrap">${lines}</div>
      <div class="row-label">İğne</div>
      <div class="chips wrap">${hooks}</div>
      <div class="row-label">Tekne</div>
      <div class="chips wrap">${boats}</div>
      <div class="row-label">Zaman</div>
      <div class="chips">
        <button class="chip ${p.night ? '' : 'on'}" data-act="night" data-arg="0">☀️ Gündüz</button>
        <button class="chip ${p.night ? 'on' : ''}" data-act="night" data-arg="1">${NIGHT.icon} Gece</button>
      </div>
      <div class="row-label">Süre</div>
      <div class="chips">${durations}</div>
      <p class="forecast ${weather.id}">${weather.icon} Hava: <b>${weather.name}</b>. ${weather.desc}${p.night ? `<br>${NIGHT.icon} ${NIGHT.desc}` : ''}</p>
      <p class="mode-meta">${reach} m'ye kadar inersin${depthNote}. Takılı yemler: ${p.baitSlots.map((id) => `${BAITS[id].icon} ${BAITS[id].name}`).join(', ')} <button class="link-btn" data-act="tab" data-arg="donanim">(Donanımı düzenle)</button>. Kova: en fazla ${boat.capacity} balık.</p>
      <button class="btn primary" data-act="play">Oltayı At</button>
    </section>`;
}

function donanimView(p: Profile): string {
  const rod = RODS[p.rod];
  const cap = rodHookCapacity(p);
  const slots = p.baitSlots
    .map((id, i) => {
      const rodLocked = i >= cap;
      return `
      <div class="hook-slot ${rodLocked ? 'locked rod-locked' : ''}" ${rodLocked ? '' : `data-slot="${i}"`}>
        <span class="hook-slot-icon">${rodLocked ? '🚫' : '🪝'}</span>
        <span class="hook-slot-bait">${BAITS[id].icon} ${BAITS[id].name}</span>
        ${rodLocked ? '<small>Daha güçlü olta gerek</small>' : ''}
      </div>`;
    })
    .join('');
  const nextPrice = nextHookSlotPrice(p);
  let addSlot = '';
  if (nextPrice !== null) {
    addSlot = `<button class="hook-slot locked" data-act="buy-hookslot" ${canBuyHookSlot(p) ? '' : 'disabled'}>
        <span class="hook-slot-icon">🔒</span>
        <span class="hook-slot-bait">+ İğne · ${money(nextPrice)}</span>
      </button>`;
  } else if (rod.hookCapacity < 3) {
    addSlot = `<div class="hook-slot locked rod-locked">
        <span class="hook-slot-icon">🔒</span>
        <span class="hook-slot-bait">Daha güçlü olta gerek</span>
      </div>`;
  }
  const tray = BAIT_ORDER.filter((id) => p.baits[id])
    .map((id) => `<div class="bait-chip" data-drag-bait="${id}">${BAITS[id].icon} ${BAITS[id].name}</div>`)
    .join('');
  return `
    <p class="rig-note">Bir yemi sürükleyip bir iğneye bırak; her iğne kendi yemiyle balık çeker. ${rod.name}: en fazla ${cap} iğne taşır.</p>
    <div class="rig-hooks">${slots}${addSlot}</div>
    <div class="row-label">Yemlerin</div>
    <div class="rig-tray">${tray}</div>`;
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
    return shopRow(r.name, [r.desc, `iniş ×${(r.drop / RODS.kamis.drop).toFixed(1)} · çekiş ×${r.reel}`], action);
  }).join('');

  const lines = LINE_ORDER.map((id) => {
    const l = LINES[id];
    const action = p.lines[id]
      ? `<span class="maxed">${p.line === id ? 'Takılı' : 'Sende'}</span>`
      : `<button class="btn buy" data-act="buy-line" data-arg="${id}" ${canBuyLine(p, id) ? '' : 'disabled'}>${money(l.price)}</button>`;
    return shopRow(l.name, [l.desc, `${l.depth} m · dayanıklılık ${l.durability}/4${l.sharkReady ? ' · köpekbalığına dayanır' : ''}`], action);
  }).join('');

  const hooks = HOOK_ORDER.map((id) => {
    const h = HOOKS[id];
    const action = p.hooks[id]
      ? `<span class="maxed">${p.hook === id ? 'Takılı' : 'Sende'}</span>`
      : `<button class="btn buy" data-act="buy-hook" data-arg="${id}" ${canBuyHook(p, id) ? '' : 'disabled'}>${money(h.price)}</button>`;
    return shopRow(h.name, [h.desc], action);
  }).join('');

  const baits = BAIT_ORDER.map((id) => {
    const b = BAITS[id];
    const action = p.baits[id]
      ? `<span class="maxed">${p.baitSlots.includes(id) ? 'Takılı' : 'Sende'}</span>`
      : `<button class="btn buy" data-act="buy-bait" data-arg="${id}" ${canBuyBait(p, id) ? '' : 'disabled'}>${money(b.price)}</button>`;
    return shopRow(`${b.icon} ${b.name}`, [b.desc], action);
  }).join('');

  const boats = BOAT_ORDER.map((id) => {
    const bt = BOATS[id];
    const action = p.boats[id]
      ? `<span class="maxed">${p.boat === id ? 'Elinde' : 'Sende'}</span>`
      : `<button class="btn buy" data-act="buy-boat" data-arg="${id}" ${canBuyBoat(p, id) ? '' : 'disabled'}>${money(bt.price)}</button>`;
    return shopRow(bt.name, [bt.desc, `kova: ${bt.capacity} balık`], action);
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

  return `
    <h4>🎣 Oltalar</h4>${rods}
    <h4>🧵 Misinalar</h4>${lines}
    <h4>🪝 İğneler</h4>${hooks}
    <h4>🪱 Yemler</h4>${baits}
    <h4>🚤 Tekneler</h4>${boats}
    <h4>🗺️ Bölgeler</h4>${zones}`;
}

function logView(p: Profile): string {
  const fish = SPECIES_ORDER.filter((id) => !SPECIES[id].junk);
  const found = fish.filter((id) => p.logbook[id]).length;
  const items = fish
    .map((id) => {
      const s = SPECIES[id];
      const entry = p.logbook[id];
      return entry
        ? `<li><i style="--c:${s.color}"></i><span>${s.name}<small>${money(s.price)}</small></span><b>${entry.count}</b></li>`
        : `<li class="unknown"><i></i><span>???</span><b>—</b></li>`;
    })
    .join('');
  return `
    <p class="log-head">${found}/${fish.length} tür · ${p.stats.trips} av · ${p.stats.totalFish} balık</p>
    <ul class="logbook">${items}</ul>`;
}
