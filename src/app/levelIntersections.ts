import { doIntersect } from "../utils/geometry";
import { Link, Node } from "../utils/gameLogic";

export function enrichTimeTrialLinks(nodes: Node[], links: Link[]): Link[] {
  const nextLinks = JSON.parse(JSON.stringify(links)) as Link[];
  const targetLinkCount = Math.min(
    nodes.length + Math.max(2, Math.floor(nodes.length / 2)),
    20,
  );

  let attempts = 0;
  while (nextLinks.length < targetLinkCount && attempts < 240) {
    attempts++;
    const firstNode = nodes[Math.floor(Math.random() * nodes.length)];
    const secondNode = nodes[Math.floor(Math.random() * nodes.length)];

    if (!firstNode || !secondNode || firstNode.id === secondNode.id) {
      continue;
    }

    const exists = nextLinks.some(
      (entry) =>
        (entry.node1Id === firstNode.id && entry.node2Id === secondNode.id) ||
        (entry.node1Id === secondNode.id && entry.node2Id === firstNode.id),
    );

    if (exists) {
      continue;
    }

    nextLinks.push({
      id: `tt-link-${nextLinks.length}-${attempts}`,
      node1Id: firstNode.id,
      node2Id: secondNode.id,
      color: "#94a3b8",
    });
  }

  return nextLinks;
}

export function getIntersectingLinkIds(
  currentNodes: Node[],
  currentLinks: Link[],
): Set<string> {
  const intersections = new Set<string>();

  for (let i = 0; i < currentLinks.length; i++) {
    for (let j = i + 1; j < currentLinks.length; j++) {
      const firstLink = currentLinks[i];
      const secondLink = currentLinks[j];

      if (
        firstLink.node1Id === secondLink.node1Id ||
        firstLink.node1Id === secondLink.node2Id ||
        firstLink.node2Id === secondLink.node1Id ||
        firstLink.node2Id === secondLink.node2Id
      ) {
        continue;
      }

      const firstNodeA = currentNodes.find(
        (node) => node.id === firstLink.node1Id,
      );
      const firstNodeB = currentNodes.find(
        (node) => node.id === firstLink.node2Id,
      );
      const secondNodeA = currentNodes.find(
        (node) => node.id === secondLink.node1Id,
      );
      const secondNodeB = currentNodes.find(
        (node) => node.id === secondLink.node2Id,
      );

      if (!firstNodeA || !firstNodeB || !secondNodeA || !secondNodeB) {
        continue;
      }

      if (doIntersect(firstNodeA, firstNodeB, secondNodeA, secondNodeB)) {
        intersections.add(firstLink.id);
        intersections.add(secondLink.id);
      }
    }
  }

  return intersections;
}
