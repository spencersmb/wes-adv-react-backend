const {forwardTo} = require('prisma-binding') // gives us the ability to query our DB using yoga

// Process to create a query
// 1. Edit schema.graphql
// 2. Edit Query.js or Mutations.js
// 3. Restart server + playhground then test in playground

const Query = {

  // Quick way to mock up api requests and build it out later with AUTH
  items: forwardTo('db'),
  item: forwardTo('db'),
  
  // pagination
  itemsConnection: forwardTo('db'),

  me(parent, args, ctx, info){
    // check if there is a current user ID
    if(!ctx.request.userId){
      return null;
    }

    return ctx.db.query.user({
      where: {
        id: ctx.request.userId
      }
    }, info)
  }

  // MANUAL WAY
  // parent - schema of graphQL
  // args - arguments passed into the query
  // ctx - access the db and rest of req(headers, cookies, etc..)
  // info - information on the graphQL query
  // async items(parent, args, ctx, info){
  //   return await ctx.db.query.items()
  // }
}

module.exports = Query
