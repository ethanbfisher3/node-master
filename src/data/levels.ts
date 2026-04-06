import {
  Link,
  LINK_COLORS,
  NODE_RADIUS,
  Node,
  normalizeNodePositions,
} from "../utils/gameLogic";
import { doIntersect } from "../utils/geometry";

export interface LevelData {
  id: number;
  nodes: Node[];
  links: Link[];
}

const GAME_WIDTH = 350;
const GAME_HEIGHT = 500;

// Helper to generate a deterministic level for pre-generation
function generateFixedLevel(
  id: number,
  nodeCount: number,
  linkCount: number,
): LevelData {
  let nodes: Node[] = [];
  let links: Link[] = [];

  const centerX = GAME_WIDTH / 2;
  const centerY = GAME_HEIGHT / 2;
  const playArea = Math.min(GAME_WIDTH, GAME_HEIGHT) * 0.6;

  // Pseudo-random based on ID
  let seed = id * 1337;
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // 1. Create nodes in a tight central cluster first
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      x: centerX + (random() - 0.5) * playArea,
      y: centerY + (random() - 0.5) * playArea,
    });
  }
  nodes = normalizeNodePositions(
    nodes,
    GAME_WIDTH,
    GAME_HEIGHT,
    NODE_RADIUS,
    NODE_RADIUS * 5,
  );

  // 2. Connect nodes to form a cycle to ensure connectivity
  for (let i = 0; i < nodeCount; i++) {
    links.push({
      id: `link-${i}`,
      node1Id: nodes[i].id,
      node2Id: nodes[(i + 1) % nodeCount].id,
      color: LINK_COLORS[i % LINK_COLORS.length],
    });
  }

  // 3. Add extra links in a fan from node 0 so the graph stays outerplanar.
  // This guarantees at least one crossing-free solution exists.
  const maxExtraLinks = Math.max(0, nodeCount - 3);
  let extra = Math.min(linkCount - nodeCount, maxExtraLinks);
  let fanTargetIndex = 2;

  while (extra > 0 && fanTargetIndex < nodeCount - 1) {
    links.push({
      id: `link-extra-${extra}`,
      node1Id: nodes[0].id,
      node2Id: nodes[fanTargetIndex].id,
      color: LINK_COLORS[links.length % LINK_COLORS.length],
    });
    fanTargetIndex++;
    extra--;
  }

  // 4. Tangle phase: Aggressively shuffle until we have a high intersection count
  // We want at least (linkCount * 0.5) intersections for a "real" puzzle
  const minIntersections = Math.floor(
    linkCount *
      (nodeCount <= 6
        ? 0.4
        : nodeCount <= 8
          ? 0.6
          : nodeCount <= 11
            ? 0.8
            : 0.9),
  );
  let tangleAttempts = 0;

  while (tangleAttempts < 50) {
    tangleAttempts++;

    // Shuffle positions
    for (let i = 0; i < nodeCount; i++) {
      nodes[i].x = centerX + (random() - 0.5) * playArea;
      nodes[i].y = centerY + (random() - 0.5) * playArea;
    }
    nodes = normalizeNodePositions(
      nodes,
      GAME_WIDTH,
      GAME_HEIGHT,
      NODE_RADIUS,
      NODE_RADIUS * 5,
    );

    // Count intersections
    let intersectionCount = 0;
    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        const l1 = links[i];
        const l2 = links[j];
        if (
          l1.node1Id === l2.node1Id ||
          l1.node1Id === l2.node2Id ||
          l1.node2Id === l2.node1Id ||
          l1.node2Id === l2.node2Id
        )
          continue;

        const n1a = nodes.find((n) => n.id === l1.node1Id)!;
        const n1b = nodes.find((n) => n.id === l1.node2Id)!;
        const n2a = nodes.find((n) => n.id === l2.node1Id)!;
        const n2b = nodes.find((n) => n.id === l2.node2Id)!;

        if (doIntersect(n1a, n1b, n2a, n2b)) {
          intersectionCount++;
        }
      }
    }

    if (intersectionCount >= minIntersections) break;
  }

  return { id, nodes, links };
}

const levels: LevelData[] = [];

let levelId = 1;

for (let nodeCount = 5; nodeCount <= 15; nodeCount++) {
  const maxExtraLinks = Math.max(1, Math.min(5, nodeCount - 3));

  for (let variant = 0; variant < 20; variant++) {
    const extraLinks = 1 + (variant % maxExtraLinks);
    levels.push(generateFixedLevel(levelId, nodeCount, nodeCount + extraLinks));
    levelId++;
  }
}

export const PRE_GENERATED_LEVELS = levels;
