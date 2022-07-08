import { gql } from 'apollo-server'

const typeDefs = gql`
  type Assessment {
    code: String
    course: Course
    description: String!
    end: Date
    id: ID!
    name: String!
    start: Date
  }

  extend type Query {
    assessment(id: ID!): Assessment @auth(requires: TEACHER)
  }
`

export default typeDefs
