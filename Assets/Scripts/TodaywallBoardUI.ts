/**
 * TodaywallBoardUI — glass columns, card plates, and a left color palette.
 * Passive view: setCounts / setGhostMode / attachCardTitle. Does not persist
 * or decide column drops.
 */

import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {
  FlexAlign,
  FlexAlignSelf,
  FlexDirection,
  FlexJustify,
} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Frame, FrameAppearance} from "SpectaclesUIKit.lspkg/Scripts/Components/Frame/Frame"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import {TODAYWALL_PALETTE, TodaywallColorId, todaywallFill} from "./TodaywallAssetManifest"

const DELETE_ICON = requireAsset("../Icons/delete_fill0.png") as Texture
const IMAGE_MAT = requireAsset("../Materials/ImageMaterial.mat") as Material

const FONT_SIZE_SCALE = 1.35
type TextRole =
  | "Title1"
  | "Title2"
  | "HeadlineXL"
  | "Headline1"
  | "Headline2"
  | "Subheadline"
  | "Button"
  | "Callout"
  | "Body"
  | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700},
  Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700},
  Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700},
  Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500},
  Callout: {size: 39, weight: 700},
  Body: {size: 39, weight: 500},
  Caption: {size: 38, weight: 500},
}
function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}
function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

const LAYOUT_Z_LIFT = 0.02
const CONTENT_Z = 0.6

@component
export class TodaywallBoardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TodaywallBoardUI – glass columns</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("To do column anchor")
  todoColumn: SceneObject
  @input
  @hint("Doing column anchor")
  doingColumn: SceneObject
  @input
  @hint("Done column anchor")
  doneColumn: SceneObject
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Column width in cm")
  @widget(new SliderWidget(18, 36, 0.5))
  columnWidthCm: number = 28
  @input
  @hint("Column height in cm")
  @widget(new SliderWidget(32, 72, 1))
  columnHeightCm: number = 56
  @input
  @hint("Task card width in cm — drag this in Inspector to resize cards")
  @widget(new SliderWidget(10, 26, 0.5))
  cardWidthCm: number = 21
  @input
  @hint("Task card height in cm")
  @widget(new SliderWidget(5, 16, 0.5))
  cardHeightCm: number = 9
  @input
  @hint("Distance from the top of a column to the To do (3) header, cm")
  @widget(new SliderWidget(3, 14, 0.5))
  headerFromTopCm: number = 5.5
  @input
  @hint("Gap from that header down to the first card, cm — drag this to close the empty space")
  @widget(new SliderWidget(4, 22, 0.5))
  headerToCardsCm: number = 10
  @input
  @hint("Pinned frame opacity (see-through)")
  @widget(new SliderWidget(0.2, 1, 0.05))
  pinnedOpacity: number = 0.55
  @input
  @hint("Ghost preview opacity")
  @widget(new SliderWidget(0.1, 0.8, 0.05))
  ghostOpacity: number = 0.32
  @input("vec4", "{0.92, 0.94, 0.97, 1}")
  @hint("Column label color")
  @widget(new ColorWidget())
  labelColor: vec4
  @input("vec4", "{0.96, 0.97, 0.99, 1}")
  @hint("Card title color — Specs additive display, dark ink vanishes")
  @widget(new ColorWidget())
  titleInk: vec4
  @ui.group_end

  private frames: Frame[] = []
  private cardPlates: BackPlate[] = []
  private todoHeader: Text | null = null
  private doingHeader: Text | null = null
  private doneHeader: Text | null = null
  private pendingTodo = 0
  private pendingDoing = 0
  private pendingDone = 0

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.buildColumns())
  }

  public setCounts(todo: number, doing: number, done: number): void {
    this.pendingTodo = todo
    this.pendingDoing = doing
    this.pendingDone = done
    this.flushCounts()
  }

  private flushCounts(): void {
    if (this.todoHeader) {
      this.todoHeader.text = this.headerLine("To do", this.pendingTodo)
    }
    if (this.doingHeader) {
      this.doingHeader.text = this.headerLine("Doing", this.pendingDoing)
    }
    if (this.doneHeader) {
      this.doneHeader.text = this.headerLine("Done", this.pendingDone)
    }
  }

  public get firstCardLocalY(): number {
    const top = this.columnHeightCm * 0.5
    return top - this.headerFromTopCm - this.headerToCardsCm
  }

  private headerLine(name: string, count: number): string {
    return name + " (" + count + ")"
  }

  public setGhostMode(ghost: boolean): void {
    this.ghostRequested = ghost
    this.applyGhost()
  }

  public setScanHint(text: string, visible: boolean): void {
    this.ensureScanHint()
    if (this.hintLabel) {
      this.hintLabel.text = text
    }
    if (this.hintRoot) {
      this.hintRoot.enabled = visible
    }
  }

  public tickScanHintInView(camPos: vec3, look: vec3): void {
    if (!this.hintRoot || !this.hintRoot.enabled) {
      return
    }
    const pos = camPos.add(look.uniformScale(95)).add(new vec3(0, -8, 0))
    this.hintRoot.getTransform().setWorldPosition(pos)
    const facing = quat.lookAt(look.uniformScale(-1), vec3.up())
    this.hintRoot.getTransform().setWorldRotation(facing)
    this.hintRoot.getTransform().setWorldScale(new vec3(1, 1, 1))
  }

  private hintRoot: SceneObject | null = null
  private hintLabel: Text | null = null

  private ensureScanHint(): void {
    if (this.hintRoot) {
      return
    }
    const root = global.scene.createSceneObject("TodaywallScanHint")
    root.setParent(this.sceneObject)
    root.createComponent("Component.Canvas")
    const t = root.createComponent("Component.Text") as Text
    t.text = "Look at a wall"
    t.depthTest = true
    applyTextRole(t, "Headline1", 90)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-22, 22, -8, 8)
    t.textFill.color = new vec4(0.97, 0.98, 1, 1)
    this.hintRoot = root
    this.hintLabel = t
  }

  private ghostRequested: boolean = true

  private applyGhost(): void {
    const a = this.ghostRequested ? this.ghostOpacity : this.pinnedOpacity
    for (const frame of this.frames) {
      try {
        frame.opacity = a
      } catch (_e) {
        // Frame visual not ready until onInitialized
      }
    }
  }

  public attachCardVisual(parent: SceneObject, title: string, colorId: string): {label: Text; plate: SceneObject} {
    const plate = global.scene.createSceneObject("CardPlate")
    plate.setParent(parent)
    plate.createComponent("Component.Canvas")
    const back = plate.createComponent(BackPlate.getTypeName()) as BackPlate
    back.size = new vec2(this.cardWidthCm, this.cardHeightCm)
    this.cardPlates.push(back)
    const apply = () => {
      this.muteBackPlateHits(back)
      this.tintPlate(plate, colorId)
    }
    back.onInitialized.add(apply)
    apply()

    const so = global.scene.createSceneObject("CardTitle")
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(0, 0, 0.8))
    so.getTransform().setLocalRotation(quat.quatIdentity())
    const t = so.createComponent("Component.Text") as Text
    t.text = title
    t.depthTest = true
    applyTextRole(t, "Callout", 110)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Wrap
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-this.cardWidthCm * 0.42, this.cardWidthCm * 0.42, -this.cardHeightCm * 0.38, this.cardHeightCm * 0.38)
    const ink = this.titleInk ? this.titleInk : new vec4(0.96, 0.97, 0.99, 1)
    t.textFill.color = ink
    return {label: t, plate: plate}
  }

  /** Wrap the title and grow the plate so a long name stays inside the card. Returns height in cm. */
  public fitCardToTitle(label: Text, plate: SceneObject): number {
    const halfW = this.cardWidthCm * 0.42
    const minH = this.cardHeightCm
    const maxH = this.cardHeightCm * 2.6
    const padY = 2.8
    label.horizontalOverflow = HorizontalOverflow.Wrap
    label.verticalOverflow = VerticalOverflow.Overflow
    label.layoutRect = Rect.create(-halfW, halfW, -48, 48)

    let textH = 0
    try {
      const box = label.getBoundingBox()
      if (box) {
        textH = Math.abs(box.top - box.bottom)
      }
    } catch (_e) {
      textH = 0
    }
    if (textH < 1.2) {
      const lineH = Math.max(2.8, label.getCursorHeight ? label.getCursorHeight() : 3.1)
      const charsPerLine = Math.max(10, Math.floor(this.cardWidthCm * 0.84 / 1.15))
      const lines = Math.max(1, Math.ceil(label.text.length / charsPerLine))
      textH = lines * lineH
    }
    const h = Math.max(minH, Math.min(maxH, textH + padY))
    const halfH = h * 0.46
    label.layoutRect = Rect.create(-halfW, halfW, -halfH, halfH)
    const back = plate.getComponent(BackPlate.getTypeName()) as BackPlate
    if (back) {
      back.size = new vec2(this.cardWidthCm, h)
    }
    return h
  }

  public tintPlate(plate: SceneObject, colorId: string): void {
    const fill = todaywallFill(colorId)
    const rect = plate.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    if (!rect) {
      return
    }
    rect.gradient = false
    rect.backgroundColor = fill
  }

  public createPalette(parent: SceneObject): {
    root: SceneObject
    swatches: {id: TodaywallColorId; wrapper: SceneObject; restLocal: vec3}[]
    trash: SceneObject
  } {
    const root = this.obj(parent, "TodaywallPalette", new vec3(-74, 6, 0))
    const swatches: {id: TodaywallColorId; wrapper: SceneObject; restLocal: vec3}[] = []
    const size = 7
    const gap = 8.2
    const top = 14
    for (let i = 0; i < TODAYWALL_PALETTE.length; i++) {
      const spec = TODAYWALL_PALETTE[i]
      const rest = new vec3(0, top - i * gap, 1.2)
      const wrapper = this.obj(root, "Swatch-" + spec.id, rest)
      wrapper.createComponent("Component.Canvas")
      const plate = global.scene.createSceneObject("SwatchPlate")
      plate.setParent(wrapper)
      plate.createComponent("Component.Canvas")
      const back = plate.createComponent(BackPlate.getTypeName()) as BackPlate
      back.size = new vec2(size, size)
      this.cardPlates.push(back)
      const paint = () => {
        this.muteBackPlateHits(back)
        this.tintPlate(plate, spec.id)
      }
      back.onInitialized.add(paint)
      paint()
      swatches.push({id: spec.id, wrapper: wrapper, restLocal: rest})
    }
    const lastY = top - (TODAYWALL_PALETTE.length - 1) * gap
    const trash = this.makeTrashTarget(root, new vec3(0, lastY - 11, 1.2))
    return {root: root, swatches: swatches, trash: trash}
  }

  private makeTrashTarget(parent: SceneObject, rest: vec3): SceneObject {
    const wrapper = this.obj(parent, "TrashTarget", rest)
    const iconSO = this.obj(wrapper, "TrashIcon", new vec3(0, 0, 1.5))
    const img = iconSO.createComponent("Component.Image") as Image
    const mat = IMAGE_MAT.clone() as Material
    img.mainMaterial = mat
    mat.mainPass.baseTex = DELETE_ICON
    mat.mainPass.depthTest = true
    mat.mainPass.depthWrite = false
    iconSO.getTransform().setLocalScale(new vec3(6.4, 6.4, 1))
    return wrapper
  }

  public pulseTrash(trash: SceneObject | null, hot: boolean): void {
    if (!trash) {
      return
    }
    const s = hot ? 1.14 : 1
    trash.getTransform().setLocalScale(new vec3(s, s, s))
  }

  public setCardTitle(label: Text, title: string): void {
    if (label) {
      label.text = title
    }
  }

  private buildColumns(): void {
    if (!this.todoColumn || !this.doingColumn || !this.doneColumn) {
      print("[TodaywallBoardUI] Missing column anchors.")
      return
    }
    this.mountColumn(this.todoColumn, "To do", (t) => {
      this.todoHeader = t
      this.flushCounts()
    })
    this.mountColumn(this.doingColumn, "Doing", (t) => {
      this.doingHeader = t
      this.flushCounts()
    })
    this.mountColumn(this.doneColumn, "Done", (t) => {
      this.doneHeader = t
      this.flushCounts()
    })
  }

  private mountColumn(slot: SceneObject, title: string, onCount: (t: Text) => void): void {
    const host = this.obj(slot, title + "Frame")
    host.createComponent("Component.Canvas")
    const frame = host.createComponent(Frame.getTypeName()) as Frame
    // Wall columns stay on the wall plane — Frame billboards by default
    // and that flattens/overlaps the headers.
    ;(frame as unknown as {useBillboarding: boolean}).useBillboarding = false
    frame.autoShowHide = false
    frame.autoScaleContent = false
    frame.allowScaling = false
    frame.allowTranslation = false
    this.frames.push(frame)

    frame.onInitialized.add(() => {
      frame.showCloseButton = false
      frame.showFollowButton = false
      frame.innerSize = new vec2(this.columnWidthCm, this.columnHeightCm)
      frame.padding = new vec2(0.8, 0.8)
      frame.appearance = FrameAppearance.Small
      frame.margin = 1.0
      frame.cutOutCenter = true
      this.freezeFrameFacing(frame)
      this.lockColumnManipulation(frame)
      this.applyGhost()
      const contentHost = frame.contentTransform.getSceneObject()
      onCount(this.buildHeader(contentHost, title))
    })
  }

  private buildHeader(host: SceneObject, title: string): Text {
    // One line: "To do  3" — larger/bolder than card titles. Never FlexItem (scale squash).
    const top = this.columnHeightCm * 0.5
    const y = top - this.headerFromTopCm
    const halfW = this.columnWidthCm * 0.5
    const header = this.placeBoardLabel(
      host,
      "Header",
      this.headerLine(title, 0),
      "Title2",
      new vec3(0, y, CONTENT_Z)
    )
    header.textFill.color = this.labelColor ? this.labelColor : new vec4(0.96, 0.97, 0.99, 1)
    header.weight = 700
    // Keep the box wide and short so "To do  3" stays one line.
    header.layoutRect = Rect.create(-halfW, halfW, -2.8, 2.8)
    return header
  }

  private placeBoardLabel(
    parent: SceneObject,
    name: string,
    text: string,
    role: TextRole,
    position: vec3
  ): Text {
    const so = this.obj(parent, name, position)
    so.getTransform().setLocalRotation(quat.quatIdentity())
    so.getTransform().setLocalScale(new vec3(1, 1, 1))
    const t = so.createComponent("Component.Text") as Text
    t.text = text
    t.depthTest = true
    applyTextRole(t, role, 110)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    const halfW = Math.max(8, this.columnWidthCm * 0.42)
    t.layoutRect = Rect.create(-halfW, halfW, -4.2, 4.2)
    return t
  }

  private freezeFrameFacing(frame: Frame): void {
    frame.setUseFollow(false)
    frame.setFollowing(false)
    const billboard = frame.billboardComponent
    if (billboard) {
      billboard.xAxisEnabled = false
      billboard.yAxisEnabled = false
      billboard.zAxisEnabled = false
      billboard.enabled = false
    }
  }

  /** After pin: mute column Frames so click-drag reaches cards. */
  public muteChromeHits(): void {
    for (const frame of this.frames) {
      this.muteFrameHits(frame)
    }
    this.muteCardPlateHits()
  }

  /** Ghost board must stay pinchable; only card plates steal those rays. */
  public muteCardPlateHits(): void {
    for (const plate of this.cardPlates) {
      this.muteBackPlateHits(plate)
    }
  }

  private lockColumnManipulation(frame: Frame): void {
    const manipulation = frame.getSceneObject().getComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    if (manipulation) {
      manipulation.enabled = false
    }
  }

  private muteFrameHits(frame: Frame): void {
    try {
      if (frame.collider) {
        frame.collider.enabled = false
      }
      if (frame.interactionPlane) {
        frame.interactionPlane.enabled = false
      }
    } catch (_e) {
      // Frame visual not ready until onInitialized.
    }
    this.muteHitComponents(frame.getSceneObject())
  }

  private muteBackPlateHits(back: BackPlate): void {
    try {
      if (back.interactable) {
        back.interactable.enabled = false
      }
      if (back.interactionPlane) {
        back.interactionPlane.enabled = false
      }
    } catch (_e) {
      // BackPlate not initialized yet.
    }
    this.muteHitComponents(back.getSceneObject())
  }

  private muteHitComponents(host: SceneObject): void {
    const interactable = host.getComponent(Interactable.getTypeName()) as Interactable
    if (interactable) {
      interactable.enabled = false
    }
    const manipulation = host.getComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    if (manipulation) {
      manipulation.enabled = false
    }
    const collider = host.getComponent("Physics.ColliderComponent") as ColliderComponent
    if (collider) {
      collider.enabled = false
    }
  }

  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const sceneObject = global.scene.createSceneObject(name)
    sceneObject.setParent(parent)
    if (position) {
      sceneObject.getTransform().setLocalPosition(position)
    }
    return sceneObject
  }

  private flexColumn(
    parent: SceneObject,
    width: number,
    height: number,
    opts?: {gap?: number; padY?: number; padX?: number; justify?: FlexJustify; align?: FlexAlign}
  ): SceneObject {
    const container = this.obj(parent, "Flex")
    this.liftInZ(container, LAYOUT_Z_LIFT)
    const flexLayout = container.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flexLayout.autoDiscoverItemsOnStart = false
    const flexItem = container.createComponent(FlexItem.getTypeName()) as FlexItem
    if (width > 0) {
      flexItem.overrideWidth = width
    }
    if (height > 0) {
      flexItem.overrideHeight = height
    }
    flexLayout.onInitialized.add(() => {
      flexLayout.width = width
      flexLayout.height = height
      flexLayout.direction = FlexDirection.Column
      flexLayout.rowGap = opts?.gap ?? 0
      flexLayout.paddingTop = opts?.padY ?? 0
      flexLayout.paddingBottom = opts?.padY ?? 0
      flexLayout.paddingLeft = opts?.padX ?? 0
      flexLayout.paddingRight = opts?.padX ?? 0
      flexLayout.justifyContent = opts?.justify ?? FlexJustify.Start
      flexLayout.alignItems = opts?.align ?? FlexAlign.Stretch
    })
    return container
  }

  private flexChild(
    parent: SceneObject,
    size: {w?: number; h?: number; grow?: number},
    builder: (childObject: SceneObject) => void
  ): SceneObject {
    const child = this.obj(parent, "Item")
    this.liftInZ(child, LAYOUT_Z_LIFT)
    const flexItem = child.createComponent(FlexItem.getTypeName()) as FlexItem
    if (size.w !== undefined && size.w > 0) {
      flexItem.overrideWidth = size.w
    }
    if (size.h !== undefined && size.h > 0) {
      flexItem.overrideHeight = size.h
    }
    flexItem.flexGrow = size.grow ?? 0
    flexItem.flexShrink = 0
    flexItem.alignSelf = FlexAlignSelf.Center
    builder(child)
    const parentFlexLayout = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (parentFlexLayout) {
      parentFlexLayout.addItems([flexItem])
    }
    return child
  }

  private liftInZ(sceneObject: SceneObject, zOffset: number): void {
    const transform = sceneObject.getTransform()
    const pos = transform.getLocalPosition()
    transform.setLocalPosition(new vec3(pos.x, pos.y, pos.z + zOffset))
  }
}
