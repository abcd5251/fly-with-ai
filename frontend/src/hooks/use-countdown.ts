import { useEffect, useState } from "react";

/**
 * Milliseconds left until `target`, ticking every second.
 * Returns 0 when there is no target, so callers can render a static state
 * during SSR and light up once the hold is loaded on the client.
 */
export function useCountdown(target: number | null) {
  const [left, setLeft] = useState(() => (target ? Math.max(0, target - Date.now()) : 0));

  useEffect(() => {
    if (!target) {
      setLeft(0);
      return;
    }
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return left;
}
