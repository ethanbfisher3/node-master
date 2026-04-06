import { Point } from "./geometry";

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

/**
 * Generates a random level based on the level number
 */
export function generateLevel(level: number, width: number, height: number): { nodes: Node[]; links: Link[] } {
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
    const exists = links.some(l => 
      (l.node1Id === nodes[n1].id && l.node2Id === nodes[n2].id) ||
      (l.node1Id === nodes[n2].id && l.node2Id === nodes[n1].id)
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
