import { forceSimulation, forceCollide, forceManyBody, forceX, forceY } from 'd3-force';
import type { SimulationNodeDatum } from 'd3-force';

export interface AnalysisNodePosition {
  id: string;
  anchorWordId: string;
  position: { angle: number; distance: number };
}

export interface ComputedPosition {
  id: string;
  x: number;
  y: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  targetX: number;
  targetY: number;
}

export function layoutNodes(
  anchorPositions: Map<string, { x: number; y: number }>,
  nodes: AnalysisNodePosition[],
  containerRect: DOMRect,
  verseRect?: DOMRect
): ComputedPosition[] {
  if (nodes.length === 0) return [];

  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    return layoutMobile(nodes, containerRect, verseRect);
  }

  const nodeWidth = 280;
  const nodeHeight = 120;
  const pad = 20;

  // Determine verse area to avoid (relative to container)
  const verseTop = verseRect ? verseRect.top - containerRect.top : containerRect.height * 0.2;
  const verseBottom = verseRect
    ? verseRect.bottom - containerRect.top
    : containerRect.height * 0.8;
  const verseLeft = verseRect ? verseRect.left - containerRect.left : containerRect.width * 0.2;
  const verseRight = verseRect ? verseRect.right - containerRect.left : containerRect.width * 0.8;

  // Calculate target positions: place nodes on the sides of the verse or above/below
  const simNodes: SimNode[] = nodes.map((node) => {
    const anchor = anchorPositions.get(node.anchorWordId);
    const rad = (node.position.angle * Math.PI) / 180;
    const scaledDistance = Math.min(node.position.distance, 250);

    let targetX: number;
    let targetY: number;

    if (anchor) {
      targetX = anchor.x + Math.cos(rad) * scaledDistance;
      targetY = anchor.y + Math.sin(rad) * scaledDistance;
    } else {
      targetX = containerRect.width / 2;
      targetY = containerRect.height / 2;
    }

    // Push nodes out of the verse area (with generous margin)
    const margin = 40;
    const inVerseX = targetX + nodeWidth > verseLeft - margin && targetX < verseRight + margin;
    const inVerseY = targetY + nodeHeight > verseTop - margin && targetY < verseBottom + margin;

    if (inVerseX && inVerseY) {
      // Use the authored angle to decide placement side
      const angleDeg = ((node.position.angle % 360) + 360) % 360;

      // Check available space on each side
      const spaceRight = containerRect.width - verseRight - margin;
      const spaceLeft = verseLeft - margin;
      const spaceBelow = containerRect.height - verseBottom - margin;

      if (angleDeg >= 315 || angleDeg < 45) {
        // Prefer right
        if (spaceRight >= nodeWidth) {
          targetX = verseRight + margin;
        } else {
          targetY = verseBottom + margin;
          targetX = Math.max(pad, containerRect.width / 2 - nodeWidth / 2);
        }
      } else if (angleDeg >= 45 && angleDeg < 135) {
        // Below
        targetY = verseBottom + margin;
      } else if (angleDeg >= 135 && angleDeg < 225) {
        // Prefer left
        if (spaceLeft >= nodeWidth) {
          targetX = verseLeft - nodeWidth - margin;
        } else {
          targetY = verseBottom + margin;
          targetX = Math.max(pad, containerRect.width / 2 - nodeWidth / 2);
        }
      } else {
        // Above
        targetY = verseTop - nodeHeight - margin;
      }
    }

    return {
      id: node.id,
      x: targetX,
      y: targetY,
      targetX,
      targetY,
    };
  });

  // Run D3 force simulation to prevent overlapping between nodes
  const simulation = forceSimulation(simNodes)
    .force('collide', forceCollide(80))
    .force('charge', forceManyBody().strength(-30))
    .force('x', forceX<SimNode>((d) => d.targetX).strength(0.3))
    .force('y', forceY<SimNode>((d) => d.targetY).strength(0.3))
    .alphaDecay(0.05)
    .stop();

  for (let i = 0; i < 80; i++) simulation.tick();

  // Clamp to container bounds
  return simNodes.map((n) => ({
    id: n.id,
    x: Math.max(pad, Math.min(containerRect.width - pad - nodeWidth, n.x ?? 0)),
    y: Math.max(pad, Math.min(containerRect.height - pad - nodeHeight, n.y ?? 0)),
  }));
}

function layoutMobile(
  nodes: AnalysisNodePosition[],
  containerRect: DOMRect,
  verseRect?: DOMRect
): ComputedPosition[] {
  // Stack nodes vertically below the verse
  const startY = verseRect
    ? verseRect.bottom - containerRect.top + 30
    : containerRect.height * 0.7;
  const gap = 16;
  const nodeHeight = 120;

  return nodes.map((node, i) => ({
    id: node.id,
    x: Math.max(16, containerRect.width / 2 - 140),
    y: startY + i * (nodeHeight + gap),
  }));
}
