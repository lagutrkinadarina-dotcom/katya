import {stationSurface} from './station-materials.js';

// Locally generated worn surfaces, tiled in world metres only on the first floor.
export function receptionSurface(kind){
  return stationSurface(kind==='tile'?'floor':'wall',1);
}
