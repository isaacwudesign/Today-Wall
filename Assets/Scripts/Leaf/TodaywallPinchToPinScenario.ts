import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName} from "Leaf.lspkg/Utils/common/Utils"
import {TodaywallLeafInteractor} from "./TodaywallLeafInteractor"

@component
export class TodaywallPinchToPinScenario extends Scenario {
  async run(): Promise<void> {
    const interactor = new TodaywallLeafInteractor()

    const cardsRoot = findSceneObjectByName("CardsRoot")
    expect(cardsRoot).toBeTruthy()
    const addPanel = findSceneObjectByName("TodaywallAddPanel")
    expect(addPanel).toBeTruthy()

    const cardsEnabledBefore = cardsRoot.enabled
    const addEnabledBefore = addPanel.enabled

    await interactor.pinchToPinInFront()

    expect(cardsRoot.enabled).toBe(true)
    expect(addPanel.enabled).toBe(true)

    const becameVisible = (!cardsEnabledBefore && cardsRoot.enabled) || (!addEnabledBefore && addPanel.enabled)
    expect(becameVisible || (cardsRoot.enabled && addPanel.enabled)).toBe(true)

    expect(cardsRoot.getChildrenCount()).toBeGreaterThan(0)

    const addButton = findInteractableByName("AddButton", undefined, true)
    expect(addButton).toBeTruthy()
  }
}
