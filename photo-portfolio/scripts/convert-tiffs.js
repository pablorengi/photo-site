#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const inputFolder = "./tiff-originals";
const outputFolder = "./tiff-converted";

if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
}

const files = fs.readdirSync(inputFolder).filter((file) => file.match(/\.(tiff?|tif)$/i));

async function convertTiffToJpeg(file, index) {
  const inputFilePath = path.join(inputFolder, file);
  const outputFilePath = path.join(outputFolder, `${index + 1}.jpg`);

  try {
    await sharp(inputFilePath)
      .resize(2400, 24000, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(outputFilePath);
    console.log(`Converted ${file} to ${outputFilePath}`);
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
