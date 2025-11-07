// utils/upload/events.js
export function createBeforeUnloadGuard({ shouldBlock, onBeforeUnload }) {
  const handler = (e) => {
    try {
      if (shouldBlock && shouldBlock()) {
        onBeforeUnload && onBeforeUnload();
        e.preventDefault();
        e.returnValue = "";
      }
    } catch (_) {}
  };
  return {
    enable() {
      window.addEventListener("beforeunload", handler);
    },
    disable() {
      window.removeEventListener("beforeunload", handler);
    },
  };
}
