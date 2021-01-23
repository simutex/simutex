# SimuTex
A web-based LaTeX editor with collaborative editing.

# About
SimuTex is an in-work collaborative LaTeX editing application available in the browser. 

# Current Features
- Create, rename, and delete projects
- Share projects with users
- Specify whether a user can collaborate on the project (modify permissions)
- Specify whether a user can view the project (view latest rendered PDF output)
- Generate only PDF outputs
- All packages provided by your installation of LaTeX
- User presense, remote user cursors and text selection.

# Planned Features
- Image support, currently there is none!
- File upload

# Key Information
- Uses `latexmk` to correctly compile projects
  - Requires Docker to run the LaTeX Build Service (LBS)
- Written entirely in JavaScript with Node.js
- Uses a MongoDB instance for user accounts and project information.

# Running
1. Clone the repository
2. Ensure a MongoDB instance is running on localhost
3. Configure the MongoDB hostname, port, and database name in `config.js`
4. Create the MongoDB database using the database name chosen above
5. Start the MongoDB instance
6. Download and build the LaTeX Build Service (LBS) Docker container.
    - `$ docker build https://github.com/simutex/docker-latex.git -t latex-full:latest`
7. Open a terminal in the repository directory
8. Execute `npm install` to install the needed Node.js packages
9. Execute `npm build` to build the webpack bundles
10. Execute `npm run start` to start the server
11. Open a browser and navigate to http://localhost:3080/welcome to configure the root account
    - If you changed the default port to something else you'll need to modify that in the above address.
