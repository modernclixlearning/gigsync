/**
 * Mocks for Dexie
 */

import { vi } from 'vitest'

export class MockTable<T> {
  private data: Map<string, T> = new Map()

  async get(id: string): Promise<T | undefined> {
    return this.data.get(id)
  }

  async add(item: T): Promise<string> {
    const id = (item as any).id || crypto.randomUUID()
    this.data.set(id, item)
    return id
  }

  async update(id: string, changes: Partial<T>): Promise<number> {
    const item = this.data.get(id)
    if (item) {
      this.data.set(id, { ...item, ...changes } as T)
      return 1
    }
    return 0
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id)
  }

  async bulkGet(ids: string[]): Promise<(T | undefined)[]> {
    return ids.map((id) => this.data.get(id))
  }

  orderBy(field: string): MockOrderBy<T> {
    return new MockOrderBy(this.data, field)
  }

  toArray(): Promise<T[]> {
    return Promise.resolve(Array.from(this.data.values()))
  }
}

class MockOrderBy<T> {
  constructor(
    private data: Map<string, T>,
    private field: string
  ) {}

  toArray(): Promise<T[]> {
    const items = Array.from(this.data.values())
    items.sort((a, b) => {
      const aVal = (a as any)[this.field]
      const bVal = (b as any)[this.field]
      if (aVal < bVal) return -1
      if (aVal > bVal) return 1
      return 0
    })
    return Promise.resolve(items)
  }
}

export class MockDexie {
  songs: MockTable<any>
  setlists: MockTable<any>

  constructor() {
    this.songs = new MockTable()
    this.setlists = new MockTable()
  }
}

export const mockDb = new MockDexie()
