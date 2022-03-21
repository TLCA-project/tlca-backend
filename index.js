import mongoose from 'mongoose';
import dotenv from 'dotenv'
dotenv.config()

import {} from './models/competency-model.js';
import Course from './models/course-model.js';
import Partner from './models/partner-model.js';
import Program from './models/program-model.js';
import User from './models/user-model.js';

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', () => {
  console.error('Error while connecting to DB');
});

import { ApolloServer, UserInputError } from 'apollo-server';
import jwt from 'jsonwebtoken';
import typeDefs from './schema/schema.js';

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
    async programs(_parent, args, _context, _info) {
      const programs = await Program.find();

      const start = args.offset ?? 0;
      const end = start + (args.limit ?? programs.length);
      return programs.slice(start, end);
    },
    async program(_parent, args, _context, _info) {
      const program = await Program.findOne({ code: args.code });
      return program;
    },
    async partners(_parent, args, _context, _info) {
      const partners = await Partner.find();

      const start = args.offset ?? 0;
      const end = start + (args.limit ?? partners.length);
      return partners.slice(start, end);
    },
    async partner(_parent, args, _context, _info) {
      const pipeline = [];
      const project = {
        abbreviation: 1,
        code: 1,
        courses: {
          banner: 1,
          code: 1,
          name: 1,
          type: 1
        },
        description: 1,
        logo: 1,
        name: 1,
        website: 1
      };

      // Step 1:
      // Select the partner corresponding to the request
      pipeline.push({ $match: { 'code': args.code } });

      // Step 2:
      // Retrieve all the published and non-archived courses associated to this partner
      pipeline.push({
        $lookup: {
          from: 'courses',
          let: { partnerId: '$_id' },
          pipeline: [{ $match: { $and: [
            { $expr: { $in: ['$$partnerId', { $ifNull: ['$partners', []] }] } },
            { published: { $exists: true } },
            { archived: { $exists: false } },
            { $expr: { $ne: ['$visibility', 'private'] } }
          ] } }],
          as: 'courses'
        }
      });

      // Step 3:
      // Select the fields to keep for the returned partners
      pipeline.push({ $project: project });

      // Retrieve the partners satisfying the conditions defined hereabove
      const partners = await Partner.aggregate(pipeline);
      if (partners?.length === 1) {
        return partners[0];
      }

      throw new UserInputError('Partner not found.');
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
