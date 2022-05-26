const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// meilwire
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hsvol.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const serviceCallection = client
      .db("electric_parts")
      .collection("services");

    const boolingCallection = client.db("electric_parts").collection("booking");

    const userCollection = client.db("electric_parts").collection("users");

    const paymentCollection = client
      .db("electric_parts")
      .collection("payments");

    const reviewCollection = client.db("electric_parts").collection("review");
    const profileCollection = client.db("electric_parts").collection("profile");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // app.put("/user/admin/:email", async (req, res) => {
    // const email = req.params.email;
    // const requester = req.decoded.email;
    // const requesterAccount = await userCollection.findOne({
    // email: requester,
    // });
    // if (requesterAccount.role === "admin") {
    // const filter = { email: email };
    // const updateDoc = {
    // $set: { role: "admin" },
    // };
    // // const result = await userCollection.updateOne(filter, updateDoc);
    // res.send({ result });
    // } else {
    // res.status(403).send({ message: "forbiden" });
    // }
    // });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );

      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ result, token });
    });

    app.get("/user", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/booking", verifyJWT, async (req, res) => {
      const userEmail = req.query.userEmail;
      const decodedEmail = req.decoded.email;
      if (userEmail === decodedEmail) {
        const query = { userEmail: userEmail };
        const booking = await boolingCallection.find(query).toArray();
        return res.send(booking);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    //payment
    app.post("/create-payment-intent", async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.patch("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await boolingCallection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedBooking);
    });
    // booking
    app.get("/booking/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await boolingCallection.findOne(query);
      res.send(booking);
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const result = await boolingCallection.insertOne(booking);
      res.send(result);
    });
    //profile

    app.post("/profile", async (req, res) => {
      const newService = req.body;
      const result = await userCollection.insertOne(newService);
      res.send(result);
    });

    app.get("/profile/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await userCollection.findOne(query);
      res.send(booking);
    });

    //review
    app.post("/review", async (req, res) => {
      const newService = req.body;
      const result = await reviewCollection.insertOne(newService);
      res.send(result);
    });
    app.get("/review", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });
    //service
    //post
    app.post("/service", async (req, res) => {
      const newService = req.body;
      const result = await serviceCallection.insertOne(newService);
      res.send(result);
    });

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCallection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });
    // Delete
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await boolingCallection.deleteOne(query);
      res.send(result);
    });

    // Delete
    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await serviceCallection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello electric pars World!");
});

app.listen(port, () => {
  console.log(` Electric pars app listening on port ${port}`);
});
