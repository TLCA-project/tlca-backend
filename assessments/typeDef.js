import { gql } from 'apollo-server'

const typeDefs = gql`
  enum AssessmentCategory {
    CASESTUDY
    CODING
    EXERCISE
    INTERVIEW
    MISSION
    PROJECT
    QUIZ
  }

  enum AssessmentType {
    INCREMENTAL
    PHASED
    SINGLE_TAKE
  }

  type AssessmentChecklist {
    private: [String!] @auth(requires: TEACHER)
    public: [String!]
  }

  type AssessmentCompetency {
    checklist: AssessmentChecklist
    competency: Competency!
    isOptional: Boolean
    learningOutcomes: [Int!]
    maxStars: Int
    stars: Int
  }

  type AssessmentLoad {
    defense: Int
    grading: Int
    work: Int
  }

  type AssessmentPhase {
    competencies: [AssessmentCompetency!]
    description: String
    name: String!
  }

  type Assessment {
    canRequestEvaluation: Boolean
    category: AssessmentCategory!
    code: String
    competencies: [AssessmentCompetency!]
    course: Course!
    description: String!
    end: DateTime
    evaluationRequest: Boolean @auth(requires: TEACHER)
    hasEvaluations: Boolean
    hasOralDefense: Boolean
    hasProvider: Boolean
    hasSchedule: Boolean
    id: ID!
    isClosed: Boolean @auth(requires: [STUDENT, TEACHER])
    isHidden: Boolean @auth(requires: TEACHER)
    isIncremental: Boolean
    isPhased: Boolean
    instances: Int
    load: AssessmentLoad
    name: String!
    nbPhases: Int
    phases: [AssessmentPhase!]
    provider: String @auth(requires: [STUDENT, TEACHER])
    providerConfig: JSONObject @auth(requires: TEACHER)
    requireEvaluationRequestURL: Boolean
    start: DateTime
    takes: Int
    type: AssessmentType
  }

  type Instance {
    assessment: Assessment @auth(requires: ADMIN)
    data: JSONObject @auth(requires: TEACHER)
    datetime: DateTime!
    content: JSONObject @auth(requires: [STUDENT, TEACHER])
    id: ID!
    learner: User @auth(requires: ADMIN)
    nbEvaluations: Int! @auth(requires: ADMIN)
  }

  extend type Query {
    assessment(id: ID!): Assessment @auth(requires: [TEACHER, STUDENT])
    assessments(
      courseCode: ID
      limit: Int
      offset: Int
      open: Boolean
    ): [Assessment!] @auth(requires: [ADMIN, STUDENT, TEACHER])
    exportAssessment(id: ID!): JSONObject @auth(requires: TEACHER)
    instance(id: ID!): Instance @auth(requires: STUDENT)
    instances(assessment: ID, learner: ID): [Instance!]
      @auth(requires: [ADMIN, STUDENT, TEACHER])
  }

  input AssessmentChecklistInput {
    private: [String!]
    public: [String!]
  }

  input AssessmentCompetencyInput {
    checklist: AssessmentChecklistInput
    competency: ID!
    learningOutcomes: [Int!]
    maxStars: Int
    optional: Boolean
    stars: Int
  }

  input AssessmentLoadInput {
    defense: Int
    grading: Int
    work: Int
  }

  input AssessmentPhaseInput {
    competencies: [AssessmentCompetencyInput!]
    description: String
    name: String!
  }

  extend type Mutation {
    createAssessment(
      category: AssessmentCategory!
      code: String
      competencies: [AssessmentCompetencyInput!]
      course: ID!
      createEvent: Boolean
      description: String!
      end: DateTime
      evaluationRequest: Boolean
      incremental: Boolean
      instances: Int
      load: AssessmentLoadInput
      name: String!
      oralDefense: Boolean
      phased: Boolean
      phases: [AssessmentPhaseInput!]
      requireEvaluationRequestURL: Boolean
      start: DateTime
      takes: Int
    ): Assessment @auth(requires: TEACHER)
    createInstance(id: ID!): Instance @auth(requires: STUDENT)
    deleteAssessment(id: ID!): Boolean @auth(requires: TEACHER)
    deleteInstance(id: ID!): Boolean @auth(requires: ADMIN)
    editAssessment(
      category: AssessmentCategory!
      code: String
      competencies: [AssessmentCompetencyInput!]
      createEvent: Boolean
      description: String!
      end: DateTime
      evaluationRequest: Boolean
      id: ID!
      incremental: Boolean
      instances: Int
      load: AssessmentLoadInput
      name: String!
      oralDefense: Boolean
      phased: Boolean
      phases: [AssessmentPhaseInput!]
      requireEvaluationRequestURL: Boolean
      start: DateTime
      takes: Int
    ): Assessment @auth(requires: TEACHER)
    openCloseAssessment(id: ID!): Assessment! @auth(requires: TEACHER)
    saveAssessmentTake(
      id: ID!
      answer: [[Boolean!]!]!
      finalise: Boolean
    ): Evaluation @auth(requires: STUDENT)
    showHideAssessment(id: ID!): Assessment! @auth(requires: TEACHER)
  }
`

export default typeDefs
