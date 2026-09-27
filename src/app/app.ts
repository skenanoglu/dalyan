import type { SceneFactory, SceneRun } from './scene';
import { loadProfile, saveProfile, type Profile } from './save';
import { pullProfile, pushProfile, watchAuth, type User } from './cloud';

const FADE_MS = 260;
const TITLE_HOLD_MS = 420;

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/** Geçiş animasyonunun başlaması için bir kare bekler; sekme arka plandaysa kare gelmez, zaman aşımıyla devam eder. */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, 60);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        clearTimeout(timer);
        resolve();
      }),
    );
  });

/** Profil ve sahne geçişlerini yöneten kabuk. */
export class App {
  profile: Profile = loadProfile();
  user: User | null = null;
  private current: SceneRun<unknown> | null = null;
  private titleEl: HTMLElement;
  private authListeners = new Set<(user: User | null) => void>();
  private syncTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private root: HTMLElement,
    private curtain: HTMLElement,
  ) {
    this.titleEl = curtain.querySelector('.curtain-title') as HTMLElement;
    watchAuth((u) => void this.handleAuth(u));
  }

  /** Giriş durumu değiştiğinde çağrılır; sahneler arayüzü güncellemek için abone olur. */
  onAuth(fn: (user: User | null) => void): () => void {
    this.authListeners.add(fn);
    return () => this.authListeners.delete(fn);
  }

  private notifyAuth(): void {
    this.authListeners.forEach((fn) => fn(this.user));
  }

  /** Giriş yapılınca buluttaki profille yereldekinden daha ilerlemiş olanı seçer. */
  private async handleAuth(u: User | null): Promise<void> {
    this.user = u;
    this.notifyAuth();
    if (!u) return;
    try {
      const cloud = await pullProfile(u.uid);
      this.profile = cloud ? pickProfile(this.profile, cloud) : this.profile;
      saveProfile(this.profile);
      this.notifyAuth();
      await pushProfile(u.uid, this.profile);
    } catch {
      /* bağlantı sorunu: bir sonraki commit'te tekrar denenir */
    }
  }

  /** Profili değiştirir, hemen kaydeder ve girişliyse buluta gecikmeli gönderir. */
  commit(next: Profile): void {
    this.profile = next;
    saveProfile(next);
    this.scheduleSync();
  }

  private scheduleSync(): void {
    if (!this.user) return;
    const uid = this.user.uid;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => void pushProfile(uid, this.profile), 800);
  }

  /** Perdeyi kapatır, sahneyi değiştirir, perdeyi açar ve sahnenin sonucunu bekler. */
  async show<In, Out>(factory: SceneFactory<In, Out>, input: In, title: string): Promise<Out> {
    if (this.current) await this.closeCurtain(title);
    this.current?.destroy();
    this.root.replaceChildren();

    const host = document.createElement('section');
    host.className = 'scene-host';
    this.root.append(host);
    const run = factory(host, input, this);
    this.current = run;

    await this.openCurtain();
    return run.done;
  }

  private async closeCurtain(title: string): Promise<void> {
    this.titleEl.textContent = title;
    this.curtain.hidden = false;
    await nextFrame();
    this.curtain.classList.add('show');
    await wait(FADE_MS + TITLE_HOLD_MS);
  }

  private async openCurtain(): Promise<void> {
    if (this.curtain.hidden) return;
    this.curtain.classList.remove('show');
    await wait(FADE_MS);
    this.curtain.hidden = true;
  }
}

/** İki profilden daha çok oynanmış olanı seçer (sefer sayısı, sonra toplam balık/para). */
function pickProfile(local: Profile, cloud: Profile): Profile {
  const score = (p: Profile): number => p.stats.trips * 1_000_000 + p.stats.totalFish * 1_000 + p.stats.totalMoney;
  return score(cloud) >= score(local) ? cloud : local;
}
