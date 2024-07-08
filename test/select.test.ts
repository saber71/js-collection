import { QueryItem } from "@heraclius/query"
import { describe, expect, it } from "vitest"
import { ICollection, MemoryCollection, Select } from "../src"

interface User extends QueryItem {
  name: string
}

interface Post extends QueryItem {
  title: string
  userId: string
}

const users: ICollection<User> = new MemoryCollection<User>("user") as any
const posts: ICollection<Post> = new MemoryCollection<Post>("post") as any
users.save({ _id: "1", name: "Alice" }, { _id: "2", name: "Bob" })
posts.save({ _id: "1", title: "Post 1", userId: "1" }, { _id: "2", title: "Post 2", userId: "1" })

describe("Select", () => {
  it("should initialize correctly", () => {
    const select = Select.from<User, User>(users)
    expect(select).toBeInstanceOf(Select)
  })

  it("should filter correctly using where", async () => {
    const select = Select.from<User, User>(users).where({ _id: "1" })
    const user = await select.toOne()
    expect(user).toEqual({ _id: "1", name: "Alice" })
  })

  it("should join collections correctly", async () => {
    const select = Select.from<User & { posts: Post[] }, User>(users)
      .join(posts, async (user) => {
        return posts.search({ userId: user._id })
      })
      .expose(posts, (posts: Post[]) => ({ posts }))

    const result = await select.toOne()
    expect(result).toEqual({
      _id: "1",
      name: "Alice",
      posts: [
        { _id: "1", title: "Post 1", userId: "1" },
        { _id: "2", title: "Post 2", userId: "1" }
      ]
    })
  })

  it("should expose data correctly", async () => {
    const select = Select.from<{ name: string }, User>(users).expose(users, (user: User) => ({ name: user.name }))

    const result = await select.toOne()
    expect(result).toEqual({ name: "Alice" })
  })

  it("should return an array of results correctly", async () => {
    const select = Select.from<User, User>(users)
    const results = await select.toArray()
    expect(results).toEqual([
      { _id: "1", name: "Alice" },
      { _id: "2", name: "Bob" }
    ])
  })
})
