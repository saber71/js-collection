import type { QueryCondition, QueryItem } from "@heraclius/query"
import type { ICollection } from "./types.ts"

const map: Record<string, Transaction> = {}

export class Transaction<V extends QueryItem = QueryItem> implements ICollection<V> {
  static get<V extends QueryItem>(id: string, collection: ICollection<V>) {
    let transaction = map[id]
    if (!transaction) transaction = map[id] = new Transaction(id, collection)
    transaction.collection = collection
    return transaction
  }

  constructor(
    readonly id: string,
    public collection: ICollection<V>
  ) {
    this.begin()
  }

  private readonly _rollbackFns: Array<() => Promise<void> | any> = []
  private _begin = false
  private _timeoutHandler: any

  get name() {
    return this.collection.name
  }

  begin() {
    if (this._timeoutHandler) return
    this._begin = true
    this._timeoutHandler = setTimeout(() => {
      this.end()
      console.warn(`Transaction[${this.id}]超时自动关闭`)
    }, 30000)
  }

  end() {
    this._begin = false
    delete map[this.id]
    clearTimeout(this._timeoutHandler)
    this._timeoutHandler = undefined
  }

  async rollback() {
    for (let i = this._rollbackFns.length - 1; i >= 0; i--) {
      await this._rollbackFns[i]()
    }
    this._rollbackFns.length = 0
    this.end()
  }

  async delete(condition: QueryCondition<V>): Promise<V[]> {
    const collection = this.collection
    const result = await collection.delete(condition)
    if (result.length && this._begin) this._rollbackFns.push(() => collection.save(...result))
    return result
  }

  async deleteById(id: string): Promise<boolean> {
    const collection = this.collection
    const data = await collection.getById(id)
    if (data) {
      if (this._begin) this._rollbackFns.push(() => collection.save(data))
      return collection.deleteById(id)
    }
    return true
  }

  getById<Item extends V = V>(id: string): Promise<Item | undefined> {
    return this.collection.getById(id) as any
  }

  async save<Item extends V = V>(...items: Array<Omit<Item, "_id"> & { _id?: string }>): Promise<Item[]> {
    const collection = this.collection
    const result = await collection.save(...items)
    if (result.length && this._begin)
      this._rollbackFns.push(() =>
        collection.delete({
          _id: {
            $in: result.map((item) => item._id)
          }
        } as any)
      )
    return result
  }

  search(condition?: QueryCondition<V>): Promise<V[]> {
    return this.collection.search(condition) as any
  }

  searchOne(condition?: QueryCondition<V>): Promise<V | undefined> {
    return this.collection.searchOne(condition) as any
  }

  async update(...items: Array<Partial<V> & { _id: string }>): Promise<void> {
    const collection = this.collection
    const result = await collection.search({
      _id: {
        $in: items.map((item) => item._id)
      }
    } as any)
    await collection.update(...items)
    if (result.length && this._begin) this._rollbackFns.push(() => collection.save(...result))
  }
}
