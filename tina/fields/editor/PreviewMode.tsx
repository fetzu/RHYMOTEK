/** @jsxImportSource react */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { Line, AnalysisGroup } from './types';

interface Props {
  lines: Line[];
  groups: AnalysisGroup[];
  accentColor?: string;
  onClose: () => void;
}

// Minimal inline styles for preview (no CSS module dependency)
const previewStyles = {
  container: {
    position: 'absolute' as const,
    inset: 0,
    background: '#0a0a0a',
    display: 'flex',
    flexDirection: 'column' as const,
    zIndex: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 20px',
    background: '#0d6efd',
    color: 'white',
    fontSize: 12,
    fontWeight: 600 as const,
    flexShrink: 0,
  },
  canvas: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    position: 'relative' as const,
    overflow: 'auto',
  },
  verseContainer: {
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
    lineHeight: 1.8,
    fontWeight: 500,
    textAlign: 'center' as const,
    position: 'relative' as const,
    color: '#e0e0e0',
  },
  verseLine: { margin: '4px 0' },
  word: {
    display: 'inline',
    padding: '2px 4px',
    borderRadius: 3,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  hint: {
    position: 'absolute' as const,
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 11,
    color: '#666',
    background: '#1a1a1a',
    padding: '4px 12px',
    borderRadius: 4,
  },
  nodeCard: {
    position: 'absolute' as const,
    maxWidth: 280,
    padding: '10px 14px',
    background: 'rgba(20, 20, 20, 0.95)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #333',
    borderRadius: 10,
    fontSize: 13,
    color: '#ccc',
    lineHeight: 1.5,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    zIndex: 5,
  },
  btn: {
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: 'white',
    fontSize: 11,
    cursor: 'pointer',
  },
};

export default function PreviewMode({ lines, groups, accentColor = '#e94560', onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const annotationsRef = useRef<any[]>([]);
  const linesRef = useRef<any[]>([]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  // Cleanup annotations and lines
  const clearAll = useCallback(() => {
    annotationsRef.current.forEach((a) => {
      try { a.remove(); } catch {}
    });
    annotationsRef.current = [];

    linesRef.current.forEach((l) => {
      try { l.remove(); } catch {}
    });
    linesRef.current = [];

    setNodePositions(new Map());
  }, []);

  // Activate a group: apply annotations, draw arrows, position nodes
  const activate = useCallback(async (group: AnalysisGroup) => {
    clearAll();
    setActiveGroupId(group.id);

    // Apply RoughNotation
    try {
      const { annotate } = await import('rough-notation');
      const typeMap: Record<string, 'circle' | 'underline' | 'box' | 'highlight'> = {
        circle: 'circle', underline: 'underline', box: 'box', highlight: 'highlight',
      };

      group.highlightWordIds.forEach((wordId, i) => {
        const el = document.getElementById(wordId);
        if (!el) return;
        const annotation = annotate(el, {
          type: typeMap[group.highlightType] || 'circle',
          color: accentColor,
          padding: group.highlightType === 'circle' ? 8 : 4,
          animationDuration: 400,
          strokeWidth: 2,
          iterations: 2,
        });
        setTimeout(() => annotation.show(), i * 100);
        annotationsRef.current.push(annotation);
      });
    } catch (e) {
      console.warn('RoughNotation failed:', e);
    }

    // Draw LeaderLine arrows
    try {
      const mod = await import('leader-line-new');
      const LL = (mod.default || mod) as any;

      for (const conn of group.connections) {
        const fromEl = document.getElementById(conn.from);
        const toEl = document.getElementById(conn.to);
        if (!fromEl || !toEl) continue;
        const line = new LL(fromEl, toEl, {
          color: accentColor,
          size: 2,
          path: 'arc',
          startSocket: 'auto',
          endSocket: 'auto',
          startPlug: 'behind',
          endPlug: 'arrow1',
          dash: { animation: true },
        });
        linesRef.current.push(line);
      }
    } catch (e) {
      console.warn('LeaderLine failed:', e);
    }

    // Position nodes
    if (group.nodes.length > 0 && containerRef.current) {
      const canvasRect = containerRef.current.getBoundingClientRect();
      const positions = new Map<string, { x: number; y: number }>();

      group.nodes.forEach((node) => {
        const anchorEl = document.getElementById(node.anchorWordId);
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

      setNodePositions(positions);
    }
  }, [accentColor, clearAll]);

  // Dismiss active group
  const dismiss = useCallback(() => {
    clearAll();
    setActiveGroupId(null);
  }, [clearAll]);

  // Handle word clicks — same logic as the public site
  const handleWordClick = useCallback(
    (wordId: string) => {
      const matchingGroup = groups.find((g) => g.triggerWordIds.includes(wordId));
      if (matchingGroup) {
        if (activeGroupId === matchingGroup.id) {
          dismiss();
        } else {
          activate(matchingGroup);
        }
      }
    },
    [groups, activeGroupId, dismiss, activate]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAll();
  }, [clearAll]);

  return (
    <div style={previewStyles.container}>
      <div style={previewStyles.header}>
        <span>PREVIEW MODE — Click trigger words to test annotations</span>
        <button style={previewStyles.btn} onClick={onClose}>
          Exit Preview
        </button>
      </div>

      <div style={previewStyles.canvas} ref={containerRef}>
        <div style={previewStyles.verseContainer}>
          {lines.map((line) => (
            <div key={line.lineIndex} style={previewStyles.verseLine}>
              {line.words.map((word, i) => (
                <React.Fragment key={word.wordId}>
                  {i > 0 && ' '}
                  <span
                    id={word.wordId}
                    style={previewStyles.word}
                    onClick={() => handleWordClick(word.wordId)}
                  >
                    {word.text}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>

        {/* Analysis node cards */}
        {activeGroup?.nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          return (
            <div
              key={node.id}
              data-node-id={node.id}
              style={{
                ...previewStyles.nodeCard,
                left: pos.x,
                top: pos.y,
                opacity: 1,
                transform: 'scale(1)',
                borderColor: accentColor,
              }}
            >
              {node.type === 'text' && <div>{node.content}</div>}
              {node.type === 'image' && node.src && (
                <img src={node.src} alt={node.alt || ''} style={{ maxWidth: '100%', borderRadius: 6 }} />
              )}
              {node.type === 'link' && (
                <a href={node.url} style={{ color: accentColor, textDecoration: 'underline' }}>
                  {node.content || node.url}
                </a>
              )}
              {node.type === 'video' && node.content && (
                <div style={{ fontSize: 11, color: '#888' }}>Video: {node.content}</div>
              )}
            </div>
          );
        })}

        {!activeGroupId && (
          <div style={previewStyles.hint}>
            Click any trigger word to see annotations
          </div>
        )}
      </div>
    </div>
  );
}
