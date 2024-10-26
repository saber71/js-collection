import { deepAssign, throttle } from '@heraclius/js-tools';
import { query } from '@heraclius/query';
import { v4 } from 'uuid';
import * as fs from 'node:fs';
import { writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import path, { join } from 'node:path';
import initSql from 'sql.js/dist/sql-wasm.js';
import Keyv from 'keyv';
import { KeyvFile } from 'keyv-file';

/**
 * Select 类用于构建和执行复杂的查询操作。
 * @template Result 查询结果的数据项类型。
 * @template FromValue 来源数据项的类型。
 */ class Select {
    /**
   * 构造函数，初始化 Select 实例。
   * @param fromCollection 来源数据集合。
   */ constructor(fromCollection){
        this._from = fromCollection;
        return this.expose(fromCollection, (value)=>value);
    }
    _from;
    _condition;
    _joinMap = new Map();
    _exposeMap = new Map();
    /**
   * 从指定集合开始构建查询。
   * @param fromCollection 来源数据集合。
   */ static from(fromCollection) {
        return new Select(fromCollection);
    }
    /**
   * 设置查询条件。
   * @param condition 查询条件，可选。
   * @returns 返回 Select 实例，支持链式调用。
   */ where(condition) {
        this._condition = condition;
        return this;
    }
    /**
   * 添加连接操作。
   * @param collection 要连接的数据集合。
   * @param cb 连接回调函数，用于根据来源数据项获取连接数据项。
   * @returns 返回 Select 实例，支持链式调用。
   */ join(collection, cb) {
        this._joinMap.set(collection, cb);
        this._exposeMap.set(collection, (val)=>val);
        return this;
    }
    /**
   * 设置数据项的暴露方式。
   * @param collection 数据集合。
   * @param cb 暴露回调函数，用于根据数据项转换为查询结果项的部分属性。
   * @returns 返回 Select 实例，支持链式调用。
   */ expose(collection, cb) {
        this._exposeMap.set(collection, cb);
        return this;
    }
    /**
   * 执行查询并返回一个结果项。
   * @returns 返回查询结果的第一个数据项，若不存在则返回 undefined。
   */ async toOne() {
        const fromValue = await this._from.searchOne(this._condition);
        if (!fromValue) return;
        return await this._handleFromValue(fromValue);
    }
    /**
   * 执行查询并返回结果项数组。
   * @returns 返回查询结果的数据项数组。
   */ async toArray() {
        const array = await this._from.search(this._condition);
        const resultArray = [];
        for (let item of array){
            resultArray.push(await this._handleFromValue(item));
        }
        return resultArray;
    }
    /**
   * 处理来源数据项，结合连接和暴露操作生成最终的查询结果项。
   * @param item 来源数据项。
   * @returns 返回处理后的查询结果项。
   */ async _handleFromValue(item) {
        const result = Object.assign({}, this._exposeMap.get(this._from)?.(item));
        for (let [joinCollection, joinCB] of this._joinMap.entries()){
            const value = await joinCB(item);
            const exposedValue = this._exposeMap.get(joinCollection)?.(value);
            Object.assign(result, exposedValue);
        }
        return result;
    }
}

class MemoryCollection {
    name;
    constructor(name = "memory"){
        this.name = name;
        this._map = new Map();
    }
    _map;
    delete(condition) {
        const result = this.search(condition);
        for (let value of result){
            this._map.delete(value._id);
        }
        return result;
    }
    deleteById(id) {
        const result = this._map.get(id);
        if (result) {
            this._map.delete(id);
            return true;
        }
        return false;
    }
    //@ts-ignore
    getById(id) {
        return this._map.get(id);
    }
    save(...items) {
        for (let item of items){
            if (!item._id) item._id = v4();
            this._map.set(item._id, item);
        }
        return items;
    }
    search(condition) {
        const fn = query(condition);
        const result = [];
        for (let item of this._map.values()){
            if (fn(item)) result.push(item);
        }
        return result;
    }
    searchOne(condition) {
        const fn = query(condition);
        for (let item of this._map.values()){
            if (fn(item)) return item;
        }
    }
    update(...items) {
        for (let item of items){
            const oldData = this._map.get(item._id);
            if (!oldData) throw new Error("Not found item in collection by id " + item._id);
            deepAssign(oldData, item);
            this._map.set(item._id, oldData);
        }
    }
}

const { Database } = await initSql();
class SqlCollection {
    name;
    constructor(name, save = false){
        this.name = name;
        this._dbPath = path.join(os.homedir(), name + ".sqlite");
        let data;
        if (fs.existsSync(this._dbPath)) {
            data = fs.readFileSync(this._dbPath);
        }
        this._db = new Database(data);
        this._db.run(`CREATE TABLE IF NOT EXISTS ${name}
                  (
                      id
                      TEXT
                      PRIMARY
                      KEY,
                      data
                      TEXT
                  )`);
        this._saveData = throttle(()=>{
            if (save) {
                const data = this._db.export();
                writeFile(this._dbPath, data);
            }
        }, 300);
    }
    _dbPath;
    _db;
    _saveData;
    delete(condition) {
        const result = this.search(condition);
        result.forEach((item)=>this.deleteById(item._id));
        return result;
    }
    deleteById(id) {
        const exist = !!this.getById(id);
        this._db.exec(`delete from ${this.name} where id = '${id}'`);
        this._saveData();
        return exist;
    }
    //@ts-ignore
    getById(id) {
        const result = this._execSql(`select * from ${this.name} where id = '${id}'`);
        if (result.length) return result[0];
        return undefined;
    }
    save(...items) {
        const result = [];
        for (let item of items){
            let data = item;
            let insert = false;
            if (item._id) {
                insert = !this.getById(item._id);
            } else {
                data = Object.assign({
                    _id: v4()
                }, item);
                insert = true;
            }
            result.push(data);
            if (insert) this._db.run(`insert into ${this.name} values ('${data._id}','${JSON.stringify(data)}')`);
            else this._db.run(`update ${this.name} set data = '${JSON.stringify(data)}' where id = '${data._id}'`);
        }
        if (items.length) this._saveData();
        return result;
    }
    search(condition) {
        const result = this._execSql(`select * from ${this.name}`);
        const fn = query(condition);
        return result.filter(fn);
    }
    searchOne(condition) {
        const result = this._execSql(`select * from ${this.name}`);
        const fn = query(condition);
        for (let item of result){
            if (fn(item)) return item;
        }
    }
    update(...items) {
        for (let item of items){
            let data;
            if (item._id) data = this.getById(item._id);
            else throw new Error("_id is required");
            Object.assign(data, item);
            this._db.run(`update ${this.name} set data = '${JSON.stringify(data)}' where id = '${item._id}'`);
        }
        if (items.length) this._saveData();
    }
    _execSql(sql) {
        const result = this._db.exec(sql);
        return result.map((item)=>item.values.map((row)=>{
                const obj = {};
                item.columns.forEach((column, index)=>{
                    obj[column] = row[index];
                });
                return obj;
            })).flat().map((item)=>JSON.parse(item.data));
    }
}

/**
 * FileCollection 类用于管理和操作数据集合。
 * @template V 继承自 QueryItem 的数据项类型。
 */ class FileCollection {
    namespace;
    /**
   * 构造函数，初始化 Collection 实例。
   * @param namespace 集合的命名空间，用于数据存储的标识。
   */ constructor(namespace){
        this.namespace = namespace;
        this.name = namespace;
        this._keyValue = new Keyv({
            namespace,
            store: new KeyvFile({
                filename: join(os.homedir(), namespace + ".json")
            })
        });
    }
    name;
    _keyValue;
    /**
   * 更新指定数据项。
   * @param items 要更新的数据项数组，每个数据项需包含 _id 属性。
   */ async update(...items) {
        for (let item of items){
            const oldData = await this._keyValue.get(item._id);
            if (!oldData) throw new Error("Not found item in collection by id " + item._id);
            deepAssign(oldData, item);
            await this._keyValue.set(item._id, oldData);
        }
    }
    /**
   * 保存一个或多个数据项。
   * @param items 要保存的数据项数组，每个数据项可以包含 _id 属性，若不存在则自动生成。
   * @returns 返回保存后的数据项数组。
   */ async save(...items) {
        for (let item of items){
            if (!item._id) item._id = v4();
            await this._keyValue.set(item._id, item);
        }
        return items;
    }
    /**
   * 通过 ID 获取数据项。
   * @param id 要获取的数据项的 ID。
   * @returns 返回指定 ID 的数据项，若不存在则返回 undefined。
   */ getById(id) {
        return this._keyValue.get(id);
    }
    /**
   * 根据条件搜索数据项。
   * @param condition 搜索条件，可选。
   * @returns 返回满足条件的所有数据项数组。
   */ async search(condition) {
        const fn = query(condition);
        const result = [];
        for await (let item of this._keyValue.iterator(this.namespace)){
            if (fn(item)) result.push(item);
        }
        return result;
    }
    /**
   * 根据条件搜索一个数据项。
   * @param condition 搜索条件，可选。
   * @returns 返回满足条件的第一个数据项，若不存在则返回 undefined。
   */ async searchOne(condition) {
        const fn = query(condition);
        for await (let item of this._keyValue.iterator(this.namespace)){
            if (fn(item)) return item;
        }
    }
    /**
   * 通过 ID 删除数据项。
   * @param id 要删除的数据项的 ID。
   * @returns 返回删除操作的结果。
   */ deleteById(id) {
        return this._keyValue.delete(id);
    }
    /**
   * 根据条件删除数据项。
   * @param condition 删除条件。
   * @returns 返回被删除的数据项数组。
   */ async delete(condition) {
        const result = await this.search(condition);
        for (let value of result){
            await this._keyValue.delete(value._id);
        }
        return result;
    }
}

const map = {};
class Transaction {
    id;
    collection;
    static get(id, collection) {
        let transaction = map[id];
        if (!transaction) transaction = map[id] = new Transaction(id, collection);
        transaction.collection = collection;
        return transaction;
    }
    constructor(id, collection){
        this.id = id;
        this.collection = collection;
        this._rollbackFns = [];
        this._begin = false;
        this.begin();
    }
    _rollbackFns;
    _begin;
    _timeoutHandler;
    get name() {
        return this.collection.name;
    }
    begin() {
        if (this._timeoutHandler) return;
        this._begin = true;
        this._timeoutHandler = setTimeout(()=>{
            this.end();
            console.warn(`Transaction[${this.id}]超时自动关闭`);
        }, 30000);
    }
    end() {
        this._begin = false;
        delete map[this.id];
        clearTimeout(this._timeoutHandler);
        this._timeoutHandler = undefined;
    }
    async rollback() {
        for(let i = this._rollbackFns.length - 1; i >= 0; i--){
            await this._rollbackFns[i]();
        }
        this._rollbackFns.length = 0;
        this.end();
    }
    async delete(condition) {
        const collection = this.collection;
        const result = await collection.delete(condition);
        if (result.length && this._begin) this._rollbackFns.push(()=>collection.save(...result));
        return result;
    }
    async deleteById(id) {
        const collection = this.collection;
        const data = await collection.getById(id);
        if (data) {
            if (this._begin) this._rollbackFns.push(()=>collection.save(data));
            return collection.deleteById(id);
        }
        return true;
    }
    getById(id) {
        return this.collection.getById(id);
    }
    async save(...items) {
        const collection = this.collection;
        const result = await collection.save(...items);
        if (result.length && this._begin) this._rollbackFns.push(()=>collection.delete({
                _id: {
                    $in: result.map((item)=>item._id)
                }
            }));
        return result;
    }
    search(condition) {
        return this.collection.search(condition);
    }
    searchOne(condition) {
        return this.collection.searchOne(condition);
    }
    async update(...items) {
        const collection = this.collection;
        const result = await collection.search({
            _id: {
                $in: items.map((item)=>item._id)
            }
        });
        await collection.update(...items);
        if (result.length && this._begin) this._rollbackFns.push(()=>collection.save(...result));
    }
}

export { FileCollection, MemoryCollection, Select, SqlCollection, Transaction };
