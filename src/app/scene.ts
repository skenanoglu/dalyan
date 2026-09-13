import type { App } from './app';

/** Çalışan bir sahne: sonucu `done` ile bildirir, `destroy` ile temizlenir. */
export interface SceneRun<Out> {
  done: Promise<Out>;
  destroy(): void;
}

/**
 * Her sahne kendi kök elemanını (tuval + arayüz) yönetir.
 * Girdiyi alır, oyuncu işini bitirince sonucu döner.
 */
export type SceneFactory<In, Out> = (root: HTMLElement, input: In, app: App) => SceneRun<Out>;

export function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Tıklamayı `data-act` taşıyan en yakın elemana yönlendirir. */
export function onAction(
  root: HTMLElement,
  handler: (act: string, arg: string, el: HTMLElement) => void,
): () => void {
  const listener = (e: MouseEvent): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || !root.contains(el) || el.hasAttribute('disabled')) return;
    handler(el.dataset.act ?? '', el.dataset.arg ?? '', el);
  };
  root.addEventListener('click', listener);
  return () => root.removeEventListener('click', listener);
}
