import type { Input } from './world';

type Key = keyof Input;

const KEYBOARD: Record<string, Key> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'fire',
  KeyF: 'fire',
};

/**
 * Dokunmatik düğmeler + klavye. Balık Avı'ndaki gibi dokunma durumu her olayda
 * ekrandaki BÜTÜN parmaklardan yeniden kurulur; kaçan bir "parmak kalktı"
 * olayı tuşu basılı bırakamaz.
 */
export class Controls {
  readonly input: Input = { left: false, right: false, up: false, down: false, fire: false };
  private keys = new Set<Key>();
  private touches = new Set<Key>();
  private mouse: Key | null = null;
  private readonly offs: (() => void)[] = [];

  constructor(
    private pad: HTMLElement,
    private onInput: () => void,
  ) {
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions): void => {
      el.addEventListener(type, fn as EventListener, opts);
      this.offs.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };

    const fromTouches = (e: TouchEvent): void => {
      this.touches.clear();
      for (const t of Array.from(e.touches)) {
        const btn = (document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-key]');
        if (btn && pad.contains(btn)) this.touches.add(btn.dataset.key as Key);
      }
      this.refresh();
    };
    const touchStart = (e: TouchEvent): void => {
      e.preventDefault();
      fromTouches(e);
    };
    on(pad, 'touchstart', touchStart, { passive: false });
    on(pad, 'touchmove', touchStart, { passive: false });
    on(pad, 'touchend', fromTouches);
    on(pad, 'touchcancel', fromTouches);

    on(pad, 'pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-key]');
      if (!btn) return;
      this.mouse = btn.dataset.key as Key;
      this.refresh();
    });
    on(window, 'pointerup', () => {
      if (this.mouse === null) return;
      this.mouse = null;
      this.refresh();
    });

    on(window, 'keydown', (e: KeyboardEvent) => {
      const k = KEYBOARD[e.code];
      if (!k) return;
      e.preventDefault();
      this.keys.add(k);
      this.refresh();
    });
    on(window, 'keyup', (e: KeyboardEvent) => {
      const k = KEYBOARD[e.code];
      if (!k) return;
      this.keys.delete(k);
      this.refresh();
    });
    on(window, 'blur', () => this.releaseAll());
  }

  releaseAll(): void {
    this.keys.clear();
    this.touches.clear();
    this.mouse = null;
    this.refresh();
  }

  private refresh(): void {
    let any = false;
    for (const k of ['left', 'right', 'up', 'down', 'fire'] as Key[]) {
      const pressed = this.keys.has(k) || this.touches.has(k) || this.mouse === k;
      this.input[k] = pressed;
      any ||= pressed;
    }
    this.pad.querySelectorAll<HTMLElement>('[data-key]').forEach((b) => b.classList.toggle('on', Boolean(this.input[b.dataset.key as Key])));
    if (any) this.onInput();
  }

  dispose(): void {
    for (const off of this.offs) off();
  }
}
