export interface Word {
  wordId: string;
  text: string;
}

export interface Line {
  lineIndex: number;
  words: Word[];
}

export interface AnalysisNodeData {
  id: string;
  type: 'text' | 'image' | 'link' | 'video';
  content?: string;
  src?: string;
  alt?: string;
  url?: string;
  anchorWordId: string;
  position: { angle: number; distance: number };
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
