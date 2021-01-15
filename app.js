const express = require('express');
const app = express();
const passportSaml = require('passport-saml')
const passport = require('passport')
const session = require('express-session');
const saml = require('passport-saml').Strategy;
const bodyParser = require('body-parser');
const fs = require('fs')
var https = require('https');
var http = require('http');

var privateKey  = fs.readFileSync('sslcert/httpshksamlpoc.key', 'utf8');
var certificate = fs.readFileSync('sslcert/httpshksamlpoc.cert', 'utf8');
//self-sign cert for https server
var credentials = {key: privateKey, cert: certificate};

app.use(require("express-session")({
secret: "This is the secret line",
resave: false,
saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});

// saml strategy for passport
var strategy = new saml(
	{
		entryPoint: 'https://samltest.id/idp/profile/SAML2/Redirect/SSO',
		issuer: 'hksamlpoc',
		callbackUrl:'https://hksamlpoc/app/login/callback',
		acceptedClockSkewMs: -1 // Fix Timestamps Validity Error

	},
	(profile, done) => {
		userProfile = profile;
		done(null, userProfile);
	}
);

passport.use(strategy);

var redirectToLogin = (req, res, next) => {
	console.log("Check login status.")
	if (!req.isAuthenticated() || userProfile == null) {
		console.log("Login Required.")
		return res.redirect('/app/login');
	}
	  res.send('Hello ' + userProfile.email + '<br> <a href="/app/logout"><button type="button">Logout</button></a>');
};

app.get('/app/portal_home', redirectToLogin, (req, res) => {
	res.render('index', {
		title: 'Express Web Application',
		heading: 'Logged-In to Express Web Application'
	});
});


app.get('/app/frontpage', function (req, res) {
  res.send('Hello, please login. <br> <a href="/app/portal_home"><button type="button">Login</button></a>');
});

app.get(
	'/app/login',
	passport.authenticate('saml', {
		successRedirect: '/app/portal_home',
		failureRedirect: '/app/login'
	})
);

app.get('/app/logout', (req, res) => {
	userProfile = null;
	return res.redirect('/app/frontpage');

	// return strategy.logout(req, (err, uri) => {
	// 	req.logout();

	// 	userProfile = null;
	// 	return res.redirect(uri);
	// });
});

app.get('/app/failed', (req, res) => {
	res.status(401).send('Login failed');
});

app.get('/', function (req, res) {
  res.send('Hello World!');
});


app.post(
	'/app/login/callback',
	bodyParser.urlencoded({ extended: false }),
	passport.authenticate('saml', {
		failureRedirect: '/app/failed',
		failureFlash: true
	}),
	(req, res) => {
		console.log('login success')
		console.log(res)

		// // saml assertion extraction from saml response
		// var samlResponse = res.req.body.SAMLResponse;
		// var decoded = base64decode(samlResponse);
		// var assertion =
		// 	('<saml2:Assertion' + decoded.split('<saml2:Assertion')[1]).split(
		// 		'</saml2:Assertion>'
		// 	)[0] + '</saml2:Assertion>';
		// var urlEncoded = base64url(assertion);

		// success redirection to /app
		return res.redirect('/app/portal_home');
	}
);


app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(8080);
httpsServer.listen(443);