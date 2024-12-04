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
  id: undefined,
  friends: undefined,
  groups: undefined,
};

// database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST, // the database server
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
app.use(express.static(__dirname + '/resources'));

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
    const isLoggedIn = req.session.user ? true : false;
    res.render('pages/login', { isLoggedIn });
  });

  app.get('/register', (req, res) => {
    res.render('pages/register');
  });

  app.get('/home', (req, res) => {

    const isLoggedIn = req.session.user ? true : false;
    res.render('pages/home', { isLoggedIn });
  });
  
app.get('/profile', (req, res) => {
    const isLoggedIn = req.session.user ? true : false;
    res.render('pages/profile_page', { isLoggedIn });
  });

  app.get('/groups', (req, res) => {
    const isLoggedIn = req.session.user ? true : false;


    const lookup_groups_q = `SELECT group_id FROM users_to_groups WHERE user_id=$1`;
    let get_group_name_q = `SELECT group_name FROM groups WHERE group_id =`;
    let get_user_names_q = `SELECT username FROM users WHERE user_id = `;
    let get_user_ids_q = `SELECT user_id from user_to_groups WHERE group_id =`;

    db.any(lookup_groups_q, [user.id])
        // if query execution succeeds
        // send success message
        .then(function (data) {
          console.log("group_ids:")
          console.log(data);
          let ids = [];
          idString = '';
          for (let i = 0; i < data.length; i++) {
            console.log(data[i]);
            ids.push(data[i].group_id);
          }
          idString = `ANY('{ ` + ids.toString() + `}')`;
          get_group_name_q = get_group_name_q + idString;
          db.any(get_group_name_q)
          // if query execution succeeds
          // send success message
          .then(function (data) {
            console.log("group_names:")
            console.log(data);
            res.render('pages/groups', { isLoggedIn, data });
            user.groups = data;
          })
          // if query execution fails
          // send error message
          .catch(function (err) {
            return console.log(err);
          });
          get_user_ids_q = get_user_ids_q + idString;
          db.any(get_user_ids_q)
          // if query execution succeeds
          // send success message
          .then(function (data) {
            console.log("user_names:")
            console.log(data);
            res.render('pages/groups', { isLoggedIn, data });
            user.username = data;
          })
          // if query execution fails
          // send error message
          .catch(function (err) {
            return console.log(err);
          });



        })
        // if query execution fails
        // send error message
        .catch(function (err) {
          res.render('pages/home', { isLoggedIn, 'message':'there was an error loading your friends' });
          return console.log(err);

        });
   

  });

  app.get('/friends', (req, res) => {
    const isLoggedIn = req.session.user ? true : false;

    const lookup_friends_q = `SELECT friend_id FROM friends WHERE user_id=$1`;
    let get_friend_name_q = `SELECT username FROM users WHERE user_id=`;

    db.any(lookup_friends_q, [user.id])
        // if query execution succeeds
        // send success message
        .then(function (data) {
          console.log(data);
          let ids = [];
          idString = '';
          for (let i =0; i < data.length; i++) {
            console.log(data[i]);
            ids.push(data[i].friend_id);
          }
          idString = `ANY('{ ` + ids.toString() + `}')`;
          get_friend_name_q = get_friend_name_q + idString;
          db.any(get_friend_name_q)
          // if query execution succeeds
          // send success message
          .then(function (data) {
            console.log(data);
            res.render('pages/friends', { isLoggedIn, data });
            user.friends = data;
          })
          // if query execution fails
          // send error message
          .catch(function (err) {
            return console.log(err);
          });
          
          
          
        })
        // if query execution fails
        // send error message
        .catch(function (err) {
          res.render('pages/home', { isLoggedIn, 'message':'there was an error loading your friends' });
          return console.log(err);
          
        });

    
  });

  app.get('/payment', (req, res) => {
    const isLoggedIn = req.session.user ? true : false;

    const lookup_friends_q = `SELECT friend_id FROM friends WHERE user_id=$1`;
    let get_friend_name_q = `SELECT user_id, username FROM users WHERE user_id=`;
    let get_group_name_q = `SELECT (group_id, group_name) FROM groups WHERE group_id=`;
    const lookup_groups_q = `SELECT group_id FROM users_to_groups WHERE user_id=$1`
    var groups = [];
    var friends = [];

    db.any(lookup_friends_q, [user.id])
        // if query execution succeeds
        // send success message
        .then(function (data) {
          console.log(data);
          let ids = [];
          idString = '';
          let names = [];
          for (let i =0; i < data.length; i++) {
            console.log(data[i]);
            ids.push(data[i].friend_id);
          }
          idString = `ANY('{ ` + ids.toString() + `}')`;
          get_friend_name_q = get_friend_name_q + idString;
          db.any(get_friend_name_q)
          // if query execution succeeds
          // send success message
          .then(function (data) {
            friends = data;
            user.friends = data;
            db.any(lookup_groups_q, [user.id])
              // if query execution succeeds
              // send success message
              .then(function (data) {
                console.log(data);
                let gids = [];
                idString = '';
                let names = [];
                for (let i =0; i < data.length; i++) {
                  console.log(data[i]);
                  ids.push(data[i].group_id);
                }
                gidString = `ANY('{ ` + gids.toString() + `}')`;
                get_group_name_q = get_group_name_q + gidString;
                db.any(get_group_name_q)
                // if query execution succeeds
                // send success message
                .then(function (data) {
                  groups = data;
                  user.groups = data;
                  res.render('pages/payment', { isLoggedIn, friends, groups })
                })
                // if query execution fails
                // send error message
                .catch(function (err) {
                return console.log(err);
            });
          
          
          
        })
        // if query execution fails
        // send error message
        .catch(function (err) {
          return console.log(err);
          
        });

            
          })
          // if query execution fails
          // send error message
          .catch(function (err) {
            return console.log(err);
          });
          
          
          
        })
        // if query execution fails
        // send error message
        .catch(function (err) {
          return console.log(err);
          
        });
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
          user.id = data[0].user_id;
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

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

// Authentication Required
app.use(auth);



app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('pages/logout');
});

app.post('/add_transaction', (req, res) => {
  let add_user_q = `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *;`

});

app.post('/add_friend', (req, res) => {
  const isLoggedIn = req.session.user ? true : false;
  if (req.session){
    let find_user_q = 'SELECT user_id FROM users WHERE username=$1;'
    let add_friend_q = `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) RETURNING *;`
    var friend_id = -1;
    var user_id = -1;
    let data = user.friends;
    if(user.id) { 
      user_id = user.id;
  
      db.one(find_user_q, [req.body.friend_username])
          
        .then(function (data) {
            friend_id = data.user_id;

        db.any(add_friend_q, [user_id, friend_id])
        // if query execution succeeds
        // send success message
        .then(function (data) {
          res.redirect('/friends');
        })
        // if query execution fails
        // send error message
        .catch(function (err) {
          res.render('pages/friends', { isLoggedIn, message : "Request could not be processed, Try again later.", data });
          return console.log(err);
          
        });
        })
          
          .catch(function (err) {
            res.render('pages/friends', { isLoggedIn, message: "There was an error finding this user.", data })
            return console.log(err);
        });
      }
      else { 
        res.render('pages/friends', { isLoggedIn, message: "There was an error processing this request. Please check the entered usernames and try again.", data });
      }
    }
      else {
        res.redirect('/login');
      }
   
});

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

app.post('/createGroup', async (req, res) => {
  const b = req.body;
  console.log(b);
  // res.send("Received!");
 
  const insertQuery = 'INSERT INTO GROUPS (group_name, payment_day, payment_time) VALUES ($1, $2, $3) returning *;'
 
  try{
    const result = await db.one(insertQuery, [req.body.event_name, req.body.event_weekday, req.body.event_time]);
    console.log("Inserted into db successfully : ", result);
    var group_id = result.group_id;
 
    let strArray = req.body.event_attendees.split(', ');
    console.log("Assumed usernames = ", strArray)
 
    strArray.forEach(async inputUsername => {
      var user_id = await db.one('SELECT user_id FROM users WHERE username = $1', [inputUsername]);
      var result = await db.none('INSERT INTO users_to_groups (user_id, group_id) values ($1, $2)', [user_id.user_id, group_id])
    })
 
    res.redirect("/groups");
  }
 
  catch (error) {
    console.log("ERROR!");
    console.log(error)
    res.redirect("/groups");
  }
 });

app.post('/createPayment', async (req, res) => {
  if (req.session){
  let get_group_payee_user_q = 'SELECT payee_id FROM groups WHERE group_id=$1;'
  let add_transaction_q = `INSERT INTO expenses (payer, payee, amount) VALUES ($1, $2, $3) RETURNING *;`
  const add_transaction_to_group = `INSERT INTO expenses_to_groups (trans_id, group_id) VALUES ($1, $2) RETURNING *;`
  var payer_id = -1;
  var payee_id = -1;
  console.log(req.body);
  if(user.id) { 
    payer_id = user.id;
    paymentTag = req.body.recipient.split('_');
    payee_id = +paymentTag[1];
    paymentType = paymentTag[0];

    if (paymentType == 'f'){ // if we are paying to a friend
            db.any(add_transaction_q, [payer_id, payee_id, req.body.amount])
              // if query execution succeeds
              // send success message
            .then(function (data) {
            console.log(data);
            res.render('pages/payment', {message: 'Transaction Sent!'});
            })
          // if query execution fails
          // send error message
          .catch(function (err) {
          res.render('pages/payment', {message: "There was an error processing this request. Please try again."});
          return console.log(err);
          });
    }
    else { // if we are paying a group
      db.any(get_group_payee_user_q, [payee_id])
        // if query execution succeeds
        // send success message
      .then(function (data) {
        var payee_user = data.payee_id;
        db.any(add_transaction_q, [payer_id, payee_user, req.body.amount])
              // if query execution succeeds
              // send success message
            .then(function (data) {
              db.any(add_transaction_to_group, [data.trans_id, payee_id])
              // if query execution succeeds
              // send success message
              .then(function (data) { 
                
                res.render('pages/payment', {message: 'Transaction Sent!'});
              })
              // if query execution fails
              // send error message
              .catch(function (err) {
                return console.log(err);
                
              });
            })
          // if query execution fails
          // send error message
          .catch(function (err) {
          res.render('pages/payment', {message: "There was an error processing this request. Please try again."});
          return console.log(err);
          });

      })
      // if query execution fails
      // send error message
      .catch(function (err) {
        res.render('pages/payment', {message: "There was an error processing this request. Please try again."});
        return console.log(err);
    });
    }
    }
    else { // If there is no saved user_id, we cant perform the operation
      res.render('pages/payment', {message: "There was an error processing this request. Please try again."});
    
  }
  }
          
  
  });


  app.post('/createTransaction', async (req, res) => {
    if (req.session){
    let find_user_q = 'SELECT user_id FROM users WHERE username=$1;'
    let add_transaction_q = `INSERT INTO transactions (amount, payee) VALUES ($1, $2) RETURNING *;`
    var payer_ids = [];
    var payee_id = -1;
    if(user.id) { 
      payee_id = user.id;
            db.one(find_user_q, [req.body.payee_username])
            
            .then(function (data) {
              payee_id = data.user_id;
  
              
          })
            .catch(function (err) {
              res.render('pages/payment', {message: "There was an error finding this user."})
              return console.log(err);
          });
    }
    else { 
      res.render('pages/friends', {message: "There was an error processing this request. Please check the entered usernames and try again."});
    }
    }
    });
  


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');

