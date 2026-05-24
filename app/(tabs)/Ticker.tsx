import React from 'react';
import { GlassTicker } from '../components/GlassTicker';

interface TickerProps {
  text: string;
  bg?: string;
  color?: string;
  speed?: number;
  height?: number;
  fontSize?: number;
  hues?: [string, string, string];
}

/** Legacy ticker API — renders glassy colour-shifting banner. */
export function Ticker({ text, speed = 9000, height = 32, fontSize = 11, hues }: TickerProps) {
  return <GlassTicker text={text} speed={speed} height={height} fontSize={fontSize} hues={hues} />;
}
