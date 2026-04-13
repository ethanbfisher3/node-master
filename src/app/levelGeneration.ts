import {
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

function hasEnoughStartingIntersections(
  nodes: Node[],
  links: Link[],
  width: number,
  height: number,
  minimumIntersections: number,
): boolean {
  const normalizedNodes = normalizeNodePositions(
    JSON.parse(JSON.stringify(nodes)),
    width,
    height,
  );
  const intersections = getIntersectingLinkIds(normalizedNodes, links);
  return intersections.size >= minimumIntersections;
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
    const packSeed = selectedLevelPackId || "default";
    const combinedSeed = `${packSeed}:${levelId}`;
    let fallbackNodes: Node[] = [];
    let fallbackLinks: Link[] = [];

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

      nextNodes = generatedLevel.nodes;
      nextLinks = generatedLevel.links;
      break;
    }

    if (nextNodes.length === 0 || nextLinks.length === 0) {
      nextNodes = fallbackNodes;
      nextLinks = fallbackLinks;
    }
  }

  return {
    nodes: nextNodes,
    links: nextLinks,
  };
}
