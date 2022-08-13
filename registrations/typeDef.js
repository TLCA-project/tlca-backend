import { gql } from 'apollo-server'

const typeDefs = gql`
  enum RegistrationInvitation {
    REQUESTED
    SENT
  }

  type Progress {
    advanced: Int
    basic: Int!
  }

  type Registration {
    datetime: DateTime!
    email: String
    group: RegistrationGroup
    id: ID!
    invitation: RegistrationInvitation
    progress: Progress
    user: User
  }

  type RegistrationGroup {
    teaching: Int
    working: Int
  }

  extend type Query {
    registrations(
      confirmed: Boolean
      courseCode: ID
      limit: Int
      offset: Int
    ): [Registration!] @auth(requires: [ADMIN, TEACHER])
  }

  extend type Mutation {
    acceptInvitationRequest(id: ID!): Registration @auth(requires: TEACHER)
    removeGroup(id: ID!, group: Int!, type: GroupType!): Registration
      @auth(requires: TEACHER)
    updateGroup(id: ID!, group: Int!, type: GroupType!): Registration
      @auth(requires: TEACHER)
  }
`

export default typeDefs
