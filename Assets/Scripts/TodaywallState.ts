/**
 * TodaywallState — titles, column assignment, and PersistentStorage.
 * Pure logic. Does not touch the scene graph or play audio.
 */

import {TODAYWALL_STORAGE_KEY, TodaywallColorId, TodaywallColumnId} from "./TodaywallAssetManifest"

export interface TodaywallCardRecord {
  id: string
  title: string
  column: TodaywallColumnId
  color: TodaywallColorId
}

const DEFAULT_CARDS: TodaywallCardRecord[] = [
  {id: "sample-1", title: "Write recap", column: "todo", color: "slate"},
  {id: "sample-2", title: "Book dentist", column: "todo", color: "slate"},
  {id: "sample-3", title: "Review PRs", column: "doing", color: "slate"},
  {id: "sample-4", title: "Inbox 10", column: "todo", color: "slate"},
  {id: "sample-5", title: "Water plants", column: "done", color: "slate"},
]

export class TodaywallState {
  private cards: TodaywallCardRecord[] = []
  private nextId = 1

  public load(): void {
    try {
      const store = global.persistentStorageSystem.store
      if (store.has(TODAYWALL_STORAGE_KEY)) {
        const raw = store.getString(TODAYWALL_STORAGE_KEY)
        const parsed = JSON.parse(raw) as {cards?: TodaywallCardRecord[]}
        if (parsed && parsed.cards && parsed.cards.length > 0) {
          this.cards = parsed.cards
            .filter((c) => c && c.title && c.column)
            .map((c) => ({
              id: c.id,
              title: c.title,
              column: c.column,
              color: c.color ? c.color : "slate",
            }))
          this.recomputeNextId()
          return
        }
      }
    } catch (e) {
      print("[TodaywallState] load failed, using samples: " + e)
    }
    this.cards = DEFAULT_CARDS.map((c) => ({id: c.id, title: c.title, column: c.column, color: c.color}))
    this.recomputeNextId()
    this.save()
  }

  public save(): void {
    try {
      const store = global.persistentStorageSystem.store
      store.putString(TODAYWALL_STORAGE_KEY, JSON.stringify({cards: this.cards}))
    } catch (e) {
      print("[TodaywallState] save failed: " + e)
    }
  }

  public getCards(): TodaywallCardRecord[] {
    return this.cards.slice()
  }

  public addCard(title: string, column: TodaywallColumnId = "todo"): TodaywallCardRecord {
    const trimmed = title.replace(/\s+/g, " ").trim()
    const record: TodaywallCardRecord = {
      id: "card-" + this.nextId++,
      title: trimmed.length > 0 ? trimmed : "New task",
      column: column,
      color: "slate",
    }
    this.cards.push(record)
    this.save()
    return record
  }

  public moveCard(id: string, column: TodaywallColumnId, index: number = -1): void {
    const from = this.cards.findIndex((c) => c.id === id)
    if (from < 0) {
      return
    }
    const [card] = this.cards.splice(from, 1)
    card.column = column
    const siblings: number[] = []
    for (let i = 0; i < this.cards.length; i++) {
      if (this.cards[i].column === column) {
        siblings.push(i)
      }
    }
    const max = siblings.length
    const slot = index < 0 ? max : Math.max(0, Math.min(index, max))
    let at = this.cards.length
    if (siblings.length === 0) {
      at = this.cards.length
    } else if (slot >= siblings.length) {
      at = siblings[siblings.length - 1] + 1
    } else {
      at = siblings[slot]
    }
    this.cards.splice(at, 0, card)
    this.save()
  }

  public setCardColor(id: string, color: TodaywallColorId): void {
    for (const card of this.cards) {
      if (card.id === id) {
        card.color = color
        this.save()
        return
      }
    }
  }

  public removeCard(id: string): void {
    this.cards = this.cards.filter((c) => c.id !== id)
    this.save()
  }

  public countIn(column: TodaywallColumnId): number {
    let n = 0
    for (const card of this.cards) {
      if (card.column === column) {
        n++
      }
    }
    return n
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
