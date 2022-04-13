import { AuthenticationError, UserInputError } from 'apollo-server';
import jwt from 'jsonwebtoken';
import { DateTime } from 'luxon'

import {} from '../models/competency-model.js';
import Course from '../models/course-model.js';
import Partner from '../models/partner-model.js';
import Program from '../models/program-model.js';
import Registration from '../models/registration-model.js';
import User from '../models/user-model.js';

function isCoordinator(course, context) {
  const userId = context.user?.id;
  return (course.coordinator._id || course.coordinator).toString() === userId;
}

function isTeacher(course, context) {
  const userId = context.user?.id;
  return course.teachers && course.teachers.some(t => (t._id || t).toString() === userId);
}

function canEnroll(schedule, now) {
  if (schedule) {
    const isAfter = (dt) => dt > now;
    const isSameOrBefore = (dt) => dt <= now;

    const events = [{
      field: 'registrationsStart',
      check: isAfter
    }, {
      field: 'registrationsEnd',
      check: isSameOrBefore
    }, {
      field: 'evaluationsEnd',
      check: isSameOrBefore
    }, {
      field: 'end',
      check: isSameOrBefore
    }];

    for (const event of events) {
      if (schedule[event.field] && event.check(DateTime.fromISO(schedule[event.field]))) {
        return false;
      }
    }
  }

  return true;
}

const resolvers = {
  CourseVisibility: {
    PUBLIC: 'public',
    INVITE_ONLY: 'invite-only',
    PRIVATE: 'private'
  },
  CourseLoadType: {
    WEEKLY: 'weekly',
    THEO_PRAC: 'theo+prac'
  },
  RegistrationInvite: {
    REQUESTED: 'requested',
    SENT: 'sent'
  },
  Course: {
    async hasRequestedInvite(parent, _args, context, _info) {
      const registration = await Registration.findOne({ course: parent._id, user: context.user.id });
      return registration?.invite === 'requested';
    },
    isCoordinator(parent, _args, context, _info) {
      return parent.coordinator.id === context.user.id;
    },
    async isRegistered(parent, _args, context, _info) {
      const registration = await Registration.findOne({ course: parent._id, user: context.user.id });
      return !!registration && !registration.invite;
    },
    isTeacher(parent, _args, context, _info) {
      const userId = context.user.id;
      const teachers = parent.teachers;
      return teachers && teachers.some((t) => t.id === userId);
    },
    async partners(parent, _args, _context, _info) {
      return await Partner.find({ _id: { $in: parent.partners } })
    },
    async registration(parent, _args, context, _info) {
      return await Registration.findOne({ course: parent._id, user: context.user.id });
    },
    team(parent, _args, _context, _info) {
      const team = [];

      // Add all the teachers
      const teachers = parent.teachers;
      if (teachers) {
        team.push(...teachers);
      }

      // Add the coordinator if he/she is not also a teacher
      const coordinator = parent.coordinator;
      if (!team.find(t => (t._id || t).toString() === (coordinator._id || coordinator).toString())) {
        team.push(coordinator);
      }

      return team;
    }
  },
  Partner: {
    async courses(parent, _args, _context, _info) {
      const pipeline = [];

      // Only retrieve courses from this partner
      // that are published, not archived and are not private
      pipeline.push({ $match: { $and: [
        { $expr: { $in: [parent._id, { $ifNull: ['$partners', []] }] } },
        { published: { $exists: true } },
        { archived: { $exists: false } },
        { $expr: { $ne: ['$visibility', 'private'] } }
      ] } });

      const courses = await Course.aggregate(pipeline);

      // Generate full path for the banner
      courses.forEach(course => {
        if (course.banner) {
          course.banner = `/uploads/courses/${course._id}/${course.banner}`;
        }
      });

      return courses;
    }
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
    async course(_parent, args, _context, _info) {
      let course = await Course.findOne({ code: args.code });
      if (!course) {
        throw new UserInputError('Course not found.');
      }

      course = await Course.populate(course, [
        { path: 'competencies.competency', select: 'code description name', model: 'Competency' },
        { path: 'coordinator', select: '_id displayName', model: 'User' },
        { path: 'teachers', select: '_id displayName', model: 'User' },
      ]).then(c => c.toJSON());

      // Generate full path for the banner
      if (course.banner) {
        course.banner = `/uploads/courses/${course._id}/${course.banner}`;
      }

      // Rename the 'id' field of the coordinator and teachers
      course.coordinator.id = course.coordinator._id.toString();
      if (course.teachers) {
        course.teachers.forEach(t => t.id = t._id.toString());
      }

      // Restructure the format of the schedule
      if (course.schedule) {
        course.schedule = Object.entries(course.schedule).map(([name, date]) => ({ name, date }));
      }

      return course;
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
        id: user._id.toString(),
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles
      };
    },
    async partners(_parent, args, _context, _info) {
      let partners = await Partner.find();

      const start = args.offset ?? 0;
      const end = start + (args.limit ?? partners.length);

      partners = partners.slice(start, end);

      // Generate full path for the banner
      partners.forEach(partner => {
        if (partner.banner) {
          partner.banner = `/uploads/partners/${partner._id}/${partner.banner}`;
        }
      });

      return partners;
    },
    async partner(_parent, args, _context, _info) {
      const partner = await Partner.findOne({ code: args.code });
      if (!partner) {
        throw new UserInputError('Partner not found.');
      }

      // Generate full path for the banner
      if (partner.banner) {
        partner.banner = `/uploads/partners/${partner._id}/${partner.banner}`;
      }

      // Generate full path for the logo
      if (partner.logo) {
        partner.logo = `/uploads/partners/${partner._id}/${partner.logo}`;
      }

      return partner;
    },
    async programs(_parent, args, _context, _info) {
      let programs = await Program.find();

      const start = args.offset ?? 0;
      const end = start + (args.limit ?? programs.length);

      programs = programs.slice(start, end);

      // Generate full path for the banner
      programs.forEach(program => {
        if (program.banner) {
          program.banner = `/uploads/programs/${program._id}/${program.banner}`;
        }
      });

      return programs;
    },
    async program(_parent, args, _context, _info) {
      let program = await Program.findOne({ code: args.code });
      if (!program) {
        throw new UserInputError('Program not found.');
      }

      // Generate full path for the program
      if (program.banner) {
        program.banner = `/uploads/programs/${program._id}/${program.banner}`;
      }

      if (_info.operation.selectionSet.selections[0].selectionSet.selections.find(s => s.name.value === 'courses')) {
        program = await Program.populate(program, [
          { path: 'courses', model: 'Course' },
        ]);

        // Generate full path for the banner
        program.courses.forEach(course => {
          if (course.banner) {
            course.banner = `/uploads/courses/${course._id}/${course.banner}`;
          }
        });
      }

      return program;
    }
  },
  Mutation: {
    async register(_parent, args, context, _info) {
      const course = await Course.findOne({ code: args.code });
      if (!course) {
        throw new UserInputError('Course not found.');
      }

      // Can only register to a published course with 'public' visibility
      if (!course.published || course.archived || course.visibility !== 'public') {
        throw new UserInputError('REGISTRATION_FAILED');
      }

      // Coordinator and teacher cannot register to their own course
      if (isCoordinator(course, context) || isTeacher(course, context)) {
        throw new UserInputError('REGISTRATION_FAILED');
      }

      // Can only register if it agrees with the schedule of the course
      const now = DateTime.now();
      if (!canEnroll(course.schedule, now)) {
        throw new UserInputError('REGISTRATION_FAILED');
      }

      // Check whether there is not already a registration
      const userId = context.user.id;
      const registration = await Registration.findOne({ course: course._id, user: userId });
      if (registration) {
        throw new UserInputError('REGISTRATION_FAILED');
      }

      // Create a new registration for the user
      try {
        const registration = new Registration({
          course: course._id,
          date: now,
          user: userId,
        });
        course.registration = await registration.save();

        return course;
      }
      catch (err) {}

      throw new UserInputError('REGISTRATION_FAILED');
    },
    async requestInvite(_parent, args, context, _info) {
      const course = await Course.findOne({ code: args.code });
      if (!course) {
        throw new UserInputError('Course not found.');
      }

      // Can only request an invite for a published course with 'invite-only' visibility
      if (!course.published || course.archived || course.visibility !== 'invite-only') {
        throw new UserInputError('INVITE_REQUEST_FAILED');
      }

      // Coordinator and teacher cannot request an invite for their own course
      if (isCoordinator(course, context) || isTeacher(course, context)) {
        throw new UserInputError('INVITE_REQUEST_FAILED');
      }

      // Can only request an invite if it agrees with the schedule of the course
      const now = DateTime.now();
      if (!canEnroll(course.schedule, now)) {
        throw new UserInputError('INVITE_REQUEST_FAILED');
      }

      // Check whether there is not already a registration
      const userId = context.user.id;
      const registration = await Registration.findOne({ course: course._id, user: userId });
      if (registration) {
        throw new UserInputError('INVITE_REQUEST_FAILED');
      }

      // Create a new registration for the user, representing the invite request
      try {
        const registration = new Registration({
          course: course._id,
          date: now,
          invite: 'requested',
          user: userId
        });
        course.registration = await registration.save();

        return course;
      }
      catch (err) {}

      throw new UserInputError('INVITE_REQUEST_FAILED');
    },
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
