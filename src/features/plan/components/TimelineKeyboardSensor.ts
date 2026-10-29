import { KeyboardSensor } from '@dnd-kit/dom';

/** Move between actual targets, not arbitrary pixels. Enter commits; Escape cancels. */
export class TimelineKeyboardSensor extends KeyboardSensor {
  protected override handleMove(direction: 'up' | 'down' | 'left' | 'right', event: KeyboardEvent) {
    const source = this.manager.dragOperation.source?.element;
    if (!(source instanceof HTMLElement)) return;
    const workspace = source.closest('[data-runtime-timeline]');
    if (!workspace) return super.handleMove(direction, event);
    const target = this.manager.dragOperation.target?.element ?? source;
    const vertical = direction === 'up' || direction === 'down';
    const candidates = [
      ...workspace.querySelectorAll<HTMLElement>(
        vertical ? '[data-plan-activity]' : '[data-plan-day]',
      ),
    ].filter((el) => el.getClientRects().length && !el.hasAttribute('disabled'));
    const current = vertical
      ? (target.closest<HTMLElement>('[data-plan-activity]') ?? source)
      : (target.closest<HTMLElement>('[data-plan-day]') ??
        candidates.find((el) => el.dataset.planDay === source.getAttribute('data-activity-day')));
    const index = current ? candidates.indexOf(current) : -1;
    const offset = direction === 'up' || direction === 'left' ? -1 : 1;
    const next = candidates[Math.max(0, Math.min(candidates.length - 1, index + offset))];
    if (!next || next === current) {
      event.preventDefault();
      return;
    }
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const rect = next.getBoundingClientRect();
    event.preventDefault();
    this.manager.actions.move({
      event,
      to: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
    });
  }
}
