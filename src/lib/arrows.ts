type LeaderLineInstance = {
  remove: () => void;
  position: () => void;
  setOptions: (options: Record<string, unknown>) => void;
};

type LeaderLineConstructor = new (
  start: Element,
  end: Element,
  options?: Record<string, unknown>
) => LeaderLineInstance;

let LeaderLineClass: LeaderLineConstructor | null = null;
const activeLines: LeaderLineInstance[] = [];

async function getLeaderLine(): Promise<LeaderLineConstructor | null> {
  if (LeaderLineClass) return LeaderLineClass;
  try {
    const mod = await import('leader-line-new');
    LeaderLineClass = (mod.default || mod) as unknown as LeaderLineConstructor;
    return LeaderLineClass;
  } catch {
    console.warn('LeaderLine failed to load');
    return null;
  }
}

export interface Connection {
  from: string;
  to: string;
  label?: string;
}

export async function drawConnections(
  connections: Connection[],
  color: string
): Promise<void> {
  const LL = await getLeaderLine();
  if (!LL) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (const conn of connections) {
    const fromEl = document.getElementById(conn.from);
    const toEl = document.getElementById(conn.to);
    if (!fromEl || !toEl) continue;

    const line = new LL(fromEl, toEl, {
      color,
      size: 2,
      path: 'arc',
      startSocket: 'auto',
      endSocket: 'auto',
      startPlug: 'behind',
      endPlug: 'arrow1',
      dash: prefersReducedMotion ? undefined : { animation: true },
    });

    activeLines.push(line);
  }
}

export function clearConnections(): void {
  activeLines.forEach((line) => {
    try {
      line.remove();
    } catch {
      // Element may already be removed
    }
  });
  activeLines.length = 0;
}

export function repositionConnections(): void {
  activeLines.forEach((line) => {
    try {
      line.position();
    } catch {
      // Element may not be visible
    }
  });
}
