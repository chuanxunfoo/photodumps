import type { ImageSourcePropType } from 'react-native';
import type { CameraRigId } from './types';

export type RigMeta = {
  id: CameraRigId;
  /** Short label under camera (Dazz-style). */
  shortLabel: string;
  brand: string;
  model: string;
  image: ImageSourcePropType;
  grad: [string, string];
  filter: 'none';
};

export const CAMERA_RIGS: RigMeta[] = [
  {
    id: 'sony',
    shortLabel: 'α7',
    brand: 'SONY',
    model: 'α7',
    image: require('../../assets/photobooth/rigs/sony.png'),
    grad: ['#0c1929', '#94a3b8'],
    filter: 'none',
  },
  {
    id: 'canon',
    shortLabel: 'EOS R6',
    brand: 'Canon',
    model: 'EOS R6',
    image: require('../../assets/photobooth/rigs/canon.png'),
    grad: ['#3f1d12', '#f97316'],
    filter: 'none',
  },
  {
    id: 'polaroid',
    shortLabel: '636',
    brand: 'Polaroid',
    model: '636 CloseUp',
    image: require('../../assets/photobooth/rigs/polaroid.png'),
    grad: ['#e8e0d5', '#d97706'],
    filter: 'none',
  },
  {
    id: 'fuji',
    shortLabel: 'X-T5',
    brand: 'FUJIFILM',
    model: 'X-T5',
    image: require('../../assets/photobooth/rigs/fuji.png'),
    grad: ['#14532d', '#a16207'],
    filter: 'none',
  },
  {
    id: 'nikon',
    shortLabel: 'Z9',
    brand: 'Nikon',
    model: 'Z9',
    image: require('../../assets/photobooth/rigs/nikon.png'),
    grad: ['#0f172a', '#64748b'],
    filter: 'none',
  },
  {
    id: 'leica',
    shortLabel: 'M',
    brand: 'Leica',
    model: 'M',
    image: require('../../assets/photobooth/rigs/leica.png'),
    grad: ['#0a0a0a', '#eab308'],
    filter: 'none',
  },
];

export function rigById(id: CameraRigId): RigMeta {
  return CAMERA_RIGS.find(r => r.id === id) ?? CAMERA_RIGS[0];
}
