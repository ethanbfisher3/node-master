import React, { useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  SafeAreaView, 
  ScrollView,
  StatusBar,
  Platform
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { 
  Trophy, 
  Play, 
  RotateCcw, 
  Settings, 
  Coins, 
  ChevronRight, 
  Info, 
  LayoutGrid, 
  ArrowLeft 
} from 'lucide-react-native';

import { doIntersect } from './utils/geometry';
import { Node, Link } from './utils/gameLogic';
import { PRE_GENERATED_LEVELS } from './data/levels';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GAME_WIDTH = 350;
const GAME_HEIGHT = 500;
const NODE_RADIUS = 20;

// Draggable Node Component
const DraggableNode = ({ node, onDrag }: { node: Node, onDrag: (id: string, x: number, y: number) => void }) => {
  const translateX = useSharedValue(node.x);
  const translateY = useSharedValue(node.y);

  const panGesture = useMemo(() => Gesture.Pan().onUpdate((event) => {
    const boardX = (SCREEN_WIDTH - GAME_WIDTH) / 2;
    const boardY = (SCREEN_HEIGHT - GAME_HEIGHT) / 2;

    translateX.value = Math.max(NODE_RADIUS, Math.min(GAME_WIDTH - NODE_RADIUS, event.absoluteX - boardX));
    translateY.value = Math.max(NODE_RADIUS, Math.min(GAME_HEIGHT - NODE_RADIUS, event.absoluteY - boardY));

    runOnJS(onDrag)(node.id, translateX.value, translateY.value);
  }), [node.id, onDrag, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - NODE_RADIUS },
      { translateY: translateY.value - NODE_RADIUS },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.nodeContainer, animatedStyle]}>
        <View style={styles.nodeInner}>
          <View style={styles.nodeDot} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

export default function App() {
  const [view, setView] = useState<'home' | 'game' | 'complete' | 'levels'>('home');
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [intersectingLinks, setIntersectingLinks] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [isLevelComplete, setIsLevelComplete] = useState(false);

  const checkIntersections = useCallback((currentNodes: Node[], currentLinks: Link[]) => {
    const intersections = new Set<string>();
    
    for (let i = 0; i < currentLinks.length; i++) {
      for (let j = i + 1; j < currentLinks.length; j++) {
        const l1 = currentLinks[i];
        const l2 = currentLinks[j];
        
        const n1a = currentNodes.find(n => n.id === l1.node1Id)!;
        const n1b = currentNodes.find(n => n.id === l1.node2Id)!;
        const n2a = currentNodes.find(n => n.id === l2.node1Id)!;
        const n2b = currentNodes.find(n => n.id === l2.node2Id)!;

        if (l1.node1Id === l2.node1Id || l1.node1Id === l2.node2Id || 
            l1.node2Id === l2.node1Id || l1.node2Id === l2.node2Id) {
          continue;
        }

        if (doIntersect(n1a, n1b, n2a, n2b)) {
          intersections.add(l1.id);
          intersections.add(l2.id);
        }
      }
    }
    
    setIntersectingLinks(intersections);
    
    if (intersections.size === 0 && currentLinks.length > 0 && !isLevelComplete) {
      handleWin();
    }
  }, [isLevelComplete, level, moves]);

  const handleWin = () => {
    setIsLevelComplete(true);
    const earned = level * 10 + Math.max(0, 50 - moves);
    setCoins((prev: number) => prev + earned);
    
    setTimeout(() => {
      setView('complete');
    }, 1000);
  };

  const startLevel = (lvl: number) => {
    const levelData = PRE_GENERATED_LEVELS.find(l => l.id === lvl) || PRE_GENERATED_LEVELS[0];
    const newNodes = JSON.parse(JSON.stringify(levelData.nodes));
    const newLinks = JSON.parse(JSON.stringify(levelData.links));
    
    setNodes(newNodes);
    setLinks(newLinks);
    setLevel(lvl);
    setMoves(0);
    setIsLevelComplete(false);
    setView('game');
    checkIntersections(newNodes, newLinks);
  };

  const handleNodeDrag = (id: string, x: number, y: number) => {
    setNodes((prev: Node[]) => {
      const newNodes = prev.map((n: Node) => n.id === id ? { ...n, x, y } : n);
      checkIntersections(newNodes, links);
      return newNodes;
    });
    if (moves === 0) setMoves(1); // Start counting moves
  };

  return (
    <GestureHandlerRootView style={styles.root as any}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {view === 'home' && (
          <View style={styles.homeContainer}>
            <View style={[styles.logoContainer, { transform: [{ rotate: '12deg' }] }]}>
              <View style={styles.logoCircle} />
              <View style={[styles.logoCircle, { transform: [{ rotate: '45deg' }, { translateX: 15 }] }]} />
            </View>
            
            <Text style={styles.title}>NODE{'\n'}MASTER</Text>
            <Text style={styles.subtitle}>The most satisfying puzzle</Text>

            <View style={styles.coinBadge}>
              <Coins size={20} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.coinText}>{coins}</Text>
            </View>

            <TouchableOpacity 
              style={styles.mainButton}
              onPress={() => setView('levels')}
            >
              <LayoutGrid size={24} color="white" />
              <Text style={styles.mainButtonText}>SELECT LEVEL</Text>
            </TouchableOpacity>

            <View style={styles.secondaryButtonsRow}>
              <TouchableOpacity style={styles.iconButton}>
                <Settings size={24} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Info size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {view === 'levels' && (
          <View style={styles.levelsContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setView('home')} style={styles.backButton}>
                <ArrowLeft size={24} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>LEVELS</Text>
            </View>

            <ScrollView style={styles.levelsScroll} showsVerticalScrollIndicator={false}>
              {['Easy', 'Medium', 'Hard', 'Expert'].map((difficulty) => {
                const filteredLevels = PRE_GENERATED_LEVELS.filter(l => l.difficulty === difficulty);
                const diffColors: any = {
                  Easy: { bg: '#dcfce7', text: '#15803d' },
                  Medium: { bg: '#dbeafe', text: '#1d4ed8' },
                  Hard: { bg: '#ffedd5', text: '#c2410c' },
                  Expert: { bg: '#fee2e2', text: '#b91c1c' }
                };
                
                return (
                  <View key={difficulty} style={styles.difficultySection}>
                    <View style={styles.difficultyHeader}>
                      <View style={[styles.difficultyBadge, { backgroundColor: diffColors[difficulty].bg }]}>
                        <Text style={[styles.difficultyBadgeText, { color: diffColors[difficulty].text }]}>{difficulty}</Text>
                      </View>
                      <View style={styles.divider} />
                    </View>
                    <View style={styles.levelGrid}>
                      {filteredLevels.map((lvl) => (
                        <TouchableOpacity
                          key={lvl.id}
                          onPress={() => startLevel(lvl.id)}
                          style={[
                            styles.levelButton,
                            level === lvl.id && styles.levelButtonActive
                          ]}
                        >
                          <Text style={[
                            styles.levelButtonText,
                            level === lvl.id && styles.levelButtonTextActive
                          ]}>{lvl.id}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {view === 'game' && (
          <View style={styles.gameContainer}>
            <View style={styles.gameHeader}>
              <View style={styles.gameHeaderLeft}>
                <TouchableOpacity onPress={() => setView('home')} style={styles.gameIconButton}>
                  <ArrowLeft size={20} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setView('levels')} style={styles.gameIconButton}>
                  <LayoutGrid size={20} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => startLevel(level)} style={styles.gameIconButton}>
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
              <Svg style={StyleSheet.absoluteFill}>
                {links.map((link: Link) => {
                  const n1 = nodes.find((n: Node) => n.id === link.node1Id)!;
                  const n2 = nodes.find((n: Node) => n.id === link.node2Id)!;
                  const isIntersecting = intersectingLinks.has(link.id);
                  
                  return (
                    <Line
                      key={link.id}
                      x1={n1.x}
                      y1={n1.y}
                      x2={n2.x}
                      y2={n2.y}
                      stroke={isIntersecting ? '#EF4444' : '#10B981'}
                      strokeWidth={isIntersecting ? 6 : 4}
                      strokeLinecap="round"
                    />
                  );
                })}
              </Svg>

              {nodes.map((node: Node) => (
                <View key={node.id}>
                  <DraggableNode 
                    node={node} 
                    onDrag={handleNodeDrag} 
                  />
                </View>
              ))}
            </View>

            <View style={styles.gameFooter}>
              <Text style={styles.movesText}>Moves: {moves}</Text>
              <Text style={styles.hintText}>Drag nodes to untangle. Green links are clear!</Text>
            </View>
          </View>
        )}

        {view === 'complete' && (
          <View style={styles.completeContainer}>
            <View style={styles.trophyContainer}>
              <Trophy size={48} color="white" />
            </View>
            
            <Text style={styles.completeTitle}>WELL DONE!</Text>
            <Text style={styles.completeSubtitle}>Level {level} completed</Text>

            <View style={styles.rewardCard}>
              <View style={styles.rewardRow}>
                <Text style={styles.rewardLabel}>Base Reward</Text>
                <Text style={styles.rewardValue}>+{level * 10}</Text>
              </View>
              <View style={styles.rewardRow}>
                <Text style={styles.rewardLabel}>Move Bonus</Text>
                <Text style={styles.rewardValue}>+{Math.max(0, 50 - moves)}</Text>
              </View>
              <View style={styles.rewardDivider} />
              <View style={styles.rewardRow}>
                <Text style={styles.rewardTotalLabel}>Total Earned</Text>
                <View style={styles.rewardTotalValueContainer}>
                  <Coins size={20} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.rewardTotalValue}>{level * 10 + Math.max(0, 50 - moves)}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.nextButton}
              onPress={() => startLevel(level + 1)}
            >
              <Text style={styles.nextButtonText}>NEXT LEVEL</Text>
              <ChevronRight size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  homeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#3b82f6',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderWidth: 4,
    borderColor: 'white',
    borderRadius: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 42,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 48,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 48,
  },
  coinText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#b45309',
    marginLeft: 8,
  },
  mainButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 12,
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 16,
  },
  iconButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelsContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  levelsScroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  difficultySection: {
    marginBottom: 32,
  },
  difficultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  levelButton: {
    width: (SCREEN_WIDTH - 48 - 36) / 4,
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  levelButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  levelButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#94a3b8',
  },
  levelButtonTextActive: {
    color: 'white',
  },
  gameContainer: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  root: {
    flex: 1,
  },
  gameHeaderLeft: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  gameIconButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  levelIndicatorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  levelIndicatorValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  gameCoinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'flex-end',
  },
  gameCoinText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
    marginLeft: 6,
  },
  board: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  nodeContainer: {
    position: 'absolute',
    width: NODE_RADIUS * 2,
    height: NODE_RADIUS * 2,
    zIndex: 10,
  },
  nodeInner: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: NODE_RADIUS,
    borderWidth: 4,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  nodeDot: {
    width: 4,
    height: 4,
    backgroundColor: '#0f172a',
    borderRadius: 2,
  },
  gameFooter: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: 32,
  },
  movesText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  trophyContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#22c55e',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 32,
  },
  rewardCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  rewardDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  rewardTotalLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  rewardTotalValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardTotalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#d97706',
  },
  nextButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
    gap: 12,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },
});
