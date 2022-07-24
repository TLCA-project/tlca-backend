import { UserInputError } from 'apollo-server'

function isCoordinator(course, user) {
  const userId = user?.id
  return (course.coordinator._id || course.coordinator).toString() === userId
}

const resolvers = {
  AssessmentCategory: {
    QUIZ: 'quiz',
    EXERCISE: 'exercise',
    CODING: 'coding',
    MISSION: 'mission',
    PROJECT: 'project',
    INTERVIEW: 'interview',
    CASESTUDY: 'casestudy',
  },
  Query: {
    async assessment(_parent, args, { models }, _info) {
      const { Assessment } = models

      const assessment = await Assessment.findOne({ _id: args.id })
      if (!assessment) {
        throw new UserInputError('Assessment not found.')
      }

      return assessment
    },
  },
  Mutation: {
    async createAssessment(_parent, args, { models, user }, _info) {
      const { Assessment, Competency, Course } = models

      // Retrieve the course for which to create an assessment.
      const course = await Course.findOne({ code: args.course })
      if (!course || !isCoordinator(course, user)) {
        throw new UserInputError('Course not found.')
      }

      // TODO: populate competencies with codes
      const courseCompetencies = []

      // Check that the constraints are satisfied.
      if (args.competencies.some((c) => courseCompetencies.includes(c))) {
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
        await assessment.save()
        return assessment._id
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
  },
}

export default resolvers
