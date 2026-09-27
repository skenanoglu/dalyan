import type { BaitId } from '../../app/types';

/**
 * İşaretçi tabanlı basit sürükle-bırak: `[data-drag-bait]` çiplerini `.hook-slot`lara taşır.
 * Native HTML5 sürükle-bırak dokunmatikte çalışmadığı için pointer olaylarıyla elle kurulmuştur.
 * `root` sahne boyunca sabit kalır (yalnızca içeriği yeniden çizilir), bu yüzden tek seferlik bağlanır.
 */
export function bindBaitDrag(root: HTMLElement, onDrop: (slot: number, baitId: BaitId) => void): () => void {
  let ghost: HTMLElement | null = null;
  let dragBait: BaitId | null = null;
  let sourceEl: HTMLElement | null = null;

  const clearHover = (): void => {
    root.querySelectorAll('.hook-slot.drop-hover').forEach((el) => el.classList.remove('drop-hover'));
  };

  const targetSlot = (x: number, y: number): HTMLElement | null =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>('.hook-slot:not(.locked)') ?? null;

  const onMove = (e: PointerEvent): void => {
    if (!ghost) return;
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    clearHover();
    targetSlot(e.clientX, e.clientY)?.classList.add('drop-hover');
  };

  const onUp = (e: PointerEvent): void => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    clearHover();
    sourceEl?.classList.remove('dragging');
    ghost?.remove();
    ghost = null;
    const slotEl = targetSlot(e.clientX, e.clientY);
    const slot = slotEl ? Number(slotEl.dataset.slot) : NaN;
    if (dragBait && !Number.isNaN(slot)) onDrop(slot, dragBait);
    dragBait = null;
    sourceEl = null;
  };

  const onDown = (e: PointerEvent): void => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-drag-bait]');
    if (!chip) return;
    e.preventDefault();
    dragBait = chip.dataset.dragBait as BaitId;
    sourceEl = chip;
    chip.classList.add('dragging');
    ghost = chip.cloneNode(true) as HTMLElement;
    ghost.classList.add('bait-ghost');
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    document.body.appendChild(ghost);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  root.addEventListener('pointerdown', onDown);
  return () => {
    root.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    ghost?.remove();
  };
}
