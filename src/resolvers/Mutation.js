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
  }

}

module.exports = Mutations
