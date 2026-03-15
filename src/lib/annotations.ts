import { annotate, type RoughAnnotation } from 'rough-notation';

const activeAnnotations: RoughAnnotation[] = [];

export type HighlightType = 'circle' | 'underline' | 'box' | 'highlight';

const ROUGH_TYPE_MAP: Record<HighlightType, 'circle' | 'underline' | 'box' | 'highlight'> = {
  circle: 'circle',
  underline: 'underline',
  box: 'box',
  highlight: 'highlight',
};

export function circleWords(
  wordIds: string[],
  color: string,
  type: HighlightType = 'circle'
): void {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  wordIds.forEach((wordId, i) => {
    const el = document.getElementById(wordId);
    if (!el) return;

    const annotation = annotate(el, {
      type: ROUGH_TYPE_MAP[type],
      color,
      padding: type === 'circle' ? 8 : 4,
      animationDuration: prefersReducedMotion ? 0 : 400,
      strokeWidth: 2,
      iterations: 2,
    });

    // Stagger the animations slightly
    setTimeout(
      () => annotation.show(),
      prefersReducedMotion ? 0 : i * 100
    );

    activeAnnotations.push(annotation);
  });
}

export function clearAnnotations(): void {
  activeAnnotations.forEach((a) => a.remove());
  activeAnnotations.length = 0;
}
