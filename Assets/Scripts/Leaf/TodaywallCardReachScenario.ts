import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {getInteractables} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {TodaywallLeafInteractor} from "./TodaywallLeafInteractor"

@component
export class TodaywallCardReachScenario extends Scenario {
  private readonly ik = createIKInteractor()

  async run(): Promise<void> {
    const interactor = new TodaywallLeafInteractor()
    await interactor.pinchToPinInFront()

    const cardsRoot = findSceneObjectByName("CardsRoot")
    expect(cardsRoot).toBeTruthy()
    expect(cardsRoot.enabled).toBe(true)

    const cardCountBefore = this.countCardInteractables()
    expect(cardCountBefore).toBeGreaterThan(0)

    const card = this.firstCardInteractable()
    if (!card) {
      throw new Error("No enabled Card-* interactable after pin")
    }

    await this.ik.trigger(card)
    await sleep(400)

    const cardCountAfter = this.countCardInteractables()
    expect(cardCountAfter).toBe(cardCountBefore)
    expect(card.getSceneObject().enabled).toBe(true)
  }

  private firstCardInteractable() {
    const hits = getInteractables()
    for (let i = 0; i < hits.length; i++) {
      const obj = hits[i].getSceneObject()
      if (obj.name.startsWith("Card-") && hits[i].enabled && obj.isEnabledInHierarchy) {
        return hits[i]
      }
    }
    return undefined
  }

  private countCardInteractables(): number {
    let n = 0
    const hits = getInteractables()
    for (let i = 0; i < hits.length; i++) {
      if (hits[i].getSceneObject().name.startsWith("Card-")) {
        n++
      }
    }
    return n
  }
}
