var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var mongoose = require('mongoose');
var nodemailer = require("nodemailer");

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser = require('cookie-parser');
var session = require('express-session');


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://api.eventful.com');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    next();
}


app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());   //for parsing application/json

app.use(multer()); // for parsing multipart/form-data

app.use(session({
    secret: process.env.SESSION_SECRET || 'this is the secret',
    resave: false,
    saveUninitialized: false
}));

app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));
app.use(allowCrossDomain);

/*app.use('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://api.eventful.com/json/categories/list?app_key=rcnxbzfT3dLNF3ff");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
*/

mongoose.connect(process.env.OPENSHIFT_MONGODB_DB_URL || 'mongodb://localhost/wham');

app.get("/", function (req, res, next) {
    res.sendfile(__dirname + '/public/index.html');
    next();
});

var smtpTransport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        user: "avengerswham@gmail.com",
        pass: "msd_avengers"
    }
});


app.post('/sendEmail', function (req, res) {
    var user = req.body;
    var password;
    UserProfileModel.findOne({email: user.email}, function (err, userProfile) {
        if (userProfile != null) {
            if (err) {
                res.send("Email is not registered with us");
            } else {
                //
                password = userProfile.password;
                var mailOptions = {
                    to: user.email,
                    subject: "Do Not Reply : Password Recovery",
                    html: "Hello,<br> <br> Username: " + user.email + "<br>Password: " + password
                };
                smtpTransport.sendMail(mailOptions, function (error, response) {
                    if (error) {
                        res.send("Invalid email address");
                    } else {
                        res.send("Password sent to your Email!!");
                    }
                });
            }
        } else {
            res.send("Email is not registered with us");
        }
    });


})
var ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
app.listen(port, ip);

var UserProfileSchema = new mongoose.Schema({
    email: String,
    password: String,
    firstname: String,
    lastname: String,
    withinRadius: String,
    categories: Array,
    dislikedEvents: Array
}, {collection: "UserProfile"});

var UserProfileModel = mongoose.model("UserProfileModel", UserProfileSchema);

passport.use('Authentication', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    },
    function (email, password, done) {
        UserProfileModel.findOne({email: email, password: password}, function (err, user) {
            if (user != null) {
                if (err) {
                    return done("Error");
                } else {
                    return done(null, user);
                }
            } else {
                return done("Error");
            }
        });

    }));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});
app.post("/", function (req, res, next) {
});
app.post("/logout", function (req, res) {
    var reqUser = req.body;
    UserProfileModel.findOne({email: reqUser.email}, function (err, userProfile) {
        if (userProfile != null) {
            req.session.destroy();
            res.send(200);
        }

        else {
            res.send("Error");
        }
    });
});

app.post("/login", passport.authenticate('Authentication'), function (req, res) {
    var user = req.user;
    UserProfileModel.findOne({email: user.email}, function (err, userProfile) {
        if (userProfile != null) {
            res.json(userProfile);
        }
        else res.send("Error");
    });

});


app.post("/register", function (req, res) {

    var newUserAuth = req.body;
    var newUserAuthObject = new UserProfileModel(newUserAuth);
    UserProfileModel.findOne({email: newUserAuth.email}, function (err, userProfile) {
        if (userProfile != null) {
            res.send("error");
        }
        else {
            newUserAuthObject.save(function (err, userProfile) {
                if (err) {
                    res.send('error');
                }
                else {
                    res.send('ok');
                }
            })
        }
    });


});

app.post("/dislikeEvent", function (req, res) {
    var newUserAuth = req.body;
    UserProfileModel.findOne({email: newUserAuth.email}, function (err, userProfile) {
        if (userProfile != null) {
            userProfile.dislikedEvents = newUserAuth.dislikedEvents;
            userProfile.save(function (err, user) {
                if (err) {
                    res.send('error');
                }
                else {

                    res.send('ok');
                }
            });
        }
        else res.send('Please log in');
    })
});


app.post("/updatepassword", function (req, res) {
    var newUserAuth = req.body.user;
    //console.log("in before server:" + req.body.oldpassword + req.body.newpassword);
    UserProfileModel.findOne({email: newUserAuth.email}, function (err, userProfile) {
        //console.log("in server:" + req.body.oldpassword + req.body.newpassword);
        if (userProfile != null) {
            if (userProfile.password == req.body.oldpassword) {
                userProfile.password = req.body.newpassword;
                userProfile.save(function (err, user) {
                    if (err) {
                        res.send('error');
                    }
                    else {

                        res.send('ok');
                    }
                });
            }
            else res.send('invalid');
        }
        else res.send('Please log in');
    })
});

app.post("/update", function (req, res) {
    var newUserAuth = req.body;
    UserProfileModel.findOne({email: newUserAuth.email}, function (err, userProfile) {
        if (userProfile != null) {
            userProfile.withinRadius = newUserAuth.withinRadius;
            userProfile.categories = newUserAuth.categories;
            userProfile.save(function (err, user) {
                if (err) {
                    res.send('error');
                }
                else {

                    res.send('ok');
                }
            });
        }
        else res.send('Please log in');
    })
});