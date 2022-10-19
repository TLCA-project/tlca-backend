import Bugsnag from '@bugsnag/js'
import { ApolloServer } from 'apollo-server'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'

import { schema, models } from './data/schema.js'
import { connectDB } from './lib/mongoose.js'

dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

// Configure BugSnag monitoring.
Bugsnag.start({
  appVersion: '1.1.10',
  apiKey: process.env.BUGSNAG_SERVER_API_KEY,
  enabledReleaseStages: ['production'],
  environment: process.env.NODE_ENV,
})
const bugsnagPlugin = () => ({
  requestDidStart: async () => ({
    async didEncounterErrors(requestContext) {
      requestContext.errors.forEach((error) => {
        if (
          !['BAD_USER_INPUT', 'UNAUTHENTICATED'].includes(
            error.extensions?.code
          )
        ) {
          Bugsnag.notify(error, (event) => {
            event.addMetadata('GraphQLMetadata', {
              path: error.path,
            })
          })
        }
      })
    },
  }),
})

// Initialise SMTP transport.
const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: 587,
  secure: false,
  ignoreTLS: true,
  auth: {
    user: process.env.SMTP_SERVER_USER,
    pass: process.env.SMTP_SERVER_PASSWORD,
  },
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
      smtpTransport,
      user,
    }
  },
  plugins: [bugsnagPlugin],
})

// Launch the apollo server.
server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
