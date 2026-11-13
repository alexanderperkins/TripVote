import { useEffect, useId, useRef, useState } from 'react';

// A "⋯" button that opens a small menu of actions, e.g. Edit and Delete on an activity.
// items: [{ label, onSelect, danger }]
export default function MoreMenu({ label, items }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    rootRef.current?.querySelector('[role="menuitem"]')?.focus();

    function handlePointer(event) {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    }
    function handleKey(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const options = [...rootRef.current.querySelectorAll('[role="menuitem"]')];
        const index = options.indexOf(document.activeElement);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        options[(index + step + options.length) % options.length]?.focus();
        event.preventDefault();
      }
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        className="grid h-11 w-11 place-items-center rounded-lg text-xl leading-none text-muted outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-12 z-10 grid min-w-36 rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                item.onSelect();
              }}
              className={`min-h-11 rounded-lg px-3 text-left text-sm font-semibold outline-none hover:bg-page focus-visible:bg-page ${
                item.danger ? 'text-danger' : 'text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
