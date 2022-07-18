import { gql } from 'apollo-server'

const typeDefs = gql`
  enum ProgramStatus {
    ARCHIVED
    PUBLISHED
    UNPUBLISHED
  }

  enum ProgramType {
    TRAINING
    UPROGRAM
  }

  enum ProgramView {
    COORDINATOR
    STUDENT
    TEACHER
    USER
  }

  type Program {
    banner: String
    code: ID!
    coordinator: User!
    courses: [Course!]!
    description: String!
    field: String
    hasRequestedInvite: Boolean @auth
    isArchived: Boolean @auth(requires: [ADMIN, TEACHER])
    isCoordinator: Boolean @auth(requires: TEACHER)
    isPublished: Boolean @auth(requires: [ADMIN, TEACHER])
    isRegistered: Boolean @auth(requires: STUDENT)
    language: String
    name: String!
    partners: [Partner!]
    registration: Registration @auth
    status: ProgramStatus @auth(requires: [ADMIN, TEACHER])
    tags: [String!]
    type: ProgramType!
    visibility: Visibility!
  }

  extend type Query {
    programs(offset: Int, limit: Int, view: ProgramView): [Program!]!
    program(code: ID!): Program
  }
`

export default typeDefs
