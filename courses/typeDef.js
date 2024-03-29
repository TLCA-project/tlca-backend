import { gql } from 'apollo-server'

const typeDefs = gql`
  enum CompetencyCategory {
    ADVANCED
    BASIC
  }

  enum CourseLoadType {
    THEO_PRAC
    WEEKLY
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

  enum GroupType {
    TEACHING
    WORKING
  }

  enum Visibility {
    INVITE_ONLY
    PRIVATE
    PUBLIC
  }

  type Event {
    datetime: DateTime
    name: String
  }

  type CourseCompetency {
    category: CompetencyCategory!
    competency: Competency!
    subcategory: String
    useLearningOutcomes: Boolean
  }

  type CourseGroup {
    teaching: [CourseTeachingGroup!]
    working: [CourseWorkingGroup!]
  }

  type CourseLoad {
    ects: Int
    practice: Int
    theory: Int
    type: CourseLoadType
    weekload: Int
  }

  type CourseTeachingGroup {
    isSupervisor: Boolean
    name: String
    supervisor: User!
  }

  type CourseWorkingGroup {
    name: String
    size: Int
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
    groups: CourseGroup @auth(requires: TEACHER)
    hasAdvancedCompetencies: Boolean
    hasGroups: Boolean @auth(requires: TEACHER)
    hasReceivedInvitation: Boolean @auth
    hasRequestedInvitation: Boolean @auth
    hasTeachingGroups: Boolean @auth(requires: TEACHER)
    hasWorkingGroups: Boolean @auth(requires: TEACHER)
    isArchived: Boolean @auth(requires: [ADMIN, STUDENT, TEACHER])
    isCoordinator: Boolean @auth
    isPublished: Boolean @auth(requires: [ADMIN, STUDENT, TEACHER])
    isRegistered: Boolean @auth
    isTeacher: Boolean @auth
    language: String
    load: CourseLoad
    name: String!
    partners: [Partner!]
    published: DateTime @auth(requires: TEACHER)
    registration: Registration @auth
    registrations: [Registration!] @auth(requires: TEACHER)
    schedule: [Event!]
    status: CourseStatus @auth(requires: [ADMIN, STUDENT, TEACHER])
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
    useLearningOutcomes: Boolean
  }

  input CourseGroupInput {
    teaching: [CourseTeachingGroupInput!]
    working: [CourseWorkingGroupInput!]
  }

  input CourseLoadInput {
    ects: Int
    practice: Int
    theory: Int
    type: CourseLoadType
    weekload: Int
  }

  input CourseTeachingGroupInput {
    name: String
    supervisor: ID!
  }

  input CourseWorkingGroupInput {
    name: String
    size: Int
  }

  input EventInput {
    datetime: DateTime
    name: String
  }

  extend type Mutation {
    archiveCourse(archiveCode: String, code: ID!): Course
      @auth(requires: TEACHER)
    cloneCourse(cloneCode: String, code: ID!): Course @auth(requires: TEACHER)
    createCourse(
      code: String!
      colophon: String
      competencies: [CourseCompetencyInput!]!
      description: String!
      field: String
      groups: CourseGroupInput
      language: String
      load: CourseLoadInput
      name: String!
      partners: [ID!]
      schedule: [EventInput!]
      span: Int
      tags: [String!]
      teachers: [ID!]
      type: CourseType!
      visibility: Visibility
    ): Course @auth(requires: TEACHER)
    editCourse(
      code: String!
      colophon: String
      competencies: [CourseCompetencyInput!]
      description: String
      field: String
      groups: CourseGroupInput
      language: String
      load: CourseLoadInput
      name: String
      partners: [ID!]
      schedule: [EventInput!]
      span: Int
      tags: [String!]
      teachers: [ID!]
      type: CourseType
      visibility: Visibility
    ): Course @auth(requires: TEACHER)
    publishCourse(code: ID!): Course @auth(requires: TEACHER)
  }
`

export default typeDefs
