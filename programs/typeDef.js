import { gql } from 'apollo-server'

const typeDefs = gql`
  enum ProgramStatus {
    ARCHIVED
    PUBLISHED
    UNPUBLISHED
  }

  enum ProgramType {
    TRAINING
    UNIT
    UPROGRAM
  }

  enum ProgramView {
    COORDINATOR
    STUDENT
    USER
  }

  enum ProgramVisibility {
    INVITE_ONLY
    PRIVATE
    PUBLIC
  }

  type ProgramCourse {
    course: Course!
    isOptional: Boolean
  }

  type Program {
    archived: DateTime @auth(requires: TEACHER)
    banner: String
    code: ID!
    coordinator: User!
    courses: [ProgramCourse!]!
    description: String!
    field: String
    hasRequestedInvitation: Boolean @auth
    isArchived: Boolean @auth(requires: [ADMIN, TEACHER])
    isCoordinator: Boolean @auth(requires: TEACHER)
    isPublished: Boolean @auth(requires: [ADMIN, TEACHER])
    isRegistered: Boolean @auth(requires: STUDENT)
    language: String
    name: String!
    partners: [Partner!]
    published: DateTime @auth(requires: TEACHER)
    registration: Registration @auth
    status: ProgramStatus @auth(requires: [ADMIN, TEACHER])
    tags: [String!]
    type: ProgramType!
    visibility: ProgramVisibility!
  }

  extend type Query {
    program(code: ID!): Program
    programs(offset: Int, limit: Int, view: ProgramView): [Program!]!
  }

  input ProgramCourseInput {
    course: ID!
    optional: Boolean
  }

  extend type Mutation {
    createProgram(
      code: String!
      courses: [ProgramCourseInput!]!
      description: String
      name: String!
      type: ProgramType
      visibility: ProgramVisibility
    ): Program @auth(requires: TEACHER)
    editProgram(
      code: String!
      courses: [ProgramCourseInput!]
      description: String
      name: String
      type: ProgramType
      visibility: ProgramVisibility
    ): Program @auth(requires: TEACHER)
    publishProgram(code: ID!): Program @auth(requires: TEACHER)
  }
`

export default typeDefs
