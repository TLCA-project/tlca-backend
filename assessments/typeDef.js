import { gql } from 'apollo-server'

const typeDefs = gql`
  enum AssessmentCategory {
    QUIZ
    EXERCISE
    CODING
    MISSION
    PROJECT
    INTERVIEW
    CASESTUDY
  }

  type AssessmentCompetency {
    competency: Competency!
    stars: Int!
    optional: Boolean
  }

  type Assessment {
    category: AssessmentCategory!
    code: String
    competencies: [AssessmentCompetency!]!
    course: Course!
    description: String!
    end: Date
    id: ID!
    name: String!
    start: Date
  }

  extend type Query {
    assessment(id: ID!): Assessment @auth(requires: TEACHER)
  }

  input AssessmentCompetencyInput {
    competency: ID!
    stars: Int!
    optional: Boolean
  }

  extend type Mutation {
    createAssessment(
      category: AssessmentCategory!
      code: String
      competencies: [AssessmentCompetencyInput!]!
      course: ID!
      description: String
      end: Date
      name: String!
      start: Date
    ): ID @auth(requires: TEACHER)
  }
`

export default typeDefs
