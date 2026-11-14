// Mouse users select with one click and open with two. Touch and keyboard
// users have no comfortable double-click, so they get other ways to open things.

let lastPointer = 'mouse';

window.addEventListener('pointerdown', (event) => (lastPointer = event.pointerType), true);

export function usesMouse() {
  return lastPointer === 'mouse';
}

/** Desktop icons: true when this click should open the item straight away. */
export function opensImmediately(event: MouseEvent) {
  return event.detail === 0 || !usesMouse();
}

/**
 * Lists where selecting matters: the keyboard opens at once, touch opens on a
 * second tap of the selected item, and the mouse waits for its double-click.
 */
export function opensFromList(event: MouseEvent, alreadySelected: boolean) {
  return event.detail === 0 || (!usesMouse() && alreadySelected);
}
