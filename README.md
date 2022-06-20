# tlca-backend

Backend server of the TLCA platform

## Quick install

Start by installing required dependencies:

- [MongoDB](https://www.mongodb.com/try/download/community) (4.2+)
- [Node.js](https://nodejs.org) (16+)
- [Yarn Classic](https://classic.yarnpkg.com)

Then, clone the Git repository, and launch the installation:

    > git clone https://github.com/TLCA-project/tlca-backend.git
    > cd tlca-backend
    > yarn install

Once successfully installed, create a local untracked file in the root folder named `.env.development`. Write the following content in this file:

    > MONGODB_URI=mongodb://localhost:27017/tlca-dev
    > JWT_SECRET=MY_SECRET_STORY

You must of course refer to your own local configuration for the MongoDB server and you can customise the name of the database and the secret JWT key to be used. Then, you can run the backend server locally in development mode:

    > yarn start

The backend server should be ready at [http://localhost:4001](http://localhost:4001). From there, you will be able to easily query the server with Apollo Studio.
