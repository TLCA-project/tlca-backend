import { gql } from 'apollo-server'

const typeDefs = gql`
  enum EvaluationStatus {
    PUBLISHED
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
    competencies: [EvaluationCompetency!]
    course: Course!
    date: DateTime!
    id: ID!
    instance: AssessmentInstance
    isPublished: Boolean
    learner: User!
    note: String
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
