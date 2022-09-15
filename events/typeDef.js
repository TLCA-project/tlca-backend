import { gql } from 'apollo-server'

const typeDefs = gql`
  enum EventType {
    ASSESSMENT
    LAB
    LECTURE
  }

  type Event {
    description: String
    end: DateTime!
    id: ID!
    start: DateTime!
    title: String!
    type: EventType
  }

  extend type Query {
    event(id: ID!): Event @auth(requires: TEACHER)
    events(courseCode: ID): [Event!] @auth(requires: TEACHER)
  }

  extend type Mutation {
    createEvent(
      courseCode: ID
      end: DateTime!
      start: DateTime!
      title: String!
      type: EventType
    ): Event @auth(requires: TEACHER)
  }
`

export default typeDefs
