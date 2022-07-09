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

## Install in Docker Development Environment

If you prefer, you can use a Docker Development Environment instead of installing the code on your machine.  With VSCode support for remote containers, you can use the IDE on your local machine to edit source files inside the container.  

First, install or upgrade Docker on your host, to have the latest Dev Env features.  
  
Two possibilities exists  : 
    - you can host the files on your local filesystem and use containers to run the application, such that any change is refleted on your local machine. 
    - or you can keep the code entirely in the backend container, edit the files with VSCode, check the result on your local browser and use Git to commit/push your code.  The code doesn't need to exist on your host filesystem, and you don't need to install the dependencies on your machine.  

In both cases, two containers will be launched : one for the database and another for the node backend.  They are handled by Docker Compose.  
Environment variables are handled through the `.docker-env.development` file that you can edit and fit to your needs.  
You can also adjust the container configuration by editing the `.docker/docker-compose.yaml` file. 

Another `docker-compose.yaml` file is available at the root of the tlca-backend directory.  This one can be used to start the containers directly, outside Docker Dev Env.  


### Using a Local Folder  

Start a Docker Development Environment from your Docker Dashboad.  Select "New Dev Environment", and choose source "Local Directory".  Select the tlca-backend directory on your filesystem, and finish the interactive wizard. You will now have a running Docker Dev Env. with two running containers, one for the Mongo database and another for the backend.  To open the code in VSCode, select "Open in VSCode" button next to the backend container.  

Once in VSCode, you can edit the source files, but also run the development server.  Open a terminal on the container, and run : 

    > yarn install
    > yarn start

Once the server is started, you'll be able to access the backend via localhost:4001

### Using a remote repository

Use the same procedure as above, but choose source "Existing Git Repo" and provide the URL of the repository (you can specify a specific branch preceeded by a `@` character at the end of the git URL).  As above, run : 

    > yarn install
    > yarn start

and open localhost:4001 in your browser. 