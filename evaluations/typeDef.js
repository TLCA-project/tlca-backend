import { gql } from 'apollo-server'

const typeDefs = gql`
  enum EvaluationStatus {
    PUBLISHED
    SUBMITTED
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
    date: DateTime!
    id: ID!
    instance: AssessmentInstance
    isPublished: Boolean
    learner: User!
    note: String @auth(requires: TEACHER)
    published: DateTime
    status: EvaluationStatus
  }

  extend type Query {
    evaluation(id: ID!): Evaluation @auth(requires: [STUDENT, TEACHER])
    evaluations(
      assessment: ID
      courseCode: ID
      learner: ID
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
    publishEvaluation(id: ID!): Evaluation @auth(requires: TEACHER)
  }
`

export default typeDefs
