/**
 * TodaydeskState — titles, tray assignment, and PersistentStorage.
 * Pure logic. Does not touch the scene graph or play audio.
 */

import {TodaydeskTrayId} from "./TodaydeskAssetManifest"

export interface TodaydeskCardRecord {
  id: string
  title: string
  tray: TodaydeskTrayId
}

const STORAGE_KEY = "todaydesk.v1.cards"
const DEFAULT_CARDS: TodaydeskCardRecord[] = [
  {id: "sample-1", title: "Write recap", tray: "todo"},
  {id: "sample-2", title: "Book dentist", tray: "todo"},
  {id: "sample-3", title: "Review PRs", tray: "doing"},
  {id: "sample-4", title: "Inbox 10", tray: "todo"},
  {id: "sample-5", title: "Water plants", tray: "done"},
]

export class TodaydeskState {
  private cards: TodaydeskCardRecord[] = []
  private nextId = 1

  public load(): void {
    try {
      const store = global.persistentStorageSystem.store
      if (store.has(STORAGE_KEY)) {
        const raw = store.getString(STORAGE_KEY)
        const parsed = JSON.parse(raw) as {cards?: TodaydeskCardRecord[]}
        if (parsed && parsed.cards && parsed.cards.length > 0) {
          this.cards = parsed.cards.filter((c) => c && c.title && c.tray)
          this.recomputeNextId()
          return
        }
      }
    } catch (e) {
      print("[TodaydeskState] load failed, using samples: " + e)
    }
    this.cards = DEFAULT_CARDS.map((c) => ({id: c.id, title: c.title, tray: c.tray}))
    this.recomputeNextId()
    this.save()
  }

  public save(): void {
    try {
      const store = global.persistentStorageSystem.store
      store.putString(STORAGE_KEY, JSON.stringify({cards: this.cards}))
    } catch (e) {
      print("[TodaydeskState] save failed: " + e)
    }
  }

  public getCards(): TodaydeskCardRecord[] {
    return this.cards.slice()
  }

  public addCard(title: string, tray: TodaydeskTrayId = "todo"): TodaydeskCardRecord {
    const trimmed = title.trim()
    const record: TodaydeskCardRecord = {
      id: "card-" + this.nextId++,
      title: trimmed.length > 0 ? trimmed : "New task",
      tray: tray,
    }
    this.cards.push(record)
    this.save()
    return record
  }

  public moveCard(id: string, tray: TodaydeskTrayId): void {
    for (const card of this.cards) {
      if (card.id === id) {
        card.tray = tray
        this.save()
        return
      }
    }
  }

  public cardsIn(tray: TodaydeskTrayId): TodaydeskCardRecord[] {
    const out: TodaydeskCardRecord[] = []
    for (const card of this.cards) {
      if (card.tray === tray) {
        out.push(card)
      }
    }
    return out
  }

  private recomputeNextId(): void {
    let max = 0
    for (const card of this.cards) {
      const m = /^card-(\d+)$/.exec(card.id)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > max) {
          max = n
        }
      }
    }
    this.nextId = max + 1
  }
}
