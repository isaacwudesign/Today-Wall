/**
 * TodaywallMain — lifecycle and wiring only.
 * Does not author UIKit, spawn meshes, or persist. Pushes titles into the
 * board; board owns grab/drop; UI modules are passive views.
 */

import {TodaywallAddUI} from "./TodaywallAddUI"
import {TodaywallAudioController} from "./TodaywallAudioController"
import {TodaywallBoardController} from "./TodaywallBoardController"
import {TodaywallBoardUI} from "./TodaywallBoardUI"
import {requireRef} from "./TodaywallSceneRefs"
import {TodaywallState} from "./TodaywallState"

@component
export class TodaywallMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TodaywallMain – orchestrates wall board</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Board controller (pin + cards)")
  board: TodaywallBoardController
  @input
  @hint("See-through column UI")
  boardUI: TodaywallBoardUI
  @input
  @hint("Add-task UI")
  addUI: TodaywallAddUI
  @input
  @hint("Audio cues")
  audio: TodaywallAudioController
  @ui.group_end
  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("Draw collider wireframes for cards")
  debugColliders: boolean = false
  @ui.group_end

  private state = new TodaywallState()

  onAwake(): void {
    requireRef(this.board, "board")
    requireRef(this.boardUI, "boardUI")
    requireRef(this.addUI, "addUI")
    requireRef(this.audio, "audio")
    print("[Todaywall] Ready. Look at a wall and pinch to pin the board.")
    this.state.load()
    this.createEvent("OnStartEvent").bind(() => {
      this.addUI.onAddTitle.add((title: string) => {
        this.board.addTitle(title, this.debugColliders)
      })
      this.board.bootstrap(this.state, this.debugColliders)
      this.setColliderDebugAll(this.getSceneObject(), this.debugColliders)
    })
  }

  private setColliderDebugAll(root: SceneObject, on: boolean): void {
    const collider = root.getComponent("Physics.ColliderComponent") as ColliderComponent
    if (collider) {
      collider.debugDrawEnabled = on
    }
    const body = root.getComponent("Physics.BodyComponent") as BodyComponent
    if (body) {
      body.debugDrawEnabled = on
    }
    const count = root.getChildrenCount()
    for (let i = 0; i < count; i++) {
      this.setColliderDebugAll(root.getChild(i), on)
    }
  }
}
