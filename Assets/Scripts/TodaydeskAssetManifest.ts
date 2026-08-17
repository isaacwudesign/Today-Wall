/**
 * TodaydeskAssetManifest — stable names, GLB AABBs, and authored SceneObject
 * contracts. Does not load assets (requireAsset lives in controllers) and
 * does not own gameplay state.
 */

export type TodaydeskTrayId = "todo" | "doing" | "done"

export interface TodaydeskMeshAabb {
  w: number
  h: number
  d: number
  ox: number
  oy: number
  oz: number
  /** Extra Y rotation (degrees, runtime-converted) applied to the visual child only. */
  yawVisualDeg?: number
}

/** Post-normalize SPECS GLB sizes at import scale 100. */
export const TODAYDESK_MESHES: Record<string, TodaydeskMeshAabb> = {
  TodoTray: {w: 22.0, h: 6.8, d: 16.0, ox: 0.0, oy: 3.4, oz: 0.0},
  DoingTray: {w: 22.0, h: 5.4, d: 17.1, ox: 0.0, oy: 2.7, oz: 0.0, yawVisualDeg: 90},
  DoneTray: {w: 22.0, h: 4.8, d: 15.8, ox: 0.0, oy: 2.4, oz: 0.0},
  TaskCard: {w: 5.7, h: 7.6, d: 12.0, ox: 0.0, oy: 3.8, oz: 0.0},
}

export const TODAYDESK_PATHS = {
  todoTray: "../GeneratedMeshes/TodoTray.glb",
  doingTray: "../GeneratedMeshes/DoingTray.glb",
  doneTray: "../GeneratedMeshes/DoneTray.glb",
  taskCard: "../GeneratedMeshes/TaskCard.glb",
  pickupSfx: "../GeneratedSFX/CardPickup.wav",
  dropSfx: "../GeneratedSFX/CardDrop.wav",
  doneSfx: "../GeneratedSFX/CardDone.wav",
  addIcon: "../Icons/add.png",
  checkIcon: "../Icons/check.png",
}

export const TODAYDESK_SCENE = {
  root: "Todaydesk",
  board: "TodaydeskBoard",
  todoSlot: "TodoSlot",
  doingSlot: "DoingSlot",
  doneSlot: "DoneSlot",
  cardsRoot: "CardsRoot",
  addPanel: "TodaydeskAddPanel",
  audio: "TodaydeskAudio",
}
