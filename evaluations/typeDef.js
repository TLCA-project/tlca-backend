import { gql } from 'apollo-server'

const typeDefs = gql`
  enum EvaluationStatus {
    PUBLISHED
    UNPUBLISHED
  }

  type Evaluation {
    assessment: Assessment!
    date: DateTime!
    id: ID!
    isPublished: Boolean
    learner: User!
    published: DateTime
    status: EvaluationStatus @auth(requires: TEACHER)
  }

  extend type Query {
    evaluation(id: ID!): Evaluation @auth(requires: TEACHER)
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
