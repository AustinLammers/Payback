const express = require("express"); // To build an application server or API
const app = express();
const handlebars = require("express-handlebars");
const Handlebars = require("handlebars");
const path = require("path");
const pgp = require("pg-promise")(); // To connect to the Postgres DB from the node server
const bodyParser = require("body-parser");
const session = require("express-session"); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require("bcryptjs"); //  To hash passwords
const axios = require("axios"); // To make HTTP requests from our server. We'll learn more about it in Part C.

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: "hbs",
  layoutsDir: __dirname + "/views/layouts",
  partialsDir: __dirname + "/views/partials",
});

// database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST, // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

console.log(dbConfig);

const db = pgp(dbConfig);

// test your database
db.connect()
  .then((obj) => {
    console.log("Database connection successful"); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch((error) => {
    console.log("ERROR:", error.message || error);
  });

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.
app.use(express.static(__dirname + "/resources"));

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

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  const isLoggedIn = req.session.user ? true : false;

  if (isLoggedIn) res.render("pages/home", { isLoggedIn });
  res.render("pages/login", { isLoggedIn });
});

app.get("/register", (req, res) => {
  const isLoggedIn = req.session.user ? true : false;
  if (isLoggedIn) res.render("pages/home", { isLoggedIn });
  res.render("pages/register");
});

app.get("/home", async (req, res) => {
  const isLoggedIn = req.session.user ? true : false;
  
  // If user is not logged in, show login page
  if (!isLoggedIn) {
    return res.render("pages/login", { isLoggedIn });
  }

  // Initialize arrays to store the groups and friends
  let groups = [];
  let friends = [];

  // Queries to get group and friend information
  const lookup_groups_q = `SELECT group_id FROM users_to_groups WHERE user_id=$1`;
  const lookup_friends_q = `SELECT friend_id FROM friends WHERE user_id=$1`;
  
  try {
    // Fetch groups the user is part of
    const groupData = await db.any(lookup_groups_q, [req.session.user_id]);

    // Extract group IDs from the response and build a string for querying group details
    let gids = groupData.map(group => group.group_id);
    if (gids.length > 0) {
      // Use ARRAY[...] syntax to pass the list of IDs as an array for the ANY operator
      const gidArray = `ARRAY[${gids.join(",")}]`;  // Format the list as an array
      const get_group_name_q = `SELECT group_id, group_name, amount FROM groups WHERE group_id = ANY(${gidArray})`;
      
      // Get detailed information about the user's groups
      const groupDetails = await db.any(get_group_name_q);
      groups = groupDetails.map(group => ({
        group_id: group.group_id,
        group_name: group.group_name,
        amount: group.amount
      }));

      // Sort the groups by amount in ascending order
      groups.sort((a, b) => a.amount - b.amount);
    }

    // Fetch friends of the user
    const friendData = await db.any(lookup_friends_q, [req.session.user_id]);
    
    // Extract friend IDs and get their usernames
    let friendIds = friendData.map(friend => friend.friend_id);
    if (friendIds.length > 0) {
      const friendIdsArray = `ARRAY[${friendIds.join(",")}]`;  // Format the list as an array
      const get_friend_name_q = `SELECT user_id, username FROM users WHERE user_id = ANY(${friendIdsArray})`;

      // Get the usernames of the friends
      const friendDetails = await db.any(get_friend_name_q);
      friends = friendDetails.map(friend => ({
        user_id: friend.user_id,
        username: friend.username
      }));
    }

    // Render the home page with the groups and friends data
    res.render("pages/home", { 
      isLoggedIn, 
      groups, 
      friends 
    });

  } catch (err) {
    console.log("Error fetching groups or friends:", err);
    res.render("pages/home", { 
      isLoggedIn,
      message: "There was an error loading your groups or friends." 
    });
  }
});

  
  app.get('/profile', async (req, res) => {
    const isLoggedIn = req.session.user ? true : false;
    if (!isLoggedIn) res.render("pages/login", { isLoggedIn });
        const get_all_paid_q = `SELECT * FROM expenses WHERE payer=$1 ORDER BY trans_id DESC LIMIT 5`;
        const get_all_loaned_q = `SELECT * FROM expenses WHERE payee=$1 ORDER BY trans_id DESC LIMIT 5`;
        var outgoing = [];
        var incoming = [];
        // Check if the user is logged in
        if (!isLoggedIn) {
            console.error('User not logged in or session missing user id');
            return res.status(401).send({ error: 'Unauthorized: Please log in' });
        }
        db.any(get_all_loaned_q, [req.session.user_id])
        // if query execution succeeds
        // send success message
        .then(function (data) {
          incoming = data;
          var balance = 0;
          for(let i = 0; i < data.length; i++) {
            balance += (+data[i].amount);
            console.log("balance",balance);
          }

          db.any(get_all_paid_q, [req.session.user_id])
        // if query execution succeeds
        // send success message
        .then(async function (data) {
          outgoing = data;
          for(let i = 0; i < data.length; i++) {

            balance -= (+data[i].amount);
            console.log("balance",balance);
          }
          let username = req.session.username;
          try {
            let get_user_name_q = `SELECT username FROM users WHERE user_id=$1;`;
            console.log(outgoing);
            for (let i=0; i < outgoing.length; i++){
              const result = await db.one(get_user_name_q, [outgoing[i].payee]);
              outgoing[i].username = result.username;
          }
          console.log(incoming);
          for (let i=0; i < incoming.length; i++){
            const result = await db.one(get_user_name_q, [incoming[i].payer]);
            incoming[i].username = result.username;
        }
        
            
            res.render('pages/profile_page', {isLoggedIn, outgoing, incoming, balance, username});
            
          } catch (error) {
            console.log("ERROR!");
            console.log(error);
          }
          
          
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



app.get("/groups", (req, res) => {
  const isLoggedIn = req.session.user ? true : false;
  if (!isLoggedIn) res.render("pages/login", { isLoggedIn });

  let get_group_name_q = `SELECT (group_id, group_name, amount) FROM groups WHERE group_id=`;
  const lookup_groups_q = `SELECT group_id FROM users_to_groups WHERE user_id=$1`;

  groups = [];

  db.any(lookup_groups_q, [req.session.user_id])
            // if query execution succeeds
            // send success message
            .then(function (data) {
              console.log("Active Groups: ", data);
              let gids = [];
              idString = "";
              for (let i = 0; i < data.length; i++) {
                console.log(data[i]);
                gids.push(data[i].group_id);
              }
              gidString = `ANY('{ ` + gids.toString() + `}')`;
              get_group_name_q = get_group_name_q + gidString;
              db.any(get_group_name_q)
                // if query execution succeeds
                // send success message
                .then(function (data) {
                  
                  for (let i = 0; i < data.length; i++) {
                    const length = data[i].row.length
                    str = data[i].row.substring(1,length - 1).split(",");
                    str = {'group_id': +str[0], 'group_name': str[1], 'amount': +str[2]};
                    groups.push(str);
                  }
                  req.session.groups = groups;
                  res.render("pages/groups", { isLoggedIn, groups });
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

app.get("/friends", (req, res) => {
  const isLoggedIn = req.session.user ? true : false;
  if (!isLoggedIn) res.render("pages/login", { isLoggedIn });

  const lookup_friends_q = `SELECT friend_id FROM friends WHERE user_id=$1`;
  let get_friend_name_q = `SELECT username FROM users WHERE user_id=`;

  db.any(lookup_friends_q, [req.session.user_id])
    // if query execution succeeds
    // send success message
    .then(function (data) {
      console.log(data);
      let ids = [];
      idString = "";
      for (let i = 0; i < data.length; i++) {
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
          res.render("pages/friends", { isLoggedIn, data });
          req.session.friends = data;
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
      res.render("pages/home", {
        isLoggedIn,
        message: "there was an error loading your friends",
      });
      return console.log(err);
    });
});

app.get("/payment", (req, res) => {
  const isLoggedIn = req.session.user ? true : false;
  if (!isLoggedIn) res.render("pages/login", { isLoggedIn });

  const lookup_friends_q = `SELECT friend_id FROM friends WHERE user_id=$1`;
  let get_friend_name_q = `SELECT user_id, username FROM users WHERE user_id=`;
  let get_group_name_q = `SELECT (group_id, group_name, amount) FROM groups WHERE group_id=`;
  const lookup_groups_q = `SELECT group_id FROM users_to_groups WHERE user_id=$1`;
  var groups = [];
  var friends = [];

  db.any(lookup_friends_q, [req.session.user_id])
    // if query execution succeeds
    // send success message
    .then(function (data) {
      console.log(data);
      let ids = [];
      idString = "";
      let names = [];
      for (let i = 0; i < data.length; i++) {
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
          req.session.friends = data;
          db.any(lookup_groups_q, [req.session.user_id])
            // if query execution succeeds
            // send success message
            .then(function (data) {
              console.log("Active Groups: ", data);
              let gids = [];
              idString = "";
              let names = [];
              for (let i = 0; i < data.length; i++) {
                console.log(data[i]);
                gids.push(data[i].group_id);
              }
              gidString = `ANY('{ ` + gids.toString() + `}')`;
              get_group_name_q = get_group_name_q + gidString;
              db.any(get_group_name_q)
                // if query execution succeeds
                // send success message
                .then(function (data) {
                  console.log("Users group names", data);
                  
                  for (let i = 0; i < data.length; i++) {
                    const length = data[i].row.length
                    str = data[i].row.substring(1,length - 1).split(",");
                    str = {'group_id': +str[0], 'group_name': str[1], 'amount': +str[2]};
                    groups.push(str);
                  }
                  req.session.groups = groups;
                  console.log("Users group names", groups);
                  res.render("pages/payment", { isLoggedIn, friends, groups });
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
app.post("/register", async (req, res) => {
  //hash the password using bcrypt library
  let hash = null;
  if (req.body.password) {
    hash = await bcrypt.hash(req.body.password, 10);
  }

  // To-DO: Insert username and hashed password into the 'users' table
  let add_user_q = `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *;`;
  db.any(add_user_q, [req.body.username, hash])
    // if query execution succeeds
    // send success message
    .then(function (data) {
      console.log(data);

      res.redirect("/login");
    })
    // if query execution fails
    // send error message
    .catch(function (err) {
      res.redirect("/register");
      return console.log(err);
    });
});

app.post("/login", async (req, res) => {
  let search_user_q = "SELECT * FROM users WHERE username=$1;";
  db.any(search_user_q, [req.body.username])
    // if query execution succeeds
    // send success message
    .then(async function (data) {
      req.session.username = data[0].username;
      req.session.password = data[0].password;
      req.session.user_id = data[0].user_id;
      //hash the password using bcrypt library
      const match = await bcrypt.compare(req.body.password, req.session.password);

      if (match) {
        //save user details in session like in lab 7
        req.session.user = {user : true};
        req.session.save();
        res.redirect("/home");
      } else {
        res.render("pages/login", { message: "Incorrect Password" });
      }
    })
    // if query execution fails
    // send error message
    .catch(function (err) {
      res.redirect("/register");
      return console.log(err);
    });
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect("/login");
  }
  next();
};

// Authentication Required
app.use(auth);

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/logout");
});

app.post("/add_transaction", (req, res) => {
  let add_user_q = `INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *;`;
});

app.post("/add_friend", (req, res) => {
  const isLoggedIn = req.session.user ? true : false;
  if (req.session) {
    let find_user_q = "SELECT user_id FROM users WHERE username=$1;";
    let add_friend_q = `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) RETURNING *;`;
    var friend_id = -1;
    var user_id = -1;
    let data =  req.session.friends;
    if (req.session.user) {
      user_id = req.session.user_id;

      db.one(find_user_q, [req.body.friend_username])

        .then(function (data) {
          friend_id = data.user_id;

          db.any(add_friend_q, [user_id, friend_id])
            // if query execution succeeds
            // send success message
            .then(function (data) {
              res.redirect("/friends");
            })
            // if query execution fails
            // send error message
            .catch(function (err) {
              res.render("pages/friends", {
                isLoggedIn,
                message: "Request could not be processed, Try again later.",
                data,
              });
              return console.log(err);
            });
        })

        .catch(function (err) {
          res.render("pages/friends", {
            isLoggedIn,
            message: "There was an error finding this user.",
            data,
          });
          return console.log(err);
        });
    } else {
      res.render("pages/friends", {
        isLoggedIn,
        message:
          "There was an error processing this request. Please check the entered usernames and try again.",
        data,
      });
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/welcome", (req, res) => {
  res.json({ status: "success", message: "Welcome!" });
});

app.post("/createGroup", async (req, res) => {
  const isLoggedIn = req.session.user ? true : false;
  
  const b = req.body;
  console.log(b);
  // res.send("Received!");

  const insertQuery =
    "INSERT INTO groups (group_name, payment_day, payment_time, payee, amount) VALUES ($1, $2, $3, $4, $5) returning *;";

  try {
    const result = await db.one(insertQuery, [
      req.body.event_name,
      req.body.event_weekday,
      req.body.event_time,
      req.session.user_id,
      req.body.amount
    ]);
    console.log("Inserted into db successfully : ", result);
    var group_id = result.group_id;

    let strArray = req.body.event_attendees.split(", ");
    console.log("Assumed usernames = ", strArray);

    strArray.forEach(async (inputUsername) => {
      var user_id = await db.one("SELECT user_id FROM users WHERE username = $1", [inputUsername]);
      var result = await db.none("INSERT INTO users_to_groups (user_id, group_id) values ($1, $2)", [user_id.user_id, group_id]);
    });

    res.redirect("/groups");
  } catch (error) {
    console.log("ERROR!");
    console.log(error);
    res.redirect("/groups");
  }
});

app.post("/createPayment", async (req, res) => {
  const isLoggedIn = req.session.user ? true : false;
  if (req.session) {
    let get_group_payee_user_q =
      "SELECT * FROM groups WHERE group_id=$1;";
    let add_transaction_q = `INSERT INTO expenses (payer, payee, amount) VALUES ($1, $2, $3) RETURNING *;`;
    const add_transaction_to_group = `INSERT INTO expenses_to_groups (trans_id, group_id) VALUES ($1, $2) RETURNING *;`;
    const update_group_balance = `UPDATE groups SET amount=$1 WHERE group_id=$2;`;
    var current_bal = 0;
    var payer_id = -1;
    var payee_id = -1;
    console.log(req.body);
    if (req.session.user_id) {
      payer_id = req.session.user_id;
      paymentTag = req.body.recipient.split("_");
      payee_id = +paymentTag[1];
      paymentType = paymentTag[0];
      groups = req.session.groups;
      friends = req.session.friends;

      if (paymentType == "f") {
        // if we are paying to a friend
        db.any(add_transaction_q, [payer_id, payee_id, req.body.amount])
          // if query execution succeeds
          // send success message
          .then(function (data) {
            console.log(data);
            res.redirect('/payment');
          })
          // if query execution fails
          // send error message
          .catch(function (err) {
            res.render("pages/payment", {
              message:
                "There was an error processing this request. Please try again.", isLoggedIn, friends, groups
            });
            return console.log(err);
          });
      } else {
        // if we are paying a group
        db.any(get_group_payee_user_q, [payee_id])
          // if query execution succeeds
          // send success message
          .then(function (data) {
            var payee_user = data[0].payee;
            current_bal = data[0].amount;
            db.any(add_transaction_q, [payer_id, payee_user, req.body.amount])
              // if query execution succeeds
              // send success message
              
              .then(function (data) {
                console.log("insert: ",data);
                var paid_amount = data[0].amount;
                  
                db.any(add_transaction_to_group, [data[0].trans_id, payee_id])
                  // if query execution succeeds
                  // send success message
                  .then(function (data) {
                    
                    db.any(update_group_balance, [current_bal - paid_amount, payee_id])
                  // if query execution succeeds
                  // send success message
                  .then(function (data) {
                    
                    res.redirect('/payment');
                   
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
                res.render("pages/payment", {
                  message:
                    "There was an error processing this request. Please try again.", isLoggedIn, friends, groups
                });
                return console.log(err);
              });
          })
          // if query execution fails
          // send error message
          .catch(function (err) {
            res.render("pages/payment", {
              message:
                "There was an error processing this request. Please try again.", isLoggedIn, friends, groups
            });
            return console.log(err);
          });
      }
    } else {
      // If there is no saved user_id, we cant perform the operation
      res.redirect('/login');
    }
  }
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log("Server is listening on port 3000");
