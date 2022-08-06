import { gql } from 'apollo-server'

const typeDefs = gql`
  enum RegistrationInvite {
    REQUESTED
    SENT
  }

  type Registration {
    date: Date
    email: String
    group: Int
    id: ID!
    invite: RegistrationInvite
    user: User
  }

  extend type Mutation {
    updateGroup(id: ID!, group: Int!): Registration @auth(requires: TEACHER)
  }
`

export default typeDefs
