/**
 * Hidden WebView on Sticker Studio hub — preloads WASM models so first cutout is faster.
 */
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { WASM_CUTOUT_HTML } from '../../_lib/stickerStudio/wasmCutoutHtml';

type Props = {
  enabled: boolean;
  onReady?: () => void;
};

export function WasmCutoutWarmup({ enabled, onReady }: Props) {
  const notified = useRef(false);

  if (!enabled) return null;

  const onMessage = (ev: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(ev.nativeEvent.data) as { type: string };
      if (msg.type === 'ready' && !notified.current) {
        notified.current = true;
        onReady?.();
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={st.warmup} pointerEvents="none">
      <WebView
        source={{ html: WASM_CUTOUT_HTML }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        style={st.web}
      />
    </View>
  );
}

const st = StyleSheet.create({
  warmup: { position: 'absolute', width: 2, height: 2, opacity: 0.01, overflow: 'hidden' },
  web: { flex: 1 },
});
