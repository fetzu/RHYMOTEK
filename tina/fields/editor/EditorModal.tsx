/** @jsxImportSource react */
import React, { useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Line, AnalysisGroup } from './types';
import { useEditorState } from './useEditorState';
import VerseCanvas from './VerseCanvas';
import GroupPanel from './GroupPanel';
import GroupDetail from './GroupDetail';
import PreviewMode from './PreviewMode';
import styles from './styles.module.css';

interface Props {
  title: string;
  lines: Line[];
  initialGroups: AnalysisGroup[];
  onSave: (groups: AnalysisGroup[]) => void;
  onClose: () => void;
}

// Inline CSS - TinaCMS doesn't load config.prebuild.css into the admin page
const EDITOR_CSS = `
.styles_overlay{position:fixed;inset:0;z-index:9999;background:#0f0f0f;display:flex;flex-direction:column;font-family:'Inter',system-ui,sans-serif;color:#e0e0e0}
.styles_header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#1a1a1a;border-bottom:1px solid #2a2a2a;flex-shrink:0}
.styles_headerLeft{display:flex;align-items:center;gap:12px}
.styles_headerRight{display:flex;align-items:center;gap:8px}
.styles_title{font-size:14px;font-weight:600;color:#ccc}
.styles_body{display:flex;flex:1;overflow:hidden}
.styles_groupPanel{width:220px;background:#141414;border-right:1px solid #2a2a2a;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
.styles_groupPanelHeader{padding:12px 16px;border-bottom:1px solid #2a2a2a;display:flex;justify-content:space-between;align-items:center}
.styles_groupPanelTitle{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#888}
.styles_groupList{flex:1;overflow-y:auto}
.styles_groupItem{padding:10px 16px;cursor:pointer;border-left:3px solid transparent;transition:background 0.15s;display:flex;align-items:center;justify-content:space-between;font-size:13px}
.styles_groupItem:hover{background:#1e1e1e}
.styles_groupItemActive{background:#1e1e1e;border-left-color:#e94560}
.styles_groupItemLabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.styles_groupItemCount{font-size:11px;color:#666}
.styles_canvasArea{flex:1;display:flex;flex-direction:column;overflow:hidden}
.styles_canvas{flex:1;display:flex;align-items:center;justify-content:center;padding:40px;position:relative;overflow:auto}
.styles_verseLine{margin:4px 0;text-align:center}
.styles_verseContainer{font-family:'Space Grotesk',system-ui,sans-serif;font-size:clamp(1rem,2.5vw,1.5rem);line-height:1.8;font-weight:500;user-select:none;position:relative}
.styles_word{position:relative;padding:2px 4px;border-radius:3px;cursor:pointer;transition:background 0.15s,outline 0.15s;display:inline}
.styles_word:hover{background:rgba(255,255,255,0.1)}
.styles_wordHighlighted{background:rgba(233,69,96,0.3)}
.styles_wordTrigger{outline:2px solid rgba(233,69,96,0.8);outline-offset:2px}
.styles_wordConnectFrom{background:rgba(0,180,216,0.4);outline:2px solid #00b4d8;outline-offset:2px}
.styles_modeBar{display:flex;align-items:center;gap:4px;padding:8px 20px;background:#1a1a1a;border-top:1px solid #2a2a2a;flex-shrink:0}
.styles_modeBtn{padding:6px 14px;border-radius:6px;border:1px solid #333;background:transparent;color:#aaa;font-size:12px;cursor:pointer;transition:all 0.15s}
.styles_modeBtn:hover{background:#222;color:#ddd}
.styles_modeBtnActive{background:#e94560;border-color:#e94560;color:white}
.styles_modeHint{font-size:11px;color:#666;margin-left:12px}
.styles_detailPanel{width:300px;background:#141414;border-left:1px solid #2a2a2a;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
.styles_detailSection{padding:16px;border-bottom:1px solid #2a2a2a}
.styles_detailSectionTitle{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-bottom:8px}
.styles_input{width:100%;padding:6px 10px;background:#222;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:13px;outline:none;box-sizing:border-box}
.styles_input:focus{border-color:#e94560}
.styles_textarea{width:100%;padding:6px 10px;background:#222;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:13px;outline:none;box-sizing:border-box;min-height:80px;resize:vertical;font-family:inherit}
.styles_select{width:100%;padding:6px 10px;background:#222;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:13px;outline:none;box-sizing:border-box;cursor:pointer}
.styles_highlightTypeRow{display:flex;gap:6px}
.styles_highlightTypeBtn{flex:1;padding:5px 8px;border-radius:4px;border:1px solid #333;background:transparent;color:#aaa;font-size:11px;cursor:pointer;text-align:center;transition:all 0.15s}
.styles_highlightTypeBtn:hover{background:#222}
.styles_highlightTypeBtnActive{background:#e94560;border-color:#e94560;color:white}
.styles_connectionItem{display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-size:12px}
.styles_connectionArrow{color:#888}
.styles_nodeItem{padding:8px;margin-bottom:6px;background:#1e1e1e;border-radius:6px;cursor:pointer;transition:background 0.15s}
.styles_nodeItem:hover{background:#252525}
.styles_nodeItemActive{outline:1px solid #e94560}
.styles_nodeItemHeader{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px}
.styles_nodeItemType{font-size:10px;text-transform:uppercase;letter-spacing:0.05em;padding:1px 6px;border-radius:3px;background:#333;color:#aaa}
.styles_nodeItemPreview{font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.styles_btn{padding:6px 14px;border-radius:6px;border:1px solid #333;background:transparent;color:#ccc;font-size:12px;cursor:pointer;transition:all 0.15s}
.styles_btn:hover{background:#222}
.styles_btnPrimary{background:#e94560;border-color:#e94560;color:white}
.styles_btnPrimary:hover{background:#d63a54}
.styles_btnDanger{color:#e94560;border-color:transparent}
.styles_btnDanger:hover{background:rgba(233,69,96,0.15)}
.styles_btnSmall{padding:3px 8px;font-size:11px}
.styles_svgOverlay{position:absolute;inset:0;pointer-events:none;z-index:1}
.styles_svgOverlay line{stroke:#e94560;stroke-width:2;stroke-dasharray:6 4}
.styles_svgOverlay marker path{fill:#e94560}
.styles_nodeCard{position:absolute;max-width:200px;padding:8px 12px;background:rgba(30,30,30,0.95);border:1px solid #333;border-radius:8px;font-size:12px;color:#ccc;cursor:grab;z-index:2;transition:box-shadow 0.15s}
.styles_nodeCard:hover{box-shadow:0 0 0 1px #e94560}
.styles_nodeCardDragging{cursor:grabbing;box-shadow:0 4px 20px rgba(0,0,0,0.5)}
.styles_nodeConnectorLine{stroke:#555;stroke-width:1;stroke-dasharray:3 3}
.styles_emptyState{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#555;font-size:14px;text-align:center;gap:12px}
.styles_dirtyDot{width:8px;height:8px;border-radius:50%;background:#f0a030;display:inline-block}
.styles_previewBadge{padding:4px 10px;border-radius:4px;background:#0d6efd;color:white;font-size:11px;font-weight:600}
`;

const MODE_HINTS: Record<string, string> = {
  select: 'Click words to highlight. Shift+click to set as trigger.',
  connect: 'Click a word, then click another to draw a connection arrow.',
  place: 'Click a word to place a new analysis node anchored to it.',
};

export default function EditorModal({ title, lines, initialGroups, onSave, onClose }: Props) {
  const { state, dispatch, activeGroup, canUndo, canRedo } = useEditorState(initialGroups);

  // Inject CSS into the document (TinaCMS doesn't auto-load config.prebuild.css)
  useEffect(() => {
    const STYLE_ID = 'annotation-editor-styles';
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = EDITOR_CSS;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        if (state.editingNodeId) {
          dispatch({ type: 'SET_EDITING_NODE', nodeId: null });
        } else if (state.activeGroupId) {
          dispatch({ type: 'SET_ACTIVE_GROUP', groupId: null });
        } else {
          onClose();
        }
      }

      // Undo: Ctrl+Z / Cmd+Z
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }

      // Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.editingNodeId) {
        e.preventDefault();
        dispatch({ type: 'DELETE_NODE', nodeId: state.editingNodeId });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.editingNodeId, state.activeGroupId, onClose, dispatch]);

  // Handle word clicks based on current mode
  const handleWordClick = useCallback(
    (wordId: string, shiftKey: boolean) => {
      if (!state.activeGroupId) {
        // No active group — prompt to create one
        dispatch({ type: 'ADD_GROUP' });
        return;
      }

      switch (state.mode) {
        case 'select':
          if (shiftKey) {
            dispatch({ type: 'TOGGLE_TRIGGER_WORD', wordId });
          } else {
            dispatch({ type: 'TOGGLE_HIGHLIGHT_WORD', wordId });
          }
          break;

        case 'connect':
          if (!state.connectFrom) {
            dispatch({ type: 'SET_CONNECT_FROM', wordId });
          } else if (state.connectFrom !== wordId) {
            dispatch({ type: 'ADD_CONNECTION', from: state.connectFrom, to: wordId });
          } else {
            dispatch({ type: 'SET_CONNECT_FROM', wordId: null });
          }
          break;

        case 'place':
          dispatch({
            type: 'ADD_NODE',
            anchorWordId: wordId,
            position: { angle: 0, distance: 200 },
          });
          break;
      }
    },
    [state.mode, state.connectFrom, state.activeGroupId, dispatch]
  );

  // Node drag: convert pixel position to polar coordinates relative to anchor word
  const nodeDragPositions = React.useRef<Map<string, { x: number; y: number }>>(new Map());

  const handleNodeDrag = useCallback((nodeId: string, x: number, y: number) => {
    nodeDragPositions.current.set(nodeId, { x, y });
    // Force re-render to update position visually
    // (The VerseCanvas will read from nodePositions which we update on drag end)
  }, []);

  const handleNodeDragEnd = useCallback(
    (nodeId: string) => {
      const pos = nodeDragPositions.current.get(nodeId);
      if (!pos || !activeGroup) return;

      const node = activeGroup.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Find anchor word position to compute polar coordinates
      const anchorEl = document.querySelector(`[data-word-id="${node.anchorWordId}"]`);
      const canvasEl = document.querySelector(`.${styles.canvas}`);
      if (!anchorEl || !canvasEl) return;

      const canvasRect = canvasEl.getBoundingClientRect();
      const anchorRect = anchorEl.getBoundingClientRect();
      const anchorX = anchorRect.left - canvasRect.left + anchorRect.width / 2;
      const anchorY = anchorRect.top - canvasRect.top + anchorRect.height / 2;

      // Card center (approximate)
      const cardCenterX = pos.x + 100;
      const cardCenterY = pos.y + 20;

      const dx = cardCenterX - anchorX;
      const dy = cardCenterY - anchorY;
      const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
      let angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      if (angle < 0) angle += 360;

      dispatch({
        type: 'UPDATE_NODE',
        nodeId,
        updates: { position: { angle, distance: Math.min(distance, 300) } },
      });

      nodeDragPositions.current.delete(nodeId);
    },
    [activeGroup, dispatch]
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'SET_EDITING_NODE', nodeId });
    },
    [dispatch]
  );

  const handleSave = useCallback(() => {
    onSave(state.groups);
    dispatch({ type: 'MARK_CLEAN' });
  }, [state.groups, onSave, dispatch]);

  const modal = (
    <div className={styles.overlay}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.btn} onClick={onClose}>
            ← Back
          </button>
          <span className={styles.title}>{title}</span>
          {state.dirty && <span className={styles.dirtyDot} title="Unsaved changes" />}
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.btn}
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={!canUndo ? { opacity: 0.3, cursor: 'default' } : undefined}
          >
            ↩
          </button>
          <button
            className={styles.btn}
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            style={!canRedo ? { opacity: 0.3, cursor: 'default' } : undefined}
          >
            ↪
          </button>
          <button
            className={styles.btn}
            onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
            style={state.previewActive ? { background: '#0d6efd', borderColor: '#0d6efd', color: 'white' } : undefined}
          >
            {state.previewActive ? 'Exit Preview' : 'Preview'}
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
          >
            Save & Close
          </button>
          <button className={styles.btn} onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      {/* Body: 3-column layout */}
      <div className={styles.body} style={{ position: 'relative' }}>
        {/* Preview mode overlay */}
        {state.previewActive && (
          <PreviewMode
            lines={lines}
            groups={state.groups}
            onClose={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
          />
        )}

        {/* Left: Group list */}
        <GroupPanel
          groups={state.groups}
          activeGroupId={state.activeGroupId}
          dispatch={dispatch}
        />

        {/* Center: Verse canvas */}
        <div className={styles.canvasArea}>
          {lines.length === 0 ? (
            <div className={styles.emptyState}>
              <div>No verse text found.</div>
              <div style={{ fontSize: 12 }}>
                Enter verse text in the form first, then open the visual editor.
              </div>
            </div>
          ) : (
            <VerseCanvas
              lines={lines}
              activeGroup={activeGroup}
              mode={state.mode}
              connectFrom={state.connectFrom}
              groups={state.groups}
              nodes={activeGroup?.nodes ?? []}
              editingNodeId={state.editingNodeId}
              onWordClick={handleWordClick}
              onNodeDrag={handleNodeDrag}
              onNodeDragEnd={handleNodeDragEnd}
              onNodeClick={handleNodeClick}
            />
          )}

          {/* Mode bar */}
          <div className={styles.modeBar}>
            {(['select', 'connect', 'place'] as const).map((mode) => (
              <button
                key={mode}
                className={`${styles.modeBtn} ${state.mode === mode ? styles.modeBtnActive : ''}`}
                onClick={() => dispatch({ type: 'SET_MODE', mode })}
              >
                {mode === 'select' ? 'Select Words' : mode === 'connect' ? 'Draw Connections' : 'Place Nodes'}
              </button>
            ))}
            <span className={styles.modeHint}>{MODE_HINTS[state.mode]}</span>
          </div>
        </div>

        {/* Right: Group detail (only when a group is active) */}
        {activeGroup ? (
          <GroupDetail
            group={activeGroup}
            editingNodeId={state.editingNodeId}
            dispatch={dispatch}
          />
        ) : (
          <div className={styles.detailPanel}>
            <div className={styles.emptyState}>
              <div>Select or create a group</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
