const express = require("express");
const route = express.Router();
const ImageModel = require("../models/ImageModel");
const cloudinary = require("../middlewares/cloudinary");
const streamifier = require("streamifier");
const multer = require("multer");

const upload = multer();

route.get("/", async (req, res) => {
  const data = await ImageModel.find().sort({
    createdAt: "desc",
  });
  res.json(data);
});

route.get("/:id", async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: username");
  }
  await ImageModel.findOne({ _id: req.params.id })
    .then((doc) => {
      if (doc) {
        return res.json({ success: true, doc });
      } else {
        return res.json({ success: false, error: "Does not exists" });
      }
    })
    .catch((err) => {
      return res.json({ success: false, error: "Server error" });
    });
});

route.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "DreamsCloudtech" },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const image = new ImageModel({
      image: result.url
    });
    await image.save();
    res.json({ success: true, image });
  } catch (error) {
    console.error(error);
    res.status(500).send("Image upload failed");
  }
});

// delete image
route.delete("/delete/:id", (req, res) => {
  if (!req.params.id) {
    return res.status(400).send("Missing URL parameter: username");
  }
  ImageModel.findOneAndDelete({
    _id: req.params.id,
  })
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      res.status(500).json(err);
    });
});

module.exports = route;
