export interface Word {
  wordId: string;
  text: string;
}

export interface Line {
  lineIndex: number;
  words: Word[];
}

export interface NodePosition {
  angle: number;
  distance: number;
}

export interface AnalysisNodeData {
  id: string;
  type: 'text' | 'image' | 'link' | 'video';
  content?: string;
  src?: string;
  alt?: string;
  url?: string;
  anchorWordId: string;
  position: NodePosition;
}

export interface ConnectionData {
  from: string;
  to: string;
  label?: string;
}

export interface AnalysisGroup {
  id: string;
  label: string;
  triggerWordIds: string[];
  highlightWordIds: string[];
  highlightType: 'circle' | 'underline' | 'box' | 'highlight';
  connections: ConnectionData[];
  nodes: AnalysisNodeData[];
}

export type EditorMode = 'select' | 'connect' | 'place';

export interface EditorState {
  groups: AnalysisGroup[];
  activeGroupId: string | null;
  mode: EditorMode;
  connectFrom: string | null;
  editingNodeId: string | null;
  previewActive: boolean;
  dirty: boolean;
}

export type EditorAction =
  | { type: 'SET_GROUPS'; groups: AnalysisGroup[] }
  | { type: 'SET_MODE'; mode: EditorMode }
  | { type: 'SET_ACTIVE_GROUP'; groupId: string | null }
  | { type: 'ADD_GROUP' }
  | { type: 'DELETE_GROUP'; groupId: string }
  | { type: 'UPDATE_GROUP_LABEL'; groupId: string; label: string }
  | { type: 'UPDATE_GROUP_HIGHLIGHT_TYPE'; groupId: string; highlightType: AnalysisGroup['highlightType'] }
  | { type: 'TOGGLE_HIGHLIGHT_WORD'; wordId: string }
  | { type: 'TOGGLE_TRIGGER_WORD'; wordId: string }
  | { type: 'SET_CONNECT_FROM'; wordId: string | null }
  | { type: 'ADD_CONNECTION'; from: string; to: string; label?: string }
  | { type: 'DELETE_CONNECTION'; index: number }
  | { type: 'ADD_NODE'; anchorWordId: string; position: NodePosition }
  | { type: 'UPDATE_NODE'; nodeId: string; updates: Partial<AnalysisNodeData> }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'SET_EDITING_NODE'; nodeId: string | null }
  | { type: 'TOGGLE_PREVIEW' }
  | { type: 'MARK_CLEAN' }
  | { type: 'UNDO' }
  | { type: 'REDO' };
