const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const Stripe = require('stripe');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PAYPAL_BASE = process.env.PAYPAL_BASE;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ---------------------- //
// ✅ PAYPAL SETUP
// ---------------------- //
async function getAccessToken() {
	const auth = Buffer.from(
		`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
	).toString('base64');

	const res = await axios.post(
		`${PAYPAL_BASE}/v1/oauth2/token`,
		'grant_type=client_credentials',
		{
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		}
	);
	return res.data.access_token;
}

// Test route
app.get('/', (_req, res) => {
	res.json({
		message: 'Server running with PayPal + Stripe on port 3001',
	});
});

// Create PayPal order
app.post('/create-order', async (_req, res) => {
	try {
		const accessToken = await getAccessToken();
		const orderRes = await axios.post(
			`${PAYPAL_BASE}/v2/checkout/orders`,
			{
				intent: 'CAPTURE',
				purchase_units: [
					{
						amount: {
							currency_code: 'USD',
							value: '1.00',
						},
					},
				],
			},
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
			}
		);
		res.json({ id: orderRes.data.id });
	} catch (err) {
		console.error(
			'Error creating PayPal order:',
			err.response?.data || err.message
		);
		res.status(500).json({ error: 'Failed to create PayPal order' });
	}
});

// ---------------------- //
// ✅ STRIPE CHECKOUT SETUP
// ---------------------- //
app.post('/create-stripe-session', async (req, res) => {
	try {
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			mode: 'payment',
			line_items: [
				{
					price_data: {
						currency: 'usd',
						product_data: { name: 'Test Product' },
						unit_amount: 100, // $1.00 → 100 cents
					},
					quantity: 1,
				},
			],
			success_url: 'http://localhost:3000/success',
			cancel_url: 'http://localhost:3000/cancel',
		});

		res.json({ url: session.url });
	} catch (err) {
		console.error('Stripe error:', err.message);
		res.status(500).json({ error: err.message });
	}
});

// ---------------------- //
app.listen(3001, () => console.log('Server running on port 3001'));
