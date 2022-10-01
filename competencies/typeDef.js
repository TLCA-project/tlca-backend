import { gql } from 'apollo-server'

const typeDefs = gql`
  enum CompetencyType {
    PRACTICAL
    THEORETICAL
  }

  type LearningOutcome {
    name: String!
    takes: Int
  }

  type Competency {
    archived: DateTime @auth(requires: TEACHER)
    code: ID!
    created: DateTime! @auth(requires: ADMIN)
    description: String
    hasLearningOutcomes: Boolean
    isArchived: Boolean @auth(requires: TEACHER)
    isOwner: Boolean @auth
    isPublic: Boolean
    learningOutcomes: [LearningOutcome!]
    name: String!
    partners: [Partner!]
    tags: [String!]
    type: CompetencyType
    user: User! @auth(requires: [ADMIN, TEACHER])
  }

  extend type Query {
    competencies(offset: Int, limit: Int): [Competency!]! @auth
    competency(code: ID!): Competency @auth
  }

  input LearningOutcomeInput {
    name: String!
    takes: Int
  }

  extend type Mutation {
    archiveCompetency(code: ID!): Competency @auth(requires: TEACHER)
    createCompetency(
      code: String!
      description: String
      learningOutcomes: [LearningOutcomeInput!]
      name: String!
      partners: [ID!]
      public: Boolean
      tags: [String!]
      type: CompetencyType
    ): Competency @auth(requires: TEACHER)
    editCompetency(
      code: ID!
      description: String
      learningOutcomes: [LearningOutcomeInput!]
      name: String!
      partners: [ID!]
      public: Boolean
      tags: [String!]
      type: CompetencyType
    ): Competency @auth(requires: TEACHER)
  }
`

export default typeDefs
