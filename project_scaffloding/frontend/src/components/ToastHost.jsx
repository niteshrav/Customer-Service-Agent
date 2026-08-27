import { useEffect, useState } from "react";
import { subscribeToasts } from "../lib/toast";

export default function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return subscribeToasts((payload) => {
      setItems((prev) => [...prev, payload]);
      const duration = payload.duration ?? 4200;
      if (duration > 0) {
        window.setTimeout(() => {
          setItems((prev) => prev.filter((t) => t.id !== payload.id));
        }, duration);
      }
    });
  }, []);

  function dismiss(id) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  if (!items.length) return null;

  return (
    <div className="toast-host" aria-live="polite" aria-relevant="additions">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="status">
          <span className="toast-msg">{t.message}</span>
          <button type="button" className="toast-dismiss" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
