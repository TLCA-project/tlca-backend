import { gql } from 'apollo-server';

const typeDefs = gql`
    scalar Date

    enum CourseVisibility {
        PUBLIC
        INVITE_ONLY
        PRIVATE
    }

    enum CourseLoadType {
        WEEKLY
        THEO_PRAC
    }

    enum RegistrationInvite {
        REQUESTED
        SENT
    }

    type Competency {
        code: ID!
        name: String!
        description: String
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
        banner: String
        code: ID!
        colophon: String
        competencies: [CourseCompetency!]!
        coordinator: User!
        description: String!
        field: String
        hasRequestedInvite: Boolean @auth
        isCoordinator: Boolean @auth(requires: TEACHER)
        isRegistered: Boolean @auth(requires: STUDENT)
        isTeacher: Boolean @auth(requires: TEACHER)
        language: String
        load: CourseLoad
        name: String!
        partners: [Partner!]
        registration: Registration @auth
        schedule: [Event!]
        span: Int
        tags: [String!]
        teachers: [User!]
        team: [User!]
        type: String!
        visibility: CourseVisibility!
    }

    type Program {
        code: ID!
        courses: [Course!]!
        description: String!
        name: String!
    }

    type Partner {
        abbreviation: String
        banner: String
        code: ID!
        courses: [Course!]
        description: String!
        logo: String
        name: String!
        representative: User!
        website: String
    }

    type Registration {
        date: Date
        invite: RegistrationInvite
        boop: Boolean
    }

    type SignInResponse {
        token: String!
    }

    type User {
        displayName: String!
        firstName: String!
        id: ID!
        lastName: String!
        roles: [String!]!
        username: ID!
    }

    type Query {
        courses(offset: Int, limit: Int): [Course!]!
        course(code: ID!): Course
        me: User
        partners(limit: Int): [Partner!]!
        partner(code: ID!): Partner
        programs(limit: Int): [Program!]!
        program(code: ID!): Program
    }

    type Mutation {
        register(code: ID!): Course @auth(requires: STUDENT)
        requestInvite(code: ID!): Course @auth
        signIn(email: String!, password: String!): SignInResponse!
        signOut: Boolean @auth
        signUp(firstName: String!, lastName: String!, email: String!, password: String!): Boolean
    }
`;

export default typeDefs;
