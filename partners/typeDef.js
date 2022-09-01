import { gql } from 'apollo-server'

const typeDefs = gql`
  enum PartnerView {
    MANAGER
    USER
  }

  type Partner {
    abbreviation: String
    banner: String
    code: ID!
    courses: [Course!]
    description: String!
    isManager: Boolean
    logo: String
    name: String!
    representative: User!
    website: String
  }

  extend type Query {
    partner(code: ID!): Partner
    partners(offset: Int, limit: Int, view: PartnerView): [Partner!]!
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
