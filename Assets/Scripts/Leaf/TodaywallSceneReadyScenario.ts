import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"

@component
export class TodaywallSceneReadyScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)

    const todaywall = findSceneObjectByName("Todaywall")
    expect(todaywall).toBeTruthy()
    expect(todaywall.enabled).toBe(true)

    const board = findSceneObjectByName("TodaywallBoard")
    expect(board).toBeTruthy()
    expect(board.enabled).toBe(true)

    expect(findSceneObjectByName("TodoColumn")).toBeTruthy()
    expect(findSceneObjectByName("DoingColumn")).toBeTruthy()
    expect(findSceneObjectByName("DoneColumn")).toBeTruthy()
    expect(findSceneObjectByName("CardsRoot")).toBeTruthy()
    expect(findSceneObjectByName("TodaywallColumns")).toBeTruthy()
    expect(findSceneObjectByName("TodaywallAddPanel")).toBeTruthy()
    expect(findSceneObjectByName("TodaywallAudio")).toBeTruthy()

    const scanHint = await this.waitForObject("TodaywallScanHint", 4000)
    const hintText = scanHint.getComponent("Component.Text") as Text
    expect(hintText).toBeTruthy()
    expect(hintText.text.includes("Look at a wall")).toBe(true)
  }

  private async waitForObject(name: string, timeoutMs: number): Promise<SceneObject> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const found = findSceneObjectByName(name)
      if (found && !isNull(found)) {
        return found
      }
      await sleep(100)
    }
    throw new Error(`SceneObject "${name}" did not appear within ${timeoutMs}ms`)
  }
}
