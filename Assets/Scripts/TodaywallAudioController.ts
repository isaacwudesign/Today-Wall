/**
 * TodaywallAudioController — pickup / drop / done SFX.
 * Expects nothing from the scene besides this host object. Does not own
 * board state or UI.
 */

const PICKUP_TRACK = requireAsset("../GeneratedSFX/WallPickup.wav") as AudioTrackAsset
const DROP_TRACK = requireAsset("../GeneratedSFX/WallDrop.wav") as AudioTrackAsset
const DONE_TRACK = requireAsset("../GeneratedSFX/WallDone.wav") as AudioTrackAsset

@component
export class TodaywallAudioController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TodaywallAudio – quiet grab/drop cues</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Pickup volume (0–1)")
  @widget(new SliderWidget(0, 1, 0.05))
  pickupVolume: number = 0.4
  @input
  @hint("Drop volume (0–1)")
  @widget(new SliderWidget(0, 1, 0.05))
  dropVolume: number = 0.45
  @input
  @hint("Done-column settle volume (0–1)")
  @widget(new SliderWidget(0, 1, 0.05))
  doneVolume: number = 0.5
  @ui.group_end

  private pickupAudio: AudioComponent
  private dropAudio: AudioComponent
  private doneAudio: AudioComponent

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      this.pickupAudio = this.makeVoice("Pickup", PICKUP_TRACK)
      this.dropAudio = this.makeVoice("Drop", DROP_TRACK)
      this.doneAudio = this.makeVoice("Done", DONE_TRACK)
      this.pickupAudio.playbackMode = Audio.PlaybackMode.LowLatency
      this.dropAudio.playbackMode = Audio.PlaybackMode.LowLatency
      this.doneAudio.playbackMode = Audio.PlaybackMode.LowLatency
    })
  }

  public playPickup(): void {
    this.play(this.pickupAudio, this.pickupVolume)
  }

  public playDrop(): void {
    this.play(this.dropAudio, this.dropVolume)
  }

  public playDone(): void {
    this.play(this.doneAudio, this.doneVolume)
  }

  private makeVoice(name: string, track: AudioTrackAsset): AudioComponent {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(this.sceneObject)
    const audio = obj.createComponent("Component.AudioComponent") as AudioComponent
    audio.audioTrack = track
    return audio
  }

  private play(audio: AudioComponent, volume: number): void {
    if (!audio || !audio.audioTrack) {
      return
    }
    audio.volume = volume
    audio.play(1)
  }
}
