/** @jsxImportSource react */
import React from 'react';
import type { AnalysisGroup, AnalysisNodeData, EditorAction } from './types';
import styles from './styles.module.css';

interface Props {
  group: AnalysisGroup;
  editingNodeId: string | null;
  dispatch: React.Dispatch<EditorAction>;
}

const HIGHLIGHT_TYPES = ['circle', 'underline', 'box', 'highlight'] as const;

export default function GroupDetail({ group, editingNodeId, dispatch }: Props) {
  const editingNode = group.nodes.find((n) => n.id === editingNodeId) ?? null;

  return (
    <div className={styles.detailPanel}>
      {/* Label */}
      <div className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>Label</div>
        <input
          className={styles.input}
          value={group.label}
          onChange={(e) =>
            dispatch({ type: 'UPDATE_GROUP_LABEL', groupId: group.id, label: e.target.value })
          }
        />
      </div>

      {/* Highlight Type */}
      <div className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>Highlight Style</div>
        <div className={styles.highlightTypeRow}>
          {HIGHLIGHT_TYPES.map((ht) => (
            <button
              key={ht}
              className={`${styles.highlightTypeBtn} ${group.highlightType === ht ? styles.highlightTypeBtnActive : ''}`}
              onClick={() =>
                dispatch({ type: 'UPDATE_GROUP_HIGHLIGHT_TYPE', groupId: group.id, highlightType: ht })
              }
            >
              {ht}
            </button>
          ))}
        </div>
      </div>

      {/* Trigger Words */}
      <div className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>
          Trigger Words ({group.triggerWordIds.length})
        </div>
        {group.triggerWordIds.length === 0 ? (
          <div style={{ fontSize: 11, color: '#555' }}>Shift+click words to add triggers</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {group.triggerWordIds.map((wid) => (
              <span
                key={wid}
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  background: '#2a2a2a',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
                onClick={() => dispatch({ type: 'TOGGLE_TRIGGER_WORD', wordId: wid })}
                title="Click to remove"
              >
                {wid}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Highlight Words */}
      <div className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>
          Highlighted Words ({group.highlightWordIds.length})
        </div>
        {group.highlightWordIds.length === 0 ? (
          <div style={{ fontSize: 11, color: '#555' }}>Click words to highlight them</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {group.highlightWordIds.map((wid) => (
              <span
                key={wid}
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  background: 'rgba(233, 69, 96, 0.2)',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
                onClick={() => dispatch({ type: 'TOGGLE_HIGHLIGHT_WORD', wordId: wid })}
                title="Click to remove"
              >
                {wid}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Connections */}
      <div className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>
          Connections ({group.connections.length})
        </div>
        {group.connections.map((conn, i) => (
          <div key={i} className={styles.connectionItem}>
            <span>
              <span style={{ color: '#e94560' }}>{conn.from}</span>
              <span className={styles.connectionArrow}> → </span>
              <span style={{ color: '#e94560' }}>{conn.to}</span>
              {conn.label && <span style={{ color: '#666', marginLeft: 4 }}>({conn.label})</span>}
            </span>
            <button
              className={`${styles.btn} ${styles.btnSmall} ${styles.btnDanger}`}
              onClick={() => dispatch({ type: 'DELETE_CONNECTION', index: i })}
            >
              ×
            </button>
          </div>
        ))}
        <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
          Use "Draw Connections" mode to add
        </div>
      </div>

      {/* Nodes */}
      <div className={styles.detailSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className={styles.detailSectionTitle} style={{ marginBottom: 0 }}>
            Nodes ({group.nodes.length})
          </div>
        </div>
        {group.nodes.map((node) => (
          <div
            key={node.id}
            className={`${styles.nodeItem} ${editingNodeId === node.id ? styles.nodeItemActive : ''}`}
            onClick={() => dispatch({ type: 'SET_EDITING_NODE', nodeId: node.id })}
          >
            <div className={styles.nodeItemHeader}>
              <span className={styles.nodeItemType}>{node.type}</span>
              <button
                className={`${styles.btn} ${styles.btnSmall} ${styles.btnDanger}`}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'DELETE_NODE', nodeId: node.id });
                }}
              >
                ×
              </button>
            </div>
            <div className={styles.nodeItemPreview}>
              {node.content || node.src || node.url || '(empty)'}
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
          Use "Place Nodes" mode to add
        </div>
      </div>

      {/* Node Editor (inline) */}
      {editingNode && (
        <div className={styles.detailSection} style={{ background: '#1a1a1a' }}>
          <div className={styles.detailSectionTitle}>Edit Node: {editingNode.id}</div>

          <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Type</label>
          <select
            className={styles.select}
            value={editingNode.type}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_NODE',
                nodeId: editingNode.id,
                updates: { type: e.target.value as AnalysisNodeData['type'] },
              })
            }
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="link">Link</option>
            <option value="video">Video</option>
          </select>

          {(editingNode.type === 'text' || editingNode.type === 'video') && (
            <>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginTop: 8, marginBottom: 4 }}>
                {editingNode.type === 'text' ? 'Content' : 'Embed URL'}
              </label>
              <textarea
                className={styles.textarea}
                value={editingNode.content || ''}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_NODE',
                    nodeId: editingNode.id,
                    updates: { content: e.target.value },
                  })
                }
              />
            </>
          )}

          {editingNode.type === 'image' && (
            <>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginTop: 8, marginBottom: 4 }}>Image URL</label>
              <input
                className={styles.input}
                value={editingNode.src || ''}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_NODE',
                    nodeId: editingNode.id,
                    updates: { src: e.target.value },
                  })
                }
              />
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginTop: 8, marginBottom: 4 }}>Alt Text</label>
              <input
                className={styles.input}
                value={editingNode.alt || ''}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_NODE',
                    nodeId: editingNode.id,
                    updates: { alt: e.target.value },
                  })
                }
              />
            </>
          )}

          {editingNode.type === 'link' && (
            <>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginTop: 8, marginBottom: 4 }}>Label</label>
              <input
                className={styles.input}
                value={editingNode.content || ''}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_NODE',
                    nodeId: editingNode.id,
                    updates: { content: e.target.value },
                  })
                }
              />
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginTop: 8, marginBottom: 4 }}>URL</label>
              <input
                className={styles.input}
                value={editingNode.url || ''}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_NODE',
                    nodeId: editingNode.id,
                    updates: { url: e.target.value },
                  })
                }
              />
            </>
          )}

          <label style={{ fontSize: 11, color: '#888', display: 'block', marginTop: 8, marginBottom: 4 }}>
            Anchor Word: {editingNode.anchorWordId}
          </label>
          <label style={{ fontSize: 11, color: '#888', display: 'block', marginTop: 8, marginBottom: 4 }}>
            Position: {editingNode.position.angle}° / {editingNode.position.distance}px
          </label>
        </div>
      )}

      {/* Delete Group */}
      <div className={styles.detailSection}>
        <button
          className={`${styles.btn} ${styles.btnDanger}`}
          style={{ width: '100%' }}
          onClick={() => {
            if (confirm('Delete this analysis group?')) {
              dispatch({ type: 'DELETE_GROUP', groupId: group.id });
            }
          }}
        >
          Delete Group
        </button>
      </div>
    </div>
  );
}
