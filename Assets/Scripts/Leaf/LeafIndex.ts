import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {TodaywallCardReachScenario} from "./TodaywallCardReachScenario"
import {TodaywallPinchToPinScenario} from "./TodaywallPinchToPinScenario"
import {TodaywallSceneReadyScenario} from "./TodaywallSceneReadyScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {
      id: "todaywall-scene-ready",
      typename: TodaywallSceneReadyScenario.getTypeName(),
    },
    {
      id: "todaywall-pinch-to-pin",
      typename: TodaywallPinchToPinScenario.getTypeName(),
    },
    {
      id: "todaywall-card-reach",
      typename: TodaywallCardReachScenario.getTypeName(),
    },
  ]
}
