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

console.log(dbConfig)

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

  app.get('/home', (req, res) => {
    res.render('pages/home');
  });
  
app.get('/profile', (req, res) => {
    res.render('pages/profile_page');
  });

  app.get('/groups', (req, res) => {
    res.render('pages/groups');
  });

  app.get('/friends', (req, res) => {
    res.render('pages/friends');
  });

  app.get('/payment', (req, res) => {
    res.render('pages/payment');
  });


  // Register
app.post('/register', async (req, res) => {
  //hash the password using bcrypt library
  let hash = null;
  if(req.body.password){
    hash = await bcrypt.hash(req.body.password, 10);
  }

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
          res.redirect('/home');
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



app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('pages/logout');
});

app.post('/add_transaction', (req, res) => {
  let add_user_q = `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *;`

});

app.put('/add_friend', (req, res) => {
  let find_user_q = 'SELECT user_id FROM users WHERE username=$1;'
  let add_friend_q = `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) RETURNING *;`
  var friend_id = -1;
  var user_id = -1;

  db.one(find_user_q, [user.username] )
        // if query execution succeeds
        // send success message
        .then(function (data) {
          db.one(find_user_q, [req.query.friend_username])
          
          .then(function (data) {
            friend_id = data.user_id;
            console.log("friend found: " + data.user_id + friend_id);

        db.any(add_friend_q, [user_id, friend_id])
        // if query execution succeeds
        // send success message
        .then(function (data) {
          console.log(data);
          res.render('pages/friends', {message : "Friend added sucessfully!"});
        })
        // if query execution fails
        // send error message
        .catch(function (err) {
          res.render('pages/friends', {message : "Request could not be processed, Try again later."});
          return console.log(err);
          
        });
        })
          
          .catch(function (err) {
            res.render('pages/friends', {message: "There was an error finding this user."})
            return console.log(err);
        });
        user_id = data.user_id;
        console.log("userFound: " + data.user_id + user_id);

        })
        // if query execution fails
        // send error message
        .catch(function (err) {
          res.render('pages/friends', {message: "There was an error processing this request. Please check the entered username and try again."});
          return console.log(err);
          
        });
   
});

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

app.post('/createGroup', async (req, res) => {
  let search_user_q = `SELECT * FROM users WHERE username = $1;`
  let create_group_q = `INSERT INTO groups (group_name) VALUES ($1) RETURNING group_id;`
  let users_to_groups_q = `INSERT INTO users_to_groups (user_id, group_id) VALUES ($1, $2) RETURNING user_id, group_id;`

  const {username, group_name} = req.body;
  var userResult; 
  var groupResult;

  if(req.body.username) {
    db.task('get-everything', task => {
      return task.batch([task.any(search_user_q, [username]), task.any(create_group_q, [group_name])]);
    })

    .then(function (data) {
      userResult = data[0][0].user_id;
      groupResult = data[1][0].group_id;
      db.any(users_to_groups_q, [userResult, groupResult])
      .then(mappingData => {
        return {data, mappingData};
      })
      .then((finalResult) => {
        res.status(201).json({
          status: 'success',
          data: finalResult,
          message: 'data added successfully',
      });
    })
      .catch(function (err) {
        return console.log(err);
      });
    });

  } else {
    app.use((req, res) => {
      res.status(404).send('User not found');
    });
  }
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');

