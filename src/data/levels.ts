import { Node, Link, LINK_COLORS } from "../utils/gameLogic";
import { doIntersect } from "../utils/geometry";

export interface LevelData {
  id: number;
  nodes: Node[];
  links: Link[];
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
}

const GAME_WIDTH = 350;
const GAME_HEIGHT = 500;

// Helper to generate a deterministic level for pre-generation
function generateFixedLevel(id: number, nodeCount: number, linkCount: number, difficulty: LevelData['difficulty']): LevelData {
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

  // 2. Connect nodes to form a cycle to ensure connectivity
  for (let i = 0; i < nodeCount; i++) {
    links.push({
      id: `link-${i}`,
      node1Id: nodes[i].id,
      node2Id: nodes[(i + 1) % nodeCount].id,
      color: LINK_COLORS[i % LINK_COLORS.length],
    });
  }

  // 3. Add extra links to increase complexity
  let extra = linkCount - nodeCount;
  let attempts = 0;
  while (extra > 0 && attempts < 100) {
    attempts++;
    const n1 = Math.floor(random() * nodeCount);
    const n2 = Math.floor(random() * nodeCount);
    if (n1 === n2) continue;
    const exists = links.some(l => 
      (l.node1Id === nodes[n1].id && l.node2Id === nodes[n2].id) ||
      (l.node1Id === nodes[n2].id && l.node2Id === nodes[n1].id)
    );
    if (!exists) {
      links.push({
        id: `link-extra-${extra}`,
        node1Id: nodes[n1].id,
        node2Id: nodes[n2].id,
        color: LINK_COLORS[links.length % LINK_COLORS.length],
      });
      extra--;
    }
  }

  // 4. Tangle phase: Aggressively shuffle until we have a high intersection count
  // We want at least (linkCount * 0.5) intersections for a "real" puzzle
  const minIntersections = Math.floor(linkCount * (difficulty === 'Easy' ? 0.4 : difficulty === 'Medium' ? 0.6 : 0.8));
  let tangleAttempts = 0;
  
  while (tangleAttempts < 50) {
    tangleAttempts++;
    
    // Shuffle positions
    for (let i = 0; i < nodeCount; i++) {
      nodes[i].x = centerX + (random() - 0.5) * playArea;
      nodes[i].y = centerY + (random() - 0.5) * playArea;
    }

    // Count intersections
    let intersectionCount = 0;
    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        const l1 = links[i];
        const l2 = links[j];
        if (l1.node1Id === l2.node1Id || l1.node1Id === l2.node2Id || 
            l1.node2Id === l2.node1Id || l1.node2Id === l2.node2Id) continue;
        
        const n1a = nodes.find(n => n.id === l1.node1Id)!;
        const n1b = nodes.find(n => n.id === l1.node2Id)!;
        const n2a = nodes.find(n => n.id === l2.node1Id)!;
        const n2b = nodes.find(n => n.id === l2.node2Id)!;

        if (doIntersect(n1a, n1b, n2a, n2b)) {
          intersectionCount++;
        }
      }
    }

    if (intersectionCount >= minIntersections) break;
  }

  return { id, nodes, links, difficulty };
}

const levels: LevelData[] = [];

// Generate 10 Easy levels (5 nodes)
for (let i = 1; i <= 10; i++) levels.push(generateFixedLevel(i, 5, 6, 'Easy'));

// Generate 15 Medium levels (6-7 nodes)
for (let i = 11; i <= 25; i++) levels.push(generateFixedLevel(i, i % 2 === 0 ? 6 : 7, 8, 'Medium'));

// Generate 25 Hard levels (8-10 nodes)
for (let i = 26; i <= 50; i++) levels.push(generateFixedLevel(i, 8 + (i % 3), 12, 'Hard'));

// Generate 50 Expert levels (11+ nodes)
for (let i = 51; i <= 100; i++) levels.push(generateFixedLevel(i, 11 + (i % 4), 16, 'Expert'));

export const PRE_GENERATED_LEVELS = levels;
