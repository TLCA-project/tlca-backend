import { gql } from 'apollo-server'

const typeDefs = gql`
  enum EvaluationStatus {
    ACCEPTED
    PUBLISHED
    REJECTED
    REQUESTED
    UNPUBLISHED
  }

  type EvaluationChecklist {
    private: [Boolean!] @auth(requires: TEACHER)
    public: [Boolean!]
  }

  type EvaluationCompetency {
    checklist: EvaluationChecklist
    competency: Competency!
    learningOutcomes: [Boolean!]
    selected: Boolean
  }

  type Evaluation {
    accepted: DateTime @auth(requires: TEACHER)
    assessment: Assessment!
    comment: String
    competencies: [EvaluationCompetency!]
    course: Course!
    created: DateTime! @auth(requires: TEACHER)
    data: JSONObject
    date: DateTime!
    evaluator: User
    explanation: String
    id: ID!
    instance: Instance!
    isPublished: Boolean!
    isRequestPending: Boolean @auth(requires: TEACHER)
    learner: User!
    note: String @auth(requires: TEACHER)
    pastCompetencies: [EvaluationCompetency!]
    phase: Int
    published: DateTime
    rejected: DateTime @auth(requires: TEACHER)
    rejectionReason: String
    requested: DateTime
    requestedCompetencies: [EvaluationCompetency!] @auth(requires: TEACHER)
    status: EvaluationStatus!
  }

  extend type Query {
    evaluation(id: ID!): Evaluation @auth(requires: [STUDENT, TEACHER])
    evaluations(
      assessment: ID
      courseCode: ID
      instance: ID
      learner: ID
      published: Boolean
      offset: Int
      limit: Int
    ): [Evaluation!]! @auth(requires: [STUDENT, TEACHER])
  }

  input EvaluationChecklistInput {
    private: [Boolean!]
    public: [Boolean!]
  }

  input EvaluationCompetencyInput {
    checklist: EvaluationChecklistInput
    competency: ID!
    learningOutcomes: [Boolean!]
    selected: Boolean
  }

  extend type Mutation {
    acceptEvaluationRequest(id: ID!): Evaluation @auth(requires: TEACHER)
    correctEvaluation(id: ID!): Evaluation @auth(requires: TEACHER)
    createEvaluation(
      assessment: ID!
      comment: String
      competencies: [EvaluationCompetencyInput!]
      evalDate: DateTime
      instance: ID
      learner: ID!
      phase: Int
      note: String
    ): Evaluation @auth(requires: TEACHER)
    deleteEvaluation(id: ID!): Boolean @auth(requires: TEACHER)
    deleteEvaluationRequest(id: ID!): Boolean @auth(requires: STUDENT)
    editEvaluation(
      comment: String
      competencies: [EvaluationCompetencyInput!]
      evalDate: DateTime
      id: ID!
      note: String
    ): Evaluation @auth(requires: TEACHER)
    publishEvaluation(id: ID!): Evaluation @auth(requires: TEACHER)
    rejectEvaluationRequest(id: ID!, reason: String!): Evaluation
      @auth(requires: TEACHER)
    requestEvaluation(
      assessment: ID!
      competencies: [EvaluationCompetencyInput!]
      explanation: String
      instance: ID
      phase: Int
    ): Evaluation @auth(requires: STUDENT)
  }
`

export default typeDefs
