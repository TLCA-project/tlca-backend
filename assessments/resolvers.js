import { UserInputError } from 'apollo-server'

import { isCoordinator, isTeacher } from '../lib/courses.js'
import { hasRole } from '../lib/users.js'

const resolvers = {
  AssessmentCategory: {
    CASESTUDY: 'casestudy',
    CODING: 'coding',
    EXERCISE: 'exercise',
    INTERVIEW: 'interview',
    MISSION: 'mission',
    PROJECT: 'project',
    QUIZ: 'quiz',
  },
  Assessment: {
    // Retrieve the detailed information about the competencies.
    async competencies(assessment, _args, { models }, _info) {
      const { Assessment } = models

      return await Assessment.populate(assessment, [
        {
          path: 'competencies.competency',
          model: 'Competency',
        },
      ]).then((a) => a.competencies)
    },
    // Retrieve the 'id' of the assessment from the MongoDB '_id'.
    id(assessment, _args, _context, _info) {
      return assessment._id.toString()
    },
  },
  Query: {
    // Retrieve one given assessment given its 'id'.
    async assessment(_parent, args, { models }, _info) {
      const { Assessment } = models

      const assessment = await Assessment.findOne({ _id: args.id }).lean()
      if (!assessment) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      return assessment
    },
    // Retrieve all the assessments
    // that are available to the connected user.
    async assessments(_parent, args, { models, user }, _info) {
      const { Assessment, Course } = models

      const filter = {}

      // Only 'admin' can access all the assessments
      // without specifying a course code.
      if (!args.courseCode && !hasRole(user, 'admin')) {
        throw new UserInputError(
          'The courseCode param is required for non-admin users.'
        )
      }

      if (args.open) {
        filter.closed = { $exists: false }
      }

      if (args.courseCode) {
        const course = await Course.findOne(
          { code: args.courseCode },
          'coordinator teachers'
        ).lean()

        if (
          !course ||
          !(isCoordinator(course, user) || isTeacher(course, user))
        ) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }

        // Filter the assessments according to the provided course code.
        filter.course = course._id
      }

      return await Assessment.find(filter).lean()
    },
  },
  Mutation: {
    // Create a new assessment from the specified parameters.
    async createAssessment(_parent, args, { models, user }, _info) {
      const { Assessment, Competency, Course } = models

      // Clean up the optional args.
      for (const field of ['code', 'description']) {
        if (!args[field]?.trim().length) {
          delete args[field]
        }
      }
      for (const field of ['end', 'start', 'workload']) {
        if (!args[field]) {
          delete args[field]
        }
      }

      // Retrieve the course for which to create an assessment.
      const course = await Course.findOne({ code: args.course })
        .lean()
        .populate({
          path: 'competencies.competency',
          select: 'code',
          model: 'Competency',
        })
      if (!course || !isCoordinator(course, user)) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Code must be unique among assessments from the same course.
      if (
        args.code &&
        (await Assessment.exists({
          course: course._id,
          code: args.code,
        }))
      ) {
        throw new UserInputError('INVALID_CODE', {
          formErrors: {
            code: 'The specified code already exists',
          },
        })
      }

      // Check that the constraints are satisfied.
      const courseCompetencies = course.competencies.map(
        (c) => c.competency.code
      )
      if (
        args.competencies.some(
          (c) => !courseCompetencies.includes(c.competency)
        )
      ) {
        throw new UserInputError('INVALID_COMPETENCIES')
      }

      // Create the assessment Mongoose object.
      const assessment = new Assessment(args)
      assessment.competencies = await Promise.all(
        args.competencies.map(async (c) => ({
          ...c,
          competency: (await Competency.findOne({ code: c.competency }))?._id,
        }))
      )
      assessment.course = course._id
      assessment.user = user.id

      // Save the assessment into the database.
      try {
        return await assessment.save()
      } catch (err) {
        const formErrors = {}

        switch (err.name) {
          case 'MongoServerError':
            switch (err.code) {
              case 11000:
                throw new UserInputError('EXISTING_CODE', {
                  formErrors: {
                    code: 'The specified code already exists',
                  },
                })
            }
            break

          case 'ValidationError':
            Object.keys(err.errors).forEach(
              (e) => (formErrors[e] = err.errors[e].properties.message)
            )
            throw new UserInputError('VALIDATION_ERROR', { formErrors })
        }
      }

      return null
    },
    // Delete a new assessment.
    async deleteAssessment(_parent, args, { models, user }, _info) {
      const { Assessment, Evaluation } = models

      // Retrieve the assessment to delete.
      const assessment = await Assessment.findOne({ _id: args.id }).populate({
        path: 'course',
        select: 'coordinator',
        model: 'Course',
      })
      if (!assessment || !isCoordinator(assessment.course, user)) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Check if there are any evaluation associated to the assessment.
      if (await Evaluation.exists({ assessment: assessment._id })) {
        throw new UserInputError('EVALUATIONS_STILL_ASSOCIATED')
      }

      try {
        assessment.delete()
        return true
      } catch (err) {
        console.log(err)
      }

      return false
    },
  },
}

export default resolvers
