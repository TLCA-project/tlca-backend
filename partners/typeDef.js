import { gql } from 'apollo-server';

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
    partners(limit: Int): [Partner!]!
    partner(code: ID!): Partner
  }
`;

export default typeDefs;
