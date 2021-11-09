const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
app.use(cors());
app.use(express.json());
require("dotenv").config();
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const admin = require("firebase-admin");
const { json } = require("express");

app.get("/", (req, res) => {
  res.send("Doctor Portal Backend");
});

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// https://doctors-portal-backend-server.herokuapp.com/
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qyw7u.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req?.headers?.authorization.startsWith("Bearer ")) {
    const token = req.headers?.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.verifyEmail = decodedUser.email;
    } catch {}
  }
  next();
}

client.connect((err) => {
  const database = client.db("doctorsPortal");
  const usersCollection = database.collection("users");
  const appointmentCollection = database.collection("appointments");

  // Create Email Password Info
  app.post("/user", async (req, res) => {
    const user = req.body;
    const result = await usersCollection.insertOne(user);
    res.json(result);
  });

  // Google Login
  app.put("/user", async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    const options = { upsert: true };
    const updateDoc = { $set: user };
    const result = await usersCollection.updateOne(query, updateDoc, options);
    res.json(result);
  });

  // Appointments Post
  app.post("/appointment", async (req, res) => {
    const appointment = req.body;
    const result = await appointmentCollection.insertOne(appointment);
    res.json(result);
  });

  // Get Specific Appointments
  app.get("/appointment", async (req, res) => {
    const date = req.query.date;
    const query = { date: date };
    const appointments = await appointmentCollection.find(query).toArray();
    res.send(appointments);
  });

  // Get All Appointments
  app.get("/appointments", async (req, res) => {
    const appointments = await appointmentCollection.find({}).toArray();
    res.send(appointments);
  });

  // Get User Email Appointments
  app.get("/appointments/:email", async (req, res) => {
    const params = req.params.email;
    console.log(params);
    const query = { email: params };
    const appointments = await appointmentCollection.find(query).toArray();
    res.send(appointments);
  });

  // Update Status
  app.put("/appointments/:id", async (req, res) => {
    const params = req.params.id;
    const status = req.body;
    const query = { _id: ObjectId(params) };
    const updateDoc = { $set: status };
    const result = await appointmentCollection.updateOne(query, updateDoc);
    res.json(result);
  });

  // Delete Appointments
  app.delete("/appointments/:id", async (req, res) => {
    const params = req.params.id;
    const query = { _id: ObjectId(params) };
    const result = await appointmentCollection.deleteOne(query);
    res.send(result);
  });

  //Make Admin
  app.put("/makeAdmin", async (req, res) => {
    const merchantEmail = req.body.email;
    const query = { email: merchantEmail };
    const updateDoc = { $set: { position: "merchant" } };
    const result = await usersCollection.updateOne(query, updateDoc);
    res.json(result);
  });

  app.get("/users/:email", verifyToken, async (req, res) => {
    console.log("JWT", req.verifyEmail);
    console.log(req.params.email);
    if (req.verifyEmail === req.params.email) {
      const params = req.params.email;
      const query = { email: params };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    } else {
      res.status(401).send([{ message: "Unauthorize Email Address" }]);
    }
  });

  // client.close();
});

app.listen(port, () => console.log("Server Running At Port", port));
