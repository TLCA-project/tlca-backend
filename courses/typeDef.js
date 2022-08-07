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
    datetime: DateTime
  }

  type CourseCompetency {
    competency: Competency!
    category: CompetencyCategory!
    subcategory: String
  }

  type CourseLoad {
    ects: Int
    type: CourseLoadType
    weekload: Int
    theory: Int
    practice: Int
  }

  type CourseTeachingGroup {
    name: String
    supervisor: User!
  }

  type CourseWorkingGroup {
    name: String
  }

  type Course {
    archived: DateTime @auth(requires: TEACHER)
    assessments: [Assessment!] @auth(requires: TEACHER)
    banner: String
    code: ID!
    colophon: String
    competencies: [CourseCompetency!]!
    coordinator: User!
    description: String!
    field: String
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
    published: DateTime @auth(requires: TEACHER)
    registration: Registration @auth
    registrations: [Registration!] @auth(requires: TEACHER)
    schedule: [Event!]
    status: CourseStatus @auth(requires: [ADMIN, TEACHER])
    span: Int
    tags: [String!]
    teachers: [User!]
    teachingGroups: [CourseTeachingGroup!] @auth(requires: TEACHER)
    team: [User!]
    type: CourseType!
    visibility: Visibility!
    workingGroups: [CourseWorkingGroup!] @auth(requires: TEACHER)
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

  input CourseTeachingGroupInput {
    name: String
    supervisor: ID!
  }

  input CourseWorkingGroupInput {
    name: String
  }

  extend type Mutation {
    archiveCourse(archiveCode: String, code: ID!): Course
      @auth(requires: TEACHER)
    cloneCourse(cloneCode: String, code: ID!): Course @auth(requires: TEACHER)
    createCourse(
      code: String!
      competencies: [CourseCompetencyInput!]!
      teachingGroups: [CourseTeachingGroupInput!]
      name: String!
      description: String
      teachers: [ID!]
      type: CourseType
      visibility: Visibility
      workingGroups: [CourseWorkingGroupInput!]
    ): Boolean! @auth(requires: TEACHER)
    publishCourse(code: ID!): Course @auth(requires: TEACHER)
    register(code: ID!): Course @auth(requires: STUDENT)
    requestInvite(code: ID!): Course @auth
  }
`

export default typeDefs
