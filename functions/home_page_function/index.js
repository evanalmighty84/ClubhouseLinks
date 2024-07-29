const express = require('express');
const Stripe = require('stripe');
const app = express();
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const {OAuth2Client} = require('google-auth-library');


const stripe = Stripe('sk_live_9ZwPTzovm91EYHnF5RF1VUhn'); // this is my secret key with your secret key

//test key sk_test_4eC39HqLyjWDarjtT1zdp7dc
app.use(cors({
	origin: '*', // Update to your front-end's URL
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	credentials: true
}));
app.use(bodyParser.json());

app.post('/create-payment-intent', async (req, res) => {
	const { payment_method_id, amount } = req.body;

	try {
		// Ensure amount is a valid number and in cents
		if (typeof amount !== 'number' || amount <= 0) {
			return res.status(400).json({ error: 'Invalid amount' });
		}

		// Create a Payment Intent
		const paymentIntent = await stripe.paymentIntents.create({
			amount: amount, // Amount in cents
			currency: 'usd',
			payment_method: payment_method_id,
			confirm: true,
			return_url: 'https://www.clubhouselinks.com/app/#/app/success',
		});

		// Return the client_secret
		res.json({ client_secret: paymentIntent.client_secret });
	} catch (error) {
		console.error('Error creating payment intent:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});


const serviceAccount = require('./petstream.json');
try {
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
		databaseURL: "https://winnovativeappshomepage.firebaseio.com"
	});
	console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
	console.error('Error initializing Firebase Admin SDK:', error);
}

const db = admin.firestore();
console.log('Firestore initialized successfully');

// Google OAuth client
const client = new OAuth2Client('179478627002-th39iebli3b17dg5mkj4vu32sneo8mt9.apps.googleusercontent.com');

app.get('/daysmart-plugin', async (req, res) => {
	try {
		const response = await axios.get('https://plugin.myonlineappointment.com', {
			headers: {
				'Content-Type': 'application/json',
			},
			withCredentials: true // Ensure cookies are sent and received
		});
		res.send(response.data);
	} catch (error) {
		console.error('Error fetching Daysmart plugin:', error);
		res.status(500).send('Error fetching Daysmart plugin content');
	}
});

app.post('/api/login', async (req, res) => {
	try {
		const { idToken } = req.body; // Extract the Google ID token from the request body

		// Verify Google ID token using the provided Google Client
		const ticket = await client.verifyIdToken({
			idToken,
			audience: '179478627002-th39iebli3b17dg5mkj4vu32sneo8mt9.apps.googleusercontent.com',
		});

		// Extract user information (payload) from the verified token
		const payload = ticket.getPayload();
		const email = payload['email']; // Extract the email from the payload
		const name = payload['name']; // Extract the name from the payload

		// Query Firestore to check if the email exists in the "Organizers" collection
		const organizersRef = admin.firestore().collection('Organizers');
		const organizersSnapshot = await organizersRef.where('invitedEmails', 'array-contains', email).get();

		// If the email exists in the Organizers collection
		if (!organizersSnapshot.empty) {
			// Extract storeName from the first document (assuming one email can only belong to one store)
			const storeName = organizersSnapshot.docs[0].data().storeName;

			// Generate access token using jsonwebtoken sign method
			const accessToken = jwt.sign({ email }, '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', { expiresIn: '1h' });

			// Return the access token, role Organizer, storeName, and message
			res.json({
				accessToken,
				role: 'Organizer',
				email,
				name,
				storeName,
				message: 'able to authenticate Organizer'
			});
		} else {
			// If the email is not found in the Organizers collection, check the PetParents collection
			const parentsRef = admin.firestore().collection('PetParents');
			const parentsSnapshot = await parentsRef.where('email', '==', email).get();

			// If the email exists in the PetParents collection
			if (!parentsSnapshot.empty) {
				// Extract storeName from the first document
				const storeName = parentsSnapshot.docs[0].data().storeName;

				// Generate access token using jsonwebtoken sign method
				const accessToken = jwt.sign({ email }, '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', { expiresIn: '1h' });

				// Return the access token, role PetParent, email, name, storeName, and message
				res.json({
					accessToken,
					role: 'PetParent',
					email,
					name,
					storeName,
					message: 'able to authenticate PetParent'
				});
			} else {
				// If the email is not found in either collection
				const accessToken = jwt.sign({ email }, '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', { expiresIn: '1h' });

				// Return the access token, role NewPetParent, email, and message
				res.json({
					accessToken,
					role: 'NewPetParent',
					email,
					name,
					message: 'unable to authenticate Organizer or PetParent'
				});
			}
		}
	} catch (error) {
		// Handle errors during the login process
		console.error('Login failed:', error);
		res.status(401).json({ error: 'Unauthorized' });
	}
});

module.exports = app;
