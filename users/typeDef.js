import { gql } from 'apollo-server'

const typeDefs = gql`
  type SignInResponse {
    token: String!
  }

  type User {
    displayName: String!
    firstName: String!
    id: ID!
    lastName: String!
    roles: [String!]!
    username: ID!
  }

  extend type Query {
    me: User
  }

  extend type Mutation {
    signIn(usernameOrEmail: String!, password: String!): SignInResponse!
    signOut: Boolean @auth
    signUp(email: String!, password: String!): Boolean
  }
`

export default typeDefs
