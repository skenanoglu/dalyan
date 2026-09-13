import type { Catch, SpeciesId } from '../app/types';
import { SPECIES } from '../app/species';
import { catchEntries } from '../app/catch';

/** Kova içeriğini renkli çiplerle listeler; `extra` her satırın sağına ek bilgi yazar. */
export function catchListHtml(c: Catch, extra?: (id: SpeciesId, n: number) => string): string {
  const rows = catchEntries(c)
    .map(([id, n]) => {
      const s = SPECIES[id];
      return `
        <li class="${s.junk ? 'junk' : ''}">
          <i style="--c:${s.color}"></i>
          <span>${s.name}</span>
          <b>×${n}</b>
          ${extra ? `<em>${extra(id, n)}</em>` : ''}
        </li>`;
    })
    .join('');
  return rows ? `<ul class="catch">${rows}</ul>` : '<p class="empty">Kova boş.</p>';
}
