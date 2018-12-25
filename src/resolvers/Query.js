const {forwardTo} = require('prisma-binding') // gives us the ability to query our DB using yoga

const Query = {
  // Quick way to mock up api requests and build it out later with AUTH
  items: forwardTo('db'),

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
