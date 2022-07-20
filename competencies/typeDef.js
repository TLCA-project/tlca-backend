import { gql } from 'apollo-server'

const typeDefs = gql`
  enum CompetencyType {
    PRACTICAL
    THEORETICAL
  }

  type Competency {
    code: ID!
    created: Date! @auth(requires: ADMIN)
    description: String
    isOwner: Boolean @auth
    isPublic: Boolean
    name: String!
    partners: [Partner!]
    tags: [String!]
    type: CompetencyType
    user: User! @auth(requires: [ADMIN, TEACHER])
  }

  extend type Query {
    competencies(offset: Int, limit: Int): [Competency!]! @auth
    competency(code: ID!): Competency @auth
  }

  extend type Mutation {
    createCompetency(
      code: String!
      description: String
      name: String!
      partners: [ID!]
      public: Boolean
      tags: [String!]
      type: CompetencyType
    ): Boolean! @auth(requires: TEACHER)
  }
`

export default typeDefs
