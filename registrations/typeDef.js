import { gql } from 'apollo-server'

const typeDefs = gql`
  enum RegistrationInvitation {
    REQUESTED
    SENT
  }

  type CompetencyProgress {
    competency: Competency!
    learningOutcomes: [Int!]
    progress: Int!
    stars: Int
  }

  type Progress {
    advanced: Int
    basic: Int!
    competencies: [CompetencyProgress!]
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
    registration(courseCode: ID, programCode: ID): Registration @auth
    registrations(
      confirmed: Boolean
      courseCode: ID
      limit: Int
      offset: Int
      programCode: ID
    ): [Registration!] @auth(requires: [ADMIN, TEACHER])
  }

  extend type Mutation {
    acceptInvitation(id: ID!): Registration @auth
    acceptInvitationRequest(id: ID!): Registration @auth(requires: TEACHER)
    deleteRegistration(id: ID!): Boolean @auth(requires: TEACHER)
    register(courseCode: ID!): Registration @auth(requires: STUDENT)
    removeGroup(id: ID!, type: GroupType!): Registration
      @auth(requires: TEACHER)
    requestInvitation(courseCode: ID, programCode: ID): Registration @auth
    sendInvitation(courseCode: ID!, email: String!): Registration
      @auth(requires: TEACHER)
    updateGroup(id: ID!, group: Int!, type: GroupType!): Registration
      @auth(requires: TEACHER)
  }
`

export default typeDefs
