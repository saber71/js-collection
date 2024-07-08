import { type QueryCondition, type QueryItem } from "@heraclius/query"
import type { ICollection } from "./types"

/**
 * Select 类用于构建和执行复杂的查询操作。
 * @template Result 查询结果的数据项类型。
 * @template FromValue 来源数据项的类型。
 */
export class Select<Result extends object, FromValue extends QueryItem> {
  /**
   * 构造函数，初始化 Select 实例。
   * @param fromCollection 来源数据集合。
   */
  private constructor(fromCollection: ICollection<FromValue>) {
    this._from = fromCollection
    return this.expose(fromCollection, (value) => value as any)
  }

  private readonly _from: ICollection<FromValue>
  private _condition?: QueryCondition<FromValue>
  private readonly _joinMap = new Map<ICollection, Function>()
  private readonly _exposeMap = new Map<ICollection, Function>()

  /**
   * 从指定集合开始构建查询。
   * @param fromCollection 来源数据集合。
   */
  static from<Result extends object, FromValue extends QueryItem>(fromCollection: ICollection<FromValue>) {
    return new Select<Result, FromValue>(fromCollection)
  }

  /**
   * 设置查询条件。
   * @param condition 查询条件，可选。
   * @returns 返回 Select 实例，支持链式调用。
   */
  where(condition?: QueryCondition<FromValue>) {
    this._condition = condition
    return this
  }

  /**
   * 添加连接操作。
   * @param collection 要连接的数据集合。
   * @param cb 连接回调函数，用于根据来源数据项获取连接数据项。
   * @returns 返回 Select 实例，支持链式调用。
   */
  join<V extends QueryItem>(collection: ICollection<V>, cb: (item: FromValue) => Promise<V | V[]>) {
    this._joinMap.set(collection, cb)
    this._exposeMap.set(collection, (val: any) => val)
    return this
  }

  /**
   * 设置数据项的暴露方式。
   * @param collection 数据集合。
   * @param cb 暴露回调函数，用于根据数据项转换为查询结果项的部分属性。
   * @returns 返回 Select 实例，支持链式调用。
   */
  expose<V extends QueryItem>(collection: ICollection<V>, cb: (value: V | V[]) => Partial<Result>) {
    this._exposeMap.set(collection, cb)
    return this
  }

  /**
   * 执行查询并返回一个结果项。
   * @returns 返回查询结果的第一个数据项，若不存在则返回 undefined。
   */
  async toOne() {
    const fromValue = await this._from.searchOne(this._condition)
    if (!fromValue) return
    return await this._handleFromValue(fromValue)
  }

  /**
   * 执行查询并返回结果项数组。
   * @returns 返回查询结果的数据项数组。
   */
  async toArray() {
    const array = await this._from.search(this._condition)
    const resultArray: Result[] = []
    for (let item of array) {
      resultArray.push(await this._handleFromValue(item))
    }
    return resultArray
  }

  /**
   * 处理来源数据项，结合连接和暴露操作生成最终的查询结果项。
   * @param item 来源数据项。
   * @returns 返回处理后的查询结果项。
   */
  private async _handleFromValue(item: FromValue) {
    const result: Result = Object.assign({}, this._exposeMap.get(this._from)?.(item))
    for (let [joinCollection, joinCB] of this._joinMap.entries()) {
      const value = await joinCB(item)
      const exposedValue = this._exposeMap.get(joinCollection)?.(value)
      Object.assign(result, exposedValue)
    }
    return result
  }
}
