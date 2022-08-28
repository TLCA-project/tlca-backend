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

  type AssessmentCompetency {
    competency: Competency!
    stars: Int!
    optional: Boolean
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
    load: AssessmentLoad
    name: String!
    start: DateTime
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
    stars: Int!
    optional: Boolean
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
      description: String!
      end: DateTime
      hasOralDefense: Boolean
      load: AssessmentLoadInput
      name: String!
      start: DateTime
    ): Assessment @auth(requires: TEACHER)
    deleteAssessment(id: ID!): Boolean @auth(requires: TEACHER)
    openCloseAssessment(id: ID!): Assessment! @auth(requires: TEACHER)
    showHideAssessment(id: ID!): Assessment! @auth(requires: TEACHER)
  }
`

export default typeDefs
