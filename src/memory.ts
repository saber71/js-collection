import type { ICollection } from "./types.ts"
import { deepAssign } from "@heraclius/js-tools"
import { query, type QueryCondition, type QueryItem } from "@heraclius/query"
import { v4 } from "uuid"

export class MemoryCollection<V extends QueryItem = QueryItem> implements ICollection<V> {
  constructor(readonly name: string = "memory") {}

  private readonly _map = new Map<string, V>()

  delete(condition: QueryCondition<V>): V[] {
    const result = this.search(condition)
    for (let value of result) {
      this._map.delete(value._id)
    }
    return result
  }

  deleteById(id: string): boolean {
    const result = this._map.get(id)
    if (result) {
      this._map.delete(id)
      return true
    }
    return false
  }

  //@ts-ignore
  getById<Item extends V = V>(id: string): Item | undefined {
    return this._map.get(id) as any
  }

  save<Item extends V>(...items: Array<Omit<Item, "_id"> & { _id?: string }>): Item[] {
    for (let item of items) {
      if (!item._id) item._id = v4()
      this._map.set(item._id, item as any)
    }
    return items as Item[]
  }

  search(condition?: QueryCondition<V>): V[] {
    const fn = query(condition)
    const result: V[] = []
    for (let item of this._map.values()) {
      if (fn(item)) result.push(item)
    }
    return result
  }

  searchOne(condition?: QueryCondition<V>): V | undefined {
    const fn = query(condition)
    for (let item of this._map.values()) {
      if (fn(item)) return item
    }
  }

  update(...items: Array<Partial<V> & { _id: string }>): void {
    for (let item of items) {
      const oldData = this._map.get(item._id)
      if (!oldData) throw new Error("Not found item in collection by id " + item._id)
      deepAssign(oldData, item)
      this._map.set(item._id, oldData)
    }
  }
}
