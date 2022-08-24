import Bugsnag from '@bugsnag/js'
import { ApolloServer } from 'apollo-server'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

import { schema, models } from './data/schema.js'
import { connectDB } from './lib/mongoose.js'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

// Configure BugSnag monitoring.
Bugsnag.start({
  appVersion: '1.0.2',
  apiKey: process.env.BUGSNAG_SERVER_API_KEY,
  enabledReleaseStages: ['production'],
  environment: process.env.NODE_ENV,
})
const bugsnagPlugin = () => ({
  requestDidStart: async () => ({
    async didEncounterErrors(requestContext) {
      requestContext.errors.forEach((error) => {
        Bugsnag.notify(error, (event) => {
          event.addMetadata('GraphQLMetadata', {
            path: error.path,
          })
        })
      })
    },
  }),
})

// Connect to MongoDB.
await connectDB(process.env.MONGODB_URI)

// Extract the user from the token for authentication.
const getUser = function (token) {
  if (token) {
    try {
      token = token.split(' ')[1]
      return jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET)
    } catch (err) {
      return null
    }
  }
}

// Create and configure the Apollo server.
const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    const token = req?.headers?.authorization || ''
    const user = getUser(token)
    return {
      env: process.env,
      models,
      user,
    }
  },
  plugins: [bugsnagPlugin],
})

// Launch the apollo server.
server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
