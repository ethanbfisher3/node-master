import {
  REVERSE_LEVEL_PACK_ID,
  MAX_TIME_TRIAL_GENERATION_ATTEMPTS,
  MIN_TIME_TRIAL_INTERSECTIONS,
} from "./constants";
import {
  enrichTimeTrialLinks,
  getIntersectingLinkIds,
} from "./levelIntersections";
import {
  generateLevel,
  Link,
  Node,
  normalizeNodePositions,
} from "../utils/gameLogic";

export type LevelGenerationMode = "classic" | "daily" | "weekly" | "time-trial";

type GeneratedLevelCache = Map<string, { nodes: Node[]; links: Link[] }>;

type GenerateLevelForModeArgs = {
  levelId: number;
  mode: LevelGenerationMode;
  width: number;
  height: number;
  generatedModeLevelsCache: GeneratedLevelCache;
  selectedLevelPackId: string | null;
  forcedTimeTrialNodeCount?: number;
  timeTrialNodeCount: number | null;
  requiredNodeCount?: number;
};

const MIN_STARTING_INTERSECTIONS = 1;

type ReverseLayoutSearchResult = {
  mixedStartNodes: Node[] | null;
  fullyCrossedNodes: Node[] | null;
};

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function createDeterministicRandom(seedText: string): () => number {
  let state = (hashString(seedText) % 2147483646) + 1;

  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

function cloneNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => ({ ...node }));
}

function countIntersectingLinks(nodes: Node[], links: Link[]): number {
  return getIntersectingLinkIds(nodes, links).size;
}

function findReverseLayouts(
  nodes: Node[],
  links: Link[],
  width: number,
  height: number,
): ReverseLayoutSearchResult {
  if (nodes.length === 0 || links.length === 0) {
    return {
      mixedStartNodes: null,
      fullyCrossedNodes: null,
    };
  }

  const linkCount = links.length;
  const random = createDeterministicRandom(
    `${nodes.length}:${linkCount}:${links.map((link) => link.id).join("|")}`,
  );

  let mixedStartNodes: Node[] | null = null;
  let fullyCrossedNodes: Node[] | null = null;
  let bestMixedDistance = Number.POSITIVE_INFINITY;
  const mixedTarget = linkCount * 0.5;

  const evaluateCandidate = (candidateNodes: Node[]) => {
    const normalizedCandidate = normalizeNodePositions(
      cloneNodes(candidateNodes),
      width,
      height,
    );
    const intersections = countIntersectingLinks(normalizedCandidate, links);

    if (intersections === linkCount && !fullyCrossedNodes) {
      fullyCrossedNodes = normalizedCandidate;
    }

    if (isValidReverseStartState(intersections, linkCount)) {
      const distance = Math.abs(intersections - mixedTarget);
      if (distance < bestMixedDistance) {
        bestMixedDistance = distance;
        mixedStartNodes = normalizedCandidate;
      }
    }
  };

  evaluateCandidate(nodes);
  evaluateCandidate(layoutSolvedNodes(nodes, width, height));

  const attemptCount = 80;
  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    const candidateNodes =
      attempt % 2 === 0
        ? cloneNodes(nodes)
        : layoutSolvedNodes(nodes, width, height);

    const swapCount = Math.max(2, Math.floor(candidateNodes.length / 2));
    for (let swap = 0; swap < swapCount; swap += 1) {
      const firstIndex = Math.floor(random() * candidateNodes.length);
      const secondIndex = Math.floor(random() * candidateNodes.length);
      if (firstIndex === secondIndex) {
        continue;
      }

      const firstNode = candidateNodes[firstIndex];
      const secondNode = candidateNodes[secondIndex];
      const firstX = firstNode.x;
      const firstY = firstNode.y;

      firstNode.x = secondNode.x;
      firstNode.y = secondNode.y;
      secondNode.x = firstX;
      secondNode.y = firstY;
    }

    evaluateCandidate(candidateNodes);

    if (mixedStartNodes && fullyCrossedNodes) {
      break;
    }
  }

  return {
    mixedStartNodes,
    fullyCrossedNodes,
  };
}

function isValidReverseStartState(
  intersections: number,
  linkCount: number,
): boolean {
  return intersections > 0 && intersections < linkCount;
}

function layoutSolvedNodes(
  nodes: Node[],
  width: number,
  height: number,
): Node[] {
  if (nodes.length === 0) {
    return [];
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;
  const orderedNodes = [...nodes].sort((first, second) => {
    const firstIndex = Number(first.id.replace(/\D+/g, ""));
    const secondIndex = Number(second.id.replace(/\D+/g, ""));

    if (!Number.isFinite(firstIndex) || !Number.isFinite(secondIndex)) {
      return first.id.localeCompare(second.id);
    }

    return firstIndex - secondIndex;
  });

  return orderedNodes.map((node, index) => {
    const angle = (index / orderedNodes.length) * Math.PI * 2;
    return {
      ...node,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });
}

function getStartingIntersectionCount(
  nodes: Node[],
  links: Link[],
  width: number,
  height: number,
): number {
  const normalizedNodes = normalizeNodePositions(
    JSON.parse(JSON.stringify(nodes)),
    width,
    height,
  );
  const intersections = getIntersectingLinkIds(normalizedNodes, links);
  return intersections.size;
}

function hasEnoughStartingIntersections(
  nodes: Node[],
  links: Link[],
  width: number,
  height: number,
  minimumIntersections: number,
): boolean {
  return (
    getStartingIntersectionCount(nodes, links, width, height) >=
    minimumIntersections
  );
}

export function generateLevelForMode({
  levelId,
  mode,
  width,
  height,
  generatedModeLevelsCache,
  selectedLevelPackId,
  forcedTimeTrialNodeCount,
  timeTrialNodeCount,
  requiredNodeCount,
}: GenerateLevelForModeArgs): { nodes: Node[]; links: Link[] } {
  let nextNodes: Node[] = [];
  let nextLinks: Link[] = [];

  if (mode === "daily" || mode === "weekly" || mode === "time-trial") {
    const cacheKey = `${mode}-${levelId}`;
    const shouldUseCache = mode !== "time-trial";
    const cachedLevel = shouldUseCache
      ? generatedModeLevelsCache.get(cacheKey)
      : undefined;

    if (cachedLevel) {
      nextNodes = JSON.parse(JSON.stringify(cachedLevel.nodes));
      nextLinks = JSON.parse(JSON.stringify(cachedLevel.links));
    } else {
      const nodeCount =
        mode === "time-trial"
          ? Math.max(5, forcedTimeTrialNodeCount ?? timeTrialNodeCount ?? 7)
          : 7 + Math.floor(Math.random() * 7);

      if (mode === "time-trial") {
        let generatedNodes: Node[] = [];
        let generatedLinks: Link[] = [];

        for (
          let attempt = 0;
          attempt < MAX_TIME_TRIAL_GENERATION_ATTEMPTS;
          attempt++
        ) {
          // Keep the requested node count exact for time trial generation.
          const generatorLevel = (nodeCount - 4) * 2;
          const generatedLevel = generateLevel(
            generatorLevel,
            width,
            height,
            undefined,
            nodeCount,
          );
          const enrichedLinks = enrichTimeTrialLinks(
            generatedLevel.nodes,
            generatedLevel.links,
          );

          const normalizedAttemptNodes = normalizeNodePositions(
            JSON.parse(JSON.stringify(generatedLevel.nodes)),
            width,
            height,
          );
          const attemptIntersections = getIntersectingLinkIds(
            normalizedAttemptNodes,
            enrichedLinks,
          );

          generatedNodes = normalizedAttemptNodes;
          generatedLinks = JSON.parse(JSON.stringify(enrichedLinks));

          if (attemptIntersections.size >= MIN_TIME_TRIAL_INTERSECTIONS) {
            break;
          }
        }

        nextNodes = generatedNodes;
        nextLinks = generatedLinks;
      } else {
        const generatorLevel = (nodeCount - 4) * 2;
        let fallbackNodes: Node[] = [];
        let fallbackLinks: Link[] = [];

        for (
          let attempt = 0;
          attempt < MAX_TIME_TRIAL_GENERATION_ATTEMPTS;
          attempt++
        ) {
          const generatedLevel = generateLevel(
            generatorLevel,
            width,
            height,
            undefined,
            nodeCount,
          );

          fallbackNodes = JSON.parse(JSON.stringify(generatedLevel.nodes));
          fallbackLinks = JSON.parse(JSON.stringify(generatedLevel.links));

          if (
            !hasEnoughStartingIntersections(
              generatedLevel.nodes,
              generatedLevel.links,
              width,
              height,
              MIN_STARTING_INTERSECTIONS,
            )
          ) {
            continue;
          }

          nextNodes = fallbackNodes;
          nextLinks = fallbackLinks;
          break;
        }

        if (nextNodes.length === 0 || nextLinks.length === 0) {
          nextNodes = fallbackNodes;
          nextLinks = fallbackLinks;
        }

        generatedModeLevelsCache.set(cacheKey, {
          nodes: JSON.parse(JSON.stringify(nextNodes)),
          links: JSON.parse(JSON.stringify(nextLinks)),
        });
      }
    }
  } else {
    // For classic mode, generate level with pack-specific seed.
    const isReversePack = selectedLevelPackId === REVERSE_LEVEL_PACK_ID;
    const packSeed = selectedLevelPackId || "default";
    const combinedSeed = `${packSeed}:${levelId}`;
    let fallbackNodes: Node[] = [];
    let fallbackLinks: Link[] = [];
    let reverseFallbackMixedStartNodes: Node[] | null = null;
    let reverseFallbackFullyCrossedPossible = false;

    for (
      let attempt = 0;
      attempt < MAX_TIME_TRIAL_GENERATION_ATTEMPTS;
      attempt++
    ) {
      const generatedLevel = generateLevel(
        levelId,
        width,
        height,
        `${combinedSeed}:${attempt}`,
        requiredNodeCount,
      );

      fallbackNodes = generatedLevel.nodes;
      fallbackLinks = generatedLevel.links;

      if (isReversePack) {
        const reverseLayouts = findReverseLayouts(
          generatedLevel.nodes,
          generatedLevel.links,
          width,
          height,
        );
        const hasMixedStart = Boolean(reverseLayouts.mixedStartNodes);
        const hasFullyCrossedState = Boolean(reverseLayouts.fullyCrossedNodes);

        if (hasMixedStart) {
          reverseFallbackMixedStartNodes = reverseLayouts.mixedStartNodes;
        }
        if (hasFullyCrossedState) {
          reverseFallbackFullyCrossedPossible = true;
        }

        if (!hasMixedStart || !hasFullyCrossedState) {
          continue;
        }

        nextNodes = reverseLayouts.mixedStartNodes ?? generatedLevel.nodes;
        nextLinks = generatedLevel.links;
        break;
      }

      const startingIntersections = getStartingIntersectionCount(
        generatedLevel.nodes,
        generatedLevel.links,
        width,
        height,
      );
      const isValidStartState =
        startingIntersections >= MIN_STARTING_INTERSECTIONS;

      if (!isValidStartState) {
        continue;
      }

      nextNodes = generatedLevel.nodes;
      nextLinks = generatedLevel.links;
      break;
    }

    if (nextNodes.length === 0 || nextLinks.length === 0) {
      if (
        isReversePack &&
        fallbackNodes.length > 0 &&
        fallbackLinks.length > 0
      ) {
        const reverseLayouts = findReverseLayouts(
          fallbackNodes,
          fallbackLinks,
          width,
          height,
        );
        const canFullyCross =
          reverseFallbackFullyCrossedPossible ||
          Boolean(reverseLayouts.fullyCrossedNodes);
        const mixedStartNodes =
          reverseFallbackMixedStartNodes ?? reverseLayouts.mixedStartNodes;

        if (canFullyCross && mixedStartNodes) {
          nextNodes = mixedStartNodes;
          nextLinks = fallbackLinks;
        }

        if (nextNodes.length === 0 || nextLinks.length === 0) {
          const emergencyAttemptCount = MAX_TIME_TRIAL_GENERATION_ATTEMPTS * 10;

          for (
            let emergencyAttempt = 0;
            emergencyAttempt < emergencyAttemptCount;
            emergencyAttempt += 1
          ) {
            const emergencyLevel = generateLevel(
              levelId,
              width,
              height,
              `${combinedSeed}:reverse-emergency:${emergencyAttempt}`,
              requiredNodeCount,
            );
            const emergencyReverseLayouts = findReverseLayouts(
              emergencyLevel.nodes,
              emergencyLevel.links,
              width,
              height,
            );

            if (
              emergencyReverseLayouts.mixedStartNodes &&
              emergencyReverseLayouts.fullyCrossedNodes
            ) {
              nextNodes = emergencyReverseLayouts.mixedStartNodes;
              nextLinks = emergencyLevel.links;
              break;
            }
          }
        }
      } else {
        nextNodes = fallbackNodes;
        nextLinks = fallbackLinks;
      }

      if (nextNodes.length === 0 || nextLinks.length === 0) {
        nextNodes = fallbackNodes;
        nextLinks = fallbackLinks;
      }
    }
  }

  return {
    nodes: nextNodes,
    links: nextLinks,
  };
}
