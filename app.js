const dotenv = require('dotenv');
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
dotenv.config();

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://127.0.0.1:27017/secretsDB');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id)
        .then(function (user) {
            done(null, user)
        })
        .catch(function (err) {
            done(err, null)
        })
});

app.listen(port, () => {
    console.log("App is running on port " + port + "!");
});

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register", { error: "" });
});

app.get("/secrets", (req, res) => {
    var authenticated = req.isAuthenticated();
    User.find({ "secret": { $ne: null } }).then((foundUser) => {
        if (foundUser) {
            res.render("secrets", { userWithSecrets: foundUser, isAuthenticated: authenticated });
        }
    }).catch((err) => {
        console.log("Error in rendering secrets page!");
    })
});

app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) { console.log(err); } else {
            res.redirect('/');
        }
    });
});

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
})

app.post("/register", (req, res) => {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            if (err.code === 11000 && err.keyPattern.email) {
                res.render("register", { error: "email_in_use" });
            } else {
                res.render("register", { error: err });
            }
        } else {
            passport.authenticate('local')(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});


app.post("/login", (req, res) => {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    req.login(newUser, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;
    User.findById(req.user._id).then((foundUser) => {
        if (foundUser) {
            foundUser.secret = submittedSecret;
            foundUser.save().then(() => {
                res.redirect("/secrets");
            }).catch((err) => {
                console.log("Error in submitting the secret!" + err);
            })
        }
    }).catch((err) => {
        console.log("Error in submitting the secret!" + err);
    })
})