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
    instance: AssessmentInstance!
    isPublished: Boolean!
    isRequestPending: Boolean @auth(requires: TEACHER)
    learner: User!
    note: String @auth(requires: TEACHER)
    pastCompetencies: [EvaluationCompetency!]
    published: DateTime
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
      note: String
    ): Evaluation @auth(requires: TEACHER)
    deleteEvaluation(id: ID!): Boolean @auth(requires: TEACHER)
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
    ): Evaluation @auth(requires: STUDENT)
  }
`

export default typeDefs
