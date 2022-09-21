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
    isConfirmed: Boolean
    lastName: String
    roles: [String!]!
    username: ID!
  }

  extend type Query {
    colleagues: [User!]! @auth(requires: TEACHER)
    me: User
    user(username: ID!): User @auth
    users(offset: Int, limit: Int): [User!]! @auth(requires: ADMIN)
  }

  extend type Mutation {
    confirmAccount(username: String!, emailConfirmationToken: String!): Boolean!
    editUser(firstName: String, lastName: String, username: ID): User @auth
    refreshToken(token: String!): SignInResponse!
    resendConfirmationEmail(username: String!): Boolean!
    signIn(usernameOrEmail: String!, password: String!): SignInResponse!
    signOut: Boolean @auth
    signUp(email: String!, password: String!): Boolean
  }
`

export default typeDefs
