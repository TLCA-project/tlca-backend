import { UserInputError } from 'apollo-server'

const resolvers = {
  Query: {
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
      const { Assessment, Evaluation, User } = models

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
        { id: args.assessment },
        '_id course'
      )
      if (!assessment) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Create the evaluation Mongoose object.
      const evaluation = new Evaluation(args)
      evaluation.assessment = assessment._id
      evaluation.course = assessment.course
      evaluation.evaluator = user.id
      evaluation.user = learner._id

      // Save the evaluation into the database.
      try {
        return await evaluation.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
  },
}

export default resolvers
