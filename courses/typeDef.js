import { gql } from 'apollo-server';

const typeDefs = gql`
  scalar Date

  enum CourseLoadType {
    WEEKLY
    THEO_PRAC
  }

  enum CourseType {
    PROJECT
    TRAINING
    UCOURSE
    UNIT
  }

  enum RegistrationInvite {
    REQUESTED
    SENT
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
    category: String!
    subcategory: String
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
    banner: String
    code: ID!
    colophon: String
    competencies: [CourseCompetency!]!
    coordinator: User!
    description: String!
    field: String
    hasRequestedInvite: Boolean @auth
    isArchived: Boolean @auth(requires: TEACHER)
    isCoordinator: Boolean @auth(requires: TEACHER)
    isPublished: Boolean @auth(requires: TEACHER)
    isRegistered: Boolean @auth(requires: STUDENT)
    isTeacher: Boolean @auth(requires: TEACHER)
    language: String
    load: CourseLoad
    name: String!
    partners: [Partner!]
    published: Date @auth(requires: TEACHER)
    registration: Registration @auth
    schedule: [Event!]
    span: Int
    tags: [String!]
    teachers: [User!]
    team: [User!]
    type: CourseType!
    visibility: Visibility!
  }

  type Registration {
    date: Date
    invite: RegistrationInvite
    boop: Boolean
  }

  extend type Query {
    courses(offset: Int, limit: Int, published: Boolean, filter: String, role: String): [Course!]!
    course(code: ID!): Course
  }

  extend type Mutation {
    register(code: ID!): Course @auth(requires: STUDENT)
    requestInvite(code: ID!): Course @auth
  }
`;

export default typeDefs;
