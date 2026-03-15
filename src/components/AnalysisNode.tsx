import type { AnalysisNodeData } from '../lib/types';

interface Props {
  node: AnalysisNodeData;
  x: number;
  y: number;
  visible: boolean;
  accentColor: string;
}

export default function AnalysisNode({ node, x, y, visible, accentColor }: Props) {
  const baseStyle = {
    position: 'absolute' as const,
    left: `${x}px`,
    top: `${y}px`,
    maxWidth: '280px',
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1)' : 'scale(0.8)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    pointerEvents: (visible ? 'auto' : 'none') as 'auto' | 'none',
  };

  const cardClass =
    'rounded-lg p-4 shadow-lg backdrop-blur-sm text-sm leading-relaxed';
  const cardBg = 'rgba(0, 0, 0, 0.75)';

  switch (node.type) {
    case 'text':
      return (
        <div
          class={cardClass}
          style={{ ...baseStyle, backgroundColor: cardBg }}
          data-node-id={node.id}
        >
          <p style={{ color: '#e0e0e0' }}>{node.content}</p>
        </div>
      );

    case 'image':
      return (
        <div
          class={cardClass}
          style={{ ...baseStyle, backgroundColor: cardBg, padding: '8px' }}
          data-node-id={node.id}
        >
          <img
            src={node.src}
            alt={node.alt ?? ''}
            loading="lazy"
            style={{ borderRadius: '4px', maxWidth: '100%', display: 'block' }}
          />
          {node.alt && (
            <p
              style={{
                color: '#a0a0a0',
                fontSize: '0.75rem',
                marginTop: '4px',
              }}
            >
              {node.alt}
            </p>
          )}
        </div>
      );

    case 'link':
      return (
        <div
          class={cardClass}
          style={{ ...baseStyle, backgroundColor: cardBg }}
          data-node-id={node.id}
        >
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: accentColor,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            {node.content} &#x2197;
          </a>
        </div>
      );

    case 'video':
      return (
        <div
          class={cardClass}
          style={{
            ...baseStyle,
            backgroundColor: cardBg,
            padding: '8px',
            minWidth: '280px',
          }}
          data-node-id={node.id}
        >
          <iframe
            src={node.content}
            loading="lazy"
            allowFullScreen
            style={{
              width: '100%',
              aspectRatio: '16/9',
              border: 'none',
              borderRadius: '4px',
            }}
          />
        </div>
      );

    default:
      return null;
  }
}
