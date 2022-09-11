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
    registration(courseCode: ID): Registration @auth
    registrations(
      confirmed: Boolean
      courseCode: ID
      limit: Int
      offset: Int
    ): [Registration!] @auth(requires: [ADMIN, TEACHER])
  }

  extend type Mutation {
    acceptInvitation(id: ID!): Registration @auth
    acceptInvitationRequest(id: ID!): Registration @auth(requires: TEACHER)
    register(courseCode: ID!): Registration @auth(requires: STUDENT)
    removeGroup(id: ID!, type: GroupType!): Registration
      @auth(requires: TEACHER)
    requestInvitation(courseCode: ID!): Registration @auth
    sendInvitation(courseCode: ID!, email: String!): Registration
      @auth(requires: TEACHER)
    updateGroup(id: ID!, group: Int!, type: GroupType!): Registration
      @auth(requires: TEACHER)
  }
`

export default typeDefs
