import { gql } from 'apollo-server'

const typeDefs = gql`
  type Event {
    description: String
    end: DateTime!
    id: ID!
    start: DateTime!
    title: String!
  }

  extend type Query {
    event(id: ID!): Event @auth(requires: TEACHER)
    events(courseCode: ID): [Event!] @auth(requires: TEACHER)
  }
`

export default typeDefs
