import { UserInputError } from 'apollo-server'

import { isCoordinator, isEvaluator } from '../lib/courses.js'

const resolvers = {
  EvaluationStatus: {
    PUBLISHED: 'published',
    UNPUBLISHED: 'unpublished',
  },
  Evaluation: {
    // Retrieve the assessment that this evaluation is for.
    async assessment(evaluation, _args, { models }, _info) {
      const { Assessment } = models
      return await Assessment.findOne({ _id: evaluation.assessment })
    },
    // Retrieve the course that this evaluation is related to.
    async course(evaluation, _args, { models }, _info) {
      const { Course } = models
      return await Course.findOne({ _id: evaluation.course })
    },
    // Retrieve the date the evaluation was taken.
    date(evaluation, _args, _context, _info) {
      return evaluation.evalDate || evaluation.date
    },
    // Retrieve the 'id' of the evaluation from the MongoDB '_id'.
    id(evaluation, _args, _context, _info) {
      return evaluation._id.toString()
    },
    // Retrieve whether this evaluation is published or not.
    isPublished(evaluation, _args, _context, _info) {
      return !!evaluation.published
    },
    // Retrieve the learner who took this evaluation.
    async learner(evaluation, _args, { models }, _info) {
      const { User } = models
      return await User.findOne({ _id: evaluation.user })
    },
    // Retrieve the status of this evaluation
    // according to it's publication date.
    status(evaluation, _args, _content, _info) {
      if (evaluation.published) {
        return 'published'
      }
      return 'unpublished'
    },
  },
  Query: {
    // Retrieve one given evaluation given its 'id'.
    async evaluation(_parent, args, { models }, _info) {
      const { Evaluation } = models

      const evaluation = await Evaluation.findOne({ _id: args.id }).lean()
      if (!evaluation) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      return evaluation
    },
    // Retrieve all the evaluations
    // that are available to the connected user.
    async evaluations(_parent, args, { models }, _info) {
      const { Course, Evaluation, User } = models

      const filter = {}

      if (args.assessment) {
        filter.assessment = args.assessment
      }

      if (args.courseCode) {
        const course = await Course.exists({ code: args.courseCode })
        if (!course) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }
        filter.course = course._id
      }

      if (args.learner) {
        const learner = await User.exists({ username: args.learner })
        if (!learner) {
          throw new UserInputError('LEARNER_NOT_FOUND')
        }
        filter.user = learner._id
      }

      return await Evaluation.find(filter)
    },
  },
  Mutation: {
    // Create a new evaluation from the specified assessment and learner.
    async createEvaluation(_parent, args, { models, user }, _info) {
      const { Assessment, Competency, Evaluation, User } = models

      // Clean up the optional args.
      if (!args.comment?.trim().length) {
        delete args.comment
      }
      if (!args.evalDate) {
        delete args.evalDate
      }

      // Retrieve the learner for which to create an evaluation.
      const learner = await User.exists({ username: args.learner })
      if (!learner) {
        throw new UserInputError('LEARNER_NOT_FOUND')
      }

      // Retrieve the assessment for which to create an evaluation.
      const assessment = await Assessment.findOne(
        { _id: args.assessment },
        '_id course'
      ).lean()
      if (!assessment) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Create the evaluation Mongoose object.
      const evaluation = new Evaluation(args)
      evaluation.assessment = assessment._id
      evaluation.competencies = await Promise.all(
        args.competencies.map(async (c) => ({
          ...c,
          competency: await Competency.exists({ code: c.competency }),
        }))
      )
      evaluation.course = assessment.course._id
      evaluation.evaluator = user.id
      evaluation.user = learner._id

      // Save the evaluation into the database.
      try {
        return await evaluation.save()
      } catch (err) {
        const formErrors = {}

        switch (err.name) {
          case 'ValidationError':
            Object.keys(err.errors).forEach(
              (e) => (formErrors[e] = err.errors[e].properties.message)
            )
            throw new UserInputError('VALIDATION_ERROR', { formErrors })
        }
      }

      return null
    },
    async publishEvaluation(_parent, args, { models, user }, _info) {
      const { Evaluation } = models

      const evaluation = await Evaluation.findOne({ _id: args.id }).populate({
        path: 'course',
        select: 'coordinator',
        model: 'Course',
      })
      if (!evaluation) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      // Can only publish an evaluation that is not published yet
      // and only its evaluator or the associated course coordinator can publish it..
      if (
        evaluation.published ||
        !(
          isEvaluator(evaluation, user) ||
          isCoordinator(evaluation.course, user)
        )
      ) {
        throw new UserInputError('EVALUATION_PUBLICATION_FAILED')
      }

      // Publish the evaluation.
      evaluation.published = new Date()

      try {
        // Save the evaluation into the database.
        return await evaluation.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
  },
}

export default resolvers
