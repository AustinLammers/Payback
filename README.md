# Payback
## Description
Payback is an application that allows for groups people to split bills amongst themselves. Instead of pulling out a calculator, our app will calculate what each member owes based on frameworks like even split, percentages, or absolute dollars and allow all requests for the calculated amount to be sent with a click of a button. We will also allow for users to pay back debts they have accumulated.

## Contributors

- Xavier Pena
- Alexander Drozdzewicz 
- Gilberto Corral
- Shaan Chauhan
- Austin Lammers 

## Technologies
- Bootstrap
- NodeJS
- Venmo API
- Docker
- PostgreSQL
- HTML
- Handlebars
- Node JS
- Express
- Render

## Directory Structure
PayBack/  
├── MilestoneSubmission/  
│   ├── Kick Start Doc.txt    
│   ├── Release_Notes.pdf  
│   ├── User Acceptance Testing Plan.txt  
├── ProjectSourceCode/  
│   ├── src/  
│   │   ├── init_data/  
│   │   │   ├── create.sql    
│   │   │   └── insert.sql    
│   │   ├── recourses/  
│   │   │   ├── css/  
│   │   │       └── style.css  
│   │   │   └── js/  
│   │   │       └── group.js    
│   │   │       └── script.js    
│   │   └── views/  
│   │       ├── layouts/    
│   │       └── pages/  
│   │       └── partials/  
│   │   ├── .DS_Store  
│   │   ├── groups.css  
│   │   ├── index.js  
│   ├── test/  
│   ├── .gitignore  
│   ├── docker-compose.yaml  
│   ├── package.json  
├── TeamMeetingLogs/  
│   ├── components/  
│   │   ├── Header/  
│   │   │   ├── Header.js  
│   │   │   └── Header.css  
│   │   ├── Footer/  
│   │   │   ├── Footer.js  
│   │   │   └── Footer.css  
│   │   └── ProfilePage/  
│   │       ├── ProfilePage.js  
│   │       └── ProfilePage.css  
├── README.md  
## Running the App
### Instructions on how to run the application locally.
1.) Clone the repository onto your local machine \
2.) Navigate to Payback/ProjectSourceCode/ \
3.) Create `.env` file and create fields `POSTGRES_HOST="db"`, `POSTGRES_USER="<usr>"`, `POSTGRES_PASSWORD="<pswd>"`, `POSTGRES_DB="users_db"`, `SESSION_SECRET="<secrt>"` \
4.) In console/docker, navigate to Payback/ProjectSourceCode/ \
5.) Run the command `sudo docker compose up` \
6.) In your browser, navigate to `localhost:3000/` \
7.) Enjoy the application 
### How to run the tests 
1.) Follow instructions to run app locally \
2.) Before step 3, change `command:` to `'npm run testandrun'` \
3.) Run the command `sudo docker compose up` \
4.) Tests will run automatically before the application starts 
## Application Link 
https://payback-p4gt.onrender.com/

