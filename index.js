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
