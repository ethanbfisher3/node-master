export interface Node {
  id: string;
  x: number;
  y: number;
}

export interface Link {
  id: string;
  node1Id: string;
  node2Id: string;
  color: string;
}

export interface GameState {
  level: number;
  coins: number;
  nodes: Node[];
  links: Link[];
  isComplete: boolean;
}

export const LINK_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EC4899", // Pink
];

export const NODE_RADIUS = 20;

/**
 * Simple seeded random function using linear congruential generator.
 * Deterministic based on seed value.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Class to manage seeded random number generation.
 */
class SeededRandom {
  private seed: number;

  constructor(initialSeed: number | string) {
    if (typeof initialSeed === "string") {
      // Hash the string to a number
      let hash = 0;
      for (let i = 0; i < initialSeed.length; i++) {
        const char = initialSeed.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      this.seed = Math.abs(hash);
    } else {
      this.seed = Math.abs(initialSeed);
    }
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampNodeToBounds(
  node: Node,
  width: number,
  height: number,
  nodeRadius: number,
): Node {
  return {
    ...node,
    x: clamp(node.x, nodeRadius, width - nodeRadius),
    y: clamp(node.y, nodeRadius, height - nodeRadius),
  };
}

function resolveAgainstNeighbors(
  candidate: Node,
  neighbors: Node[],
  width: number,
  height: number,
  nodeRadius: number,
): Node {
  const minimumDistance = nodeRadius * 2;
  let resolved = clampNodeToBounds(candidate, width, height, nodeRadius);

  for (let pass = 0; pass < 8; pass++) {
    let changed = false;

    for (const other of neighbors) {
      if (other.id === resolved.id) {
        continue;
      }

      const dx = resolved.x - other.x;
      const dy = resolved.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= minimumDistance) {
        continue;
      }

      const safeDistance = distance === 0 ? 1 : distance;
      const overlap = minimumDistance - safeDistance;
      const directionX = distance === 0 ? 1 : dx / safeDistance;
      const directionY = distance === 0 ? 0 : dy / safeDistance;

      resolved = clampNodeToBounds(
        {
          ...resolved,
          x: resolved.x + directionX * overlap,
          y: resolved.y + directionY * overlap,
        },
        width,
        height,
        nodeRadius,
      );
      changed = true;
    }

    if (!changed) {
      break;
    }
  }

  return resolved;
}

function moveTowardTarget(current: Node, target: Node, maxStep: number): Node {
  if (maxStep <= 0) {
    return target;
  }

  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= maxStep || distance === 0) {
    return target;
  }

  const ratio = maxStep / distance;
  return {
    ...current,
    x: current.x + dx * ratio,
    y: current.y + dy * ratio,
  };
}

export function normalizeNodePositions(
  nodes: Node[],
  width: number,
  height: number,
  nodeRadius: number = NODE_RADIUS,
  minimumDistance: number = nodeRadius * 5,
): Node[] {
  const normalizedNodes = nodes.map((node) => ({ ...node }));

  for (let pass = 0; pass < 12; pass++) {
    let changed = false;

    for (let i = 0; i < normalizedNodes.length; i++) {
      for (let j = i + 1; j < normalizedNodes.length; j++) {
        const first = normalizedNodes[i];
        const second = normalizedNodes[j];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= minimumDistance) {
          continue;
        }

        const safeDistance = distance === 0 ? 1 : distance;
        const overlap = minimumDistance - safeDistance;
        const directionX = distance === 0 ? 1 : dx / safeDistance;
        const directionY = distance === 0 ? 0 : dy / safeDistance;

        normalizedNodes[i] = clampNodeToBounds(
          {
            ...first,
            x: first.x - (directionX * overlap) / 2,
            y: first.y - (directionY * overlap) / 2,
          },
          width,
          height,
          nodeRadius,
        );
        normalizedNodes[j] = clampNodeToBounds(
          {
            ...second,
            x: second.x + (directionX * overlap) / 2,
            y: second.y + (directionY * overlap) / 2,
          },
          width,
          height,
          nodeRadius,
        );
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return normalizedNodes;
}

export function resolveNodePosition(
  nodeId: string,
  x: number,
  y: number,
  nodes: Node[],
  width: number,
  height: number,
  nodeRadius: number = NODE_RADIUS,
): Node {
  const candidate = { id: nodeId, x, y };
  const current = nodes.find((node) => node.id === nodeId) ?? candidate;
  const neighbors = nodes.filter((node) => node.id !== nodeId);
  const resolvedTarget = resolveAgainstNeighbors(
    candidate,
    neighbors,
    width,
    height,
    nodeRadius,
  );

  // Cap per-tick movement to avoid visible snapping around neighbor nodes.
  const stepped = moveTowardTarget(current, resolvedTarget, nodeRadius * 0.7);

  return resolveAgainstNeighbors(stepped, neighbors, width, height, nodeRadius);
}

export function resolveNodePositionImmediate(
  nodeId: string,
  x: number,
  y: number,
  nodes: Node[],
  width: number,
  height: number,
  nodeRadius: number = NODE_RADIUS,
): Node {
  const candidate = { id: nodeId, x, y };
  const neighbors = nodes.filter((node) => node.id !== nodeId);
  return resolveAgainstNeighbors(
    candidate,
    neighbors,
    width,
    height,
    nodeRadius,
  );
}

/**
 * Generates a random level based on the level number.
 * If seed is provided, uses deterministic generation for that seed.
 */
export function generateLevel(
  level: number,
  width: number,
  height: number,
  seed?: number | string,
  requiredNodeCount?: number,
): { nodes: Node[]; links: Link[] } {
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  const random = () => (rng ? rng.next() : Math.random());

  const nodeCount =
    typeof requiredNodeCount === "number"
      ? Math.max(3, Math.min(Math.floor(requiredNodeCount), 15))
      : Math.min(4 + Math.floor(level / 2), 15);
  const maxSolvableLinks = Math.max(nodeCount, 2 * nodeCount - 3);
  const linkCount = Math.min(
    nodeCount + Math.floor(level / 3),
    maxSolvableLinks,
    20,
  );

  const nodes: Node[] = [];
  const links: Link[] = [];

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  // Place nodes in a circle initially to ensure they are spread out
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    nodes.push({
      id: `node-${i}`,
      x: centerX + Math.cos(angle) * radius + (random() - 0.5) * 50,
      y: centerY + Math.sin(angle) * radius + (random() - 0.5) * 50,
    });
  }

  // Connect nodes to form a cycle first to ensure connectivity
  for (let i = 0; i < nodeCount; i++) {
    links.push({
      id: `link-${i}`,
      node1Id: nodes[i].id,
      node2Id: nodes[(i + 1) % nodeCount].id,
      color: LINK_COLORS[i % LINK_COLORS.length],
    });
  }

  // Add extra links in a fan so the graph stays planar and solvable.
  let extraLinks = linkCount - nodeCount;
  const fanTargets = Array.from(
    { length: Math.max(0, nodeCount - 3) },
    (_, index) => index + 2,
  );

  for (let i = fanTargets.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(random() * (i + 1));
    const temp = fanTargets[i];
    fanTargets[i] = fanTargets[swapIndex];
    fanTargets[swapIndex] = temp;
  }

  let fanTargetIndex = 0;
  while (extraLinks > 0 && fanTargetIndex < fanTargets.length) {
    const targetIndex = fanTargets[fanTargetIndex];
    links.push({
      id: `link-extra-${extraLinks}`,
      node1Id: nodes[0].id,
      node2Id: nodes[targetIndex].id,
      color: LINK_COLORS[links.length % LINK_COLORS.length],
    });
    extraLinks--;
    fanTargetIndex++;
  }

  // Shuffle node positions to create tangles
  // We do this by swapping some positions
  for (let i = 0; i < nodeCount; i++) {
    const targetIdx = Math.floor(random() * nodeCount);
    const tempX = nodes[i].x;
    const tempY = nodes[i].y;
    nodes[i].x = nodes[targetIdx].x;
    nodes[i].y = nodes[targetIdx].y;
    nodes[targetIdx].x = tempX;
    nodes[targetIdx].y = tempY;
  }

  return { nodes, links };
}
