/**
 * TodaywallBoardController — wall pin via World Query, ghost follow, grab/drop
 * cards. Owns live card SceneObjects. Does not persist (delegates to State)
 * and does not author UIKit besides asking BoardUI for titles.
 */

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import {InteractorInputType, InteractorTriggerType, TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import SIK from "SpectaclesInteractionKit.lspkg/SIK"
import {TodaywallAddUI} from "./TodaywallAddUI"
import {TodaywallAudioController} from "./TodaywallAudioController"
import {TODAYWALL_CARD, TodaywallColorId, TodaywallColumnId} from "./TodaywallAssetManifest"
import {TodaywallBoardUI} from "./TodaywallBoardUI"
import {requireRef} from "./TodaywallSceneRefs"
import {TodaywallCardRecord, TodaywallState} from "./TodaywallState"

interface LiveCard {
  id: string
  column: TodaywallColumnId
  wrapper: SceneObject
  interactable: Interactable
  label: Text
  plate: SceneObject
  collider: ColliderComponent
  height: number
}

interface LiveSwatch {
  id: TodaywallColorId
  wrapper: SceneObject
  restLocal: vec3
  interactable: Interactable
}

@component
export class TodaywallBoardController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TodaywallBoard – wall pin, grab, drop</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Empty To do column anchor")
  todoColumn: SceneObject
  @input
  @hint("Empty Doing column anchor")
  doingColumn: SceneObject
  @input
  @hint("Empty Done column anchor")
  doneColumn: SceneObject
  @input
  @hint("Parent for runtime task cards")
  cardsRoot: SceneObject
  @input
  @hint("See-through column UI")
  boardUI: TodaywallBoardUI
  @input
  @hint("Add-task UI module")
  addUI: TodaywallAddUI
  @input
  @hint("Pickup/drop audio")
  audio: TodaywallAudioController
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Max |normal·up| to accept a vertical wall (0 = wall, 1 = floor)")
  @widget(new SliderWidget(0.1, 0.6, 0.05))
  wallMaxUpDot: number = 0.35
  @input
  @hint("Ghost / pin standoff from the wall, cm")
  @widget(new SliderWidget(1, 12, 0.5))
  wallOffsetCm: number = 3
  @input
  @hint("Fallback wall distance in front of camera, cm")
  @widget(new SliderWidget(60, 180, 5))
  fallbackForwardCm: number = 130
  @input
  @hint("Extra radius past a column when detecting a drop")
  @widget(new SliderWidget(2, 16, 0.5))
  dropPaddingCm: number = 8
  @input
  @hint("Vertical spacing between cards, cm")
  @widget(new SliderWidget(10, 22, 0.5))
  cardSpacingCm: number = 10
  @ui.group_end

  private state: TodaywallState
  private live: LiveCard[] = []
  private swatches: LiveSwatch[] = []
  private paletteRoot: SceneObject | null = null
  private trashTarget: SceneObject | null = null
  private pinned = false
  private debugColliders = false
  private hitSession: HitTestSession | null = null
  private latestWall: WorldQueryHitTestResult | null = null
  private wallHitAge = 1
  private huntElapsed = 0
  private draggingId: string | null = null
  private paintingId: TodaywallColorId | null = null
  private wasPinching = false
  private allowFrontPin = false

  public bootstrap(state: TodaywallState, debugColliders: boolean): void {
    this.state = state
    this.debugColliders = debugColliders
    requireRef(this.todoColumn, "todoColumn")
    requireRef(this.doingColumn, "doingColumn")
    requireRef(this.doneColumn, "doneColumn")
    requireRef(this.cardsRoot, "cardsRoot")
    requireRef(this.boardUI, "boardUI")
    requireRef(this.addUI, "addUI")
    requireRef(this.audio, "audio")

    this.todoColumn.getTransform().setLocalPosition(new vec3(-44, -4, 0))
    this.doingColumn.getTransform().setLocalPosition(new vec3(0, -4, 0))
    this.doneColumn.getTransform().setLocalPosition(new vec3(44, -4, 0))
    this.addUI.getSceneObject().getTransform().setLocalPosition(new vec3(0, -52, 3))
    this.buildPalette(debugColliders)

    const records = this.state.getCards()
    for (const record of records) {
      this.spawnCard(record, debugColliders)
    }
    this.setCardsInteractable(false)
    this.relayoutColumns()
    this.syncCounts()
    this.boardUI.setGhostMode(true)
    this.setBoardContentVisible(false)
    this.boardUI.setScanHint("Look at a wall", true)
    this.beginPlacement()
    print("[TodaywallBoard] Look at a wall. Pinch to pin.")
  }

  public addTitle(title: string, debugColliders: boolean): void {
    const record = this.state.addCard(title, "todo")
    this.spawnCard(record, debugColliders)
    this.setCardsInteractable(this.pinned)
    this.relayoutColumns()
    this.syncCounts()
  }

  private spawnCard(record: TodaywallCardRecord, debugColliders: boolean): void {
    const w = this.boardUI.cardWidthCm
    const h = this.boardUI.cardHeightCm
    const d = TODAYWALL_CARD.d
    const wrapper = global.scene.createSceneObject("Card-" + record.id)
    wrapper.setParent(this.cardsRoot)
    wrapper.getTransform().setLocalRotation(quat.quatIdentity())
    wrapper.getTransform().setLocalScale(new vec3(1, 1, 1))

    const collider = wrapper.createComponent("Physics.ColliderComponent") as ColliderComponent
    const box = Shape.createBoxShape()
    // Deeper than the visual plate so a pinch from a Specs hand can actually hit it.
    box.size = new vec3(w, h, Math.max(d, 10))
    collider.shape = box
    collider.debugDrawEnabled = debugColliders

    const interactable = wrapper.createComponent(Interactable.getTypeName()) as Interactable
    interactable.targetingMode = TargetingMode.Direct | TargetingMode.Indirect
    const manipulation = wrapper.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    manipulation.setCanTranslate(true)
    manipulation.setCanScale(false)
    manipulation.setCanRotate(false)
    manipulation.enableStretchZ = false

    const visual = this.boardUI.attachCardVisual(wrapper, record.title, record.color)
    const label = visual.label

    const live: LiveCard = {
      id: record.id,
      column: record.column,
      wrapper: wrapper,
      interactable: interactable,
      label: label,
      plate: visual.plate,
      collider: collider,
      height: h,
    }
    this.live.push(live)
    this.hookCardManipulation(live, manipulation)
    this.fitLiveCard(live)
  }

  private hookCardManipulation(live: LiveCard, manipulation: InteractableManipulation): void {
    manipulation.onManipulationStart.add(() => {
      if (!this.pinned) {
        return
      }
      this.draggingId = live.id
      live.wrapper.getTransform().setLocalScale(new vec3(1.08, 1.08, 1.08))
      this.audio.playPickup()
    })
    manipulation.onManipulationEnd.add(() => {
      if (!this.pinned) {
        return
      }
      if (this.tryTrashCard(live)) {
        this.draggingId = null
        this.boardUI.pulseTrash(this.trashTarget, false)
        return
      }
      this.stickToBoardPlane(live)
      this.onCardDropped(live)
      this.draggingId = null
      live.wrapper.getTransform().setLocalScale(new vec3(1, 1, 1))
      this.relayoutColumns()
      this.syncCounts()
    })
  }

  private fitLiveCard(live: LiveCard): void {
    live.height = this.boardUI.fitCardToTitle(live.label, live.plate)
    this.resizeCardCollider(live)
    const wait = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    wait.bind(() => {
      live.height = this.boardUI.fitCardToTitle(live.label, live.plate)
      this.resizeCardCollider(live)
      this.relayoutColumns()
    })
    wait.reset(0.25)
  }

  private resizeCardCollider(live: LiveCard): void {
    const box = Shape.createBoxShape()
    box.size = new vec3(this.boardUI.cardWidthCm, live.height, Math.max(TODAYWALL_CARD.d, 10))
    live.collider.shape = box
  }

  private buildPalette(debugColliders: boolean): void {
    const pal = this.boardUI.createPalette(this.sceneObject)
    this.paletteRoot = pal.root
    this.trashTarget = pal.trash
    for (let i = 0; i < pal.swatches.length; i++) {
      this.wireSwatch(pal.swatches[i], debugColliders)
    }
  }

  private isOverTrash(worldPos: vec3): boolean {
    if (!this.trashTarget) {
      return false
    }
    const boardXf = this.sceneObject.getTransform()
    const inv = boardXf.getInvertedWorldTransform()
    const card = inv.multiplyPoint(worldPos)
    const bin = inv.multiplyPoint(this.trashTarget.getTransform().getWorldPosition())
    const dx = card.x - bin.x
    const dy = card.y - bin.y
    return dx * dx + dy * dy < 16 * 16
  }

  private tryTrashCard(live: LiveCard): boolean {
    const pos = live.wrapper.getTransform().getWorldPosition()
    if (!this.isOverTrash(pos)) {
      return false
    }
    const title = live.label.text
    this.state.removeCard(live.id)
    const ix = this.live.indexOf(live)
    if (ix >= 0) {
      this.live.splice(ix, 1)
    }
    live.interactable.enabled = false
    live.wrapper.destroy()
    this.relayoutColumns()
    this.syncCounts()
    this.audio.playDrop()
    print('[TodaywallBoard] Deleted "' + title + '"')
    return true
  }

  private wireSwatch(view: {id: TodaywallColorId; wrapper: SceneObject; restLocal: vec3}, debugColliders: boolean): void {
    const wrapper = view.wrapper
    const collider = wrapper.createComponent("Physics.ColliderComponent") as ColliderComponent
    const box = Shape.createBoxShape()
    box.size = new vec3(7.4, 7.4, 10)
    collider.shape = box
    collider.debugDrawEnabled = debugColliders
    const interactable = wrapper.createComponent(Interactable.getTypeName()) as Interactable
    interactable.targetingMode = TargetingMode.Direct | TargetingMode.Indirect
    const manipulation = wrapper.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    manipulation.setCanTranslate(true)
    manipulation.setCanScale(false)
    manipulation.setCanRotate(false)
    manipulation.enableStretchZ = false
    const live: LiveSwatch = {
      id: view.id,
      wrapper: wrapper,
      restLocal: view.restLocal,
      interactable: interactable,
    }
    this.swatches.push(live)
    this.hookSwatchManipulation(live, manipulation)
  }

  private hookSwatchManipulation(live: LiveSwatch, manipulation: InteractableManipulation): void {
    manipulation.onManipulationStart.add(() => {
      if (!this.pinned) {
        return
      }
      this.paintingId = live.id
      live.wrapper.getTransform().setLocalScale(new vec3(1.12, 1.12, 1.12))
      this.audio.playPickup()
    })
    manipulation.onManipulationEnd.add(() => {
      if (!this.pinned) {
        return
      }
      this.onPaintDropped(live)
      this.paintingId = null
      live.wrapper.getTransform().setLocalScale(new vec3(1, 1, 1))
      this.snapSwatchHome(live)
    })
  }

  private onPaintDropped(swatch: LiveSwatch): void {
    const pos = swatch.wrapper.getTransform().getWorldPosition()
    const card = this.nearestCard(pos)
    if (!card) {
      this.audio.playDrop()
      return
    }
    this.state.setCardColor(card.id, swatch.id)
    this.boardUI.tintPlate(card.plate, swatch.id)
    this.audio.playDrop()
    print("[TodaywallBoard] Painted \"" + card.label.text + "\" " + swatch.id)
  }

  private nearestCard(worldPos: vec3): LiveCard | null {
    let best: LiveCard | null = null
    let bestD = this.boardUI.cardWidthCm * 0.55 + 10
    for (let i = 0; i < this.live.length; i++) {
      const card = this.live[i]
      const p = card.wrapper.getTransform().getWorldPosition()
      const d = worldPos.sub(p).length
      if (d < bestD) {
        bestD = d
        best = card
      }
    }
    return best
  }

  private snapSwatchHome(swatch: LiveSwatch): void {
    swatch.wrapper.getTransform().setLocalPosition(swatch.restLocal)
    swatch.wrapper.getTransform().setLocalRotation(quat.quatIdentity())
  }

  private onCardDropped(live: LiveCard): void {
    const pos = live.wrapper.getTransform().getWorldPosition()
    const column = this.nearestColumn(pos)
    const wasDone = live.column === "done"
    const index = this.insertIndexForDrop(column, pos)
    live.column = column
    this.state.moveCard(live.id, column, index)
    this.relayoutColumns()
    this.syncCounts()
    if (column === "done" && !wasDone) {
      this.audio.playDone()
    } else {
      this.audio.playDrop()
    }
    print('[TodaywallBoard] Dropped "' + live.label.text + '" into ' + column + " at " + index)
  }

  private nearestColumn(worldPos: vec3): TodaywallColumnId {
    const boardXf = this.sceneObject.getTransform()
    const local = boardXf.getInvertedWorldTransform().multiplyPoint(worldPos)
    const candidates: {id: TodaywallColumnId; slot: SceneObject}[] = [
      {id: "todo", slot: this.todoColumn},
      {id: "doing", slot: this.doingColumn},
      {id: "done", slot: this.doneColumn},
    ]
    let best: TodaywallColumnId = "todo"
    let bestAbs = Number.POSITIVE_INFINITY
    for (const c of candidates) {
      const slotLocal = boardXf.getInvertedWorldTransform().multiplyPoint(c.slot.getTransform().getWorldPosition())
      const ax = Math.abs(local.x - slotLocal.x)
      if (ax < bestAbs) {
        bestAbs = ax
        best = c.id
      }
    }
    return best
  }

  private insertIndexForDrop(column: TodaywallColumnId, worldPos: vec3): number {
    const slot = this.columnSlot(column)
    const local = slot.getTransform().getInvertedWorldTransform().multiplyPoint(worldPos)
    const others = this.cardsInColumn(column)
    const pad = this.cardEdgePad()
    let cursor = this.stackTopY()
    for (let i = 0; i < others.length; i++) {
      const h = others[i].height
      const below = cursor - h - pad * 0.5
      if (local.y > below) {
        return i
      }
      cursor -= h + pad
    }
    return others.length
  }

  private cardsInColumn(column: TodaywallColumnId): LiveCard[] {
    const out: LiveCard[] = []
    for (const rec of this.state.getCards()) {
      if (rec.column !== column || rec.id === this.draggingId) {
        continue
      }
      const found = this.liveById(rec.id)
      if (found) {
        out.push(found)
      }
    }
    return out
  }

  private liveById(id: string): LiveCard | null {
    for (const live of this.live) {
      if (live.id === id) {
        return live
      }
    }
    return null
  }

  private columnSlot(column: TodaywallColumnId): SceneObject {
    if (column === "doing") {
      return this.doingColumn
    }
    if (column === "done") {
      return this.doneColumn
    }
    return this.todoColumn
  }

  private cardEdgePad(): number {
    return 2.2
  }

  private stackTopY(): number {
    return this.boardUI.firstCardLocalY + this.boardUI.cardHeightCm * 0.5
  }

  private cardRestZ(): number {
    return TODAYWALL_CARD.d * 0.5 + 0.8
  }

  private stickToBoardPlane(live: LiveCard): void {
    this.stickWrapperToBoard(live.wrapper, this.cardRestZ())
  }

  private stickWrapperToBoard(wrapper: SceneObject, z: number): void {
    const t = wrapper.getTransform()
    const loc = t.getLocalPosition()
    t.setLocalPosition(new vec3(loc.x, loc.y, z))
    t.setWorldRotation(this.todoColumn.getTransform().getWorldRotation())
  }

  private relayoutColumns(): void {
    const order: TodaywallColumnId[] = ["todo", "doing", "done"]
    const restZ = this.cardRestZ()
    const pad = this.cardEdgePad()
    let hover: TodaywallColumnId | null = null
    let hoverIndex = -1
    let hoverH = this.boardUI.cardHeightCm
    if (this.draggingId) {
      const drag = this.liveById(this.draggingId)
      if (drag) {
        const pos = drag.wrapper.getTransform().getWorldPosition()
        hover = this.nearestColumn(pos)
        hoverIndex = this.insertIndexForDrop(hover, pos)
        hoverH = drag.height
      }
    }
    for (const column of order) {
      const inCol = this.cardsInColumn(column)
      const slot = this.columnSlot(column)
      let cursor = this.stackTopY()
      let slotI = 0
      for (let i = 0; i < inCol.length; i++) {
        if (hover === column && slotI === hoverIndex) {
          cursor -= hoverH + pad
          slotI++
        }
        const h = inCol[i].height
        const y = cursor - h * 0.5
        const local = new vec3(0, y, restZ)
        const world = slot.getTransform().getWorldTransform().multiplyPoint(local)
        inCol[i].wrapper.getTransform().setWorldPosition(world)
        inCol[i].wrapper.getTransform().setWorldRotation(slot.getTransform().getWorldRotation())
        cursor -= h + pad
        slotI++
      }
    }
  }

  private syncCounts(): void {
    let todo = 0
    let doing = 0
    let done = 0
    for (const rec of this.state.getCards()) {
      if (rec.id === this.draggingId) {
        continue
      }
      if (rec.column === "todo") {
        todo++
      } else if (rec.column === "doing") {
        doing++
      } else {
        done++
      }
    }
    if (this.draggingId) {
      const drag = this.liveById(this.draggingId)
      if (drag) {
        const hover = this.nearestColumn(drag.wrapper.getTransform().getWorldPosition())
        if (hover === "todo") {
          todo++
        } else if (hover === "doing") {
          doing++
        } else {
          done++
        }
      }
    }
    this.boardUI.setCounts(todo, doing, done)
  }

  private setCardsInteractable(on: boolean): void {
    for (const card of this.live) {
      card.interactable.enabled = on
      card.wrapper.enabled = true
    }
    for (let i = 0; i < this.swatches.length; i++) {
      this.swatches[i].interactable.enabled = on
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
      print("[TodaywallBoard] World Query unavailable: " + e)
    }
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  private tick(): void {
    if (!this.pinned) {
      this.tickPlacement()
      return
    }
    if (this.draggingId) {
      const drag = this.liveById(this.draggingId)
      if (drag) {
        this.stickToBoardPlane(drag)
        this.boardUI.pulseTrash(this.trashTarget, this.isOverTrash(drag.wrapper.getTransform().getWorldPosition()))
      }
      this.relayoutColumns()
      this.syncCounts()
      return
    }
    this.boardUI.pulseTrash(this.trashTarget, false)
    if (this.paintingId) {
      const swatch = this.swatchById(this.paintingId)
      if (swatch) {
        this.stickWrapperToBoard(swatch.wrapper, swatch.restLocal.z)
      }
    }
  }

  private swatchById(id: TodaywallColorId): LiveSwatch | null {
    for (let i = 0; i < this.swatches.length; i++) {
      if (this.swatches[i].id === id) {
        return this.swatches[i]
      }
    }
    return null
  }

  private tickPlacement(): void {
    const dt = getDeltaTime()
    this.huntElapsed += dt
    this.wallHitAge += dt
    if (this.wallHitAge > 0.45) {
      this.latestWall = null
    }
    if (this.huntElapsed > 2.4) {
      this.allowFrontPin = true
    }
    this.castLook()
    this.followGhost()
    this.pollPinchToPin()
  }

  private castLook(): void {
    if (!this.hitSession) {
      return
    }
    const cam = WorldCameraFinderProvider.getInstance()
    const origin = cam.getWorldPosition()
    const look = this.cameraLookDir()
    const end = origin.add(look.uniformScale(280))
    this.hitSession.hitTest(origin, end, (hit) => this.considerHit(origin, look, hit))
  }

  private considerHit(camPos: vec3, look: vec3, hit: WorldQueryHitTestResult): void {
    if (!hit || this.pinned) {
      return
    }
    const n = hit.normal.normalize()
    if (Math.abs(n.dot(vec3.up())) > this.wallMaxUpDot) {
      return
    }
    if (n.dot(look) > -0.15) {
      return
    }
    const toHit = hit.position.sub(camPos)
    if (toHit.length < 25 || toHit.length > 320) {
      return
    }
    this.latestWall = hit
    this.wallHitAge = 0
  }

  private followGhost(): void {
    if (this.latestWall) {
      this.setBoardContentVisible(true)
      this.boardUI.muteCardPlateHits()
      this.boardUI.setScanHint("", false)
      this.placeOnSurface(this.latestWall, false)
      return
    }
    this.setBoardContentVisible(false)
    const hint = this.allowFrontPin
      ? "Look at a wall\nPinch to place in front"
      : "Look at a wall"
    this.boardUI.setScanHint(hint, true)
    const cam = WorldCameraFinderProvider.getInstance()
    this.boardUI.tickScanHintInView(cam.getWorldPosition(), this.cameraLookDir())
  }

  private pollPinchToPin(): void {
    const pinching = this.isPinchHeld()
    if (pinching && !this.wasPinching) {
      if (this.latestWall) {
        this.pin(this.latestWall)
      } else if (this.allowFrontPin) {
        this.pinInFront()
      }
    }
    this.wasPinching = pinching
  }

  private isPinchHeld(): boolean {
    const targeting = SIK.InteractionManager.getTargetingInteractors()
    const mice = SIK.InteractionManager.getInteractorsByType(InteractorInputType.Mouse)
    const list = targeting.concat(mice)
    for (let i = 0; i < list.length; i++) {
      const interactor = list[i]
      if (
        interactor &&
        interactor.isActive() &&
        (interactor.currentTrigger & InteractorTriggerType.Pinch) !== 0
      ) {
        return true
      }
    }
    return false
  }

  private setBoardContentVisible(on: boolean): void {
    this.todoColumn.enabled = on
    this.doingColumn.enabled = on
    this.doneColumn.enabled = on
    this.cardsRoot.enabled = on
    this.addUI.getSceneObject().enabled = on
    if (this.paletteRoot) {
      this.paletteRoot.enabled = on
    }
    if (on) {
      this.boardUI.muteCardPlateHits()
    }
  }

  private pin(hit: WorldQueryHitTestResult): void {
    this.pinned = true
    this.stopQuery()
    this.boardUI.setScanHint("", false)
    this.setBoardContentVisible(true)
    this.placeOnSurface(hit, true)
    this.boardUI.setGhostMode(false)
    this.setCardsInteractable(true)
    this.boardUI.muteChromeHits()
    this.scheduleChromeRemute()
    this.relayoutColumns()
    this.retintAll()
    print("[TodaywallBoard] Pinned on wall. Click-drag cards, or a color onto a card.")
  }

  private placeOnSurface(hit: WorldQueryHitTestResult, _locked: boolean): void {
    const n = hit.normal.normalize()
    const pos = hit.position.add(n.uniformScale(this.wallOffsetCm))
    const up = vec3.up()
    let binormal = n.cross(up)
    if (binormal.length < 0.01) {
      binormal = n.cross(vec3.forward())
    }
    binormal = binormal.normalize()
    const upright = binormal.cross(n).normalize()
    this.sceneObject.getTransform().setWorldPosition(pos)
    this.sceneObject.getTransform().setWorldRotation(quat.lookAt(n, upright))
  }

  private pinInFront(): void {
    const cam = WorldCameraFinderProvider.getInstance()
    const origin = cam.getWorldPosition()
    const look = this.cameraLookDir()
    const pos = origin.add(look.uniformScale(this.fallbackForwardCm)).add(new vec3(0, -6, 0))
    const n = look.uniformScale(-1)
    this.pinned = true
    this.stopQuery()
    this.boardUI.setScanHint("", false)
    this.setBoardContentVisible(true)
    this.sceneObject.getTransform().setWorldPosition(pos)
    this.sceneObject.getTransform().setWorldRotation(quat.lookAt(n, vec3.up()))
    this.boardUI.setGhostMode(false)
    this.setCardsInteractable(true)
    this.boardUI.muteChromeHits()
    this.scheduleChromeRemute()
    this.relayoutColumns()
    this.retintAll()
    print("[TodaywallBoard] No wall hit — placed in front.")
  }

  private retintAll(): void {
    const recs = this.state.getCards()
    for (let i = 0; i < recs.length; i++) {
      const live = this.liveById(recs[i].id)
      if (live) {
        this.boardUI.tintPlate(live.plate, recs[i].color)
      }
    }
    for (let i = 0; i < this.swatches.length; i++) {
      const sw = this.swatches[i]
      if (sw.wrapper.getChildrenCount() > 0) {
        this.boardUI.tintPlate(sw.wrapper.getChild(0), sw.id)
      }
    }
  }

  private scheduleChromeRemute(): void {
    const wait = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    wait.bind(() => {
      this.boardUI.muteChromeHits()
      this.retintAll()
    })
    wait.reset(0.2)
  }

  private cameraLookDir(): vec3 {
    const cam = WorldCameraFinderProvider.getInstance()
    return cam.getTransform().getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
  }

  private stopQuery(): void {
    if (this.hitSession) {
      try {
        this.hitSession.stop()
      } catch (_e) {
        // already stopped
      }
      this.hitSession = null
    }
  }
}
