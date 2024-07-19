import { throttle } from "@heraclius/js-tools"
import { query, type QueryCondition, type QueryItem } from "@heraclius/query"
import * as fs from "node:fs"
import { writeFile } from "node:fs/promises"
import * as os from "node:os"
import path from "node:path"
import initSql, { type Database } from "sql.js/dist/sql-wasm.js"
import { v4 } from "uuid"
import type { ICollection } from "./types.ts"

const { Database } = await initSql()

export class SqlCollection<V extends QueryItem = QueryItem> implements ICollection<V> {
  constructor(
    readonly name: string,
    save = false
  ) {
    this._dbPath = path.join(os.homedir(), name + ".sqlite")
    let data: any
    if (fs.existsSync(this._dbPath)) {
      data = fs.readFileSync(this._dbPath)
    }
    this._db = new Database(data)
    this._db.run(`CREATE TABLE IF NOT EXISTS ${name}
                  (
                      id
                      TEXT
                      PRIMARY
                      KEY,
                      data
                      TEXT
                  )`)
    this._saveData = throttle(() => {
      if (save) {
        const data = this._db.export()
        writeFile(this._dbPath, data)
      }
    }, 300)
  }

  private readonly _dbPath: string
  private readonly _db: Database
  private readonly _saveData: () => void

  delete(condition: QueryCondition<V>): V[] {
    const result = this.search(condition)
    result.forEach((item) => this.deleteById(item._id))
    return result
  }

  deleteById(id: string): boolean {
    const exist = !!this.getById(id)
    this._db.exec(`delete from ${this.name} where id = '${id}'`)
    this._saveData()
    return exist
  }

  //@ts-ignore
  getById<Item extends V = V>(id: string): undefined | Item {
    const result = this._execSql(`select * from ${this.name} where id = '${id}'`)
    if (result.length) return result[0] as any
    return undefined
  }

  save<Item extends V = V>(...items: Array<Omit<Item, "_id"> & { _id?: string }>): Item[] {
    const result: Item[] = []
    for (let item of items) {
      let data: any = item
      let insert = false
      if (item._id) {
        insert = !this.getById(item._id)
      } else {
        data = Object.assign({ _id: v4() }, item)
        insert = true
      }
      result.push(data)
      if (insert) this._db.run(`insert into ${this.name} values ('${data._id}','${JSON.stringify(data)}')`)
      else this._db.run(`update ${this.name} set data = '${JSON.stringify(data)}' where id = '${data._id}'`)
    }
    if (items.length) this._saveData()
    return result
  }

  search(condition?: QueryCondition<V>): V[] {
    const result = this._execSql(`select * from ${this.name}`)
    const fn = query(condition)
    return result.filter(fn)
  }

  searchOne(condition?: QueryCondition<V>): V | undefined {
    const result = this._execSql(`select * from ${this.name}`)
    const fn = query(condition)
    for (let item of result) {
      if (fn(item)) return item
    }
  }

  update(...items: Array<Partial<V> & { _id: string }>): void {
    for (let item of items) {
      let data: any
      if (item._id) data = this.getById(item._id)
      else throw new Error("_id is required")
      Object.assign(data, item)
      this._db.run(`update ${this.name} set data = '${JSON.stringify(data)}' where id = '${item._id}'`)
    }
    if (items.length) this._saveData()
  }

  private _execSql(sql: string) {
    const result = this._db.exec(sql)
    return result
      .map((item) =>
        item.values.map((row: any[]) => {
          const obj: any = {}
          item.columns.forEach((column: any, index: number) => {
            obj[column] = row[index]
          })
          return obj
        })
      )
      .flat()
      .map((item) => JSON.parse(item.data) as V)
  }
}
