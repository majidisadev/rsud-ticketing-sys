import { useEffect, useRef } from 'react';
import { createTimeline, set, stagger } from 'animejs';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animasi masuk halaman admin: fade + slide up dengan stagger opsional.
 * @param {Object} options
 * @param {React.RefObject} options.containerRef - ref elemen wrapper utama
 * @param {React.RefObject[]} options.cardRefs - ref array untuk card/section (stagger)
 * @param {boolean} options.enabled - jalankan animasi (e.g. !loading)
 */
export function useAdminPageAnimation({ containerRef, cardRefs = [], enabled = true }) {
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!enabled || prefersReducedMotion() || hasAnimated.current) return;

    const container = containerRef?.current;
    const cards = Array.isArray(cardRefs) ? cardRefs.map((r) => r?.current).filter(Boolean) : [];

    if (!container) return;

    set(container, { opacity: 0, y: 16 });
    set(cards, { opacity: 0, y: 12 });

    const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 400 } });
    tl.add(container, { opacity: { to: 1 }, y: { to: 0 }, duration: 450 });

    if (cards.length > 0) {
      tl.add(
        cards,
        { opacity: { to: 1 }, y: { to: 0 }, delay: stagger(60), duration: 380 },
        '-=200'
      );
    }

    hasAnimated.current = true;
  }, [enabled, containerRef, cardRefs]);
}

/**
 * Stagger animasi untuk list items (table rows, list items).
 * @param {React.RefObject} listRef - ref ke container list
 * @param {string} itemSelector - selector anak per item (e.g. '[data-row]')
 * @param {boolean} enabled - jalankan saat data sudah ada
 */
export function useStaggerListAnimation(listRef, itemSelector, enabled = true) {
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!enabled || prefersReducedMotion() || hasAnimated.current) return;

    const list = listRef?.current;
    if (!list) return;

    const items = list.querySelectorAll(itemSelector);
    if (items.length === 0) return;

    set(items, { opacity: 0, x: -8 });
    const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 320 } });
    tl.add(items, { opacity: { to: 1 }, x: { to: 0 }, delay: stagger(40), duration: 300 });
    hasAnimated.current = true;
  }, [enabled, listRef, itemSelector]);
}
