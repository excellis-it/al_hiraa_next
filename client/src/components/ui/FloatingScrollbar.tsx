import { useEffect, useRef } from 'react';

/**
 * Floating translucent horizontal scrollbar that sticks to the top of the
 * visible area of a scrollable container.  Syncs bidirectionally with the
 * target element via ref.
 *
 * Usage:
 *   const scrollRef = useRef<HTMLDivElement>(null);
 *   <div ref={scrollRef} className="overflow-auto"> ... wide table ... </div>
 *   <FloatingScrollbar targetRef={scrollRef} contentWidth={2600} />
 */
export default function FloatingScrollbar({
  targetRef,
  contentWidth = 2600,
}: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  contentWidth?: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const target = targetRef.current;
    const bar = barRef.current;
    if (!target || !bar) return;

    const onTarget = () => {
      if (syncing.current) return;
      syncing.current = true;
      bar.scrollLeft = target.scrollLeft;
      syncing.current = false;
    };
    const onBar = () => {
      if (syncing.current) return;
      syncing.current = true;
      target.scrollLeft = bar.scrollLeft;
      syncing.current = false;
    };

    target.addEventListener('scroll', onTarget);
    bar.addEventListener('scroll', onBar);
    return () => {
      target.removeEventListener('scroll', onTarget);
      bar.removeEventListener('scroll', onBar);
    };
  }, [targetRef]);

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-20 overflow-x-auto"
      style={{
        height: 10,
        background: 'rgba(241,245,249,0.65)',
        backdropFilter: 'blur(4px)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(148,163,184,0.45) transparent',
      }}
    >
      <div style={{ width: contentWidth, height: 1 }} />
    </div>
  );
}
