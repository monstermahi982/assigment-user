const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const csv = require("csv-parser");
const cors = require("cors");
const { Readable } = require("stream");
const validator = require("validator");

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const upload = multer({ storage: multer.memoryStorage() });

mongoose.connect("mongodb://127.0.0.1:27017/assigment");

const User = mongoose.model("User", {
  name: String,
  email: String,
  age: Number,
});

app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json({ success: true, data: users });
});

app.post("/users", (req, res) => {
  const user = new User({
    name: req.body?.name,
    email: req.body?.email,
    age: req.body?.age,
  });
  user.save();
  res.json({ message: true, data: user });
});

app.post("/data-upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "File is required" });
  }

  const results = [];

  const stream = Readable.from(req.file.buffer);

  stream
    .pipe(csv())
    .on("data", (row) => {
      const { name, email, age } = row;

      if (name && email && validator.isEmail(email.trim())) {
        results.push({
          name: name.trim(),
          email: email.trim(),
          age: age.trim(),
        });
      }
    })
    .on("end", async () => {
      try {
        if (results.length === 0) {
          return res.status(400).json({ error: "No valid data to insert" });
        }

        const users = await User.insertMany(results);
        res.json({ message: `Uploaded ${users.length} users` });
      } catch (err) {
        console.error("MongoDB Insert Error:", err);
        res.status(500).json({ error: "Failed to insert users" });
      }
    })
    .on("error", (err) => {
      console.error("CSV Parsing Error:", err);
      res.status(500).json({ error: "Failed to parse CSV" });
    });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
