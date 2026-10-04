import './app/styles.css';
import { App } from './app/app';
import { runGame } from './app/flow';
import { startDebugScene } from './app/debug';
import { resetProfile } from './app/save';
import { claimReferralFromUrl } from './app/referral';

const params = new URLSearchParams(location.search);

// ?sifirla → kaydı sil; parametre adres çubuğundan kaldırılır ki her yenilemede silinmesin.
if (params.has('sifirla')) {
  resetProfile();
  params.delete('sifirla');
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
}

const app = new App(document.getElementById('scene')!, document.getElementById('curtain')!);

// ?debug=1&para=5000 → test için parayı ayarla
if (params.get('debug') === '1' && params.has('para')) {
  app.commit({ ...app.profile, money: Math.max(0, Math.floor(Number(params.get('para')) || 0)) });
}

// ?ref=KOD → bir arkadaşın davet linkiyle ilk kez açıldıysa hoş geldin bonusu verir.
if (params.has('ref')) {
  const withBonus = claimReferralFromUrl(app.profile, params.get('ref'));
  if (withBonus) app.commit(withBonus);
  params.delete('ref');
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
}

if (!startDebugScene(app, params)) void runGame(app);
