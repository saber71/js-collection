import { deepAssign } from "@heraclius/js-tools"
import { query, type QueryCondition, type QueryItem } from "@heraclius/query"
import Keyv from "keyv"
import { KeyvFile } from "keyv-file"
import * as os from "node:os"
import { join } from "node:path"
import { v4 } from "uuid"
import type { ICollection } from "./types.ts"

/**
 * FileCollection 类用于管理和操作数据集合。
 * @template V 继承自 QueryItem 的数据项类型。
 */
export class FileCollection<V extends QueryItem = QueryItem> implements ICollection<V> {
  /**
   * 构造函数，初始化 Collection 实例。
   * @param namespace 集合的命名空间，用于数据存储的标识。
   */
  constructor(readonly namespace: string) {
    this.name = namespace
    this._keyValue = new Keyv({
      namespace,
      store: new KeyvFile({
        filename: join(os.homedir(), namespace + ".json")
      })
    })
  }

  readonly name: string
  private readonly _keyValue: Keyv

  /**
   * 更新指定数据项。
   * @param items 要更新的数据项数组，每个数据项需包含 _id 属性。
   */
  async update(...items: Array<Partial<V> & { _id: string }>) {
    for (let item of items) {
      const oldData = await this._keyValue.get(item._id)
      if (!oldData) throw new Error("Not found item in collection by id " + item._id)
      deepAssign(oldData, item)
      await this._keyValue.set(item._id, oldData)
    }
  }

  /**
   * 保存一个或多个数据项。
   * @param items 要保存的数据项数组，每个数据项可以包含 _id 属性，若不存在则自动生成。
   * @returns 返回保存后的数据项数组。
   */
  async save<Item extends V = V>(...items: Array<Omit<Item, "_id"> & { _id?: string }>) {
    for (let item of items) {
      if (!item._id) item._id = v4()
      await this._keyValue.set(item._id, item)
    }
    return items as Item[]
  }

  /**
   * 通过 ID 获取数据项。
   * @param id 要获取的数据项的 ID。
   * @returns 返回指定 ID 的数据项，若不存在则返回 undefined。
   */
  getById<Item extends V = V>(id: string) {
    return this._keyValue.get(id) as Promise<Item | undefined>
  }

  /**
   * 根据条件搜索数据项。
   * @param condition 搜索条件，可选。
   * @returns 返回满足条件的所有数据项数组。
   */
  async search(condition?: QueryCondition<V>) {
    const fn = query(condition)
    const result: V[] = []
    for await (let item of this._keyValue.iterator(this.namespace)) {
      if (fn(item)) result.push(item)
    }
    return result
  }

  /**
   * 根据条件搜索一个数据项。
   * @param condition 搜索条件，可选。
   * @returns 返回满足条件的第一个数据项，若不存在则返回 undefined。
   */
  async searchOne(condition?: QueryCondition<V>): Promise<V | undefined> {
    const fn = query(condition)
    for await (let item of this._keyValue.iterator(this.namespace)) {
      if (fn(item)) return item
    }
  }

  /**
   * 通过 ID 删除数据项。
   * @param id 要删除的数据项的 ID。
   * @returns 返回删除操作的结果。
   */
  deleteById(id: string) {
    return this._keyValue.delete(id)
  }

  /**
   * 根据条件删除数据项。
   * @param condition 删除条件。
   * @returns 返回被删除的数据项数组。
   */
  async delete(condition: QueryCondition<V>): Promise<V[]> {
    const result = await this.search(condition)
    for (let value of result) {
      await this._keyValue.delete(value._id)
    }
    return result
  }
}
