/**
 * Canvas trace renderer — one pass, rounded edges, no stacked image layers.
 * smooth = Chalk / Chalk+ / Glow · grainy = Toon
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { readPhotoBase64, writePngBase64 } from '../../_lib/photoFile';

export type TraceStrokeMode = 'smooth' | 'grainy';

const STROKE_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head><body>
<script>
function hash(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}
function dilateRound(alpha, w, h, r) {
  const out = new Uint8Array(alpha.length);
  const r2 = r * r;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          m = Math.max(m, alpha[ny * w + nx]);
        }
      }
      out[y * w + x] = m;
    }
  }
  return out;
}
function boxBlur(a, w, h, rad) {
  const tmp = new Uint8Array(a.length);
  const out = new Uint8Array(a.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, c = 0;
      for (let dx = -rad; dx <= rad; dx++) {
        const nx = Math.min(w - 1, Math.max(0, x + dx));
        s += a[y * w + nx]; c++;
      }
      tmp[y * w + x] = s / c;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, c = 0;
      for (let dy = -rad; dy <= rad; dy++) {
        const ny = Math.min(h - 1, Math.max(0, y + dy));
        s += tmp[ny * w + x]; c++;
      }
      out[y * w + x] = Math.round(s / c);
    }
  }
  return out;
}
function hexRgb(hex) {
  const h = (hex || '#FFFFFF').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function post(obj) {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
}
async function processJob(data) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('load'));
    img.src = data.imageDataUrl;
  });
  const maxSide = 560;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = src.data[i * 4 + 3];
  const thickness = Math.max(1, Math.min(40, data.width || 9));
  const r = Math.max(2, Math.round(thickness * scale * 0.78));
  const grainy = data.mode === 'grainy';
  const glow = !!data.glow;
  let stroke = dilateRound(alpha, w, h, r);
  const blurRad = glow ? Math.max(3, Math.round(r * 0.45)) : Math.max(2, Math.round(r * 0.28));
  stroke = boxBlur(stroke, w, h, blurRad);
  if (glow) stroke = boxBlur(stroke, w, h, blurRad + 1);
  const [cr, cg, cb] = hexRgb(data.color);
  const gapBase = grainy ? 0.05 + (1 - thickness / 40) * 0.08 : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const i = idx * 4;
      const sa = src.data[i + 3];
      if (sa > 210) {
        out.data[i] = src.data[i];
        out.data[i + 1] = src.data[i + 1];
        out.data[i + 2] = src.data[i + 2];
        out.data[i + 3] = sa;
        continue;
      }
      const fill = stroke[idx] / 255;
      if (fill < 0.04 || sa > 80) continue;
      const h1 = hash(x, y) / 4294967295;
      const h2 = hash(x * 5 + 17, y * 3 + 41) / 4294967295;
      const h3 = hash(x + 120, y + 80) / 4294967295;
      let R = cr, G = cg, B = cb;
      if (h3 > 0.9) { R = 255; G = 250; B = 235; }
      else if (h3 > 0.76 && grainy) { R = Math.min(255, cr + 20); G = Math.min(255, cg + 18); B = Math.min(255, cb + 16); }
      let a;
      if (grainy) {
        const stippleCut = gapBase + (1 - fill) * 0.04;
        if (h1 < stippleCut) {
          const hFine = hash(x * 13 + 7, y * 17 + 3) / 4294967295;
          if (hFine > 0.42 || fill < 0.35) continue;
        }
        a = Math.round(255 * fill * (0.78 + h2 * 0.22) * (0.92 + h1 * 0.08));
        const hCluster = hash(x * 3 + 11, y * 5 + 19) / 4294967295;
        if (hCluster > 0.55 && fill > 0.25) {
          a = Math.min(255, a + Math.round(40 * fill));
        }
      } else {
        a = Math.round(255 * fill * (glow ? 0.55 + fill * 0.45 : 0.88 + fill * 0.12));
      }
      if (a < 12) continue;
      out.data[i] = R;
      out.data[i + 1] = G;
      out.data[i + 2] = B;
      out.data[i + 3] = a;
    }
  }
  ctx.putImageData(out, 0, 0);
  post({ type: 'done', dataUrl: canvas.toDataURL('image/png') });
}
function onMsg(ev) {
  let data;
  try { data = JSON.parse(ev.data); } catch { return; }
  if (data.type !== 'process') return;
  processJob(data).catch(e => post({ type: 'error', message: e?.message || 'stroke failed' }));
}
document.addEventListener('message', onMsg);
window.addEventListener('message', onMsg);
post({ type: 'ready' });
</script></body></html>`;

type Props = {
  uri: string;
  color: string;
  width: number;
  mode: TraceStrokeMode;
  glow?: boolean;
  onResult: (fileUri: string) => void;
  onProcessing?: (busy: boolean) => void;
  onError?: (msg: string) => void;
};

export function TraceStrokeProcessor({ uri, color, width, mode, glow, onResult, onProcessing, onError }: Props) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const jobRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        onProcessing?.(true);
        const { dataUrl: url } = await readPhotoBase64(uri);
        if (!cancelled) setDataUrl(url);
      } catch (e) {
        onProcessing?.(false);
        onError?.(e instanceof Error ? e.message : 'Could not read cutout');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri, onError, onProcessing]);

  useEffect(() => {
    if (!ready || !dataUrl || !webRef.current) return;
    jobRef.current += 1;
    const t = setTimeout(() => {
      onProcessing?.(true);
      webRef.current?.postMessage(
        JSON.stringify({ type: 'process', imageDataUrl: dataUrl, color, width, mode, glow: !!glow }),
      );
    }, 140);
    return () => clearTimeout(t);
  }, [ready, dataUrl, color, width, mode, glow, onProcessing]);

  const onMessage = useCallback(
    async (ev: WebViewMessageEvent) => {
      let msg: { type: string; dataUrl?: string; message?: string };
      try {
        msg = JSON.parse(ev.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === 'ready') {
        setReady(true);
        return;
      }
      if (msg.type === 'done' && msg.dataUrl) {
        try {
          const b64 = msg.dataUrl.replace(/^data:image\/png;base64,/, '');
          onResult(await writePngBase64(b64));
        } catch {
          onError?.('Could not save sticker trace');
        } finally {
          onProcessing?.(false);
        }
      }
      if (msg.type === 'error') {
        onProcessing?.(false);
        onError?.(msg.message || 'Trace failed');
      }
    },
    [onResult, onError, onProcessing],
  );

  return (
    <WebView
      ref={webRef}
      source={{ html: STROKE_HTML }}
      onMessage={onMessage}
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: -9999 }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
    />
  );
}
