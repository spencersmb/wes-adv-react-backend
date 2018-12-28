const Mutations = {
  // parent - schema of graphQL
  // args - arguments passed into the query
  // ctx - access the db and rest of req(headers, cookies, etc..)
  // info - information on the graphQL query
  async createItem (parent, args, ctx, info) {
    
    // TODO: AUTH - check if user is logged in

    // we put the db on the ctx object in our other file,
    // createServer.js, we put it on CONTEXT
    const item = await ctx.db.mutation.createItem({
      data: {
        ...args
      }
    }, info) // info makes sure we return that item that was added to the DB

    return item
  },
  updateItem (parent, args, ctx, info) {
    // first make copy of updates
    const updates = {...args}
    // remove ID from updates obj
    delete updates.id
    // run update method
    // you can find what the update method takes as args in prisma.graphql
    return ctx.db.mutation.updateItem({
      data: updates,
      where: {
        id: args.id
      }
    }, info)
  },
  async deleteItem (parent, args, ctx, info) {

    const where = {id: args.id}
    // 1. find item 
    // the backticks are passing a manual query because the items query is nested inside 
    // the delete mutation
    const item = await ctx.db.query.items({where}, `{id title}`)

    // 2. Check if they own that item, or have the permissions


    // 3. Delete it!
    return ctx.db.mutation.deleteItem({ where }, info)
  }

}

module.exports = Mutations
