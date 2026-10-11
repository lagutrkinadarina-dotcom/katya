// Floor and stair dimensions shared by the scene and player navigation.
export const EYE_HEIGHT=1.65;
export const FLOOR_BASES=[-3.365,0,3.48];
export const STAIR_START=5.05;
export const STAIR_END=9.5;
export const DOWN_STAIR={zMin:2.98,zMax:5.02,base:0,rise:-3.365};
export const UP_STAIR={zMin:-.5,zMax:1.9,base:0,rise:3.48};
export const PASSAGE={north:.1,south:2.56,center:1.33};

// A straight continuation of the first-floor passage reaches the medical level.
// Existing FLOOR_BASES indices remain 1–3 so old save files keep their meaning.
export const BASEMENT_LAYOUT={
  floor:0,
  base:FLOOR_BASES[0]-3.2,
  height:3.3,
  passageStart:12.3,
  stairStart:13.1,
  stairEnd:18.55,
  landingEnd:21.3,
  doorX:20.95,
  doorWidth:1.56,
  center:PASSAGE.center,
  north:PASSAGE.north,
  south:PASSAGE.south,
};
export const BASEMENT_STAIR={
  xMin:BASEMENT_LAYOUT.passageStart,
  start:BASEMENT_LAYOUT.stairStart,
  end:BASEMENT_LAYOUT.stairEnd,
  zMin:PASSAGE.north+.25,
  zMax:PASSAGE.south-.25,
  base:FLOOR_BASES[0],
  rise:BASEMENT_LAYOUT.base-FLOOR_BASES[0],
};
