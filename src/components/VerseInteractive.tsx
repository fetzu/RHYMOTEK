import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import type { AnalysisGroup, AnalysisNodeData } from '../lib/types';
import { circleWords, clearAnnotations, type HighlightType } from '../lib/annotations';
import { drawConnections, clearConnections, repositionConnections } from '../lib/arrows';
import { layoutNodes, type ComputedPosition } from '../lib/mindmap';
import AnalysisNode from './AnalysisNode';

interface Props {
  analysisGroups: AnalysisGroup[];
  accentColor: string;
}

function getVerseRect(): DOMRect | undefined {
  const verseEl = document.querySelector('[data-verse]');
  return verseEl?.getBoundingClientRect();
}

function getAnchorPositions(
  nodes: AnalysisNodeData[],
  containerRect: DOMRect
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    const wordEl = document.getElementById(node.anchorWordId);
    if (wordEl) {
      const wordRect = wordEl.getBoundingClientRect();
      positions.set(node.anchorWordId, {
        x: wordRect.left - containerRect.left + wordRect.width / 2,
        y: wordRect.top - containerRect.top + wordRect.height / 2,
      });
    }
  });
  return positions;
}

export default function VerseInteractive({ analysisGroups, accentColor }: Props) {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<ComputedPosition[]>([]);
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const activeGroup = analysisGroups.find((g) => g.id === activeGroupId) ?? null;

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      clearAnnotations();
      clearConnections();
      setActiveGroupId(null);
      setNodePositions([]);
    }, 300);
  }, []);

  const activate = useCallback(
    async (group: AnalysisGroup) => {
      clearAnnotations();
      clearConnections();

      circleWords(group.highlightWordIds, accentColor, group.highlightType as HighlightType);
      await drawConnections(group.connections, accentColor);

      if (group.nodes.length > 0 && overlayRef.current) {
        const containerRect = overlayRef.current.getBoundingClientRect();
        const anchorPositions = getAnchorPositions(group.nodes, containerRect);
        const verseRect = getVerseRect();
        const positions = layoutNodes(anchorPositions, group.nodes, containerRect, verseRect);
        setNodePositions(positions);
      }

      setActiveGroupId(group.id);
      requestAnimationFrame(() => setVisible(true));
    },
    [accentColor]
  );

  // Handle word clicks via event delegation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const wordEl = target.closest('[data-word-id]') as HTMLElement | null;

      if (wordEl) {
        const wordId = wordEl.dataset.wordId!;
        const matchingGroup = analysisGroups.find((g) =>
          g.triggerWordIds.includes(wordId)
        );

        if (matchingGroup) {
          if (activeGroupId === matchingGroup.id) {
            dismiss();
          } else {
            activate(matchingGroup);
          }
          return;
        }
      }

      // Clicking outside trigger words and nodes dismisses
      if (activeGroupId && !target.closest('[data-node-id]')) {
        dismiss();
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeGroupId) {
        dismiss();
        return;
      }

      // Allow Enter/Space to activate words (keyboard accessibility)
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement;
        if (target.closest('[data-word-id]')) {
          e.preventDefault();
          target.click();
        }
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [analysisGroups, activeGroupId, dismiss, activate]);

  // Reposition on resize
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        repositionConnections();
        if (activeGroup && overlayRef.current) {
          const containerRect = overlayRef.current.getBoundingClientRect();
          const anchorPositions = getAnchorPositions(activeGroup.nodes, containerRect);
          const verseRect = getVerseRect();
          const positions = layoutNodes(anchorPositions, activeGroup.nodes, containerRect, verseRect);
          setNodePositions(positions);
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [activeGroup]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearAnnotations();
      clearConnections();
    };
  }, []);

  const getPosition = (nodeId: string): { x: number; y: number } => {
    const pos = nodePositions.find((p) => p.id === nodeId);
    return pos ?? { x: 0, y: 0 };
  };

  return (
    <>
      {/* Analysis label */}
      {activeGroup && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            zIndex: 40,
          }}
        >
          <span
            style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: accentColor,
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: 500,
              backdropFilter: 'blur(8px)',
            }}
          >
            {activeGroup.label}
          </span>
        </div>
      )}

      {/* Node overlay container */}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
        {activeGroup?.nodes.map((node: AnalysisNodeData) => {
          const pos = getPosition(node.id);
          return (
            <AnalysisNode
              key={node.id}
              node={node}
              x={pos.x}
              y={pos.y}
              visible={visible}
              accentColor={accentColor}
            />
          );
        })}
      </div>
    </>
  );
}
