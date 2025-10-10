const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  shorten: true,
  secure: true,
  ssl_detected: true,
});

module.exports = cloudinary;

// const cloudinary = require("cloudinary").v2;
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const multer = require("multer");
// require("dotenv").config();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
//   shorten: true,
//   secure: true,
//   ssl_detected: true,
// });

// // Configure multer to use Cloudinary for storage
// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: {
//     folder: "leave-application-docs", // A specific folder in Cloudinary
//     // You can add a function to format the public_id (filename) if needed
//     // public_id: (req, file) => 'some_unique_name',
//     allowed_formats: ["jpg", "jpeg", "png", "pdf", "doc", "docx"], // Specify allowed file types
//   },
// });

// // Initialize multer with the Cloudinary storage engine
// const cloudinaryUploader = multer({ storage: storage });

// module.exports = cloudinaryUploader;
