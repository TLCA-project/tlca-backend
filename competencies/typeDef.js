import { gql } from 'apollo-server';

const typeDefs = gql`
  type Competency {
    code: ID!
    name: String!
    description: String
  }
`;

export default typeDefs;
