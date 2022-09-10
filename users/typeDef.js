import { gql } from 'apollo-server'

const typeDefs = gql`
  type SignInResponse {
    refreshToken: String!
    token: String!
  }

  type User {
    displayName: String!
    email: String!
    firstName: String
    id: ID!
    isValidated: Boolean
    lastName: String
    roles: [String!]!
    username: ID!
  }

  extend type Query {
    me: User
    users(offset: Int, limit: Int): [User!]! @auth(requires: ADMIN)
    colleagues: [User!]! @auth(requires: TEACHER)
  }

  extend type Mutation {
    refreshToken(token: String!): SignInResponse!
    signIn(usernameOrEmail: String!, password: String!): SignInResponse!
    signOut: Boolean @auth
    signUp(email: String!, password: String!): Boolean
    validateAccount(username: String!, emailConfirmationToken: String!): Boolean
  }
`

export default typeDefs
