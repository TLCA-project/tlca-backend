import { ApolloServer } from 'apollo-server';
import dotenv from 'dotenv'
import { makeExecutableSchema } from '@graphql-tools/schema';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import typeDefs from './data/schema.js';
import resolvers from './data/resolvers.js';
import { defaultFieldResolver } from 'graphql';

dotenv.config()

// Configure the access to the MongoDB database.
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', () => {
  console.error('Error while connecting to DB');
});

// Configure functions for the GraphQL authentication.
const authDirective = function(directiveName) {
  const typeDirectiveArgumentMaps = {};
  return {
    authDirectiveTypeDefs: `directive @${directiveName}(
      requires: [Role]
    ) on OBJECT | FIELD_DEFINITION

    enum Role {
        ADMIN
        MANAGER
        TEACHER
        STUDENT
        USER
    }`,
    authDirectiveTransformer: (schema) => {
      return mapSchema(schema, {
        [MapperKind.TYPE]: (type) => {
          const authDirective = getDirective(schema, type, directiveName)?.[0]
          if (authDirective) {
            typeDirectiveArgumentMaps[type.name] = authDirective;
          }
          return undefined;
        },
        [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
          const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0] ?? typeDirectiveArgumentMaps[typeName];
          if (authDirective) {
            const { resolve = defaultFieldResolver } = fieldConfig;
            fieldConfig.resolve = function (source, args, context, info) {
              if (!context.user) {
                throw new Error('Not authorized');
              }

              const { requires } = authDirective;
              if (requires) {
                if (!requires.some(role => context.user.roles.includes(role.toLowerCase()))) {
                  throw new Error('Not authorized');
                }
              }

              return resolve(source, args, context, info);
            }
            return fieldConfig;
          }
        }
      });
    }
  };
};

const getUser = function(token) {
  if (token) {
    try {
      token = token.split(' ')[1];
      return jwt.verify(token, process.env.JWT_SECRET);
    }
    catch (err) {
      return { error: true, msg: 'Session invalid' };
    }
  }
};

// Create and configure the Apollo server.
const { authDirectiveTypeDefs, authDirectiveTransformer } = authDirective('auth');

let schema = makeExecutableSchema({
  typeDefs: [
    authDirectiveTypeDefs,
    typeDefs
  ],
  resolvers
});
schema = authDirectiveTransformer(schema);

const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    const token = req.headers.authorization || '';
    const user = getUser(token);
    return { user };
  }
});

// Launch the apollo server.
server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
