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

  type AssessmentCompetency {
    competency: Competency!
    isOptional: Boolean
    maxStars: Int
    stars: Int!
  }

  type AssessmentLoad {
    defense: Int
    grading: Int
    work: Int
  }

  type Assessment {
    category: AssessmentCategory!
    code: String
    competencies: [AssessmentCompetency!]!
    course: Course!
    description: String!
    end: DateTime
    hasOralDefense: Boolean
    id: ID!
    isClosed: Boolean @auth(requires: TEACHER)
    isHidden: Boolean @auth(requires: TEACHER)
    isIncremental: Boolean
    instances: Int
    load: AssessmentLoad
    name: String!
    start: DateTime
    type: AssessmentType
  }

  extend type Query {
    assessment(id: ID!): Assessment @auth(requires: TEACHER)
    assessments(
      courseCode: ID
      limit: Int
      offset: Int
      open: Boolean
    ): [Assessment!] @auth(requires: [ADMIN, STUDENT, TEACHER])
  }

  input AssessmentCompetencyInput {
    competency: ID!
    maxStars: Int
    optional: Boolean
    stars: Int!
  }

  input AssessmentLoadInput {
    defense: Int
    grading: Int
    work: Int
  }

  extend type Mutation {
    createAssessment(
      category: AssessmentCategory!
      code: String
      competencies: [AssessmentCompetencyInput!]!
      course: ID!
      createEvent: Boolean
      description: String!
      end: DateTime
      incremental: Boolean
      instances: Int
      load: AssessmentLoadInput
      name: String!
      oralDefense: Boolean
      start: DateTime
    ): Assessment @auth(requires: TEACHER)
    editAssessment(
      category: AssessmentCategory!
      code: String
      competencies: [AssessmentCompetencyInput!]!
      createEvent: Boolean
      description: String!
      end: DateTime
      id: ID!
      incremental: Boolean
      instances: Int
      load: AssessmentLoadInput
      name: String!
      oralDefense: Boolean
      start: DateTime
    ): Assessment @auth(requires: TEACHER)
    deleteAssessment(id: ID!): Boolean @auth(requires: TEACHER)
    openCloseAssessment(id: ID!): Assessment! @auth(requires: TEACHER)
    showHideAssessment(id: ID!): Assessment! @auth(requires: TEACHER)
  }
`

export default typeDefs
