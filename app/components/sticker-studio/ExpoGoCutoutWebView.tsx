/**
 * Expo Go: runs @imgly/background-removal in a WebView (no Nitro / dev build needed).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { readPhotoBase64 } from '../../_lib/photoFile';
import { WASM_CUTOUT_HTML } from '../../_lib/stickerStudio/wasmCutoutHtml';

type Props = {
  uri: string;
  onProgress: (pct: number, stage: string) => void;
  onComplete: (outUri: string) => void;
  onError: (message: string) => void;
};

export function ExpoGoCutoutWebView({ uri, onProgress, onComplete, onError }: Props) {
  const webRef = useRef<WebView>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [webviewReady, setWebviewReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        onProgress(5, 'Reading photo');
        const { dataUrl: url } = await readPhotoBase64(uri);
        if (!cancelled) setDataUrl(url);
      } catch (e) {
        onError(
          e instanceof Error
            ? `Could not read the photo: ${e.message}`
            : 'Could not read the photo. Try picking from Gallery.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError, onProgress, uri]);

  const dispatchProcess = useCallback(
    (url: string) => {
      const payload = JSON.stringify({ type: 'process', imageDataUrl: url });
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
    },
    [],
  );

  const startProcess = useCallback(() => {
    if (!dataUrl || !webviewReady || started.current) return;
    started.current = true;
    onProgress(12, 'Tracing subject (fast mode)…');
    dispatchProcess(dataUrl);
  }, [dataUrl, dispatchProcess, onProgress, webviewReady]);

  useEffect(() => {
    startProcess();
  }, [startProcess]);

  const onMessage = (ev: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(ev.nativeEvent.data) as {
        type: string;
        pct?: number;
        key?: string;
        dataUrl?: string;
        message?: string;
      };
      if (msg.type === 'ready' || msg.type === 'loading') {
        if (msg.type === 'loading') {
          onProgress(10, 'Downloading AI models (once per session)…');
        }
        if (msg.type === 'ready') setWebviewReady(true);
        return;
      }
      if (msg.type === 'progress') {
        const stage =
          msg.key?.includes('fetch') || msg.key?.includes('download')
            ? 'Downloading AI models…'
            : 'Cutting out subject…';
        onProgress(12 + Math.round((msg.pct ?? 0) * 0.82), stage);
        return;
      }
      if (msg.type === 'done' && msg.dataUrl) {
        void (async () => {
          try {
            onProgress(96, 'Saving cutout');
            const { writePngBase64 } = await import('../../_lib/photoFile');
            const base64 = msg.dataUrl!.replace(/^data:image\/\w+;base64,/, '');
            const outPath = await writePngBase64(base64);
            onProgress(100, 'Done');
            onComplete(outPath);
          } catch {
            onError('Could not save the cutout image.');
          }
        })();
        return;
      }
      if (msg.type === 'error') {
        onError(msg.message ?? 'AI cutout failed. Stay on Wi‑Fi and try again.');
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={styles.wrap} pointerEvents="none">
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
        style={styles.web}
        onError={() => onError('Web cutout could not load. Check Wi‑Fi and try again.')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, opacity: 0.01 },
  web: { flex: 1, backgroundColor: '#000' },
  badge: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeTxt: { color: '#00E5FF', fontSize: 11, fontWeight: '800' },
});
