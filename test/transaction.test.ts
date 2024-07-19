import type { QueryItem } from "@heraclius/query"
import { beforeEach, describe, expect, test } from "vitest"
import { MemoryCollection, Transaction } from "../src"

interface TestItem extends QueryItem {
  name: string
  age: number
}

describe("Transaction rollback", () => {
  let collection: MemoryCollection<TestItem>
  let transaction: Transaction<TestItem>

  beforeEach(() => {
    collection = new MemoryCollection<TestItem>("test")
    transaction = new Transaction<TestItem>("1", collection as any)
  })

  test("rollback after delete", async () => {
    const item1 = { name: "John", age: 30, _id: "1" }
    const item2 = { name: "Jane", age: 25, _id: "2" }
    await collection.save(item1, item2)

    transaction.begin()
    await transaction.delete({ name: "John" })
    const result = await collection.search()
    expect(result).toHaveLength(1)

    await transaction.rollback()
    const finalResult = await collection.search()
    expect(finalResult).toHaveLength(2)
    expect(finalResult).toContainEqual(item1)
    expect(finalResult).toContainEqual(item2)
  })

  test("rollback after save", async () => {
    transaction.begin()
    await transaction.save({ name: "Alice", age: 28 })
    const result = await collection.search()
    expect(result).toHaveLength(1)

    await transaction.rollback()
    const finalResult = await collection.search()
    expect(finalResult).toHaveLength(0)
  })

  test("rollback after update", async () => {
    const item1 = { name: "John", age: 30, _id: "1" }
    await collection.save(item1)

    transaction.begin()
    await transaction.update({ _id: "1", name: "Johnny", age: 31 })
    const result = await collection.searchOne({ _id: "1" })
    expect(result).toEqual({ name: "Johnny", age: 31, _id: "1" })

    await transaction.rollback()
    const finalResult = await collection.searchOne({ _id: "1" })
    expect(finalResult).toEqual(item1)
  })
})
