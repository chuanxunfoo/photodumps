import React, { useEffect, useState } from 'react';

import { ActivityIndicator, Image, StyleSheet, View, type ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import type { TraceSettings } from '../../_lib/stickerStudio/types';

import { TraceStrokeProcessor, type TraceStrokeMode } from './TraceStrokeProcessor';



function needsProcessor(trace: TraceSettings): boolean {

  if (trace.dashWrap) return true;

  return trace.style !== 'none' && trace.width > 0;

}



function strokeMode(trace: TraceSettings): TraceStrokeMode {

  return trace.style === 'toon' ? 'grainy' : 'smooth';

}



type Props = {

  uri: string;

  trace: TraceSettings;

  width: number;

  height?: number;

  aspect?: number;

  showTransparencyGrid?: boolean;

  exportRef?: React.RefObject<View | null>;

  style?: ViewStyle;

};



export function FramedCutout({

  uri,

  trace,

  width,

  height,

  aspect = 1,

  showTransparencyGrid = false,

  exportRef,

  style,

}: Props) {

  const h = height ?? Math.round(width / aspect);

  const useProcessor = needsProcessor(trace);

  const mode = strokeMode(trace);

  const [outUri, setOutUri] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);



  useEffect(() => {

    setOutUri(null);

  }, [uri, trace.color, trace.width, trace.style, trace.dashWrap]);



  if (!useProcessor) {

    return (

      <View style={[styles.wrap, style]}>

        <View ref={exportRef} collapsable={false} style={[styles.canvas, { width, height: h }]}>

          {showTransparencyGrid && <CheckerTiles width={width} height={h} />}

          <Image source={{ uri }} style={{ width, height: h }} resizeMode="contain" />

        </View>

      </View>

    );

  }



  return (

    <View style={[styles.wrap, style]}>

      <View style={[styles.wrapInner, { width, height: h }]}>

        {showTransparencyGrid && <CheckerTiles width={width} height={h} />}

        <TraceStrokeProcessor

          uri={uri}

          color={trace.color}

          width={trace.width}

          mode={mode}

          style={trace.style}

          glow={trace.style === 'glow'}

          dashWrap={trace.dashWrap}

          onResult={setOutUri}

          onProcessing={setBusy}

        />

        <View

          ref={exportRef}

          collapsable={false}

          style={[styles.canvas, { width, height: h, backgroundColor: 'transparent' }]}

        >

          {outUri ? (

            <Image source={{ uri: outUri }} style={{ width, height: h }} resizeMode="contain" />

          ) : (

            <View style={styles.wait}>

              <Image source={{ uri }} style={{ width, height: h, opacity: 0.2 }} resizeMode="contain" />

              <LinearGradient colors={['#FF0055', '#BF5AF2']} style={styles.waitBadge}>

                <ActivityIndicator color="#fff" size="small" />

              </LinearGradient>

            </View>

          )}

          {busy && outUri && (

            <View style={styles.busyOverlay} pointerEvents="none">

              <ActivityIndicator color="#FFD54F" />

            </View>

          )}

        </View>

      </View>

    </View>

  );

}



function CheckerTiles({ width, height }: { width: number; height: number }) {

  const size = 12;

  const cols = Math.ceil(width / size);

  const rows = Math.ceil(height / size);

  const cells: React.ReactNode[] = [];

  for (let r = 0; r < rows; r++) {

    for (let c = 0; c < cols; c++) {

      if ((r + c) % 2 === 0) {

        cells.push(

          <View

            key={`${r}_${c}`}

            style={{

              position: 'absolute',

              left: c * size,

              top: r * size,

              width: size,

              height: size,

              backgroundColor: 'rgba(255,255,255,0.05)',

            }}

          />,

        );

      }

    }

  }

  return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#252530' }]}>{cells}</View>;

}



const styles = StyleSheet.create({

  wrap: { alignItems: 'center', justifyContent: 'center' },

  wrapInner: { position: 'relative', alignItems: 'center', justifyContent: 'center' },

  canvas: { overflow: 'visible', alignItems: 'center', justifyContent: 'center' },

  wait: { alignItems: 'center', justifyContent: 'center' },

  waitBadge: {

    position: 'absolute',

    width: 44,

    height: 44,

    borderRadius: 22,

    alignItems: 'center',

    justifyContent: 'center',

  },

  busyOverlay: {

    ...StyleSheet.absoluteFillObject,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: 'rgba(0,0,0,0.12)',

  },

});


