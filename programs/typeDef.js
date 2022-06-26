import { gql } from 'apollo-server'

const typeDefs = gql`
  enum ProgramType {
    TRAINING
    UPROGRAM
  }

  type Program {
    banner: String
    code: ID!
    coordinator: User!
    courses: [Course!]!
    description: String!
    field: String
    hasRequestedInvite: Boolean @auth
    isCoordinator: Boolean @auth(requires: TEACHER)
    isRegistered: Boolean @auth(requires: STUDENT)
    language: String
    name: String!
    partners: [Partner!]
    registration: Registration @auth
    tags: [String!]
    type: ProgramType!
    visibility: Visibility!
  }

  extend type Query {
    programs(offset: Int, limit: Int): [Program!]!
    program(code: ID!): Program
  }
`

export default typeDefs
