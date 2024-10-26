import { QueryCondition } from '@heraclius/query';
import { QueryItem } from '@heraclius/query';

/**
 * FileCollection 类用于管理和操作数据集合。
 * @template V 继承自 QueryItem 的数据项类型。
 */
export declare class FileCollection<V extends QueryItem = QueryItem> implements ICollection<V> {
    readonly namespace: string;
    /**
     * 构造函数，初始化 Collection 实例。
     * @param namespace 集合的命名空间，用于数据存储的标识。
     */
    constructor(namespace: string);
    readonly name: string;
    private readonly _keyValue;
    /**
     * 更新指定数据项。
     * @param items 要更新的数据项数组，每个数据项需包含 _id 属性。
     */
    update(...items: Array<Partial<V> & {
        _id: string;
    }>): Promise<void>;
    /**
     * 保存一个或多个数据项。
     * @param items 要保存的数据项数组，每个数据项可以包含 _id 属性，若不存在则自动生成。
     * @returns 返回保存后的数据项数组。
     */
    save<Item extends V = V>(...items: Array<Omit<Item, "_id"> & {
        _id?: string;
    }>): Promise<Item[]>;
    /**
     * 通过 ID 获取数据项。
     * @param id 要获取的数据项的 ID。
     * @returns 返回指定 ID 的数据项，若不存在则返回 undefined。
     */
    getById<Item extends V = V>(id: string): Promise<Item | undefined>;
    /**
     * 根据条件搜索数据项。
     * @param condition 搜索条件，可选。
     * @returns 返回满足条件的所有数据项数组。
     */
    search(condition?: QueryCondition<V>): Promise<V[]>;
    /**
     * 根据条件搜索一个数据项。
     * @param condition 搜索条件，可选。
     * @returns 返回满足条件的第一个数据项，若不存在则返回 undefined。
     */
    searchOne(condition?: QueryCondition<V>): Promise<V | undefined>;
    /**
     * 通过 ID 删除数据项。
     * @param id 要删除的数据项的 ID。
     * @returns 返回删除操作的结果。
     */
    deleteById(id: string): Promise<boolean>;
    /**
     * 根据条件删除数据项。
     * @param condition 删除条件。
     * @returns 返回被删除的数据项数组。
     */
    delete(condition: QueryCondition<V>): Promise<V[]>;
}

/**
 * 表示一个集合的接口，该集合用于存储和操作特定类型的数据。
 * @template V 继承自FilterItem的类型，表示集合中元素的类型。
 */
export declare interface ICollection<V extends QueryItem = QueryItem> {
    /**
     * 集合的名称。
     */
    readonly name: string;
    /**
     * 更新集合中的一个或多个项。
     * @param items 要更新的项的数组，每个项都是部分V类型并包含_id字段。
     */
    update(...items: Array<Partial<V> & {
        _id: string;
    }>): void | Promise<void>;
    /**
     * 保存一个或多个新项或已存在的项。
     * @param items 要保存的项的数组，每个项都是V类型但不包含_id字段，或者包含可选的_id字段。
     * @returns 返回保存的项的数组。
     */
    save<Item extends V = V>(...items: Array<Omit<Item, "_id"> & {
        _id?: string;
    }>): Item[] | Promise<Item[]>;
    /**
     * 根据_id获取集合中的一个项。
     * @param id 要获取的项的_id。
     * @returns 返回对应的项，如果不存在，则为undefined。
     */
    getById<Item extends V = V>(id: string): Item | undefined | Promise<Item | undefined>;
    /**
     * 根据条件搜索集合中的项。
     * @param condition 搜索条件，可选。
     * @returns 返回符合条件的项的数组。
     */
    search(condition?: QueryCondition<V>): V[] | Promise<V[]>;
    /**
     * 根据条件搜索集合中的第一项。
     * @param condition 搜索条件，可选。
     * @returns 返回符合条件的第一项，如果不存在，则为undefined。
     */
    searchOne(condition?: QueryCondition<V>): Promise<V | undefined> | V | undefined;
    /**
     * 根据_id删除集合中的一个项。
     * @param id 要删除的项的_id。
     * @returns 返回表示是否删除对应项。
     */
    deleteById(id: string): boolean | Promise<boolean>;
    /**
     * 根据条件删除集合中的项。
     * @param condition 删除条件。
     * @returns 返回被删除的项的数组。
     */
    delete(condition: QueryCondition<V>): Promise<V[]> | V[];
}

export declare class MemoryCollection<V extends QueryItem = QueryItem> implements ICollection<V> {
    readonly name: string;
    constructor(name?: string);
    private readonly _map;
    delete(condition: QueryCondition<V>): V[];
    deleteById(id: string): boolean;
    getById<Item extends V = V>(id: string): Item | undefined;
    save<Item extends V>(...items: Array<Omit<Item, "_id"> & {
        _id?: string;
    }>): Item[];
    search(condition?: QueryCondition<V>): V[];
    searchOne(condition?: QueryCondition<V>): V | undefined;
    update(...items: Array<Partial<V> & {
        _id: string;
    }>): void;
}

/**
 * Select 类用于构建和执行复杂的查询操作。
 * @template Result 查询结果的数据项类型。
 * @template FromValue 来源数据项的类型。
 */
export declare class Select<Result extends object, FromValue extends QueryItem> {
    /**
     * 构造函数，初始化 Select 实例。
     * @param fromCollection 来源数据集合。
     */
    private constructor();
    private readonly _from;
    private _condition?;
    private readonly _joinMap;
    private readonly _exposeMap;
    /**
     * 从指定集合开始构建查询。
     * @param fromCollection 来源数据集合。
     */
    static from<Result extends object, FromValue extends QueryItem>(fromCollection: ICollection<FromValue>): Select<Result, FromValue>;
    /**
     * 设置查询条件。
     * @param condition 查询条件，可选。
     * @returns 返回 Select 实例，支持链式调用。
     */
    where(condition?: QueryCondition<FromValue>): this;
    /**
     * 添加连接操作。
     * @param collection 要连接的数据集合。
     * @param cb 连接回调函数，用于根据来源数据项获取连接数据项。
     * @returns 返回 Select 实例，支持链式调用。
     */
    join<V extends QueryItem>(collection: ICollection<V>, cb: (item: FromValue) => Promise<V | V[]>): this;
    /**
     * 设置数据项的暴露方式。
     * @param collection 数据集合。
     * @param cb 暴露回调函数，用于根据数据项转换为查询结果项的部分属性。
     * @returns 返回 Select 实例，支持链式调用。
     */
    expose<V extends QueryItem>(collection: ICollection<V>, cb: (value: V | V[]) => Partial<Result>): this;
    /**
     * 执行查询并返回一个结果项。
     * @returns 返回查询结果的第一个数据项，若不存在则返回 undefined。
     */
    toOne(): Promise<Result | undefined>;
    /**
     * 执行查询并返回结果项数组。
     * @returns 返回查询结果的数据项数组。
     */
    toArray(): Promise<Result[]>;
    /**
     * 处理来源数据项，结合连接和暴露操作生成最终的查询结果项。
     * @param item 来源数据项。
     * @returns 返回处理后的查询结果项。
     */
    private _handleFromValue;
}

export declare class SqlCollection<V extends QueryItem = QueryItem> implements ICollection<V> {
    readonly name: string;
    constructor(name: string, save?: boolean);
    private readonly _dbPath;
    private readonly _db;
    private readonly _saveData;
    delete(condition: QueryCondition<V>): V[];
    deleteById(id: string): boolean;
    getById<Item extends V = V>(id: string): undefined | Item;
    save<Item extends V = V>(...items: Array<Omit<Item, "_id"> & {
        _id?: string;
    }>): Item[];
    search(condition?: QueryCondition<V>): V[];
    searchOne(condition?: QueryCondition<V>): V | undefined;
    update(...items: Array<Partial<V> & {
        _id: string;
    }>): void;
    private _execSql;
}

export declare class Transaction<V extends QueryItem = QueryItem> implements ICollection<V> {
    readonly id: string;
    collection: ICollection<V>;
    static get<V extends QueryItem>(id: string, collection: ICollection<V>): Transaction<QueryItem>;
    constructor(id: string, collection: ICollection<V>);
    private readonly _rollbackFns;
    private _begin;
    private _timeoutHandler;
    get name(): string;
    begin(): void;
    end(): void;
    rollback(): Promise<void>;
    delete(condition: QueryCondition<V>): Promise<V[]>;
    deleteById(id: string): Promise<boolean>;
    getById<Item extends V = V>(id: string): Promise<Item | undefined>;
    save<Item extends V = V>(...items: Array<Omit<Item, "_id"> & {
        _id?: string;
    }>): Promise<Item[]>;
    search(condition?: QueryCondition<V>): Promise<V[]>;
    searchOne(condition?: QueryCondition<V>): Promise<V | undefined>;
    update(...items: Array<Partial<V> & {
        _id: string;
    }>): Promise<void>;
}

export { }
