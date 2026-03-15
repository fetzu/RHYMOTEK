import { useReducer } from 'react';
import type { EditorState, EditorAction, AnalysisGroup } from './types';

let groupCounter = 0;
let nodeCounter = 0;

function generateGroupId(): string {
  return `ag-${Date.now()}-${++groupCounter}`;
}

function generateNodeId(): string {
  return `n-${Date.now()}-${++nodeCounter}`;
}

function updateGroup(
  groups: AnalysisGroup[],
  groupId: string,
  updater: (group: AnalysisGroup) => AnalysisGroup
): AnalysisGroup[] {
  return groups.map((g) => (g.id === groupId ? updater(g) : g));
}

// Actions that modify groups and should be undoable
const UNDOABLE_ACTIONS = new Set([
  'ADD_GROUP',
  'DELETE_GROUP',
  'UPDATE_GROUP_LABEL',
  'UPDATE_GROUP_HIGHLIGHT_TYPE',
  'TOGGLE_HIGHLIGHT_WORD',
  'TOGGLE_TRIGGER_WORD',
  'ADD_CONNECTION',
  'DELETE_CONNECTION',
  'ADD_NODE',
  'UPDATE_NODE',
  'DELETE_NODE',
]);

const MAX_HISTORY = 50;

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_GROUPS':
      return { ...state, groups: action.groups, dirty: false };

    case 'SET_MODE':
      return { ...state, mode: action.mode, connectFrom: null };

    case 'SET_ACTIVE_GROUP':
      return { ...state, activeGroupId: action.groupId, connectFrom: null, editingNodeId: null };

    case 'ADD_GROUP': {
      const newGroup: AnalysisGroup = {
        id: generateGroupId(),
        label: 'New Analysis Group',
        triggerWordIds: [],
        highlightWordIds: [],
        highlightType: 'circle',
        connections: [],
        nodes: [],
      };
      return {
        ...state,
        groups: [...state.groups, newGroup],
        activeGroupId: newGroup.id,
        dirty: true,
      };
    }

    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter((g) => g.id !== action.groupId),
        activeGroupId: state.activeGroupId === action.groupId ? null : state.activeGroupId,
        dirty: true,
      };

    case 'UPDATE_GROUP_LABEL':
      return {
        ...state,
        groups: updateGroup(state.groups, action.groupId, (g) => ({ ...g, label: action.label })),
        dirty: true,
      };

    case 'UPDATE_GROUP_HIGHLIGHT_TYPE':
      return {
        ...state,
        groups: updateGroup(state.groups, action.groupId, (g) => ({
          ...g,
          highlightType: action.highlightType,
        })),
        dirty: true,
      };

    case 'TOGGLE_HIGHLIGHT_WORD': {
      if (!state.activeGroupId) return state;
      return {
        ...state,
        groups: updateGroup(state.groups, state.activeGroupId, (g) => ({
          ...g,
          highlightWordIds: g.highlightWordIds.includes(action.wordId)
            ? g.highlightWordIds.filter((id) => id !== action.wordId)
            : [...g.highlightWordIds, action.wordId],
        })),
        dirty: true,
      };
    }

    case 'TOGGLE_TRIGGER_WORD': {
      if (!state.activeGroupId) return state;
      return {
        ...state,
        groups: updateGroup(state.groups, state.activeGroupId, (g) => ({
          ...g,
          triggerWordIds: g.triggerWordIds.includes(action.wordId)
            ? g.triggerWordIds.filter((id) => id !== action.wordId)
            : [...g.triggerWordIds, action.wordId],
        })),
        dirty: true,
      };
    }

    case 'SET_CONNECT_FROM':
      return { ...state, connectFrom: action.wordId };

    case 'ADD_CONNECTION': {
      if (!state.activeGroupId) return state;
      return {
        ...state,
        groups: updateGroup(state.groups, state.activeGroupId, (g) => ({
          ...g,
          connections: [
            ...g.connections,
            { from: action.from, to: action.to, label: action.label },
          ],
        })),
        connectFrom: null,
        dirty: true,
      };
    }

    case 'DELETE_CONNECTION': {
      if (!state.activeGroupId) return state;
      return {
        ...state,
        groups: updateGroup(state.groups, state.activeGroupId, (g) => ({
          ...g,
          connections: g.connections.filter((_, i) => i !== action.index),
        })),
        dirty: true,
      };
    }

    case 'ADD_NODE': {
      if (!state.activeGroupId) return state;
      const newNode = {
        id: generateNodeId(),
        type: 'text' as const,
        content: '',
        anchorWordId: action.anchorWordId,
        position: action.position,
      };
      return {
        ...state,
        groups: updateGroup(state.groups, state.activeGroupId, (g) => ({
          ...g,
          nodes: [...g.nodes, newNode],
        })),
        editingNodeId: newNode.id,
        dirty: true,
      };
    }

    case 'UPDATE_NODE': {
      if (!state.activeGroupId) return state;
      return {
        ...state,
        groups: updateGroup(state.groups, state.activeGroupId, (g) => ({
          ...g,
          nodes: g.nodes.map((n) =>
            n.id === action.nodeId ? { ...n, ...action.updates } : n
          ),
        })),
        dirty: true,
      };
    }

    case 'DELETE_NODE': {
      if (!state.activeGroupId) return state;
      return {
        ...state,
        groups: updateGroup(state.groups, state.activeGroupId, (g) => ({
          ...g,
          nodes: g.nodes.filter((n) => n.id !== action.nodeId),
        })),
        editingNodeId: state.editingNodeId === action.nodeId ? null : state.editingNodeId,
        dirty: true,
      };
    }

    case 'SET_EDITING_NODE':
      return { ...state, editingNodeId: action.nodeId };

    case 'TOGGLE_PREVIEW':
      return { ...state, previewActive: !state.previewActive };

    case 'MARK_CLEAN':
      return { ...state, dirty: false };

    default:
      return state;
  }
}

// History wrapper for undo/redo
interface HistoryState {
  current: EditorState;
  past: AnalysisGroup[][];
  future: AnalysisGroup[][];
}

function historyReducer(histState: HistoryState, action: EditorAction): HistoryState {
  if (action.type === 'UNDO') {
    if (histState.past.length === 0) return histState;
    const previous = histState.past[histState.past.length - 1];
    return {
      current: { ...histState.current, groups: previous, dirty: true },
      past: histState.past.slice(0, -1),
      future: [histState.current.groups, ...histState.future],
    };
  }

  if (action.type === 'REDO') {
    if (histState.future.length === 0) return histState;
    const next = histState.future[0];
    return {
      current: { ...histState.current, groups: next, dirty: true },
      past: [...histState.past, histState.current.groups],
      future: histState.future.slice(1),
    };
  }

  const prevGroups = histState.current.groups;
  const newCurrent = editorReducer(histState.current, action);

  // If this is an undoable action and groups actually changed, push to history
  if (UNDOABLE_ACTIONS.has(action.type) && newCurrent.groups !== prevGroups) {
    return {
      current: newCurrent,
      past: [...histState.past.slice(-MAX_HISTORY + 1), prevGroups],
      future: [],
    };
  }

  return { ...histState, current: newCurrent };
}

const initialState: EditorState = {
  groups: [],
  activeGroupId: null,
  mode: 'select',
  connectFrom: null,
  editingNodeId: null,
  previewActive: false,
  dirty: false,
};

export function useEditorState(initial?: AnalysisGroup[]) {
  const [histState, dispatch] = useReducer(historyReducer, {
    current: { ...initialState, groups: initial || [] },
    past: [],
    future: [],
  });

  const state = histState.current;
  const activeGroup = state.groups.find((g) => g.id === state.activeGroupId) ?? null;
  const canUndo = histState.past.length > 0;
  const canRedo = histState.future.length > 0;

  return { state, dispatch, activeGroup, canUndo, canRedo };
}
