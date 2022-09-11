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
    category: AssessmentCategory!
    code: String
    competencies: [AssessmentCompetency!]
    course: Course!
    description: String!
    end: DateTime
    hasOralDefense: Boolean
    id: ID!
    isClosed: Boolean @auth(requires: TEACHER)
    isHidden: Boolean @auth(requires: TEACHER)
    isIncremental: Boolean
    isPhased: Boolean
    instances: Int
    load: AssessmentLoad
    name: String!
    phases: [AssessmentPhase!]
    start: DateTime
    takes: Int
    type: AssessmentType
  }

  extend type Query {
    assessment(id: ID!): Assessment @auth(requires: [TEACHER, STUDENT])
    assessments(
      courseCode: ID
      limit: Int
      offset: Int
      open: Boolean
    ): [Assessment!] @auth(requires: [ADMIN, STUDENT, TEACHER])
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
      incremental: Boolean
      instances: Int
      load: AssessmentLoadInput
      name: String!
      oralDefense: Boolean
      phased: Boolean
      phases: [AssessmentPhaseInput!]
      start: DateTime
      takes: Int
    ): Assessment @auth(requires: TEACHER)
    editAssessment(
      category: AssessmentCategory!
      code: String
      competencies: [AssessmentCompetencyInput!]
      createEvent: Boolean
      description: String!
      end: DateTime
      id: ID!
      incremental: Boolean
      instances: Int
      load: AssessmentLoadInput
      name: String!
      oralDefense: Boolean
      phased: Boolean
      phases: [AssessmentPhaseInput!]
      start: DateTime
      takes: Int
    ): Assessment @auth(requires: TEACHER)
    deleteAssessment(id: ID!): Boolean @auth(requires: TEACHER)
    openCloseAssessment(id: ID!): Assessment! @auth(requires: TEACHER)
    showHideAssessment(id: ID!): Assessment! @auth(requires: TEACHER)
  }
`

export default typeDefs
