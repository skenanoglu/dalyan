import type { SceneFactory, SceneRun } from './scene';
import { loadProfile, saveProfile, type Profile } from './save';

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
  private current: SceneRun<unknown> | null = null;
  private titleEl: HTMLElement;

  constructor(
    private root: HTMLElement,
    private curtain: HTMLElement,
  ) {
    this.titleEl = curtain.querySelector('.curtain-title') as HTMLElement;
  }

  /** Profili değiştirir ve hemen kaydeder. */
  commit(next: Profile): void {
    this.profile = next;
    saveProfile(next);
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
