// Rules of 고슴도치 찾기: minesweeper with hedgehogs. Pure functions over a flat
// array of cells, row by row.
import { t } from './i18n';

export type LevelId = 'beginner' | 'intermediate' | 'expert';

export interface Level {
  id: LevelId;
  label: string;
  cols: number;
  rows: number;
  hogs: number;
}

export const levels: Level[] = [
  { id: 'beginner', label: t('초급', 'Beginner'), cols: 9, rows: 9, hogs: 10 },
  { id: 'intermediate', label: t('중급', 'Intermediate'), cols: 16, rows: 16, hogs: 40 },
  { id: 'expert', label: t('고급', 'Expert'), cols: 30, rows: 16, hogs: 99 }
];

export interface Cell {
  hog: boolean;
  open: boolean;
  flag: boolean;
  /** How many of the surrounding cells hide a hedgehog. */
  near: number;
}

export function emptyBoard(level: Level): Cell[] {
  return Array.from({ length: level.cols * level.rows }, () => ({ hog: false, open: false, flag: false, near: 0 }));
}

export function neighbours(level: Level, index: number): number[] {
  const x = index % level.cols;
  const y = Math.floor(index / level.cols);
  const around: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if ((dx || dy) && nx >= 0 && nx < level.cols && ny >= 0 && ny < level.rows) around.push(ny * level.cols + nx);
    }
  }
  return around;
}

/** Hide the hedgehogs. The first cell opened and the cells around it always stay empty. */
export function plant(cells: Cell[], level: Level, safe: number) {
  const keep = new Set([safe, ...neighbours(level, safe)]);
  const spots = cells.map((_, index) => index).filter((index) => !keep.has(index));
  for (let n = 0; n < level.hogs; n++) {
    const pick = n + Math.floor(Math.random() * (spots.length - n));
    [spots[n], spots[pick]] = [spots[pick], spots[n]];
    cells[spots[n]].hog = true;
  }
  for (const [index, cell] of cells.entries()) {
    cell.near = neighbours(level, index).filter((n) => cells[n].hog).length;
  }
}

/** Open a safe cell. An empty one opens everything around it, and so on outwards. */
export function reveal(cells: Cell[], level: Level, start: number) {
  const stack = [start];
  while (stack.length) {
    const index = stack.pop()!;
    const cell = cells[index];
    if (cell.open || cell.flag || cell.hog) continue;
    cell.open = true;
    if (cell.near === 0) stack.push(...neighbours(level, index));
  }
}
