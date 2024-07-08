import { describe, expect, test } from "vitest"
import { SqlCollection } from "../src"

describe("SqlCollection", () => {
  test("delete should delete all items that match the condition", () => {
    // Arrange
    const sqlCollection = new SqlCollection("test")
    sqlCollection.save({ _id: "1", data: "test1" }, { _id: "2", data: "test2" })

    // Act
    const deletedItems = sqlCollection.delete({ data: "test1" })

    // Assert
    expect(deletedItems).toHaveLength(1)
    expect(deletedItems[0].data).toBe("test1")
    expect(sqlCollection.search({ data: "test1" })).toHaveLength(0)
  })

  test("deleteById should delete the item with the given id", () => {
    // Arrange
    const sqlCollection = new SqlCollection("test")
    sqlCollection.save({ _id: "1", data: "test1" })

    // Act
    const result = sqlCollection.deleteById("1")

    // Assert
    expect(result).toBe(true)
    expect(sqlCollection.getById("1")).toBeUndefined()
  })

  test("getById should return the item with the given id", () => {
    // Arrange
    const item = { _id: "1", data: "test1" }
    const sqlCollection = new SqlCollection("test")
    sqlCollection.save(item)

    // Act
    const result = sqlCollection.getById("1")

    // Assert
    expect(result).toEqual(item)
  })

  test("save should save new items and update existing items", () => {
    // Arrange
    const newItem = { data: "newItem" }
    const existingItem = { _id: "1", data: "existingItem" }
    const sqlCollection = new SqlCollection("test")
    sqlCollection.save(existingItem)

    // Act
    const savedItems = sqlCollection.save(newItem, { ...existingItem, data: "updatedItem" })

    // Assert
    expect(savedItems).toHaveLength(2)
    expect(savedItems[0]).toEqual({ _id: expect.any(String), data: "newItem" })
    expect(savedItems[1]).toEqual({ ...existingItem, data: "updatedItem" })
    expect(sqlCollection.getById("1")).toEqual({ ...existingItem, data: "updatedItem" })
  })

  test("search should return all items that match the condition", () => {
    // Arrange
    const sqlCollection = new SqlCollection("test")
    sqlCollection.save({ _id: "1", data: "test1" }, { _id: "2", data: "test2" })

    // Act
    const result = sqlCollection.search({ data: "test1" })

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].data).toBe("test1")
  })

  test("searchOne should return the first item that matches the condition", () => {
    // Arrange
    const sqlCollection = new SqlCollection("test")
    sqlCollection.save({ _id: "1", data: "test1" }, { _id: "2", data: "test2" })

    // Act
    const result = sqlCollection.searchOne({ data: "test1" })

    // Assert
    expect(result).toEqual({ _id: "1", data: "test1" })
  })

  test("update should update the items with the given ids", () => {
    // Arrange
    const existingItem1 = { _id: "1", data: "existingItem1" }
    const existingItem2 = { _id: "2", data: "existingItem2" }
    const sqlCollection = new SqlCollection("test")
    sqlCollection.save(existingItem1, existingItem2)

    // Act
    sqlCollection.update({ _id: "1", data: "updatedItem1" }, { _id: "2", data: "updatedItem2" })

    // Assert
    expect(sqlCollection.getById("1")).toEqual({ _id: "1", data: "updatedItem1" })
    expect(sqlCollection.getById("2")).toEqual({ _id: "2", data: "updatedItem2" })
  })
})
