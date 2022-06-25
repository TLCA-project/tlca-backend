import { UserInputError } from 'apollo-server';

const resolvers = {
  Partner: {
    async courses(partner, _args, { models: { Course } }, _info) {
      const pipeline = [];

      // Only retrieve the courses from this partner that are
      // published, not archived and are not private.
      pipeline.push({ $match: { $and: [
        { $expr: { $in: [partner._id, { $ifNull: ['$partners', []] }] } },
        { published: { $exists: true } },
        { archived: { $exists: false } },
        { $expr: { $ne: ['$visibility', 'private'] } }
      ] } });

      return await Course.aggregate(pipeline);
    }
  },
  Query: {
    async partners(_parent, args, context, _info) {
      const { Partner } = context.models;

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0);
      const limit = args.limit ?? undefined;

      // Retrieve all the courses satisfying the conditions defined hereabove.
      const partners = await Partner.find({}, null, { skip, limit });

      return partners;
    },
    async partner(_parent, args, context, _info) {
      const { Partner } = context.models;

      const partner = await Partner.findOne({ code: args.code });
      if (!partner) {
        throw new UserInputError("Partner not found.");
      }

      return partner;
    },
  },
};

export default resolvers;
