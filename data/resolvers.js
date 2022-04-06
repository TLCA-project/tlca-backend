import { UserInputError } from 'apollo-server';
import jwt from 'jsonwebtoken';

import {} from '../models/competency-model.js';
import Course from '../models/course-model.js';
import Partner from '../models/partner-model.js';
import Program from '../models/program-model.js';
import Registration from '../models/registration-model.js';
import User from '../models/user-model.js';

const resolvers = {
  CourseVisibility: {
    PUBLIC: 'public',
    INVITE_ONLY: 'invite-only',
    PRIVATE: 'private'
  },
  Query: {
    async courses(_parent, args, _context, _info) {
      const courses = await Course.find();

      // Generate full path for the banner
      courses.forEach(course => {
        if (course.banner) {
          course.banner = `/uploads/courses/${course._id}/${course.banner}`;
        }
      });

      const start = args.offset ?? 0;
      const end = start + (args.limit ?? courses.length);
      return courses.slice(start, end);
    },
    async course(_parent, args, context, _info) {
      const roles = {};
      let userId = null;
      let user = null;

      // Retrieve the course corresponding to the code with elementary fields
      const course = await Course.findOne({ code: args.code }, '_id coordinator teachers');
      if (!course) {
        throw new UserInputError('Course not found.');
      }

      // Add basic roles if a user is connected
      // Retrieve the possible registration associated to the course, if any
      if (context.user && context.user.id) {
        userId = context.user.id;
        user = await User.findOne({ _id: userId }, 'roles');
        if (user) {
          if (user.roles.includes('teacher')) {
            roles.isCoordinator = course.coordinator.toString() === userId;
            roles.isTeacher = (course.teachers && course.teachers.some(t => t.toString() === userId));
          }

          const registration = await Registration.findOne({ course: course._id, user: context.user.id }, 'invitation');
          roles.hasRequestedInvitation = registration?.invitation === 'requested';
          roles.isRegistered = user.roles.includes('student') && !!registration?.invitation;
        }
      }

      const pipeline = [];
      const project = {
        code: 1,
        colophon: 1,
        competencies: {
          competency: 1,
          category: 1,
          subcategory: 1
        },
        description: 1,
        field: 1,
        language: 1,
        name: 1,
        schedule: 1,
        tags: 1,
        type: 1,
        visibility: 1
      };

      // Step 1:
      // Select the course corresponding to the request
      pipeline.push({ $match: { 'code': args.code } });

      // Step 2:
      // Select the registration associated to this course
      // for registered students or those that requested an invite
      if (userId && user && user.roles.includes('student') && (roles.isRegistered || roles.hasRequestedInvitation)) {
        const registrationsPipeline = [];

        // Get all the registrations to this course
        registrationsPipeline.push({ $match: { $expr: { $eq: ['$course', course._id] } } });

        // Only keep the registration of the user
        registrationsPipeline.push({ $match: { $expr: { $eq: ['$user', user._id] } } });

        // Retrieve the registrations satisfying the conditions defined hereabove
        pipeline.push({ $lookup: {
          from: 'registrations',
          pipeline: registrationsPipeline,
          as: 'registration'
        } });

        pipeline.push({ $unwind: {
          path: '$registration',
          preserveNullAndEmptyArrays: true
        } });

        project.registration = {
          _id: 1,
          date: 1,
        };
      }

      // Step 3:
      // Select the fields to keep for the returned courses
      pipeline.push({ $project: project });

      // Retrieve the courses satisfying the conditions defined hereabove
      const courses = await Course.aggregate(pipeline);
      if (courses?.length === 1) {
        let course = courses[0];

        course = await Course.populate(course, [
          { path: 'competencies.competency', select: 'code description name', model: 'Competency' },
        ]);

        // Restructure the format of the schedule
        if (course.schedule) {
          course.schedule = Object.entries(course.schedule).map(([name, date]) => ({ name, date }));
        }

        // Generate full path for the banner
        if (course.banner) {
          course.banner = `/uploads/courses/${course._id}/${course.banner}`;
        }

        // Add roles related to user, if any
        Object.assign(course, roles);

        return course;
      }

      throw new UserInputError('Course not found.');
    },
    async me(_parent, _args, context, _info) {
      if (!context.user) {
        return null;
      }

      const user = await User.findOne({ _id: context.user.id });
      if (!user) {
        throw new AuthenticationError('You must be logged in.');
      }

      return {
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles
      };
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
        _id: 1,
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
        const partner = partners[0];

        // Generate full path for the logo
        if (partner.logo) {
          partner.logo = `/uploads/partners/${partner._id}/${partner.logo}`;
        }
        delete partner._id;

        return partner;
      }

      throw new UserInputError('Partner not found.');
    }
  },
  Mutation: {
    async signIn(_parent, args, _context, _info) {
      if (!args.email || !args.password) {
        throw new UserInputError('MISSING_FIELDS');
      }

      const user = await User.findOne({ email: args.email }, '_id password roles salt');
      if (user && user.authenticate(args.password)) {
        return {
          token: jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET)
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

export default resolvers;
