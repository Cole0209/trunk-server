const passport = require("passport");
const User = require("../models/user");
const Mailjet = require('node-mailjet');

const crypto = require("crypto");

var admin_email = process.env['REACT_APP_ADMIN_EMAIL'] != null ? process.env['REACT_APP_ADMIN_EMAIL'] : "luke@openmhz.com";
var site_name = process.env['REACT_APP_SITE_NAME'] != null ? process.env['REACT_APP_SITE_NAME'] : "OpenMHz";
var account_server = process.env['REACT_APP_ACCOUNT_SERVER'] != null ? process.env['REACT_APP_ACCOUNT_SERVER'] : "https://account.openmhz.com";
var cookie_domain = process.env['REACT_APP_COOKIE_DOMAIN'] != null ? process.env['REACT_APP_COOKIE_DOMAIN'] : '.openmhz.com'; //'https://s3.amazonaws.com/robotastic';


const mailjet = new Mailjet({
  apiKey: process.env['MAILJET_KEY'],
  apiSecret: process.env['MAILJET_SECRET']
});

	// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex/6969486#6969486
	const escapeRegExp = (string) => {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}

exports.isLoggedIn = function (req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
};

// -------------------------------------------


exports.authenticated = function (req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  if (req.isAuthenticated()) {
    var clientUser = (({
      firstName,
      lastName,
      screenName,
      location,
      email,
      admin,
      terms
    }) => ({
      firstName,
      lastName,
      screenName,
      location,
      email,
      admin,
      terms
    }))(
      req.user
    );
    clientUser.userId = req.user.id

    return res.json({
      success: true,
      user: clientUser
    });

  } else {
    return res.json({
      success: false
    });
  }
}

exports.login = function (req, res, next) {
  // Do email and password validation for the server

  passport.authenticate("local", function (err, user, info) {
    if (err) return next(err);
    if (!user) {
      console.log("No user");
      return res.json({
        success: false,
        message: info.message,
        reason: info.reason
      });
    }
    // ***********************************************************************
    // "Note that when using a custom callback, it becomes the application's
    // responsibility to establish a session (by calling req.login()) and send
    // a response."
    // Source: http://passportjs.org/docs
    // ***********************************************************************
    // Passport exposes a login() function on req (also aliased as logIn())
    // that can be used to establish a login session
    req.login(user, loginErr => {

      if (loginErr) {
        console.log("error")
        return res.json({
          success: false,
          message: loginErr
        });
      }
      if (!user.confirmEmail) {
        req.logout();
        req.logout(function (err) {
          if (err) { return next(err); }
          res.clearCookie('sessionId', { domain: cookie_domain, path: '/' });
          return res.json({
            success: false,
            message: "unconfirmed email",
            reason: "unconfirmed email",
            userId: user.id
          });
        });
      }
      //console.log("account/server/controllers/users.js - req.login() Authenicated: " + user.email);
      // go ahead and create the new user
      var clientUser = (({
        firstName,
        lastName,
        screenName,
        location,
        email,
        admin,
        terms
      }) => ({
        firstName,
        lastName,
        screenName,
        location,
        email,
        admin,
        terms
      }))(
        user
      );
      clientUser.userId = user.id
      return res.json({
        success: true,
        message: "authentication succeeded",
        user: clientUser,
        userId: user.id
      });
    });
  })(req, res, next);
};

exports.confirmEmail = async function (req, res, next) {
  const userId = req.params["userId"];
  const token = req.params["token"];

  let user = await User.findById(userId).catch(err => {
    console.error(err);
    res.status(404);
    res.json({
      success: false,
      message: err
    });
    return;
  });

  if (!user) {
    console.error("User not found: " + userId);
    res.status(404);
    res.json({
      success: false,
      message: "User not found"
    });
    return;
  }
  if (user.confirmEmail) {
    console.log("User already confirmed email: " + userId);
    res.status(500);
    res.json({
      success: false,
      message: "already confirmed email"
    });
    return;
  }
  const today = new Date();
  if (user.confirmEmailTTL < today) {
    res.status(500);
    console.error("Expired token for confirming email: " + userId);
    res.json({
      success: false,
      message: "token expired"
    });
    return;
  }
  if (user.confirmEmailToken != token) {
    res.status(500);
    console.error(
      "Token Mismatch DB: " + user.confirmEmailToken + " submitted: " + token
    );
    res.json({
      success: false,
      message: "token mismatch"
    });
    return;
  }
  user.confirmEmail = true;
  user.confirmEmailToken = "";
  await user.save().catch(err => {
    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });

  console.log("User: " + user.email + " confirmed email address");
  res.json({
    success: true
  });
};


exports.resetPassword = async function (req, res, next) {
  const userId = req.params["userId"];
  const token = req.params["token"];

  let user = await User.findById(userId).catch(err => {
    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });

  if (!user) {
    console.error("User not found: " + userId);
    res.status(404);
    res.json({
      success: false,
      message: "User not found"
    });
    return;
  }
  const today = new Date();
  if (user.resetPasswordTTL < today) {
    res.status(500);
    res.json({
      success: false,
      message: "token expired"
    });
    return;
  }
  if (user.resetPasswordToken != token) {
    console.log(
      "Token Mismatch DB: " + user.resetPasswordToken + " submitted: " + token
    );
    res.status(500);
    res.json({
      success: false,
      message: "token mismatch"
    });
    return;
  }

  user.password = req.body.password
  user.confirmEmail = true;
  user.confirmEmailToken = "";
  user.resetPasswordToken = "";
  await user.save().catch(err => {
    console.error(err);
    res.json({
      success: false,
      message: err
    });
    return;
  });
  res.json({
    success: true
  });
  return;
};


// -------------------------------------------
exports.sendResetPassword = async function (req, res, next) {
  let user = await User.findOne({
    email: { '$regex': escapeRegExp(req.body.email), $options: 'i' } 
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });
  if (!user) {
    console.error("Reset password failed. No user: " + req.body.email);
    res.status(404);
    res.json({
      success: false,
      message: "No account register for " + req.body.email
    });
    return;
  }
  const buffer = crypto.randomBytes(20);
  const token = buffer.toString("hex");
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  user.resetPasswordToken = token;
  user.resetPasswordTTL = tomorrow;
  await user.save().catch(err => {
    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });

  const request = mailjet.post("send", {
    version: "v3.1"
  }).request({
    Messages: [{
      From: {
        Email: admin_email,
        Name: site_name + " Admin"
      },
      To: [{
        Email: user.email,
        Name: user.firstName + " " + user.lastName
      }],
      Subject: site_name + " - Password Reset",
      TextPart: "It looks like you may have forgot your password. Copy this link to your browser to reset your password. Let us know if you are receiving this but did not request a password reset. /r" + account_server + "/reset-password/" + user.id + "/" + token,
      HTMLPart: "<h3>Thanks for using " + site_name + "!</h3><br />It looks like you may have forgot your password. Copy this link to your browser to reset your password. Let us know if you are receiving this but did not request a password reset.<p>" + account_server + "/reset-password/" + user.id + "/" + token + "</p>"
    }]
  });
  request
    .then(result => {
      console.log(`Password reset sent to: ${user.email}`)
    })
    .catch(err => {
      console.error(err.statusCode);
      console.error(err);
      res.json({
        success: false,
        message: err
      });
      return;
    });
  res.json({
    success: true
  });
  return;
};

function handleSendConfirmEmail(user) {

  return new Promise(async (resolve, reject) => {
    if (user.confirmEmail) {
      console.log("Error - Send Confirm Email - User already confirmed email: " + user.email);
      reject({
        success: false,
        message: "already confirmed email"
      });
      return;
    }

    const buffer = crypto.randomBytes(20);
    const token = buffer.toString("hex");
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    user.confirmEmailToken = token;
    user.confirmEmailTTL = tomorrow;
    await user.save();
    mailjet.post("send", {
      version: "v3.1"
    }).request({
      Messages: [{
        From: {
          Email: admin_email,
          Name: site_name + " Admin"
        },
        To: [{
          Email: user.email,
          Name: user.firstName + " " + user.lastName
        }],
        Subject: "Confirm " + site_name + " Account",
        TextPart: "Thanks for signing up for " + site_name + ". We just wanted to check and make sure your email address was real. Copy and paste this addres in your browser to confirm your email address: " + account_server + "/confirm-email/" + user._id + "/" + token,
        HTMLPart: "<h3>Thanks for signing up for " + site_name + "</h3><br />We just wanted to check and make sure your email address was real. Copy and paste this addres in your browser to confirm your email address:<p> " + account_server + "/confirm-email/" + user._id + "/" + token + "</p>"
      }]
    }).then(result => {
      console.log("Confirm email sent to: " + user.email);
      resolve({
        success: true,
        userId: user._id
      });
    }).catch(err => {
      console.error("Admin Email: " + admin_email + " User Email: " + user.email);
      console.error("Error - Send Confirm Email - caught: " + err);
      res.status(500);
      reject({
        success: false,
        message: err
      });
    });
  });
}

// -------------------------------------------
exports.sendConfirmEmail = async function (req, res, next) {
  const userId = req.params["userId"];
  let user = await User.findById(userId).catch(err => {

    console.error("Error - Send Confirm Email: " + err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });
  if (!user) {
    console.error("Error - Send Confirm Email: User not found " + userId);
    res.status(404);
    res.json({
      success: false,
      message: "user not found"
    });
    return;
  }
  handleSendConfirmEmail(user).then(function (result) {
    res.json(result);
    return;
  }).catch(function (error) {
    res.json(error);
    return;
  });
}



// -------------------------------------------

exports.logout = function (req, res, next) {
  // the logout method is added to the request object automatically by Passport
  req.logout(function (err) {
    if (err) { return next(err); }

    res.clearCookie('sessionId', { domain: cookie_domain, path: '/' });
    return res.json({
      success: true
    });
  });
};

exports.terms = async function (req, res, next) {
  const userId = req.params["userId"];
  let user = await User.findById(userId).catch(err => {
    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });

  if (req.user.id != userId) {
    console.log(
      "Logged in user's ID: " +
      req.user.id +
      " does not match Param: " +
      userId
    );
    res.status(500);
    res.json({
      success: false,
      message: "UserID incorrect"
    });
    return;
  }

  user.terms = 1.1; //User.termsVer;
  await user.save().catch(err => {

    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });
  var clientUser = (({
    terms
  }) => ({
    terms
  }))(
    user
  );
  res.json({
    success: true,
    user: clientUser
  });
  return;
}
// -------------------------------------------


exports.validateProfile = function (req, res, next) {
  console.log("Validating user profile: " + req.body.email);
  if (!req.body.firstName || (req.body.firstName.length < 2)) {
    console.error("ERROR: Validate System - req.body.firstName");
    res.json({
      success: false,
      message: "First Name is Required"
    });
    return;
  }
  res.locals.firstName = req.body.firstName.replace(/[^\w\s\.\,\-\'\`]/gi, '');

  if (!req.body.lastName || (req.body.lastName.length < 2)) {
    console.error("ERROR: Validate System - req.body.lastName");
    res.json({
      success: false,
      message: "Last Name is Required"
    });
    return;
  }
  res.locals.lastName = req.body.lastName.replace(/[^\w\s\.\,\-\'\`]/gi, '');


  res.locals.screenName = req.body.screenName.replace(/[^\w\s\.\,\-\_]/gi, '');

  if (!req.body.location || (req.body.location.length < 2)) {
    console.error("ERROR: Validate System - req.body.location");
    res.json({
      success: false,
      message: "System location is Required"
    });
    return;
  }
  res.locals.location = req.body.location.replace(/[^\w\s\.\,\-\_]/gi, '');

  next();
}

exports.updateProfile = async function (req, res, next) {
  const userId = req.params["userId"];

  user = await User.findById(userId).catch(err => {
    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });

  if (req.user.id != userId) {
    console.log(
      "ERROR: Logged in user's ID: " +
      req.user.id +
      " does not match Param: " +
      userId
    );
    res.json({
      success: false,
      message: "UserID incorrect"
    });
    return;
  }

  // Lets make sure someone else isn't using this screenName

  screenNameUser = await User.findOne({ screenName:  { '$regex': escapeRegExp(req.body.screenName) , $options: 'i' }  }).catch(err => {
    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });

  // Did we find a user with the screeName, is it not us?
  if (screenNameUser && (screenNameUser.userId != user.userId)) {
    res.status(500);
    res.json({
      success: false,
      message: "Screen Name already in use"
    });
    return;
  }



  // go ahead and create the new user
  user.firstName = res.locals.firstName
  user.lastName = res.locals.lastName
  user.screenName = res.locals.screenName
  user.location = res.locals.location


  await user.save().catch(err => {
    console.error(err);
    res.json({
      success: false,
      message: err
    });
    return;
  });
  var clientUser = (({
    firstName,
    lastName,
    screenName,
    location
  }) => ({
    firstName,
    lastName,
    screenName,
    location
  }))(
    user
  );
  console.log("Updated Profile: " + userId)
  res.json({
    success: true,
    user: clientUser
  });
  return;
};
// -------------------------------------------

exports.register = async function (req, res, next) {
  console.log("Registration request for: " + req.body.email);

  let user = await User.findOne({
    $or: [{
			email: { '$regex': escapeRegExp(req.body.email), $options: 'i' } 
		}, {
			local: {
				email: { '$regex': escapeRegExp(req.body.email), $options: 'i' } 
			}
		}]
  }).catch(err => {
    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });
  // is email address already in use?
  if (user) {
    res.status(500);
    res.json({
      success: false,
      message: "Email already in use"
    });
    return;
  }
  user = await User.findOne({ screenName: req.body.screenName }).catch(err => {
    console.error(err);
    res.status(500);
    res.json({
      success: false,
      message: err
    });
    return;
  });
  // is email address already in use?
  if (user) {
    res.status(500);
    res.json({
      success: false,
      message: "Screen Name already in use"
    });
    return;
  }
  // go ahead and create the new user
  user = (({
    firstName,
    lastName,
    screenName,
    location,
    email,
    password
  }) => ({
    firstName,
    lastName,
    screenName,
    location,

  }))(
    res.locals
  );
  user.password = req.body.password;
  user.email = req.body.email;

  let savedUser = await User.create(user)

  console.log("Successfully registered: " + user.email + ", now sending confirmation email.");
  // Since registration worked, send a confirmation email.
  handleSendConfirmEmail(savedUser).then(function (result) {
    console.log("Confirmation email sent to: " + user.email);
    res.json({
      success: true,
      message: result
    });
    return;
  }).catch(function (err) {
    console.error("Error creating user: " + user.email + " Error: " + err);
    res.json({
      success: false,
      message: err
    });
    return;
  });
}