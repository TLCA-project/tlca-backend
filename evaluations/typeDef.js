import { gql } from 'apollo-server'

const typeDefs = gql`
  type Evaluation {
    id: ID!
  }

  extend type Query {
    evaluations(
      assessment: ID
      courseCode: ID
      learner: ID
      offset: Int
      limit: Int
    ): [Evaluation!]! @auth(requires: TEACHER)
  }

  extend type Mutation {
    createEvaluation(
      assessment: ID!
      comment: String
      evalDate: DateTime
      learner: ID!
    ): Evaluation @auth(requires: TEACHER)
  }
`

export default typeDefs
