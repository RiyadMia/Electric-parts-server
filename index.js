const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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

async function run() {
  try {
    await client.connect();
    const serviceCallection = client
      .db("electric_parts")
      .collection("services");

    const boolingCallection = client.db("electric_parts").collection("booking");

    const userCollection = client.db("electric_parts").collection("users");

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
        { expiresIn: "2h" }
      );
      console.log(token);
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ result, token });
    });

    app.get("/booking", async (req, res) => {
      const userEmail = req.query.userEmail;
      const query = { userEmail: userEmail };
      const booking = await boolingCallection.find(query).toArray();
      res.send(booking);
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const result = await boolingCallection.insertOne(booking);
      res.send(result);
    });

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCallection.find(query);
      const services = await cursor.toArray();
      res.send(services);
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
