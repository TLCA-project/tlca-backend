import mongoose from 'mongoose';
require('dotenv').config()

import {} from './models/competency-model.js';
import Course from './models/course-model.js';
import {} from './models/partner-model.js';
import User from './models/user-model.js';

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', () => {
  console.error('Error while connecting to DB');
});

import { ApolloServer, gql, UserInputError } from 'apollo-server';
import jwt from 'jsonwebtoken';

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
    description: String,
    name: String!,
    website: String,
    courses: [Course!]
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

const resolvers = {
  Query: {
    async courses(_parent, args, _context, _info) {
      const courses = await Course.find();

      const start = args.offset ?? 0;
      const end = start + (args.limit ?? courses.length);
      return courses.slice(start, end);
    },
    async course(_parent, args, _context, _info) {
      let course = await Course.findOne({ code: args.code });
      course = await Course.populate(course, [
        { path: 'competencies.competency', select: 'code description name', model: 'Competency' },
      ]).then(c => c.toJSON());

      if (course.schedule) {
        course.schedule = Object.entries(course.schedule).map(([name, date]) => ({ name, date }));
      }

      return course;
    },
    me(_parent, _args, _context, _info) {
      return { displayName: 'Sébastien' };
    },
    programs(_parent, args, _context, _info) {
      return programs.slice(0, args.limit ?? programs.length);
    },
    program(_parent, args, _context, _info) {
      return programs.find(p => p.code === args.code);
    },
    partners(_parent, args, _context, _info) {
      return partners.slice(0, args.limit ?? partners.length);
    },
    partner(_parent, args, _context, _info) {
      return partners.find(p => p.code === args.code);
    }
  },
  Mutation: {
    async signIn(_parent, args, _context, _info) {
      if (!args.email || !args.password) {
        throw new UserInputError('MISSING_FIELDS');
      }

      const user = await User.findOne({ email: args.email });
      if (user && user.authenticate(args.password)) {
        return {
          token: jwt.sign({ id: 'CouCou' }, process.env.JWT_SECRET)
        };
      }

      throw new UserInputError('INVALID_CREDENTIALS');
    },
    signOut(_parent, _args, _context, _info) {
      return true;
    },
    async signUp(_parent, args, _context, _info) {
      if (!args.firstName || !args.lastName || !args.email || !args.password) {
        throw new UserInputError('MISSING_FIELDS');
      }

      const user = new User(args);
      user.displayName = user.firstName + ' ' + user.lastName;
      user.provider = 'local';

      user.updateEmail(args.email);

      try {
        await user.save();
        return true;
      } catch (err) {
        switch (err.name) {
          case 'MongoServerError': {
            switch (err.code) {
              case 11000: {
                throw new UserInputError('EXISTING_EMAIL_ADDRESS');
              }
            }
          }

          case 'ValidationError': {
            if (err.errors.email) {
              throw new UserInputError('INVALID_EMAIL_ADDRESS');
            }
          }
        }
        return false;
      }
    }
  }
};

const getUser = function(_token) {
  return { loggedIn: true };
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization || '';
    const user = getUser(token);
    return { user };
  }
});

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
