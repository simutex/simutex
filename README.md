# SimuTex
A web-based LaTeX editor with planned collaborative editing.

# About
SimuTex is an in-work collaborative LaTeX editing application available in the browser. 

The application currently does not contain collaborative editing, arguably a key feature of the application.

# Current Features
- Create, rename, and delete projects
- Share projects with users
- Specify whether a user can collaborate on the project (modify permissions)
- Specify whether a user can view the project (view latest rendered PDF output)
- Generate only PDF outputs
- All packages provided by your installation of LaTeX

# Planned Features
- Image support, currently there is none!
- File upload
- BibTex
- Collaborative real-time editing

# Key Information
- Uses `latexmk` to correctly compile projects
  - Requires `pdfLaTeX` to be in your system path
- Written entirely in JavaScript with Node.js
- Uses a MongoDB instance for user accounts and project information.

# Running
1. Clone the repository
2. Ensure a MongoDB instance is running
    - No credentials required at this time
3. Configure the MongoDB hostname, port, and database name in `config.js`
4. Create the MongoDB database using the database name chosen above
5. Start the MongoDB instance
6. Place a copy of `latexmk` in the root repository directory
6. Open a terminal in the repository directory
2. Execute `npm install` to install the needed Node.js packages
3. Execute `npm run start` to start the server
4. Open a browser and navigate to http://localhost:3080/
