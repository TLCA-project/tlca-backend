import { gql } from 'apollo-server';

const typeDefs = gql`
    scalar Date

    enum CourseVisibility {
        PUBLIC
        INVITE_ONLY
        PRIVATE
    }

    type Competency {
        code: String!
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

    type Course {
        banner: String
        code: String!
        colophon: String
        competencies: [CourseCompetency!]!
        description: String!
        field: String
        hasRequestedInvitation: Boolean @auth
        isCoordinator: Boolean @auth(requires: [ADMIN, TEACHER])
        isRegistered: Boolean @auth(requires: [ADMIN, STUDENT])
        isTeacher: Boolean @auth(requires: [ADMIN, TEACHER])
        language: String
        name: String!
        registration: Registration @auth(requires: [STUDENT])
        schedule: [Event!]
        tags: [String!]
        type: String!
        visibility: CourseVisibility!
    }

    type Program {
        code: String!
        name: String!
    }

    type Partner {
        abbreviation: String
        banner: String
        code: String!
        courses: [Course!]
        description: String
        logo: String
        name: String!
        website: String
    }

    type Registration {
        date: Date
    }

    type SignInResponse {
        token: String!
    }

    type User {
        displayName: String!
        firstName: String!
        lastName: String!
        roles: [String!]!
    }

    type Query {
        courses(offset: Int, limit: Int): [Course!]!
        course(code: String!): Course
        me: User
        partners(limit: Int): [Partner!]!
        partner(code: String!): Partner
        programs(limit: Int): [Program!]!
        program(code: String!): Program
    }

    type Mutation {
        signIn(email: String!, password: String!): SignInResponse!
        signOut: Boolean
        signUp(firstName: String!, lastName: String!, email: String!, password: String!): Boolean
    }
`;

export default typeDefs;
