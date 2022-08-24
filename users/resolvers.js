import { AuthenticationError, UserInputError } from 'apollo-server'
import jwt from 'jsonwebtoken'
import { DateTime } from 'luxon'

// Create the access and the refresh tokens.
function getTokens(user, env) {
  const userinfo = { id: user._id, roles: user.roles }

  const token = jwt.sign(userinfo, env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  })
  const refreshToken = jwt.sign(userinfo, env.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: '14d',
  })

  user.refreshToken = refreshToken
  user.refreshTokenExpires = DateTime.now().plus({ days: 14 }).toJSDate()

  return {
    token,
    refreshToken,
  }
}

const resolvers = {
  User: {
    displayName(user, _args, _context, _info) {
      if (!(user.firstName && user.lastName)) {
        return user.username
      }
      return `${user.firstName} ${user.lastName}`
    },
  },
  Query: {
    async colleagues(_parent, _args, { models }, _info) {
      const { User } = models

      return await User.find({ roles: 'teacher' })
    },
    async me(_parent, _args, { models, user }, _info) {
      const { User } = models

      // Retrieve the logged in user, if any.
      const loggedUser = await User.findOne(
        { _id: user?.id },
        'firstName lastName roles username'
      ).lean()
      if (!user) {
        throw new AuthenticationError('Not authorized')
      }

      // Return all the selected field except '_id'
      return (({ _id, ...rest }) => rest)(loggedUser)
    },
    async users(_parent, args, { models }, _info) {
      const { User } = models

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0)
      const limit = args.limit ?? undefined

      // Retrieve all the users satisfying the conditions defined hereabove.
      const users = await User.find({}, null, { skip, limit })
      return users.map((user) => ({
        ...user.toJSON(),
        id: user.id,
        isValidated: !user.emailConfirmationToken,
      }))
    },
  },
  Mutation: {
    async refreshToken(_parent, args, { env, models }, _info) {
      const { User } = models

      // Check the refresh token validity.
      const decoded = jwt.verify(args.token, env.JWT_REFRESH_TOKEN_SECRET)
      if (!decoded) {
        throw new UserInputError('INVALID_REFRESH_TOKEN')
      }

      // Find a user with the given refresh token.
      const user = await User.findOne(
        { _id: decoded.id },
        '_id refreshToken refreshTokenExpires roles'
      )
      if (
        !user ||
        user.refreshToken !== args.token ||
        DateTime.now() > DateTime.fromISO(user.refreshTokenExpires)
      ) {
        throw new UserInputError('INVALID_REFRESH_TOKEN')
      }

      // Create the access and the refresh tokens.
      const { refreshToken, token } = getTokens(user, env)

      // Save the refresh token into the database.
      try {
        await user.save()
        return {
          refreshToken,
          token,
        }
      } catch (err) {
        console.log(err)
      }
    },
    async signIn(_parent, args, { env, models }, _info) {
      const { User } = models

      // Find a user who has either the specified email address
      // or the specified username.
      const user = await User.findOne(
        {
          $or: [
            { email: args.usernameOrEmail },
            { username: args.usernameOrEmail },
          ],
        },
        '_id password roles salt'
      )
      if (!user?.authenticate(args.password)) {
        throw new UserInputError('INVALID_CREDENTIALS')
      }

      // Create the access and the refresh tokens.
      const { refreshToken, token } = getTokens(user, env)

      // Save the refresh token into the database.
      try {
        await user.save()
        return {
          refreshToken,
          token,
        }
      } catch (err) {
        console.log(err)
      }
    },
    async signOut(_parent, _args, { models, user }, _info) {
      const { User } = models

      // Find the connected user.
      const loggedUser = await User.findOne(
        { _id: user.id },
        '_id refreshToken refreshTokenExpires'
      )

      // Remove his/her refresh token.
      loggedUser.refreshToken = undefined
      loggedUser.refreshTokenExpires = undefined

      // Save the refresh token into the database.
      try {
        await loggedUser.save()
        return true
      } catch (err) {
        console.log(err)
      }

      return false
    },
    async signUp(_parent, args, { models }, _info) {
      const { User } = models

      if (!args.email || !args.password) {
        throw new UserInputError('MISSING_FIELDS')
      }

      const user = new User(args)
      user.provider = 'local'

      user.updateEmail(args.email)

      try {
        await user.save()
        return true
      } catch (err) {
        switch (err.name) {
          case 'MongoServerError': {
            switch (err.code) {
              case 11000: {
                throw new UserInputError('EXISTING_EMAIL_ADDRESS')
              }
            }
            break
          }

          case 'ValidationError': {
            if (err.errors.email) {
              throw new UserInputError('INVALID_EMAIL_ADDRESS')
            }
            if (err.errors.password) {
              throw new UserInputError('INVALID_PASSWORD')
            }
            break
          }
        }
        return false
      }
    },
  },
}

export default resolvers
