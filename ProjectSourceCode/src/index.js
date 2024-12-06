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
  const isLoggedIn = req.session.user ? true : false; // this construct shows up a lot, it checks if the user is logged in

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
  
  if (!isLoggedIn) {
    return res.render("pages/login", { isLoggedIn });
  }

  let groups = [];
  let friends = [];

  const lookup_groups_q = `SELECT group_id FROM users_to_groups WHERE user_id=$1`;
  const lookup_friends_q = `SELECT friend_id FROM friends WHERE user_id=$1`;
  
  try { // We need to find all the groups a user is a part of
    const groupData = await db.any(lookup_groups_q, [req.session.user_id]);

    let gids = groupData.map(group => group.group_id);
    if (gids.length > 0) {
      const gidArray = `ARRAY[${gids.join(",")}]`;  
      const get_group_name_q = `SELECT group_id, group_name, amount FROM groups WHERE group_id = ANY(${gidArray})`;
      
      const groupDetails = await db.any(get_group_name_q);
      groups = groupDetails.map(group => ({
        group_id: group.group_id,
        group_name: group.group_name,
        amount: parseFloat(group.amount).toFixed(2) 
      }));

      groups.sort((a, b) => a.amount - b.amount);
    }
      //Grabbing all of the users friends
    const friendData = await db.any(lookup_friends_q, [req.session.user_id]);
    
    let friendIds = friendData.map(friend => friend.friend_id);
    if (friendIds.length > 0) {
      const friendIdsArray = `ARRAY[${friendIds.join(",")}]`; 
      const get_friend_name_q = `SELECT user_id, username FROM users WHERE user_id = ANY(${friendIdsArray})`;
      // We have all the ids, now get the names of the friends
      const friendDetails = await db.any(get_friend_name_q);
      friends = friendDetails.map(friend => ({
        user_id: friend.user_id,
        username: friend.username
      }));
    }
    
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

app.get('/group/:groupId/users', async (req, res) => {
  const groupId = req.params.groupId;
  
  const query = `
    SELECT u.username 
    FROM users u
    JOIN users_to_groups ug ON u.user_id = ug.user_id
    WHERE ug.group_id = $1;
  `;
  
  try {
    const users = await db.any(query, [groupId]);
    
    res.json({ users });
  } catch (err) {
    console.error("Error fetching group users:", err);
    res.status(500).json({ error: "Failed to fetch users in the group" });
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
        // First, we get all the incoming payments that the user recieved
        db.any(get_all_loaned_q, [req.session.user_id])
        // if query execution succeeds
        // send success message
        .then(function (data) {
          // Calculate the incoming money the user recieved 
          incoming = data;
          var balance = 0;
          for(let i = 0; i < data.length; i++) {
            balance += (+data[i].amount);
            console.log("balance",balance);
          }
          //then we grab all the outgoing payments the user sent
          db.any(get_all_paid_q, [req.session.user_id])
        // if query execution succeeds
        // send success message
        .then(async function (data) {
          outgoing = data;
          for(let i = 0; i < data.length; i++) {
            //calulate outgoing money user spent
            balance -= (+data[i].amount);
            console.log("balance",balance);
          }
          let username = req.session.username;
          try {
            // Now that we have all the payments, lets grab the names of the accosiated users to display them on the profile page
            // We need to get the name of the user who isnt the current user in either case which is different
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
        
            //send all information to the prifile page for rendering
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
  //find all the groups the user is a member of
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
              // now that we have the group ids, we need the names to display them
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
                  // Save the current known groups for later rendering, helps when a group creation fails
                  req.session.groups = groups;
                  //pass the groups to the groups page for render
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

  // Find all the users the current user is friends with
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
      // get the usernames of all the user ids we just got
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

  //first we need to get the list of friends
  db.any(lookup_friends_q, [req.session.user_id])
    // if query execution succeeds
    // send success message
    .then(function (data) {
      console.log(data);
      let ids = [];
      idString = "";
      let names = [];
      for (let i = 0; i < data.length; i++) {
        //for each friend found, extract the id and save it for later
        console.log(data[i]);
        ids.push(data[i].friend_id);
      }
      idString = `ANY('{ ` + ids.toString() + `}')`; // Create the sql query to match all the user ids we just found
      get_friend_name_q = get_friend_name_q + idString;
      db.any(get_friend_name_q) //get the names
        // if query execution succeeds
        // send success message
        .then(function (data) {
          friends = data;
          req.session.friends = data;
          //now, we need to find the groups
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
                gids.push(data[i].group_id);// doing the same thing we did for the friends, extract the ids and save them in an array
              }
              gidString = `ANY('{ ` + gids.toString() + `}')`;
              get_group_name_q = get_group_name_q + gidString;
              // get the names corresponding to these ids
              db.any(get_group_name_q)
                // if query execution succeeds
                // send success message
                .then(function (data) {
                  console.log("Users group names", data);
                  
                  for (let i = 0; i < data.length; i++) {
                    const length = data[i].row.length
                    str = data[i].row.substring(1,length - 1).split(",");
                    str = {'group_id': +str[0], 'group_name': str[1], 'amount': +str[2]}; //extract the information from the query and store it in an object for the handlebars to parse
                    groups.push(str);
                  }
                  req.session.groups = groups; // Save the results for re-render on payment failure
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
  //search for the input username
  db.any(search_user_q, [req.body.username])
    // if query execution succeeds
    // send success message
    .then(async function (data) {
      //if the user name exists save vital information
      req.session.username = data[0].username;
      req.session.password = data[0].password;
      req.session.user_id = data[0].user_id;
      //hash the password using bcrypt library
      const match = await bcrypt.compare(req.body.password, req.session.password); //checking password

      if (match) {
        //if successful, save user details in session like in lab 7
        req.session.user = {user : true};
        req.session.save();
        res.redirect("/home");
      } else {
        res.render("pages/login", { message: "Incorrect Password" }); // user was found but password was wrong
      }
    })
    //user is not found, send to registration
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
      //see if the friend exists
      db.one(find_user_q, [req.body.friend_username])

        .then(function (data) {
          friend_id = data.user_id;
          // if they are found, save the id and add them as a friend using
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
    //insert the group information into the database
    const result = await db.one(insertQuery, [
      req.body.event_name,
      req.body.event_weekday,
      req.body.event_time,
      req.session.user_id,
      req.body.amount
    ]);
    console.log("Inserted into db successfully : ", result);
    // If we made the group sucessfully, snag the group id
    var group_id = result.group_id;
    // Now, get the array of usernames they wanted to add the the group
    let strArray = req.body.event_attendees.split(", ");
    console.log("Assumed usernames = ", strArray);

    strArray.forEach(async (inputUsername) => {
      //for each username, find the user id and then add it to the group
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
      //some preparing of variables
      payer_id = req.session.user_id;
      paymentTag = req.body.recipient.split("_"); // this line is an artifact of how I encoded a friend payment vs a group payment. 
                                                  //encoded as t_x where t is g or f for group and friend and x is the id of the friend/group
      payee_id = +paymentTag[1];// Grabbing the id and payment type
      paymentType = paymentTag[0];
      groups = req.session.groups;
      friends = req.session.friends;

      if (paymentType == "f") {
        // if we are paying to a friend, we dont need to worry about linking it to a group, we can just send it straight there
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
        // if we are paying a group, we first need to get the user who requested money from the group
        db.any(get_group_payee_user_q, [payee_id])
          // if query execution succeeds
          // send success message
          .then(function (data) {
            var payee_user = data[0].payee;
            current_bal = data[0].amount;
            //once we have the user, send the payment to them
            db.any(add_transaction_q, [payer_id, payee_user, req.body.amount])
              // if query execution succeeds
              // send success message
              
              .then(function (data) {
                console.log("insert: ",data);
                var paid_amount = data[0].amount; //get the paid amount from the payment for later
                  
                db.any(add_transaction_to_group, [data[0].trans_id, payee_id]) // now we need to link the transaction to the group itself
                  // if query execution succeeds
                  // send success message
                  .then(function (data) {
                    
                    db.any(update_group_balance, [current_bal - paid_amount, payee_id]) // and finally change the remaining balance on the group
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
