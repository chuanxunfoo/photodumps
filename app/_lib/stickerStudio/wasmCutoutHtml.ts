/** Inline HTML for Expo Go WASM cutout — shared for warmup + processing WebViews. */
export const WASM_CUTOUT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; background: #1a1a22; color: #aaa; font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  </style>
</head>
<body>
  <p id="status">Loading AI…</p>
  <script type="module">
    import { removeBackground, preload } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/index.mjs";
    const status = document.getElementById("status");
    function post(obj) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
    post({ type: "loading" });
    try {
      await preload({ model: "small" });
      post({ type: "ready" });
    } catch (e) {
      post({ type: "error", message: e?.message || "Could not load AI" });
    }
    async function handleJob(ev) {
      let data;
      try { data = JSON.parse(ev.data); } catch { return; }
      if (data.type !== "process" || !data.imageDataUrl) return;
      try {
        status.textContent = "Tracing subject…";
        const input = await fetch(data.imageDataUrl).then(r => r.blob());
        const out = await removeBackground(input, {
          model: "small",
          output: { format: "image/png", quality: 0.88 },
          progress: (key, current, total) => {
            const pct = total ? Math.round((current / total) * 100) : 0;
            post({ type: "progress", pct, key: String(key) });
          },
        });
        const reader = new FileReader();
        reader.onload = () => post({ type: "done", dataUrl: reader.result });
        reader.onerror = () => post({ type: "error", message: "Could not encode PNG" });
        reader.readAsDataURL(out);
      } catch (e) {
        post({ type: "error", message: e?.message || "Cutout failed" });
      }
    }
    document.addEventListener("message", handleJob);
    window.addEventListener("message", handleJob);
  </script>
</body>
</html>`;
