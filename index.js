const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is Running!');
})

{/* mongodb+srv://db_admin:<password>@cluster0.v3j0rcs.mongodb.net/test  */ }

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v3j0rcs.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const servicesCollection = client.db('service_review').collection('services');
        const reviewsCollection = client.db('service_review').collection('reviews');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ token })
        })

        app.get('/home-services', async (req, res) => {
            const query = {};
            const cursor = servicesCollection.find(query).sort({ timestamp: -1 }).limit(3);
            const services = await cursor.toArray();
            res.send(services);
        })

        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await servicesCollection.findOne(query);
            res.send(service);
        })

        app.post('/services', async (req, res) => {
            const service = req.body;
            // console.log(service);
            const result = await servicesCollection.insertOne(service);
            res.send(result);
        })

        app.get('/reviews', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const email = req.query.email;
            if (decoded.email !== email) {
                res.status(403).send({ message: 'Unauthorized Access' });
            }
            const query = { author_email: email };
            const cursor = reviewsCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        app.get('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { service_id: id };
            const cursor = reviewsCollection.find(query).sort({ timestamp: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        app.post('/reviews', verifyJWT, async (req, res) => {
            const review = req.body;
            // console.log(review);
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        })

        app.get('/edit-review/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const review = await reviewsCollection.findOne(query);
            res.send(review);
        })

        app.put('/reviews/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const review = req.body;
            // console.log(review);
            const option = { upsert: true };
            const updatedReview = {
                $set: {
                    review_txt: review.review_txt
                }
            }
            const result = await reviewsCollection.updateOne(filter, updatedReview, option);
            res.send(result);
        })

        app.delete('/reviews/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await reviewsCollection.deleteOne(query);
            res.send(result);
        })

    }
    finally {

    }
}

run().catch(e => console.error(e));


app.listen(port, () => {
    console.log(`Server is Running on PORT:${port}`);
})
