import fs from 'fs';
import path from 'path';
import axios from 'axios';
// import Ocr from './external-lib/gutenye/ocr-node/src/index.ts';
import Ocr from '@gutenye/ocr-node';

// https://github.com/PaddlePaddle/PaddleOCR/blob/main/doc/doc_en/models_list_en.md

// Folder containing the images
const folderPath = './test_imgs';

const runOCRForImages = async () => {
  try {
    // Create the OCR instance
    const ocr = await Ocr.create();

    // Read all files from the folder
    const files = fs.readdirSync(folderPath);

    // Filter out only image files (e.g., jpg, png)
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/.test(file));

    // Iterate through each image file
    for (const file of imageFiles) {
      const imagePath = path.join(folderPath, file);
      console.log(`Processing image: ${imagePath}`);

      // Start the timer for this image
      console.time(`Detection Time for ${file}`);

      // Detect text from the image
      const result = await ocr.detect(imagePath);

      // End the timer and log the result
      console.timeEnd(`Detection Time for ${file}`);

      // Display the result after detection
      console.log(`OCR Result for ${file}:`, result);
    }
  } catch (error) {
    console.error('Error while processing images:', error);
  }
};

// Call the function to run OCR on images in the folder
// runOCRForImages();

const urlsJsonPath = './text_urls.json'; // Example: [{"url": "https://example.com/image1.jpg"}, {"url": "https://example.com/image2.png"}]

// Folder to temporarily save downloaded images
const downloadFolder = './downloaded_images';

// Function to download image from URL
const downloadImage = async (url, downloadFolder) => {
  // Get the file name from the URL by splitting at '/' and taking the last part
  const fileName = url.split('/').pop();
  
  // Join the file name with the download folder path
  const filePath = path.join(downloadFolder, fileName);
  
  // Fetch the image from the URL
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',  // Stream the response to handle large files
  });
  
  // Create a write stream to save the file
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  // Return a promise that resolves when the download finishes
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath));  // Resolve with file path
    writer.on('error', reject);  // Reject in case of error
  });
};

const runOCRForURLs = async () => {
  try {
    // Read the URLs from the JSON file
    const urlData = JSON.parse(fs.readFileSync(urlsJsonPath, 'utf8'));
    const urls = urlData; // Directly use the array since it's a list of URLs

    // Create OCR instance
    const ocr = await Ocr.create();
    
    // Ensure the download folder exists
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder);
    }

    const results = {};

    // Iterate through each URL
    for (const url of urls) {
      const fileName = path.basename(url); // Get the file name from the URL
      console.log(`Processing image from URL: ${url}`);

      // Download the image
      const imagePath = await downloadImage(url, downloadFolder); // Ensure you pass the download folder

      // Start the timer for this image
      console.time(`Detection Time for ${fileName}`);

      // Detect text from the downloaded image
      const result = await ocr.detect(imagePath);
      console.log(`OCR Result for ${fileName}:`, result);

      // End the timer
      console.timeEnd(`Detection Time for ${fileName}`);

      // Add result to JSON object
      results[url] = result;

      // Optionally, delete the image after processing (cleanup)
      fs.unlinkSync(imagePath);
    }

    // Log the final results
    // console.log('OCR Results:', JSON.stringify(results, null, 2));

    // Write the results to a JSON file
    fs.writeFileSync('ocr_results.json', JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Error while processing images:', error);
  }
};


// Call the function to run OCR on images from URLs
runOCRForURLs();
