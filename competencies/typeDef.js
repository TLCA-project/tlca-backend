import { gql } from 'apollo-server'

const typeDefs = gql`
  enum CompetencyType {
    PRACTICAL
    THEORETICAL
  }

  type Competency {
    code: ID!
    description: String
    isOwner: Boolean
    isPublic: Boolean
    name: String!
    partners: [Partner!]
    type: CompetencyType
    user: User!
  }

  extend type Query {
    competencies(offset: Int, limit: Int): [Competency!]! @auth
    competency(code: ID!): Competency @auth
  }

  extend type Mutation {
    createCompetency(
      code: String!
      name: String!
      description: String
      type: CompetencyType
      isPublic: Boolean
      partners: [ID!]
    ): Boolean! @auth(requires: TEACHER)
  }
`

export default typeDefs
