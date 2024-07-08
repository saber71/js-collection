import { type QueryCondition, type QueryItem } from "@heraclius/query"

/**
 * 表示一个集合的接口，该集合用于存储和操作特定类型的数据。
 * @template V 继承自FilterItem的类型，表示集合中元素的类型。
 */
export interface ICollection<V extends QueryItem = QueryItem> {
  /**
   * 集合的名称。
   */
  readonly name: string

  /**
   * 更新集合中的一个或多个项。
   * @param items 要更新的项的数组，每个项都是部分V类型并包含_id字段。
   */
  update(...items: Array<Partial<V> & { _id: string }>): void | Promise<void>

  /**
   * 保存一个或多个新项或已存在的项。
   * @param items 要保存的项的数组，每个项都是V类型但不包含_id字段，或者包含可选的_id字段。
   * @returns 返回保存的项的数组。
   */
  save<Item extends V = V>(...items: Array<Omit<Item, "_id"> & { _id?: string }>): Item[] | Promise<Item[]>

  /**
   * 根据_id获取集合中的一个项。
   * @param id 要获取的项的_id。
   * @returns 返回对应的项，如果不存在，则为undefined。
   */
  getById<Item extends V = V>(id: string): Item | undefined | Promise<Item | undefined>

  /**
   * 根据条件搜索集合中的项。
   * @param condition 搜索条件，可选。
   * @returns 返回符合条件的项的数组。
   */
  search(condition?: QueryCondition<V>): V[] | Promise<V[]>

  /**
   * 根据条件搜索集合中的第一项。
   * @param condition 搜索条件，可选。
   * @returns 返回符合条件的第一项，如果不存在，则为undefined。
   */
  searchOne(condition?: QueryCondition<V>): Promise<V | undefined> | V | undefined

  /**
   * 根据_id删除集合中的一个项。
   * @param id 要删除的项的_id。
   * @returns 返回表示是否删除对应项。
   */
  deleteById(id: string): boolean | Promise<boolean>

  /**
   * 根据条件删除集合中的项。
   * @param condition 删除条件。
   * @returns 返回被删除的项的数组。
   */
  delete(condition: QueryCondition<V>): Promise<V[]> | V[]
}
