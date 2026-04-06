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
 * Generates a random level based on the level number
 */
export function generateLevel(
  level: number,
  width: number,
  height: number,
): { nodes: Node[]; links: Link[] } {
  const nodeCount = Math.min(4 + Math.floor(level / 2), 15);
  const linkCount = Math.min(nodeCount + Math.floor(level / 3), 20);

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
      x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
      y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
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

  // Add extra random links if needed
  let extraLinks = linkCount - nodeCount;
  let attempts = 0;
  while (extraLinks > 0 && attempts < 100) {
    attempts++;
    const n1 = Math.floor(Math.random() * nodeCount);
    const n2 = Math.floor(Math.random() * nodeCount);

    if (n1 === n2) continue;

    // Check if link already exists
    const exists = links.some(
      (l) =>
        (l.node1Id === nodes[n1].id && l.node2Id === nodes[n2].id) ||
        (l.node1Id === nodes[n2].id && l.node2Id === nodes[n1].id),
    );

    if (!exists) {
      links.push({
        id: `link-extra-${extraLinks}`,
        node1Id: nodes[n1].id,
        node2Id: nodes[n2].id,
        color: LINK_COLORS[links.length % LINK_COLORS.length],
      });
      extraLinks--;
    }
  }

  // Shuffle node positions to create tangles
  // We do this by swapping some positions
  for (let i = 0; i < nodeCount; i++) {
    const targetIdx = Math.floor(Math.random() * nodeCount);
    const tempX = nodes[i].x;
    const tempY = nodes[i].y;
    nodes[i].x = nodes[targetIdx].x;
    nodes[i].y = nodes[targetIdx].y;
    nodes[targetIdx].x = tempX;
    nodes[targetIdx].y = tempY;
  }

  return { nodes, links };
}
