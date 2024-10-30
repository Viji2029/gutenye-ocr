import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import Ocr from '@gutenye/ocr-node';
import { exec } from 'child_process'; // Import exec to run system commands

const folderPath = './test_imgs';


async function isFullyTransparent(imagePath) {
  try {
    // Load the image and get its metadata
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    // Check if the image has an alpha channel
    if (!metadata.hasAlpha) {
      return false; // No alpha channel, thus the image is not transparent
    }

    // Extract the alpha channel and check for transparency
    const { data: alphaChannel } = await image
      .ensureAlpha() // Ensure the alpha channel is present
      .extractChannel('alpha') // Extract the alpha channel
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Check if all alpha channel values are 0 (fully transparent)
    const isTransparent = alphaChannel.every(value => value === 0);
    return isTransparent;
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}


const resizeImage = async (imagePath, targetSize = 512) => {
  const { width, height } = await sharp(imagePath).metadata();
  
  if (width < targetSize && height < targetSize) {
    // If both dimensions are smaller than the target size, return original buffer
    return await sharp(imagePath).toBuffer();
  }

  // Calculate the aspect ratio and new dimensions
  const aspectRatio = width / height;
  let newWidth, newHeight;

  if (width < height) {
    newWidth = targetSize;
    newHeight = Math.round(targetSize / aspectRatio);
  } else {
    newHeight = targetSize;
    newWidth = Math.round(targetSize * aspectRatio);
  }

  return {
    buffer: await sharp(imagePath)
      .resize(newWidth, newHeight)
      .toBuffer(),
    originalDimensions: { width, height },
    newDimensions: { newWidth, newHeight }
  };
};

const rescaleTextBounds = (detections, scaleX, scaleY) => {
  if (detections.length === 0) {
    return []; // Return an empty array if no detections are provided
  }


  return detections.map(detection => {  // Looping through each detection
    const box = detection.box;

    // Calculate the bounding box coordinates
    const minX = Math.min(...box.map(point => point[0]));
    const minY = Math.min(...box.map(point => point[1]));
    const maxX = Math.max(...box.map(point => point[0]));
    const maxY = Math.max(...box.map(point => point[1]));

    // Calculate width and height
    const width = maxX - minX;
    const height = maxY - minY;

    // Rescale the coordinates
    return {
      mean: detection.mean,
      text: detection.text,
      box: [
        [
          Math.round(minX * scaleX),
          Math.round(minY * scaleY)
        ],
        [
          Math.round((minX + width) * scaleX),
          Math.round(minY * scaleY)
        ],
        [
          Math.round((minX + width) * scaleX),
          Math.round((minY + height) * scaleY)
        ],
        [
          Math.round(minX * scaleX),
          Math.round((minY + height) * scaleY)
        ]
      ]
    };
  });
};


// Clear swap memory
const clearSwap = () => {
  exec('sudo swapoff -a && sudo swapon -a', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error clearing swap memory: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error clearing swap memory: ${stderr}`);
      return;
    }
    console.log(`Swap cleared successfully: ${stdout}`);
  });
};

const calculateInitialQuality = (currentSizeInKB, targetSizeInKB) => {
  const scalingFactor = targetSizeInKB / currentSizeInKB;
  let initialQuality = Math.round(80 * scalingFactor);
  return Math.min(Math.max(initialQuality, 10), 80);
};

const compressImageToSize = async (imagePath, targetSizeInKB) => {
  const targetSizeInBytes = targetSizeInKB * 1024;
  let currentSizeInBytes = fs.statSync(imagePath).size;
  let currentSizeInKB = currentSizeInBytes / 1024;
  let quality = calculateInitialQuality(currentSizeInKB, targetSizeInKB);
  let compressedImageBuffer;

  console.log(`Initial quality set to: ${quality}`);

  do {
    try {
      compressedImageBuffer = await sharp(imagePath)
        .jpeg({ quality })
        .toBuffer();

      const imageSizeInBytes = Buffer.byteLength(compressedImageBuffer);
      console.log(`Current compressed image size: ${(imageSizeInBytes / 1024).toFixed(2)} KB`);

      if (imageSizeInBytes <= targetSizeInBytes) {
        return compressedImageBuffer;
      }

      quality -= 5;
    } catch (error) {
      console.error('Error during compression:', error);
      break;
    }
  } while (quality > 0);

  return await sharp(imagePath).toBuffer();
};

const runOCRForImages = async () => {
  try {
    const ocr = await Ocr.create();
    const files = fs.readdirSync(folderPath).slice(286, 301);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/.test(file));
    const results = {};
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const imagePath = path.join(folderPath, file);
      const transparency = await isFullyTransparent(imagePath);

        if (imagePath.includes("17PVREO7zgo")) {
            continue; // This will skip to the next iteration of the loop
        }
        if (transparency) {
          results[file] = [];
          fs.writeFileSync('ocr_results-test-aws.json', JSON.stringify(results, null, 2));
          continue; // This will skip to the next iteration of the loop
        }
      console.log(imagePath);
      const initialSizeInMB = fs.statSync(imagePath).size / (1024 * 1024);
      console.log(`Initial image size: ${initialSizeInMB.toFixed(2)} MB`);

      let imageBuffer;
      if (initialSizeInMB > 0.5) {
        console.log('Image size exceeds 0.5 MB, compressing to 250 KB...');
        imageBuffer = await compressImageToSize(imagePath, 250);
      } else {
        imageBuffer = await sharp(imagePath).toBuffer();
      }

      console.time(`Detection Time for ${file}`);
      const result = await ocr.detect(imageBuffer);
      console.timeEnd(`Detection Time for ${file}`);
      console.log(`OCR Result for ${file}:`, result);
      results[file] = result;

      fs.writeFileSync('ocr_results-test-aws.json', JSON.stringify(results, null, 2));

      // Clear swap memory after every 5 images
      if ((i + 1) % 5 === 0) {
        console.log(`Processed ${i + 1} images. Clearing swap memory...`);
        clearSwap();
      }
    }
  } catch (error) {
    console.error('Error while processing images:', error);
  }
};

const runOCRForImagesV2 = async () => {
  try {
    const ocr = await Ocr.create();
    const files = fs.readdirSync(folderPath);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/.test(file));
    const results = {};
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const imagePath = path.join(folderPath, file);
      const transparency = await isFullyTransparent(imagePath);

      if (imagePath.includes("17PVREO7zgo")) {
        continue; // Skip this file
      }
      if (transparency) {
        results[file] = [];
        fs.writeFileSync('ocr_results-test-sample.json', JSON.stringify(results, null, 2));
        continue; // Skip this file
      }

      console.log(imagePath);
      const initialSizeInMB = fs.statSync(imagePath).size / (1024 * 1024);
      console.log(`Initial image size: ${initialSizeInMB.toFixed(2)} MB`);

      // Resize if necessary
      const { buffer: imageBuffer, originalDimensions, newDimensions } = await resizeImage(imagePath, 512);

      // Check if resized image exceeds size threshold
      const resizedSizeInMB = imageBuffer.length / (1024 * 1024);
      if (resizedSizeInMB > 0.5) {
        console.log('Resized image size exceeds 0.5 MB, compressing to 250 KB...');
        imageBuffer = await compressImageToSize(imagePath, 250); // Use original image path for compression
      }

      // Run OCR on resized image
      console.time(`Detection Time for ${file}`);
      const result = await ocr.detect(imageBuffer);
      console.timeEnd(`Detection Time for ${file}`);
      console.log(`OCR Result for ${file}:`, result);

      // Rescale the text bounds to the original image size
      const scaleX = originalDimensions.width / newDimensions.newWidth;
      const scaleY = originalDimensions.height / newDimensions.newHeight;

      results[file] = rescaleTextBounds(result, scaleX, scaleY), // Rescale text bounds for original image
        

      fs.writeFileSync('ocr_results-test-sample.json', JSON.stringify(results, null, 2));

      // Clear swap memory after every 5 images
      if ((i + 1) % 5 === 0) {
        console.log(`Processed ${i + 1} images. Clearing swap memory...`);
        clearSwap();
      }
    }
  } catch (error) {
    console.error('Error while processing images:', error);
  }
};

// Call the function to run OCR on images in the folder
runOCRForImagesV2();
