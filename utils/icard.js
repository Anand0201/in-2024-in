const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');
const admin = require('firebase-admin'); // Ensure this is available in your icard.js

const capitalizeFirstLetter2 = (str) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

const createCircularImage = async (imageBuffer, diameter, format) => {
  const radius = diameter / 2;
  let sharpImage = sharp(imageBuffer)
    .resize(diameter, diameter)
    .composite([{
      input: Buffer.from(
        `<svg><circle cx="${radius}" cy="${radius}" r="${radius}" /></svg>`
      ),
      blend: 'dest-in'
    }]);

  switch (format) {
    case 'jpeg':
      sharpImage = sharpImage.jpeg();
      break;
    case 'png':
      sharpImage = sharpImage.png();
      break;
    default:
      throw new Error('Unsupported image format');
  }

  return await sharpImage.toBuffer();
};

const generateIdCard = async (imageBuffer, strid, fullName, emailId, phone, format = 'png') => {
  const cardPath = "./icard.pdf"; // Path to your PDF template
  const existingPdfBytes = fs.readFileSync(cardPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const page = pdfDoc.getPages()[0];

  const maxDimension = 230;
  const circularImageBuffer = await createCircularImage(imageBuffer, maxDimension, format);
  console.log('Circular Image Buffer Length:', circularImageBuffer.length);

  const image = await pdfDoc.embedPng(circularImageBuffer);

  // const { width, height } = image.scale(0.4);
  const width = 57;
  const height = 57;
  const x = 42.5;
  const y = 143;

  page.drawImage(image, { x, y, width, height });

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const name = capitalizeFirstLetter2(fullName);
  const email = emailId.toLowerCase();
  const phoneNumber = phone;
  
  page.drawText(strid, {
    x: 50,
    y: 79,
    size: 5,
    font: helveticaFont,
    color: rgb(1, 1, 1)
  });

  page.drawText(name, {
    x: 20,
    y: 100,
    size: 8,
    font: helveticaFont,
    color: rgb(1, 1, 1)
  });

  page.drawText(email, {
    x: 50,
    y: 69.2,
    size: 5,
    font: helveticaFont,
    color: rgb(1, 1, 1)
  });

  page.drawText(phoneNumber, {
    x: 50,
    y: 58,
    size: 5,
    font: helveticaFont,
    color: rgb(1, 1, 1)
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, 'public', 'icards', `${fullName}.pdf`);
  fs.writeFileSync(outputPath, pdfBytes);

  console.log('PDF created successfully');

  // Upload to Firebase Storage
  const bucket = admin.storage().bucket();
  const icardUpload = bucket.file(`Icards/${fullName}/${fullName}.pdf`);
  await icardUpload.save(pdfBytes);
  const icardURL = await icardUpload.getSignedUrl({
    action: 'read',
    expires: '03-01-2500'
  });

  return icardURL[0]; // Return the URL of the uploaded ID card
};

module.exports = { generateIdCard };
