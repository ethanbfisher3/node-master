import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { ArrowLeft, Coins, LayoutGrid, RotateCcw } from "lucide-react-native";

import { DraggableNode } from "../components/DraggableNode";
import { styles } from "../styles";
import { Link, Node } from "../utils/gameLogic";

type GameScreenProps = {
  level: number;
  coins: number;
  nodes: Node[];
  links: Link[];
  intersectingLinks: Set<string>;
  moves: number;
  trialTimeLeftSeconds?: number;
  noAdsOwned: boolean;
  onBackHome: () => void;
  onOpenLevels: () => void;
  onRestart: () => void;
  onNodeDrag: (id: string, x: number, y: number) => void;
};

export function GameScreen({
  level,
  coins,
  nodes,
  links,
  intersectingLinks,
  moves,
  trialTimeLeftSeconds,
  noAdsOwned,
  onBackHome,
  onOpenLevels,
  onRestart,
  onNodeDrag,
}: GameScreenProps) {
  return (
    <View style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <View style={styles.gameHeaderLeft}>
          <TouchableOpacity onPress={onBackHome} style={styles.gameIconButton}>
            <ArrowLeft size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenLevels}
            style={styles.gameIconButton}
          >
            <LayoutGrid size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRestart} style={styles.gameIconButton}>
            <RotateCcw size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.levelIndicator}>
          <Text style={styles.levelIndicatorLabel}>Level</Text>
          <Text style={styles.levelIndicatorValue}>{level}</Text>
        </View>

        <View style={styles.gameCoinBadge}>
          <Coins size={16} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.gameCoinText}>{coins}</Text>
        </View>
      </View>

      <View style={styles.board}>
        <Svg style={styles.boardSvg}>
          {links.map((link) => {
            const n1 = nodes.find((node) => node.id === link.node1Id)!;
            const n2 = nodes.find((node) => node.id === link.node2Id)!;
            const isIntersecting = intersectingLinks.has(link.id);

            return (
              <Line
                key={link.id}
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke={isIntersecting ? "#EF4444" : "#10B981"}
                strokeWidth={isIntersecting ? 6 : 4}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>

        {nodes.map((node) => (
          <View key={node.id}>
            <DraggableNode node={node} allNodes={nodes} onDrag={onNodeDrag} />
          </View>
        ))}
      </View>

      <View style={styles.gameFooter}>
        <Text style={styles.movesText}>Moves: {moves}</Text>
        {typeof trialTimeLeftSeconds === "number" && (
          <Text style={styles.trialTimerText}>
            Time Left: {trialTimeLeftSeconds}s
          </Text>
        )}
        <Text style={styles.hintText}>
          Drag nodes to untangle. Green links are clear!
        </Text>
      </View>
    </View>
  );
}
