const db = require('../models/database');


const userController = {};
console.log("userController")

userController.saveUser = async (req, res, next) => {
  console.log("saveUser")
  try {
  const { email, displayName, loc, password } = req.body;
  console.log(email, displayName, loc, password);
  // checking if a user with such an email already exists
  const userExistenceCheckerQuery = `
    select *
    from users as u
    where email = $1
  `;
  const userExistenceCheck = await db.query(userExistenceCheckerQuery, [email]);
  console.log("userController -> saveUser -> userExistenceCheck", userExistenceCheck.rows)
  if ( userExistenceCheck.rowCount > 0 ) {
    throw new Error ('A user with this email already exists');
  } else {
    // creating a new user in the DB
    const createUser = `
      INSERT INTO users (email, name, password, location)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    // const createUser = `
    // select *
    // from users
    // `
    const newUser = await db.query(createUser, [email, displayName, password, loc]);

    res.locals.userData = newUser.rows[0];
  }
  return next();
  } catch (err) {
    next(err);
  }
};

// verifying that the user exists in the Database
userController.loginUser = async (req, res, next) => {
  console.log('loginUser');
  try {
    const { email, password } = req.body;
    // checking if a USER w/ such credentials exists
    const checkUserQuery = `
      select *
      from users
      where users.email = $1 and users.password = $2
    `;
    console.log("userController -> loginUser -> #1")
    const emailUserLookup = await db.query(checkUserQuery, [email, password]);
    console.log("userController -> loginUser -> #2")
    if (emailUserLookup.rows[0]) {
      res.locals.doesUserExist = true;
      res.locals.isArtist = false;
      res.locals.userId = emailUserLookup.rows[0].id;
      res.locals.userType = 'user';
      console.log(emailUserLookup.rows[0])
    } else {
        // checking if an ARTIST w/ such credentials exists
      const checkArtistQuery = `
        select *
        from artists
        where artists.email = $1 and artists.password = $2
      `;
      const emailArtistLookup = await db.query(checkArtistQuery, [email, password]);
      console.log(emailArtistLookup.rows[0])
      if (emailArtistLookup.rows[0]) {
        res.locals.doesUserExist = true;
        res.locals.isArtist = true;
        res.locals.userId = emailArtistLookup.rows[0].id;
        res.locals.userType = 'artist';
      } else {
        res.locals.doesUserExist = false;
        res.locals.isArtist = false;
        res.locals.userId = '';
        res.locals.userType = '';
      }
    }
    console.log("#3", res.locals)
    return next();
  } catch (err) {
    return next(err);
  }
};



module.exports = userController;






const db = require('../models/database');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userController = {};
console.log("userController")

userController.saveUser = async (req, res, next) => {
  console.log("saveUser")
  try {
  const { email, displayName, loc, password } = req.body;
  // checking if a user with such an email already exists
  const userExistenceCheckerQuery = `
    select *
    from users as u
    where email = $1
  `;
  const userExistenceCheck = await db.query(userExistenceCheckerQuery, [email]);
  if ( userExistenceCheck.rowCount > 0 ) {
    throw new Error ('A user with this email already exists');
  } else {
    // creating a new user in the DB
    const createUser = `
      INSERT INTO users (email, name, password, location)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    // create a bcrypt hash
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password.toString(), salt);
    // create a user w/ hashed password
    const newUser = await db.query(createUser, [email, displayName, passwordHash, loc]);
    // create a JWT token
    const token = jwt.sign(
      {
        user: newUser.rows[0].id,
        usertype: 'user'
      },
      process.env.JWT_SECRET
    );
    // create a cookie w/ JWT token
    res
    .cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.locals.userData = newUser.rows[0];
  }
  return next();
  } catch (err) {
    next(err);
  }
};

// verifying that the user exists in the Database
userController.loginUser = async (req, res, next) => {
  console.log('loginUser');
  try {
    const { email, password } = req.body;
    // checking if a USER w/ such credentials exists
    const checkUserQuery = `
      select *
      from users
      where users.email = $1 and users.password = $2
    `;
    const emailUserLookup = await db.query(checkUserQuery, [email, password]);
    // check if such a user exists
    if (emailUserLookup.rows[0]) {
      // compare passed in password w/ hashed password in DB
      const passwordCorrect = await bcrypt.compare(
        password,
        emailUserLookup.rows[0].password
      );
      if (!passwordCorrect) {
        throw new Error ("Wrong email or password")
      };
      // create a JWT token
      const token = jwt.sign(
        {
          user:  emailUserLookup.rows[0].id,
          usertype: 'user'
        },
        process.env.JWT_SECRET
      );
      // create a cookie w/ JWT token
      res
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      // assign res.locals data
      res.locals.doesUserExist = true;
      res.locals.isArtist = false;
      res.locals.userId = emailUserLookup.rows[0].id;
      res.locals.userType = 'user';
    } else {
        // checking if an ARTIST w/ such credentials exists
      const checkArtistQuery = `
        select *
        from artists
        where artists.email = $1 and artists.password = $2
      `;
      const emailArtistLookup = await db.query(checkArtistQuery, [email, password]);
      console.log(emailArtistLookup.rows[0])
      if (emailArtistLookup.rows[0]) {
              // compare passed in password w/ hashed password in DB
      const passwordCorrect = await bcrypt.compare(
        password,
        emailArtistLookup.rows[0].password
      );
      if (!passwordCorrect) {
        throw new Error ("Wrong email or password")
      };
      // create a JWT token
      const token = jwt.sign(
        {
          user:  emailArtistLookup.rows[0].id,
          usertype: 'artist'
        },
        process.env.JWT_SECRET
      );
      // create a cookie w/ JWT token
      res
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });

        res.locals.doesUserExist = true;
        res.locals.isArtist = true;
        res.locals.userId = emailArtistLookup.rows[0].id;
        res.locals.userType = 'artist';
      } else {
        // if neither a user nor an artist w/ such credentials exists, return FALSE
        res.locals.doesUserExist = false;
        res.locals.isArtist = false;
        res.locals.userId = '';
        res.locals.userType = '';
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
};


module.exports = userController;


