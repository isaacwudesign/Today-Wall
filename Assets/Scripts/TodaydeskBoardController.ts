/**
 * TodaydeskBoardController — trays, world-query desk placement, grab/drop cards.
 * Owns live card SceneObjects. Does not persist (delegates to TodaydeskState)
 * and does not author UIKit.
 */

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {TodaydeskAddUI} from "./TodaydeskAddUI"
import {TodaydeskAudioController} from "./TodaydeskAudioController"
import {TODAYDESK_MESHES, TodaydeskMeshAabb, TodaydeskTrayId} from "./TodaydeskAssetManifest"
import {requireRef} from "./TodaydeskSceneRefs"
import {TodaydeskCardRecord, TodaydeskState} from "./TodaydeskState"

const TodoTrayPrefab = requireAsset("../GeneratedMeshes/TodoTray.glb") as ObjectPrefab
const DoingTrayPrefab = requireAsset("../GeneratedMeshes/DoingTray.glb") as ObjectPrefab
const DoneTrayPrefab = requireAsset("../GeneratedMeshes/DoneTray.glb") as ObjectPrefab
const TaskCardPrefab = requireAsset("../GeneratedMeshes/TaskCard.glb") as ObjectPrefab

interface LiveCard {
  id: string
  tray: TodaydeskTrayId
  wrapper: SceneObject
  label: Text
}

@component
export class TodaydeskBoardController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TodaydeskBoard – trays, grab, desk place</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Empty slot for the To do tray")
  todoSlot: SceneObject
  @input
  @hint("Empty slot for the Doing tray")
  doingSlot: SceneObject
  @input
  @hint("Empty slot for the Done tray")
  doneSlot: SceneObject
  @input
  @hint("Parent for runtime task cards")
  cardsRoot: SceneObject
  @input
  @hint("Add-task UI module")
  addUI: TodaydeskAddUI
  @input
  @hint("Pickup/drop audio")
  audio: TodaydeskAudioController
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Seconds to hunt for a desk surface before falling back")
  @widget(new SliderWidget(0.5, 6, 0.5))
  queryTimeoutSec: number = 2.5
  @input
  @hint("Fallback distance in front of the camera, cm")
  @widget(new SliderWidget(40, 140, 5))
  fallbackForwardCm: number = 80
  @input
  @hint("Fallback drop below eye height, cm")
  @widget(new SliderWidget(10, 80, 5))
  fallbackDownCm: number = 42
  @input
  @hint("Extra radius past tray AABB when detecting a drop")
  @widget(new SliderWidget(2, 16, 0.5))
  dropPaddingCm: number = 6
  @input
  @hint("Side spacing between cards in a tray, cm")
  @widget(new SliderWidget(4, 10, 0.2))
  cardSpacingCm: number = 6.2
  @ui.group_end

  private state: TodaydeskState
  private live: LiveCard[] = []
  private placed = false
  private elapsed = 0
  private hitSession: HitTestSession | null = null
  private bestHit: WorldQueryHitTestResult | null = null
  private draggingId: string | null = null

  public bootstrap(state: TodaydeskState, debugColliders: boolean): void {
    this.state = state
    requireRef(this.todoSlot, "todoSlot")
    requireRef(this.doingSlot, "doingSlot")
    requireRef(this.doneSlot, "doneSlot")
    requireRef(this.cardsRoot, "cardsRoot")
    requireRef(this.addUI, "addUI")
    requireRef(this.audio, "audio")

    this.addUI.getSceneObject().getTransform().setLocalPosition(new vec3(0, 18, 12))

    this.mountMesh(this.todoSlot, TodoTrayPrefab, TODAYDESK_MESHES.TodoTray, debugColliders)
    this.mountMesh(this.doingSlot, DoingTrayPrefab, TODAYDESK_MESHES.DoingTray, debugColliders)
    this.mountMesh(this.doneSlot, DoneTrayPrefab, TODAYDESK_MESHES.DoneTray, debugColliders)
    print("[TodaydeskBoard] Trays mounted. Hunting for a desk…")

    const records = this.state.getCards()
    for (const record of records) {
      this.spawnCard(record, debugColliders)
    }
    this.relayoutTrays()
    this.beginPlacement()
  }

  public addTitle(title: string, debugColliders: boolean): void {
    const record = this.state.addCard(title, "todo")
    this.spawnCard(record, debugColliders)
    this.relayoutTrays()
  }

  private mountMesh(
    slot: SceneObject,
    prefab: ObjectPrefab,
    aabb: TodaydeskMeshAabb,
    debugColliders: boolean
  ): void {
    const wrapper = global.scene.createSceneObject("TrayWrapper")
    wrapper.setParent(slot)
    wrapper.getTransform().setLocalPosition(new vec3(aabb.ox, aabb.oy, aabb.oz))
    wrapper.getTransform().setLocalRotation(quat.quatIdentity())
    wrapper.getTransform().setLocalScale(new vec3(1, 1, 1))
    const collider = wrapper.createComponent("Physics.ColliderComponent") as ColliderComponent
    const box = Shape.createBoxShape()
    box.size = new vec3(aabb.w, aabb.h, aabb.d)
    collider.shape = box
    collider.debugDrawEnabled = debugColliders
    const visual = prefab.instantiate(wrapper)
    visual.getTransform().setLocalPosition(new vec3(-aabb.ox, -aabb.oy, -aabb.oz))
    if (aabb.yawVisualDeg && aabb.yawVisualDeg !== 0) {
      visual.getTransform().setLocalRotation(quat.angleAxis((aabb.yawVisualDeg * Math.PI) / 180, vec3.up()))
    }
  }

  private spawnCard(record: TodaydeskCardRecord, debugColliders: boolean): void {
    const aabb = TODAYDESK_MESHES.TaskCard
    const wrapper = global.scene.createSceneObject("Card-" + record.id)
    wrapper.setParent(this.cardsRoot)
    wrapper.getTransform().setLocalRotation(quat.quatIdentity())
    wrapper.getTransform().setLocalScale(new vec3(1, 1, 1))

    const collider = wrapper.createComponent("Physics.ColliderComponent") as ColliderComponent
    const box = Shape.createBoxShape()
    box.size = new vec3(aabb.w, aabb.h, aabb.d)
    collider.shape = box
    collider.debugDrawEnabled = debugColliders

    const interactable = wrapper.createComponent(Interactable.getTypeName()) as Interactable
    interactable.targetingMode = 3
    const manipulation = wrapper.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    manipulation.setCanScale(false)
    manipulation.setCanRotate(false)

    const visual = TaskCardPrefab.instantiate(wrapper)
    visual.getTransform().setLocalPosition(new vec3(-aabb.ox, -aabb.oy, -aabb.oz))
    const label = this.addUI.attachCardTitle(wrapper, record.title)

    const live: LiveCard = {id: record.id, tray: record.tray, wrapper: wrapper, label: label}
    this.live.push(live)

    manipulation.onManipulationStart.add(() => {
      this.draggingId = record.id
      this.audio.playPickup()
    })
    manipulation.onManipulationEnd.add(() => {
      this.draggingId = null
      this.onCardDropped(live)
    })
  }

  private onCardDropped(live: LiveCard): void {
    const pos = live.wrapper.getTransform().getWorldPosition()
    const tray = this.nearestTray(pos)
    live.tray = tray
    this.state.moveCard(live.id, tray)
    this.relayoutTrays()
    if (tray === "done") {
      this.audio.playDone()
    } else {
      this.audio.playDrop()
    }
  }

  private nearestTray(worldPos: vec3): TodaydeskTrayId {
    const candidates: {id: TodaydeskTrayId; slot: SceneObject; aabb: TodaydeskMeshAabb}[] = [
      {id: "todo", slot: this.todoSlot, aabb: TODAYDESK_MESHES.TodoTray},
      {id: "doing", slot: this.doingSlot, aabb: TODAYDESK_MESHES.DoingTray},
      {id: "done", slot: this.doneSlot, aabb: TODAYDESK_MESHES.DoneTray},
    ]
    let best: TodaydeskTrayId = "todo"
    let bestDist = Number.POSITIVE_INFINITY
    for (const c of candidates) {
      const p = c.slot.getTransform().getWorldPosition()
      const dx = worldPos.x - p.x
      const dz = worldPos.z - p.z
      const reach = Math.max(c.aabb.w, c.aabb.d) * 0.5 + this.dropPaddingCm
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < reach && dist < bestDist) {
        bestDist = dist
        best = c.id
      }
    }
    return best
  }

  private relayoutTrays(): void {
    const order: TodaydeskTrayId[] = ["todo", "doing", "done"]
    const slots: Record<TodaydeskTrayId, SceneObject> = {
      todo: this.todoSlot,
      doing: this.doingSlot,
      done: this.doneSlot,
    }
    const aabb = TODAYDESK_MESHES.TaskCard
    for (const tray of order) {
      const inTray = this.live.filter((c) => c.tray === tray && c.id !== this.draggingId)
      for (let i = 0; i < inTray.length; i++) {
        const slot = slots[tray]
        const local = new vec3((i - (inTray.length - 1) * 0.5) * this.cardSpacingCm, 0.4 + aabb.oy, 2.0)
        const world = slot.getTransform().getWorldTransform().multiplyPoint(local)
        inTray[i].wrapper.getTransform().setWorldPosition(world)
        inTray[i].wrapper.getTransform().setWorldRotation(slot.getTransform().getWorldRotation())
      }
    }
  }

  private beginPlacement(): void {
    try {
      const wq = require("LensStudio:WorldQueryModule") as WorldQueryModule
      const options = HitTestSessionOptions.create()
      options.filter = true
      this.hitSession = wq.createHitTestSessionWithOptions(options)
      this.hitSession.start()
    } catch (e) {
      print("[TodaydeskBoard] World Query unavailable, using in-front fallback: " + e)
      this.placeFallback()
      return
    }
    this.createEvent("UpdateEvent").bind(() => this.tickPlacement())
  }

  private tickPlacement(): void {
    if (this.placed) {
      return
    }
    this.elapsed += getDeltaTime()
    this.castLookDown()
    if (this.elapsed >= this.queryTimeoutSec) {
      if (this.bestHit) {
        this.placeOnHit(this.bestHit)
      } else {
        this.placeFallback()
      }
    }
  }

  private castLookDown(): void {
    if (!this.hitSession) {
      return
    }
    const cam = WorldCameraFinderProvider.getInstance()
    const origin = cam.getWorldPosition()
    const look = this.cameraLookDir()
    const down = vec3.down()
    const dirs = [
      down.add(look.uniformScale(0.25)).normalize(),
      down.add(look.uniformScale(0.55)).normalize(),
      down.add(look.uniformScale(0.9)).normalize(),
    ]
    for (const dir of dirs) {
      const end = origin.add(dir.uniformScale(220))
      this.hitSession.hitTest(origin, end, (hit) => this.considerHit(origin, look, hit))
    }
  }

  private considerHit(camPos: vec3, forward: vec3, hit: WorldQueryHitTestResult): void {
    if (!hit || this.placed) {
      return
    }
    const n = hit.normal.normalize()
    if (n.dot(vec3.up()) < 0.7) {
      return
    }
    const toHit = hit.position.sub(camPos)
    if (toHit.dot(forward) < 20) {
      return
    }
    const drop = camPos.y - hit.position.y
    if (drop < 18 || drop > 130) {
      return
    }
    if (!this.bestHit || hit.position.y > this.bestHit.position.y) {
      this.bestHit = hit
    }
  }

  private placeOnHit(hit: WorldQueryHitTestResult): void {
    this.placed = true
    this.stopQuery()
    const cam = WorldCameraFinderProvider.getInstance()
    const camPos = cam.getWorldPosition()
    let forward = camPos.sub(hit.position)
    forward = forward.sub(hit.normal.uniformScale(forward.dot(hit.normal)))
    if (forward.length < 0.01) {
      forward = vec3.forward()
    } else {
      forward = forward.normalize()
    }
    this.sceneObject.getTransform().setWorldPosition(hit.position)
    this.sceneObject.getTransform().setWorldRotation(quat.lookAt(forward, hit.normal))
    this.relayoutTrays()
    print(
      "[TodaydeskBoard] Placed on desk at " +
        hit.position.x.toFixed(1) +
        ", " +
        hit.position.y.toFixed(1) +
        ", " +
        hit.position.z.toFixed(1)
    )
  }

  private cameraLookDir(): vec3 {
    const cam = WorldCameraFinderProvider.getInstance()
    return cam.getTransform().getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
  }

  private fmtVec(v: vec3): string {
    return v.x.toFixed(2) + "," + v.y.toFixed(2) + "," + v.z.toFixed(2)
  }

  private placeFallback(): void {
    this.placed = true
    this.stopQuery()
    const cam = WorldCameraFinderProvider.getInstance()
    const look = this.cameraLookDir()
    print("[TodaydeskBoard] cam pos=" + this.fmtVec(cam.getWorldPosition()) + " look=" + this.fmtVec(look))
    const pos = cam.getWorldPosition().add(look.uniformScale(this.fallbackForwardCm)).add(vec3.down().uniformScale(this.fallbackDownCm))
    this.sceneObject.getTransform().setWorldPosition(pos)
    let forward = cam.getWorldPosition().sub(pos)
    forward.y = 0
    if (forward.length < 0.01) {
      forward = vec3.forward()
    } else {
      forward = forward.normalize()
    }
    this.sceneObject.getTransform().setWorldRotation(quat.lookAt(forward, vec3.up()))
    this.relayoutTrays()
    print("[TodaydeskBoard] No desk in front — board placed in front of you")
  }

  private stopQuery(): void {
    if (this.hitSession) {
      try {
        this.hitSession.stop()
      } catch (_e) {
        // editor / already stopped
      }
      this.hitSession = null
    }
  }
}
