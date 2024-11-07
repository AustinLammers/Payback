const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

const user = {
  username: undefined,
  password: undefined,
};

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);



// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

//Endpoints start here

app.get('/', (req, res) => {
    res.redirect('/login');
  });

  app.get('/login', (req, res) => {
    res.render('pages/login');
  });

  app.get('/register', (req, res) => {
    res.render('pages/register');
  });

  // Register
app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  
  const hash = await bcrypt.hash(req.body.password, 10);

  // To-DO: Insert username and hashed password into the 'users' table
  let add_user_q = `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *;`
  db.any(add_user_q, [req.body.username, hash])
        // if query execution succeeds
        // send success message
        .then(function (data) {
          console.log(data);
          res.redirect('/login');
        })
        // if query execution fails
        // send error message
        .catch(function (err) {
          res.redirect('/register');
          return console.log(err);
          
        });

        
});



app.post('/login', async (req, res) => {

  let search_user_q = 'SELECT * FROM users WHERE username=$1;'
  db.any(search_user_q, [req.body.username])
        // if query execution succeeds
        // send success message
        .then(async function (data) { 
          user.username = data[0].username;
          user.password = data[0].password;
          //hash the password using bcrypt library
          const match = await bcrypt.compare(req.body.password, user.password);

          if(match) {
          //save user details in session like in lab 7
          req.session.user = user;
          req.session.save();
          res.redirect('/discover')
          }
          else {
          res.render('pages/login', {'message' : 'Incorrect Password'})

          }
        })
        // if query execution fails
        // send error message
        .catch(function (err) {
          res.redirect('/register');
          return console.log(err);
          
        });
});



app.get('/logout', async (req, res) => {
  req.session.destroy();
  res.render('pages/logout');
});




// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');