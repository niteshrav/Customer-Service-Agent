/**
 * Lightweight pub/sub toast bus (no external deps).
 */
const listeners = new Set();
let seq = 0;

export function subscribeToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function toast(message, type = "info", opts = {}) {
  const id = ++seq;
  const payload = {
    id,
    message: String(message || ""),
    type: ["success", "error", "warning", "info"].includes(type) ? type : "info",
    duration: opts.duration ?? 4200,
  };
  listeners.forEach((fn) => fn(payload));
  return id;
}

toast.success = (msg, opts) => toast(msg, "success", opts);
toast.error = (msg, opts) => toast(msg, "error", opts);
toast.warning = (msg, opts) => toast(msg, "warning", opts);
toast.info = (msg, opts) => toast(msg, "info", opts);
