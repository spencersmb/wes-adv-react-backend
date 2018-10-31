const Mutations = {
  createItem (parent, args, ctx, info) {
    // TODO: AUTH - check if user is logged in

    // we put the db on the ctx object in our other file,
    // createServer.js, we put it on CONTEXT
    const item = ctx.db.createItem({
      data: {
        ...args
      }
    })
  }
  // createDog (parent, args, ctx, info) {
  //   console.log('args', args)
  //
  // }
}

module.exports = Mutations
