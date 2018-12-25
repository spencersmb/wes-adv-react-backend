const {GraphQLServer} = require('graphql-yoga')
const Mutation = require('./resolvers/Mutation')
const Query = require('./resolvers/Query')
const db = require('./db')

// Create the GraphQL Yoga Server
function createServer () {
  return new GraphQLServer({
    typeDefs: 'src/schema.graphql', // specific GraphQL mutations and Query's we custom write
    resolvers: {
      Mutation, // push data
      Query, // get data
    },
    resolverValidationOptions: {
      requireResolversForResolveType: false,
    },
    context: req => ({...req, db}),
  })
}

module.exports = createServer