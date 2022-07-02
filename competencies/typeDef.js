import { gql } from 'apollo-server'

const typeDefs = gql`
  enum CompetencyType {
    PRACTICAL
    THEORETICAL
  }

  type Competency {
    code: ID!
    description: String
    name: String!
    partners: [Partner!]
    isOwner: Boolean
    isPublic: Boolean
    type: CompetencyType
    user: User!
  }

  extend type Query {
    competencies(offset: Int, limit: Int): [Competency!]! @auth
    competency(code: ID!): Competency @auth
  }
`

export default typeDefs
