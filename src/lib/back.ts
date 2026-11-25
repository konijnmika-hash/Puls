import { useEffect, useRef } from 'react';

/**
 * Terugknop van de telefoon (Android) binnen de app houden.
 *
 * We zetten één extra stap in de geschiedenis. Drukt iemand op terug, dan
 * handelt het bovenste open scherm (venster, training, kookmodus) dat af en
 * zetten we de stap terug. Is er niets meer open, dan mag terug de app echt
 * verlaten.
 */
type Handler = { fn: () => boolean };
const stack: Handler[] = [];
let installed = false;

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const guard = () => history.pushState({ puls: true }, '');
  if (!history.state?.puls) guard();
  window.addEventListener('popstate', () => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].fn()) {
        guard();
        return;
      }
    }
    // niets meer om te sluiten: echt terug, de app uit
    history.back();
  });
}

/** `fn` geeft true terug als hij de terugknop heeft afgehandeld. */
export function useBack(fn: () => boolean) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    install();
    const h: Handler = { fn: () => ref.current() };
    stack.push(h);
    return () => {
      const i = stack.indexOf(h);
      if (i >= 0) stack.splice(i, 1);
    };
  }, []);
}
