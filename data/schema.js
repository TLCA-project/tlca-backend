import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql } from 'apollo-server';

import { authDirectiveTypeDefs, authDirectiveTransformer } from '../directives/auth-directive.js';

import competencies from '../competencies/index.js';
import courses from '../courses/index.js';
import partners from '../partners/index.js';
import programs from '../programs/index.js';
import users from '../users/index.js';

const typeDefs = gql`
  type Query
  type Mutation
`;

let schema = makeExecutableSchema({
  typeDefs: [
    authDirectiveTypeDefs,
    typeDefs,
    competencies.typeDef,
    courses.typeDef,
    partners.typeDef,
    programs.typeDef,
    users.typeDef
  ],
  resolvers: [
    competencies.resolvers,
    courses.resolvers,
    partners.resolvers,
    programs.resolvers,
    users.resolvers
  ]
});
schema = authDirectiveTransformer(schema);

const models = {
  Competency: competencies.Competency,
  Course: courses.Course,
  Partner: partners.Partner,
  Program: programs.Program,
  Registration: courses.Registration,
  User: users.User
};

export { schema, models };
