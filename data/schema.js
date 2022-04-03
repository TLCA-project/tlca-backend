import { gql } from 'apollo-server';

const typeDefs = gql`
    scalar Date

    type Competency {
        code: String!,
        name: String!,
        description: String
    }

    type Event {
        name: String,
        date: Date
    }

    type CourseCompetency {
        competency: Competency!,
        category: String!,
        subcategory: String
    }

    type Course {
        banner: String,
        code: String!,
        colophon: String,
        competencies: [CourseCompetency!]!,
        description: String!,
        field: String,
        language: String,
        name: String!,
        schedule: [Event!],
        tags: [String!],
        type: String!
    }

    type Program {
        code: String!,
        name: String!
    }

    type Partner {
        abbreviation: String,
        banner: String,
        code: String!,
        courses: [Course!],
        description: String,
        logo: String,
        name: String!,
        website: String
    }

    type SignInResponse {
        token: String!
    }

    type User {
        displayName: String!
    }

    type Query {
        courses(offset: Int, limit: Int): [Course!]!,
        course(code: String!): Course,
        me: User,
        partners(limit: Int): [Partner!]!,
        partner(code: String!): Partner,
        programs(limit: Int): [Program!]!,
        program(code: String!): Program
    }

    type Mutation {
        signIn(email: String!, password: String!): SignInResponse!,
        signOut: Boolean,
        signUp(firstName: String!, lastName: String!, email: String!, password: String!): Boolean
    }
`;

export default typeDefs;
