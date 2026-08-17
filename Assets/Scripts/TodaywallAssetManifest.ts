/**
 * TodaywallAssetManifest — stable names, card AABB, and authored SceneObject
 * contracts. Does not load assets (requireAsset lives in controllers) and
 * does not own gameplay state.
 */

export type TodaywallColumnId = "todo" | "doing" | "done"

export interface TodaywallMeshAabb {
  w: number
  h: number
  d: number
  ox: number
  oy: number
  oz: number
}

/** Post-normalize SPECS GLB size at import scale 100. TODO: verify with aabb_cm */
export const TODAYWALL_CARD: TodaywallMeshAabb = {
  w: 14.0,
  h: 7.5,
  d: 1.2,
  ox: 0.0,
  oy: 0.0,
  oz: 0.0,
}

export const TODAYWALL_PATHS = {
  pickupSfx: "../GeneratedSFX/WallPickup.wav",
  dropSfx: "../GeneratedSFX/WallDrop.wav",
  doneSfx: "../GeneratedSFX/WallDone.wav",
  addIcon: "../Icons/add.png",
}

export const TODAYWALL_SCENE = {
  root: "Todaywall",
  board: "TodaywallBoard",
  todoColumn: "TodoColumn",
  doingColumn: "DoingColumn",
  doneColumn: "DoneColumn",
  cardsRoot: "CardsRoot",
  addPanel: "TodaywallAddPanel",
  audio: "TodaywallAudio",
  columns: "TodaywallColumns",
}

export const TODAYWALL_STORAGE_KEY = "todaywall.v1.cards"

export type TodaywallColorId = "slate" | "rose" | "amber" | "mint" | "sky" | "violet"

export const TODAYWALL_PALETTE: {id: TodaywallColorId; rgb: number[]}[] = [
  {id: "slate", rgb: [0.2, 0.22, 0.26]},
  {id: "rose", rgb: [0.78, 0.32, 0.38]},
  {id: "amber", rgb: [0.86, 0.58, 0.22]},
  {id: "mint", rgb: [0.28, 0.7, 0.48]},
  {id: "sky", rgb: [0.28, 0.58, 0.92]},
  {id: "violet", rgb: [0.62, 0.42, 0.92]},
]

export function todaywallFill(id: string): vec4 {
  for (let i = 0; i < TODAYWALL_PALETTE.length; i++) {
    if (TODAYWALL_PALETTE[i].id === id) {
      const rgb = TODAYWALL_PALETTE[i].rgb
      return new vec4(rgb[0], rgb[1], rgb[2], 0.95)
    }
  }
  return new vec4(0.2, 0.22, 0.26, 0.95)
}
