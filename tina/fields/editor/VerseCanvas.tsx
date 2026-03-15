/** @jsxImportSource react */
import React, { useRef, useCallback, useMemo } from 'react';
import type { Line, AnalysisGroup, EditorMode, AnalysisNodeData } from './types';
import styles from './styles.module.css';

interface Props {
  lines: Line[];
  activeGroup: AnalysisGroup | null;
  mode: EditorMode;
  connectFrom: string | null;
  groups: AnalysisGroup[];
  nodes: AnalysisNodeData[];
  editingNodeId: string | null;
  onWordClick: (wordId: string, shiftKey: boolean) => void;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
  onNodeDragEnd: (nodeId: string) => void;
  onNodeClick: (nodeId: string) => void;
}

export default function VerseCanvas({
  lines,
  activeGroup,
  mode,
  connectFrom,
  groups,
  nodes,
  editingNodeId,
  onWordClick,
  onNodeDrag,
  onNodeDragEnd,
  onNodeClick,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const verseRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Build set of highlighted/trigger word IDs for the active group
  const highlightedWords = useMemo(
    () => new Set(activeGroup?.highlightWordIds ?? []),
    [activeGroup]
  );
  const triggerWords = useMemo(
    () => new Set(activeGroup?.triggerWordIds ?? []),
    [activeGroup]
  );

  // Build a map of wordId -> groupIds for showing indicators on words belonging to any group
  const wordGroupMap = useMemo(() => {
    const map = new Map<string, string[]>();
    groups.forEach((g) => {
      [...g.highlightWordIds, ...g.triggerWordIds].forEach((wid) => {
        const existing = map.get(wid) || [];
        if (!existing.includes(g.id)) {
          map.set(wid, [...existing, g.id]);
        }
      });
    });
    return map;
  }, [groups]);

  const getWordClassName = useCallback(
    (wordId: string) => {
      const classes = [styles.word];
      if (highlightedWords.has(wordId)) classes.push(styles.wordHighlighted);
      if (triggerWords.has(wordId)) classes.push(styles.wordTrigger);
      if (connectFrom === wordId) classes.push(styles.wordConnectFrom);
      return classes.join(' ');
    },
    [highlightedWords, triggerWords, connectFrom]
  );

  const handleWordClick = useCallback(
    (e: React.MouseEvent, wordId: string) => {
      e.stopPropagation();
      onWordClick(wordId, e.shiftKey);
    },
    [onWordClick]
  );

  // Node dragging
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      dragRef.current = {
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current || !canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const x = ev.clientX - canvasRect.left - dragRef.current.offsetX;
        const y = ev.clientY - canvasRect.top - dragRef.current.offsetY;
        onNodeDrag(dragRef.current.nodeId, x, y);
      };

      const handleMouseUp = () => {
        if (dragRef.current) {
          onNodeDragEnd(dragRef.current.nodeId);
          dragRef.current = null;
        }
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [onNodeDrag, onNodeDragEnd]
  );

  // Compute node pixel positions from polar coordinates
  const nodePositions = useMemo(() => {
    if (!activeGroup || !verseRef.current || !canvasRef.current) return new Map<string, { x: number; y: number }>();
    const positions = new Map<string, { x: number; y: number }>();
    const canvasRect = canvasRef.current.getBoundingClientRect();

    activeGroup.nodes.forEach((node) => {
      const anchorEl = verseRef.current?.querySelector(`[data-word-id="${node.anchorWordId}"]`);
      if (!anchorEl) return;
      const anchorRect = anchorEl.getBoundingClientRect();
      const anchorX = anchorRect.left - canvasRect.left + anchorRect.width / 2;
      const anchorY = anchorRect.top - canvasRect.top + anchorRect.height / 2;
      const rad = (node.position.angle * Math.PI) / 180;
      const dist = Math.min(node.position.distance, 250);
      positions.set(node.id, {
        x: anchorX + Math.cos(rad) * dist,
        y: anchorY + Math.sin(rad) * dist,
      });
    });
    return positions;
  }, [activeGroup, lines]);

  // Connection SVG lines
  const connectionLines = useMemo(() => {
    if (!activeGroup || !verseRef.current || !canvasRef.current) return [];
    const canvasRect = canvasRef.current.getBoundingClientRect();
    return activeGroup.connections
      .map((conn) => {
        const fromEl = verseRef.current?.querySelector(`[data-word-id="${conn.from}"]`);
        const toEl = verseRef.current?.querySelector(`[data-word-id="${conn.to}"]`);
        if (!fromEl || !toEl) return null;
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        return {
          x1: fromRect.left - canvasRect.left + fromRect.width / 2,
          y1: fromRect.top - canvasRect.top + fromRect.height / 2,
          x2: toRect.left - canvasRect.left + toRect.width / 2,
          y2: toRect.top - canvasRect.top + toRect.height / 2,
          label: conn.label,
        };
      })
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number; label?: string }[];
  }, [activeGroup, lines]);

  return (
    <div className={styles.canvas} ref={canvasRef}>
      {/* SVG overlay for connections */}
      <svg className={styles.svgOverlay}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" />
          </marker>
        </defs>
        {connectionLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            markerEnd="url(#arrowhead)"
          />
        ))}
        {/* Node connector lines */}
        {activeGroup?.nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          const anchorEl = verseRef.current?.querySelector(`[data-word-id="${node.anchorWordId}"]`);
          if (!pos || !anchorEl || !canvasRef.current) return null;
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const anchorRect = anchorEl.getBoundingClientRect();
          const ax = anchorRect.left - canvasRect.left + anchorRect.width / 2;
          const ay = anchorRect.top - canvasRect.top + anchorRect.height / 2;
          return (
            <line
              key={`conn-${node.id}`}
              x1={ax}
              y1={ay}
              x2={pos.x + 100}
              y2={pos.y + 20}
              className={styles.nodeConnectorLine}
            />
          );
        })}
      </svg>

      {/* Verse text */}
      <div className={styles.verseContainer} ref={verseRef}>
        {lines.map((line) => (
          <div key={line.lineIndex} className={styles.verseLine}>
            {line.words.map((word, i) => (
              <React.Fragment key={word.wordId}>
                {i > 0 && ' '}
                <span
                  className={getWordClassName(word.wordId)}
                  data-word-id={word.wordId}
                  onClick={(e) => handleWordClick(e, word.wordId)}
                >
                  {word.text}
                  {wordGroupMap.has(word.wordId) && !highlightedWords.has(word.wordId) && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#666',
                      }}
                    />
                  )}
                </span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>

      {/* Node cards */}
      {activeGroup?.nodes.map((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return null;
        return (
          <div
            key={node.id}
            className={`${styles.nodeCard} ${editingNodeId === node.id ? styles.nodeItemActive : ''}`}
            style={{ left: pos.x, top: pos.y }}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick(node.id);
            }}
          >
            <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>
              {node.type.toUpperCase()}
            </div>
            <div style={{ fontSize: 11, color: '#ccc' }}>
              {node.content?.slice(0, 50) || node.src || node.url || '(empty)'}
              {(node.content?.length ?? 0) > 50 ? '...' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
