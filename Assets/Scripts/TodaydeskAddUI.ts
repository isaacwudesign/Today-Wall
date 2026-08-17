/**
 * TodaydeskAddUI — Add button + keyboard field, and card title labels.
 * Passive view: emits onAddTitle, creates Text under a card parent when asked.
 * Does not persist, drop, or decide trays.
 */

import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {
  FlexAlign,
  FlexDirection,
  FlexJustify,
} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Frame} from "SpectaclesUIKit.lspkg/Scripts/Components/Frame/Frame"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {TextInputField} from "SpectaclesUIKit.lspkg/Scripts/Components/TextInputField/TextInputField"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

const ADD_ICON = requireAsset("../Icons/add.png") as Texture
const FONT_SIZE_SCALE = 1.0
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
const BUTTON_LABEL_Z = 0.08

@component
export class TodaydeskAddUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TodaydeskAddUI – add a card</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm")
  @widget(new SliderWidget(12, 28, 0.5))
  widthCm: number = 20
  @input
  @hint("Panel height in cm")
  @widget(new SliderWidget(5, 14, 0.5))
  heightCm: number = 7
  @input
  @hint("Add button label")
  addLabel: string = "Add"
  @input
  @hint("Placeholder shown in the title field")
  placeholderLabel: string = "New task"
  @input("vec4", "{0.12, 0.1, 0.08, 1}")
  @hint("Ink color for card titles")
  @widget(new ColorWidget())
  titleInk: vec4
  @ui.group_end

  public onAddTitle: Event<string> = new Event<string>()

  private inputField: TextInputField | null = null
  private draftText: string = ""

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const frame = this.sceneObject.createComponent(Frame.getTypeName()) as Frame
    frame.autoShowHide = false
    frame.autoScaleContent = false
    frame.allowScaling = false
    frame.onInitialized.add(() => {
      frame.innerSize = new vec2(this.widthCm, this.heightCm)
      frame.padding = new vec2(0.8, 0.8)
      this.buildContent(frame.contentTransform.getSceneObject())
    })
  }

  /** Mount a large readable title on a physical card wrapper. */
  public attachCardTitle(parent: SceneObject, title: string): Text {
    const so = global.scene.createSceneObject("CardTitle")
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(0, 3.6, -3.4))
    const t = so.createComponent("Component.Text") as Text
    t.text = title
    t.depthTest = false
    t.size = 8
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-5.5, 5.5, -2.0, 2.0)
    const ink = this.titleInk ? this.titleInk : new vec4(0.08, 0.06, 0.05, 1)
    t.textFill.color = ink
    return t
  }

  public setCardTitle(label: Text, title: string): void {
    if (label) {
      label.text = title
    }
  }

  private buildContent(host: SceneObject): void {
    const content = this.obj(host, "Content", new vec3(0, 0, CONTENT_Z))
    const col = this.flexColumn(content, this.widthCm, this.heightCm, {
      gap: 0.8,
      padX: 0.8,
      padY: 0.6,
      justify: FlexJustify.Center,
      align: FlexAlign.Stretch,
    })

    this.flexChild(col, {h: 3.0}, (rowHost) => {
      const row = rowHost.createComponent(FlexLayout.getTypeName()) as FlexLayout
      row.autoDiscoverItemsOnStart = false
      row.onInitialized.add(() => {
        row.direction = FlexDirection.Row
        row.alignItems = FlexAlign.Center
        row.justifyContent = FlexJustify.SpaceBetween
        row.columnGap = 0.8
        row.width = this.widthCm - 1.6
        row.height = 3.0
      })
      this.addInput(rowHost, this.widthCm - 1.6 - 8.4)
      this.addButton(rowHost)
    })
  }

  private addInput(parent: SceneObject, widthCm: number): void {
    const tfSO = this.obj(parent, "Input")
    const tf = tfSO.createComponent(TextInputField.getTypeName()) as TextInputField
    tf.size = new vec3(widthCm, 3.0, 1)
    const item = tfSO.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = widthCm
    item.overrideHeight = 3.0
    const parentFlex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout
    if (parentFlex) {
      parentFlex.addItems([item])
    }
    this.inputField = tf
    this.createEvent("OnStartEvent").bind(() => {
      tf.onTextChanged.add((value: string) => {
        this.draftText = value
      })
    })
  }

  private addButton(parent: SceneObject): void {
    const sizeX = 7.6
    const sizeY = 3.0
    const so = this.obj(parent, "AddButton")
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(sizeX, sizeY, 1)
    const ec = so.createComponent(ElementContent.getTypeName()) as ElementContent
    ec.leadingIcon = ADD_ICON
    this.addButtonLabel(so, this.addLabel, sizeX - 2.2)
    const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = sizeX
    item.overrideHeight = sizeY
    const parentFlex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout
    if (parentFlex) {
      parentFlex.addItems([item])
    }
    btn.onTriggerUp.add(() => this.submitOrOpenKeyboard())
  }

  private addButtonLabel(parent: SceneObject, text: string, widthCM: number): void {
    const so = global.scene.createSceneObject("ButtonLabel")
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(0.6, 0, BUTTON_LABEL_Z))
    const t = so.createComponent("Component.Text") as Text
    t.text = text
    t.depthTest = true
    applyTextRole(t, "Button")
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-widthCM / 2, widthCM / 2, -1.2, 1.2)
  }

  private submitOrOpenKeyboard(): void {
    const fromField = (this.inputField ? this.inputField.text : this.draftText).trim()
    if (fromField.length > 0) {
      this.emitTitle(fromField)
      return
    }
    this.openKeyboard()
  }

  private openKeyboard(): void {
    require("LensStudio:TextInputModule")
    const options = new TextInputSystem.KeyboardOptions()
    options.enablePreview = true
    options.keyboardType = TextInputSystem.KeyboardType.Text
    options.returnKeyType = TextInputSystem.ReturnKeyType.Done
    options.onTextChanged = (text: string, _range: vec2) => {
      this.draftText = text
    }
    options.onReturnKeyPressed = () => {
      this.emitTitle(this.draftText)
      global.textInputSystem.dismissKeyboard()
    }
    options.onError = (error: number, description: string) => {
      print("[TodaydeskAddUI] keyboard error " + error + ": " + description)
    }
    global.textInputSystem.requestKeyboard(options)
  }

  private emitTitle(raw: string): void {
    const title = raw.trim()
    if (title.length === 0) {
      return
    }
    this.onAddTitle.invoke(title)
    this.draftText = ""
    if (this.inputField) {
      this.inputField.text = ""
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
