import { gql } from 'apollo-server'

const typeDefs = gql`
  type Partner {
    abbreviation: String
    banner: String
    code: ID!
    courses: [Course!]
    description: String!
    logo: String
    name: String!
    representative: User!
    website: String
  }

  extend type Query {
    partner(code: ID!): Partner
    partners(limit: Int): [Partner!]!
  }

  extend type Mutation {
    createPartner(
      abbreviation: String
      code: ID!
      description: String
      name: String!
      website: String
    ): Partner @auth(requires: MANAGER)
  }
`

export default typeDefs
