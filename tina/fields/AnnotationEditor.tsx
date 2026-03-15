/** @jsxImportSource react */
import React, { useState, useMemo, useCallback } from 'react';
import { useFormState } from 'react-final-form';
import type { AnalysisGroup, Line } from './editor/types';
import EditorModal from './editor/EditorModal';

interface FieldProps {
  field: any;
  input: {
    name: string;
    value: AnalysisGroup[] | undefined;
    onChange: (value: AnalysisGroup[]) => void;
  };
  meta: any;
}

function parseVerseText(verseText: string): Line[] {
  if (!verseText) return [];
  return verseText.split('\n').map((lineText, lineIndex) => ({
    lineIndex,
    words: lineText
      .split(/\s+/)
      .filter(Boolean)
      .map((text, wordIndex) => ({
        wordId: `w-${lineIndex}-${wordIndex}`,
        text,
      })),
  }));
}

export default function AnnotationEditor({ field, input, meta }: FieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const formState = useFormState();

  const groups: AnalysisGroup[] = useMemo(() => {
    return Array.isArray(input.value) ? input.value : [];
  }, [input.value]);

  // Get verse text and lines from sibling form fields
  const verseText = formState.values?.verseText || '';
  const formLines = formState.values?.lines;
  const title = formState.values?.title || 'Untitled';

  // Use form lines if available, otherwise parse from verse text
  const lines: Line[] = useMemo(() => {
    if (Array.isArray(formLines) && formLines.length > 0) {
      return formLines;
    }
    return parseVerseText(verseText);
  }, [formLines, verseText]);

  const handleSave = useCallback(
    (updatedGroups: AnalysisGroup[]) => {
      input.onChange(updatedGroups);

      // Also update the lines field if it was auto-generated from verse text
      if ((!formLines || formLines.length === 0) && verseText) {
        const generatedLines = parseVerseText(verseText);
        // Access the form to update the lines field
        try {
          const form = (formState as any).form;
          if (form?.change) {
            form.change('lines', generatedLines);
          }
        } catch {
          // Silently fail — lines will be generated on next save
        }
      }

      setIsOpen(false);
    },
    [input, formLines, verseText, formState]
  );

  const totalWords = groups.reduce((sum, g) => sum + g.highlightWordIds.length, 0);
  const totalConnections = groups.reduce((sum, g) => sum + g.connections.length, 0);
  const totalNodes = groups.reduce((sum, g) => sum + g.nodes.length, 0);

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 8,
          color: '#f6f6f9',
        }}
      >
        {field.label || 'Analysis Groups'}
      </label>

      {/* Summary card */}
      <div
        style={{
          background: '#26262b',
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
          border: '1px solid #3a3a40',
        }}
      >
        {groups.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888' }}>
            No analysis groups yet. Open the visual editor to start annotating.
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: '#ccc', marginBottom: 8 }}>
              {groups.length} group{groups.length !== 1 ? 's' : ''} · {totalWords} highlighted
              words · {totalConnections} connections · {totalNodes} nodes
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {groups.map((g) => (
                <span
                  key={g.id}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    background: '#3a3a40',
                    borderRadius: 4,
                    color: '#aaa',
                  }}
                >
                  {g.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Open editor button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!verseText && lines.length === 0}
        style={{
          display: 'block',
          width: '100%',
          padding: '10px 16px',
          background: '#e94560',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: verseText || lines.length > 0 ? 'pointer' : 'not-allowed',
          opacity: verseText || lines.length > 0 ? 1 : 0.5,
          transition: 'background 0.15s',
        }}
        onMouseOver={(e) => {
          if (verseText || lines.length > 0) {
            (e.target as HTMLElement).style.background = '#d63a54';
          }
        }}
        onMouseOut={(e) => {
          (e.target as HTMLElement).style.background = '#e94560';
        }}
      >
        Open Visual Annotation Editor
      </button>

      {!verseText && lines.length === 0 && (
        <div style={{ fontSize: 11, color: '#888', marginTop: 6, textAlign: 'center' }}>
          Enter verse text above first
        </div>
      )}

      {/* Full-screen modal */}
      {isOpen && (
        <EditorModal
          title={title}
          lines={lines}
          initialGroups={groups}
          onSave={handleSave}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
