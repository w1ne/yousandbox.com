export interface PaneWidths {
    left: number   // percentage 0–100
    center: number // percentage 0–100
    right: number  // percentage 0–100
}

const DEFAULT_MIN_PCT = 10

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

/**
 * Move the divider between the left and center panes.
 * deltaPct > 0 → left grows, center shrinks.
 * deltaPct < 0 → left shrinks, center grows.
 */
export function adjustLeftHandle(
    panes: PaneWidths,
    deltaPct: number,
    minPct: number = DEFAULT_MIN_PCT,
): PaneWidths {
    const maxLeft = 100 - panes.right - minPct
    const newLeft = clamp(panes.left + deltaPct, minPct, maxLeft)
    const actualDelta = newLeft - panes.left
    return {
        left: newLeft,
        center: panes.center - actualDelta,
        right: panes.right,
    }
}

/**
 * Move the divider between the center and right panes.
 * deltaPct > 0 → center grows, right shrinks.
 * deltaPct < 0 → center shrinks, right grows.
 */
export function adjustRightHandle(
    panes: PaneWidths,
    deltaPct: number,
    minPct: number = DEFAULT_MIN_PCT,
): PaneWidths {
    const maxCenter = 100 - panes.left - minPct
    const newCenter = clamp(panes.center + deltaPct, minPct, maxCenter)
    const actualDelta = newCenter - panes.center
    return {
        left: panes.left,
        center: newCenter,
        right: panes.right - actualDelta,
    }
}
