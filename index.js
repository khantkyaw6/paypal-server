import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PAYPAL_BASE = process.env.PAYPAL_BASE;

console.log({
	CID: process.env.PAYPAL_CLIENT_ID,
	SECRET: process.env.PAYPAL_SECRET,
});

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

app.get('/', (_req, res) => {
	res.send('Server is running at port 3001');
});

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
							value: '97.00',
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
			'Error creating order:',
			err.response?.data || err.message
		);
		res.status(500).json({ error: 'Failed to create order' });
	}
});

app.listen(3001, () => console.log('Server running on port 3001'));
