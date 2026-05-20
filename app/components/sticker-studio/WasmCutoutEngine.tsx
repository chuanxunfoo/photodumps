/**
 * Single hidden WebView for Expo Go WASM cutout — preloads models once, reuses for every cutout.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { readPhotoBase64 } from '../../_lib/photoFile';
import { WASM_CUTOUT_HTML } from '../../_lib/stickerStudio/wasmCutoutHtml';

export type WasmCutoutJob = {
  uri: string;
  onProgress: (pct: number, stage: string) => void;
  onComplete: (outUri: string) => void;
  onError: (message: string) => void;
};

type Props = {
  enabled: boolean;
  onReady?: () => void;
  job?: WasmCutoutJob | null;
};

export function WasmCutoutEngine({ enabled, onReady, job }: Props) {
  const webRef = useRef<WebView>(null);
  const notifiedReady = useRef(false);
  const activeJobUri = useRef<string | null>(null);
  const [webviewReady, setWebviewReady] = useState(false);

  const dispatchProcess = useCallback((imageDataUrl: string) => {
    const payload = JSON.stringify({ type: 'process', imageDataUrl });
    webRef.current?.postMessage(payload);
    webRef.current?.injectJavaScript(`
      (function(){
        var d=${JSON.stringify(payload)};
        var e=new MessageEvent('message',{data:d});
        document.dispatchEvent(e);
        window.dispatchEvent(e);
      })();
      true;
    `);
  }, []);

  useEffect(() => {
    if (!enabled) {
      notifiedReady.current = false;
      activeJobUri.current = null;
      setWebviewReady(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!job) {
      activeJobUri.current = null;
    }
  }, [job]);

  useEffect(() => {
    if (!enabled || !job || !webviewReady) return;
    if (activeJobUri.current === job.uri) return;

    let cancelled = false;
    activeJobUri.current = job.uri;

    (async () => {
      try {
        job.onProgress(14, 'Reading photo…');
        const { dataUrl } = await readPhotoBase64(job.uri);
        if (cancelled) return;
        job.onProgress(
          notifiedReady.current ? 18 : 12,
          notifiedReady.current ? 'Tracing subject…' : 'Downloading AI models (once per session)…',
        );
        dispatchProcess(dataUrl);
      } catch (e) {
        activeJobUri.current = null;
        job.onError(
          e instanceof Error
            ? `Could not read the photo: ${e.message}`
            : 'Could not read the photo. Try picking from Gallery.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatchProcess, enabled, job, webviewReady]);

  const onMessage = (ev: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(ev.nativeEvent.data) as {
        type: string;
        pct?: number;
        key?: string;
        dataUrl?: string;
        message?: string;
      };

      if (msg.type === 'loading') {
        job?.onProgress(10, 'Downloading AI models (once per session)…');
        return;
      }

      if (msg.type === 'ready') {
        setWebviewReady(true);
        if (!notifiedReady.current) {
          notifiedReady.current = true;
          onReady?.();
        }
        return;
      }

      if (!job) return;

      if (msg.type === 'progress') {
        const stage =
          msg.key?.includes('fetch') || msg.key?.includes('download')
            ? 'Downloading AI models…'
            : 'Cutting out subject…';
        job.onProgress(12 + Math.round((msg.pct ?? 0) * 0.82), stage);
        return;
      }

      if (msg.type === 'done' && msg.dataUrl) {
        void (async () => {
          try {
            job.onProgress(96, 'Saving cutout');
            const { writePngBase64 } = await import('../../_lib/photoFile');
            const base64 = msg.dataUrl!.replace(/^data:image\/\w+;base64,/, '');
            const outPath = await writePngBase64(base64);
            activeJobUri.current = null;
            job.onProgress(100, 'Done');
            job.onComplete(outPath);
          } catch {
            activeJobUri.current = null;
            job.onError('Could not save the cutout image.');
          }
        })();
        return;
      }

      if (msg.type === 'error') {
        activeJobUri.current = null;
        job.onError(msg.message ?? 'AI cutout failed. Stay on Wi‑Fi and try again.');
      }
    } catch {
      /* ignore */
    }
  };

  if (!enabled) return null;

  return (
    <View style={st.host} pointerEvents="none">
      <WebView
        ref={webRef}
        source={{ html: WASM_CUTOUT_HTML }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        style={st.web}
        onError={() => {
          activeJobUri.current = null;
          job?.onError('Web cutout could not load. Check Wi‑Fi and try again.');
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  host: { position: 'absolute', width: 2, height: 2, opacity: 0.01, overflow: 'hidden' },
  web: { flex: 1 },
});
