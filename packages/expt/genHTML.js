import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';

// Path to your JSON file
const jsonFilePath = './ocr_results-test-sample.json';

// Read the JSON file
const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

// Create an HTML document
// let htmlContent = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Image Grid</title>
//     <style>
//         body {
//             font-family: Arial, sans-serif;
//             margin: 20px;
//         }
//         .grid {
//             display: grid;
//             grid-template-columns: repeat(4, 1fr);
//             gap: 10px;
//         }
//         .item {
//             text-align: center;
//             border: 1px solid #ccc;
//             border-radius: 5px;
//             padding: 10px;
//         }
//         img {
//             max-width: 100%;
//             height: auto;
//             border-radius: 5px;
//         }
//         .text {
//             color: navy; /* Text color for obj.text */
//         }
//         .mean {
//             color: black; /* Text color for mean */
//         }
//         .area {
//             color: green; /* Color for area percentage */
//         }
//     </style>
// </head>
// <body>
//     <h1>Image Grid</h1>
//     <div class="grid">`;

// Function to get image dimensions from a URL using sharp
async function getImageDimensions(imageUrl) {
    let imageBuffer;
    try{
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
         imageBuffer = Buffer.from(response.data);
    }catch(error){
        imageBuffer = fs.readFileSync(`./test_imgs/${imageUrl}`);
    }
    const { width, height } = await sharp(imageBuffer).metadata();
    return { width, height };
}

// Process each URL in the data
async function generateHTML() {
    for (const url in data) {
        const jsonObjects = data[url];

        // Get image dimensions from URL
        const dimensions = await getImageDimensions(url);
        const imageWidth = dimensions.width;
        const imageHeight = dimensions.height;
        const imageArea = imageWidth * imageHeight; // Total image area

        htmlContent += `<div class="item">`;
        // htmlContent += `<img src="${url}" alt="${url}">`;
        htmlContent += `<img src="./test_imgs/${url}" alt="${url}">`;

        if (jsonObjects.length > 0) {
            jsonObjects.forEach(obj => {
                if (obj.mean > 0) {
                    const roundedMean = parseFloat(obj.mean).toFixed(2);
                    
                    // Calculate the area of the bounding box
                    const [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] = obj.box;
                    const boxWidth = Math.abs(x2 - x1);
                    const boxHeight = Math.abs(y3 - y1);
                    const boxArea = boxWidth * boxHeight;

                    // Calculate the area percentage
                    const areaPercentage = ((boxArea / imageArea) * 100).toFixed(2);

                    // Format the output as "text : mean (area%)"
                    htmlContent += `<div>
                        <span class="text">${obj.text}</span> : 
                        <span class="mean">${roundedMean}</span> 
                        <span class="area">(${areaPercentage}%)</span>
                    </div>`;
                }
            });
        } else {
            htmlContent += `<div>No text detected</div>`;
        }
        htmlContent += `</div>`;
    }

    htmlContent += `
        </div>
    </body>
    </html>`;

    // Path to save the HTML file
    const htmlFilePath = './output_test.html';

    // Write the HTML content to a file
    fs.writeFileSync(htmlFilePath, htmlContent);
    console.log('HTML document generated:', htmlFilePath);
}

async function generateHTMLV2() {
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Image Grid</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
            }
            .item {
                position: relative;
                text-align: center;
                border: 1px solid #ccc;
                border-radius: 5px;
                padding: 10px;
            }
            img {
                max-width: 100%;
                height: auto;
                border-radius: 5px;
            }
            .text {
                color: navy;
            }
            .mean {
                color: black;
            }
            .area {
                color: green;
            }
            .bbox {
                position: absolute;
                border: 2px solid red;
            }
        </style>
    </head>
    <body>
        <h1>Image Grid</h1>
        <div class="grid">`;

    for (const url in data) {
        const jsonObjects = data[url];

        // Get original image dimensions from URL
        const dimensions = await getImageDimensions(url);
        const imageWidth = dimensions.width;
        const imageHeight = dimensions.height;

        // Define a new resized width (based on the grid's max-width)
        const resizedImageWidth = 300; // You can adjust this value
        const scaleFactor = resizedImageWidth / imageWidth;
        const resizedImageHeight = imageHeight * scaleFactor;
        const imageArea = imageWidth * imageHeight;

        // Add the image inside a grid item with relative positioning
        //htmlContent += `<div class="item" style="position: relative;">
            // <img src="./test_imgs/${url}" alt="${url}" style="width: ${resizedImageWidth}px; height: ${resizedImageHeight}px;">`;
        htmlContent += `<div class="item" style="position: relative;">
            <img src="./test_imgs/${url}" alt="${url}" style="width: ${resizedImageWidth}px; height: ${resizedImageHeight}px;">`;

        if (jsonObjects.length > 0) {
            jsonObjects.forEach(obj => {
                if (obj.mean > 0) {
                    const roundedMean = parseFloat(obj.mean).toFixed(2);

                    // Extract and scale the bounding box coordinates
                    const [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] = obj.box.map(([x, y]) => [x * scaleFactor, y * scaleFactor]);
                    const boxWidth = Math.abs(x2 - x1);
                    const boxHeight = Math.abs(y3 - y1);

                    // Calculate the area percentage
                    const boxArea = boxWidth * boxHeight;
                    const areaPercentage = ((boxArea / imageArea) * 100).toFixed(2);

                    // Draw the bounding box as an absolutely positioned div
                    htmlContent += `<div class="bbox" style="
                        left: ${x1+20}px;
                        top: ${y1+10}px;
                        width: ${boxWidth}px;
                        height: ${boxHeight}px;
                    "></div>`;

                    // Display the text, mean, and area percentage
                    htmlContent += `<div>
                        <span class="text">${obj.text}</span> :
                        <span class="mean">${roundedMean}</span>
                        <span class="area">(${areaPercentage}%)</span>
                    </div>`;
                }
            });
        } else {
            htmlContent += `<div>No text detected</div>`;
        }

        htmlContent += `</div>`; // Close grid item
    }

    htmlContent += `
        </div>
    </body>
    </html>`;

    // Path to save the HTML file
    const htmlFilePath = './output.html';

    // Write the HTML content to a file
    fs.writeFileSync(htmlFilePath, htmlContent);
    console.log('HTML document generated:', htmlFilePath);
}

// Generate the HTML file
generateHTMLV2().catch(err => console.error(err));
