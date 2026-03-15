/** @jsxImportSource react */
import React from 'react';
import type { AnalysisGroup, EditorAction } from './types';
import styles from './styles.module.css';

interface Props {
  groups: AnalysisGroup[];
  activeGroupId: string | null;
  dispatch: React.Dispatch<EditorAction>;
}

export default function GroupPanel({ groups, activeGroupId, dispatch }: Props) {
  return (
    <div className={styles.groupPanel}>
      <div className={styles.groupPanelHeader}>
        <span className={styles.groupPanelTitle}>Groups</span>
        <button
          className={`${styles.btn} ${styles.btnSmall} ${styles.btnPrimary}`}
          onClick={() => dispatch({ type: 'ADD_GROUP' })}
        >
          + New
        </button>
      </div>
      <div className={styles.groupList}>
        {groups.length === 0 && (
          <div style={{ padding: '20px 16px', fontSize: 12, color: '#555' }}>
            No analysis groups yet. Click "+ New" to create one.
          </div>
        )}
        {groups.map((group) => (
          <div
            key={group.id}
            className={`${styles.groupItem} ${group.id === activeGroupId ? styles.groupItemActive : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_GROUP', groupId: group.id })}
          >
            <span className={styles.groupItemLabel}>{group.label}</span>
            <span className={styles.groupItemCount}>
              {group.highlightWordIds.length}w
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
