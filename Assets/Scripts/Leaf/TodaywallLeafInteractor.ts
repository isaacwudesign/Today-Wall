import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"

/**
 * Shared Todaywall actions. Placement needs ~2.4s of hunt time before a
 * no-wall pinch is allowed (`allowFrontPin`), then an SIK pinch pins in front.
 */
export class TodaywallLeafInteractor extends DefaultLeafInteractor {
  async waitForPlacementWindow(): Promise<void> {
    await sleep(1500)
    await sleep(2800)
  }

  async pinchToPinInFront(): Promise<void> {
    await this.waitForPlacementWindow()
    const right = LeafHandInteractor.get("right")
    await right.hand.makeGesture("pinch")
    await sleep(800)
    await right.hand.makeGesture("relaxed")
    await sleep(400)
  }

  async tapButton(buttonName: string): Promise<void> {
    const button = findInteractablesByName(buttonName, undefined, true)[0]
    if (!button) {
      throw new Error(`Button "${buttonName}" not found or not enabled`)
    }
    await this.trigger(button)
    await sleep(200)
  }
}
