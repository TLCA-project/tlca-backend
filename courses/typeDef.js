import { gql } from 'apollo-server'

const typeDefs = gql`
  enum CompetencyCategory {
    ADVANCED
    BASIC
  }

  enum CourseLoadType {
    WEEKLY
    THEO_PRAC
  }

  enum CourseStatus {
    ARCHIVED
    PUBLISHED
    UNPUBLISHED
  }

  enum CourseType {
    PROJECT
    TRAINING
    UCOURSE
    UNIT
  }

  enum CourseView {
    COORDINATOR
    STUDENT
    TEACHER
    USER
  }

  enum Visibility {
    PUBLIC
    INVITE_ONLY
    PRIVATE
  }

  type Event {
    name: String
    date: Date
  }

  type CourseCompetency {
    competency: Competency!
    category: CompetencyCategory!
    subcategory: String
  }

  type CourseGroup {
    name: String!
    supervisor: User!
  }

  type CourseLoad {
    ects: Int
    type: CourseLoadType
    weekload: Int
    theory: Int
    practice: Int
  }

  type Course {
    archived: Date @auth(requires: TEACHER)
    assessments: [Assessment!] @auth(requires: TEACHER)
    banner: String
    code: ID!
    colophon: String
    competencies: [CourseCompetency!]!
    coordinator: User!
    description: String!
    field: String
    groups: [CourseGroup!] @auth(requires: TEACHER)
    hasRequestedInvite: Boolean @auth
    isArchived: Boolean @auth(requires: [ADMIN, TEACHER])
    isCoordinator: Boolean @auth(requires: TEACHER)
    isPublished: Boolean @auth(requires: [ADMIN, TEACHER])
    isRegistered: Boolean @auth(requires: STUDENT)
    isTeacher: Boolean @auth(requires: TEACHER)
    language: String
    load: CourseLoad
    name: String!
    partners: [Partner!]
    published: Date @auth(requires: TEACHER)
    registration: Registration @auth
    registrations: [Registration!] @auth(requires: TEACHER)
    schedule: [Event!]
    status: CourseStatus @auth(requires: [ADMIN, TEACHER])
    span: Int
    tags: [String!]
    teachers: [User!]
    team: [User!]
    type: CourseType!
    visibility: Visibility!
  }

  extend type Query {
    courses(offset: Int, limit: Int, view: CourseView): [Course!]!
    course(code: ID!): Course
  }

  input CourseCompetencyInput {
    competency: ID!
    category: CompetencyCategory!
    subcategory: String
  }

  input CourseGroupInput {
    name: String!
    supervisor: ID!
  }

  extend type Mutation {
    archiveCourse(archiveCode: String, code: ID!): Course
      @auth(requires: TEACHER)
    createCourse(
      code: String!
      competencies: [CourseCompetencyInput!]!
      groups: [CourseGroupInput!]
      name: String!
      description: String
      teachers: [ID!]
      type: CourseType
      visibility: Visibility
    ): Boolean! @auth(requires: TEACHER)
    publishCourse(code: ID!): Course @auth(requires: TEACHER)
    register(code: ID!): Course @auth(requires: STUDENT)
    requestInvite(code: ID!): Course @auth
  }
`

export default typeDefs
