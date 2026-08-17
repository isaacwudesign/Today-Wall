/**
 * TodaydeskMain — lifecycle and wiring only.
 * Does not author UIKit, spawn meshes, or persist. Pushes titles into the
 * board; board owns grab/drop; AddUI is a passive view.
 */

import {TodaydeskAddUI} from "./TodaydeskAddUI"
import {TodaydeskAudioController} from "./TodaydeskAudioController"
import {TodaydeskBoardController} from "./TodaydeskBoardController"
import {requireRef} from "./TodaydeskSceneRefs"
import {TodaydeskState} from "./TodaydeskState"

@component
export class TodaydeskMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TodaydeskMain – orchestrates planner</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Board controller (trays + cards)")
  board: TodaydeskBoardController
  @input
  @hint("Add-task UI")
  addUI: TodaydeskAddUI
  @input
  @hint("Audio cues")
  audio: TodaydeskAudioController
  @ui.group_end
  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("Draw collider wireframes for trays and cards")
  debugColliders: boolean = false
  @ui.group_end

  private state = new TodaydeskState()

  onAwake(): void {
    requireRef(this.board, "board")
    requireRef(this.addUI, "addUI")
    requireRef(this.audio, "audio")
    print("[Todaydesk] Ready. Look down, grab a card, drop it in a tray.")
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
