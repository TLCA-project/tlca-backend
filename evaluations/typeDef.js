import { gql } from 'apollo-server'

const typeDefs = gql`
  type Evaluation {
    assessment: Assessment!
    date: DateTime!
    id: ID!
    learner: User!
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
