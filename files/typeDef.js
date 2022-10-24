import { gql } from 'apollo-server'

const typeDefs = gql`
  enum BannerType {
    COURSE
    PARTNER
    PROGRAM
  }

  type Banner {
    path: String
  }

  type Resource {
    id: ID!
    name: String!
    size: Int!
    type: String!
  }

  extend type Query {
    resources(courseCode: ID): [Resource!]! @auth(requires: [STUDENT, TEACHER])
  }

  extend type Mutation {
    updateBanner(
      code: String!
      image: String!
      name: String!
      type: BannerType!
    ): Banner @auth(requires: TEACHER)
  }
`

export default typeDefs
