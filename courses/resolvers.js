import { UserInputError } from 'apollo-server';
import { DateTime } from 'luxon'

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
  CourseLoadType: {
    WEEKLY: 'weekly',
    THEO_PRAC: 'theo+prac'
  },
  CourseType: {
    PROJECT: 'project',
    TRAINING: 'training',
    UCOURSE: 'ucourse',
    UNIT: 'unit'
  },
  RegistrationInvite: {
    REQUESTED: 'requested',
    SENT: 'sent'
  },
  Visibility: {
    PUBLIC: 'public',
    INVITE_ONLY: 'invite-only',
    PRIVATE: 'private'
  },
  Course: {
    async hasRequestedInvite(course, _args, { models, user }, _info) {
      const { Registration } = models;

      const registration = await Registration.findOne({ course: course._id, user: user.id });
      return registration?.invite === 'requested';
    },
    isCoordinator(course, _args, { user }, _info) {
      return course.coordinator.id === user.id;
    },
    async isRegistered(course, _args, { models, user }, _info) {
      const { Registration } = models;

      const registration = await Registration.findOne({ course: course._id, user: user.id });
      return !!registration && !registration.invite;
    },
    isTeacher(course, _args, { user }, _info) {
      const userId = user.id;
      const teachers = course.teachers;
      return teachers && teachers.some((t) => t.id === userId);
    },
    async partners(course, _args, { models }, _info) {
      const { Partner } = models;

      return await Partner.find({ _id: { $in: course.partners } });
    },
    async registration(course, _args, { models, user }, _info) {
      const { Registration } = models;

      return await Registration.findOne({ course: course._id, user: user.id });
    },
    team(course, _args, _context, _info) {
      const team = [];

      // Add all the teachers
      const teachers = course.teachers;
      if (teachers) {
        team.push(...teachers);
      }

      // Add the coordinator if he/she is not also a teacher
      const coordinator = course.coordinator;
      if (!team.find(t => (t._id || t).toString() === (coordinator._id || coordinator).toString())) {
        team.push(coordinator);
      }

      return team;
    }
  },
  Query: {
    async courses(_parent, args, { models, user }, _info) {
      const { Course } = models;

      const pipeline = [];
      const statusMatch = {
        $or: [{ $and: [{ published: { $exists: true } }, { archived: { $exists: false } }] }]
      };
      const visibilityMatch = {
        $or: [{ $expr: { $ne: ['$visibility', 'private'] } }]
      };

      // Step 1:
      // If a user is connected,
      // retrieve all the registrations associated to each course
      if (user) {
        pipeline.push({ $lookup: {
          from: 'registrations',
          localField: '_id',
          foreignField: 'course',
          as: 'registrations'
        } });
      }

      // Step 2:
      // If a user is connected,
      // add derived fields depending on his/her roles
      if (user) {
        const addFields = {};
        const roles = user.roles;

        // Teachers can be the coordinator or a teacher of a course
        if (roles.includes('teacher')) {
          addFields.isCoordinator = { $eq: ['$coordinator', user.id] };
          addFields.isTeacher = { $anyElementTrue: { $map: {
            input: { $ifNull: ['$teachers', []] },
            as: 'teacher',
            in: { $eq: ['$$teacher', user.id] }
          } } };
        }

        // Students can be registered to a course
        if (roles.includes('student')) {
          addFields.isRegistered = { $anyElementTrue: { $map: {
            input: '$registrations',
            as: 'registration',
            in: { $and: [{ $eq: ['$$registration.user', user.id] }, { $eq: [{ $type: '$$registration.invite' }, 'missing'] }] }
          } } };
        }

        if (Object.keys(addFields).length) {
          pipeline.push({ $addFields: addFields });
        }
      }

      // Step 3:
      // If a user is connected
      // filter courses by status
      if (user) {
        const roles = user.roles;

        // Teachers can access their own non-published and archived courses
        if (roles.includes('teacher')) {
          const teacherMatch = { $and: [] };
          if (args.published) {
            teacherMatch.$and.push({ $and: [{ published: { $exists: true } }, { archived: { $exists: true } }] });
          } else {
            teacherMatch.$and.push({ $or: [{ published: { $exists: false } }, { $and: [{ published: { $exists: true } }, { archived: { $exists: true } }] }] });
          }
          teacherMatch.$and.push({ $or: [{ isCoordinator: true }, { isTeacher: true }] });
          statusMatch.$or.push(teacherMatch);
        }

        // Students can access archived courses
        if (roles.includes('student')) {
          statusMatch.$or.push({ $and: [{ archived: { $exists: true } }, { isRegistered: true }] });
        }
      }

      // Step 4:
      // If a user is connected and a 'filter' has been defined,
      // filter the courses that are returned
      // and cancel the visibility filter
      if (user && args.filter) {
        const match = {};

        // Adapt filter and projection according to filter query param
        switch (req.query.filter) {
          case 'student': {
            match.isRegistered = true;
            visibilityMatch.$or = [];
            break;
          }

          case 'teacher': {
            match.$or = [{ isCoordinator: true }, { isTeacher: true }];
            visibilityMatch.$or = [];
            break;
          }
        }

        if (Object.keys(match).length) {
          pipeline.push({ $match: match });
        }
      }

      // Step 5:
      // If a user is connected and a 'role filter' has been defined,
      // filter the courses that are returned
      if (user && args.role) {
        const match = {};

        // Adapt filter and projection according to filter query param
        switch (req.query.role) {
          case 'coordinator':
            match.isCoordinator = true;
            break;

          case 'teacher':
            match.isTeacher = true;
            break;
        }

        if (Object.keys(match).length) {
          pipeline.push({ $match: match });
        }
      }

      // Step 6:
      // Filter course by status
      pipeline.push({ $match: statusMatch });

      // Step 7:
      // Filter course by visibility
      if (visibilityMatch.$or.length) {
        pipeline.push({ $match: visibilityMatch });
      }

      // Step 8:
      // Sort the courses by creation dates
      pipeline.push({ $sort: { created: -1, code: 1 } });

      return await Course.aggregate(pipeline);

      // // Set up offset and limit
      // const skip = Math.max(0, args.offset ?? 0);
      // const limit = args.limit ?? undefined;

      // // Retrieve all the courses satisfying the conditions defined hereabove
      // const courses = await Course.find(filter, null, { skip, limit });
    },
    async course(_parent, args, { models, user }, _info) {
      const { Course } = models;

      let course = await Course.findOne({ code: args.code });
      if (!course) {
        throw new UserInputError('Course not found.');
      }

      // If no user is authenticated,
      // reject the request if the course has not been published or is archived
      if (!user && (!course.published || course.archived || course.visibility === 'private')) {
        throw new UserInputError('Course not found.');
      }

      course = await Course.populate(course, [
        { path: 'competencies.competency', select: 'code description name', model: 'Competency' },
        { path: 'coordinator', select: '_id displayName', model: 'User' },
        { path: 'teachers', select: '_id displayName', model: 'User' },
      ]).then(c => c.toJSON());

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
  },
  Mutation: {
    async register(_parent, args, { models, user }, _info) {
      const { Course } = models;

      const course = await Course.findOne({ code: args.code });
      if (!course) {
        throw new UserInputError('Course not found.');
      }

      // Can only register to a published course with 'public' visibility
      if (!course.published || course.archived || course.visibility !== 'public') {
        throw new UserInputError('REGISTRATION_FAILED');
      }

      // Coordinator and teacher cannot register to their own course
      if (isCoordinator(course, user) || isTeacher(course, user)) {
        throw new UserInputError('REGISTRATION_FAILED');
      }

      // Can only register if it agrees with the schedule of the course
      const now = DateTime.now();
      if (!canEnroll(course.schedule, now)) {
        throw new UserInputError('REGISTRATION_FAILED');
      }

      // Check whether there is not already a registration
      const userId = user.id;
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
    async requestInvite(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models;

      const course = await Course.findOne({ code: args.code });
      if (!course) {
        throw new UserInputError('Course not found.');
      }

      // Can only request an invite for a published course with 'invite-only' visibility
      if (!course.published || course.archived || course.visibility !== 'invite-only') {
        throw new UserInputError('INVITE_REQUEST_FAILED');
      }

      // Coordinator and teacher cannot request an invite for their own course
      if (isCoordinator(course, user) || isTeacher(course, user)) {
        throw new UserInputError('INVITE_REQUEST_FAILED');
      }

      // Can only request an invite if it agrees with the schedule of the course
      const now = DateTime.now();
      if (!canEnroll(course.schedule, now)) {
        throw new UserInputError('INVITE_REQUEST_FAILED');
      }

      // Check whether there is not already a registration
      const userId = user.id;
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
    }
  }
};

export default resolvers;
