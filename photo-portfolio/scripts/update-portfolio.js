#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

const inputFolder = "./tiff-originals";
const outputFolder = "./tiff-converted";

if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
}

const files = fs.readdirSync(inputFolder).filter((file) => file.match(/\.(tiff?|tif)$/i));

async function processPhoto(file, index) {
  const inputFilePath = path.join(inputFolder, file);
  const baseName = path.parse(file).name;
  const outputFilePath = path.join(outputFolder, `${baseName}.jpg`);

  try {
    // Step 1: Convert TIFF to JPEG
    await sharp(inputFilePath)
      .resize(2400, 24000, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(outputFilePath);
    console.log(`Converted ${file} to ${outputFilePath}`);

    // Step 2: Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(outputFilePath, {
      folder: "portfolio",
      public_id: baseName,
      quality: "auto:good",
    });
    console.log(`Uploaded ${file} to Cloudinary: ${uploadResult.secure_url}`);
  } catch (error) {
    console.error(`Error converting ${file}:`, error);
  }
}

async function main() {
  for (let i = 0; i < files.length; i += 1) {
    await convertTiffToJpeg(files[i], i);
  }
}

main();
