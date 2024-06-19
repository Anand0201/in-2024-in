const express = require('express');
const mongoose = require('mongoose');
const Student = require('./model/user');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();
const multer = require('multer');
const { generateIdCard } = require('./utils/icard.js'); // Correct import
const path = require('path');
const fs = require('fs');

const app = express();

const {privatekey} = JSON.parse(process.env.private_key)

const serviceA = {
  "type": process.env.type,
  "project_id": process.env.project_id,
  "private_key_id": process.env.private_key_id,
  "private_key": privatekey,
  "client_email": process.env.client_email,
  "client_id": process.env.client_id,
  "auth_uri": process.env.auth_uri,
  "token_uri": process.env.token_uri,
  "auth_provider_x509_cert_url": process.env.auth_provider_x509_cert_url,
  "client_x509_cert_url": process.env.client_x509_cert_url,
  "universe_domain": process.env.universe_domain
}

// const serviceAccount = require('./orionstechelite-278cc-firebase-adminsdk-sjqv9-9c6721fce9.json');

app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const db = process.env.database;

mongoose.connect(db)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error: ", err));

admin.initializeApp({
  credential: admin.credential.cert(serviceA),
  storageBucket: 'orionstechelite-278cc.appspot.com'
});

const bucket = admin.storage().bucket();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/form', (req, res) => {
  res.render('form');
});

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: 'internship@orionstechelite.com',
    pass: 'OrionS@2024'
  }
});

app.post('/submitRegistration', upload.fields([{ name: 'screenshot' }, { name: 'passport' }]), async (req, res) => {
  try {
    const { full_name, emailid, phone, Program, semester, College, discipline } = req.body;
    const newRegistration = new Student({
      full_name,
      emailid,
      phone,
      program: Program,
      semester,
      college: College,
      discipline
    });

    let passportURL = '';
    let icardURL = '';
    let passportFile = '';

    if (req.files) {
      console.log(req.files);

      if (req.files.screenshot) {
        const screenshot = req.files.screenshot[0];
        const screenshotUpload = bucket.file(`screenshots/${full_name}/${screenshot.originalname}`);
        await screenshotUpload.save(screenshot.buffer);
        console.log('Screenshot successfully uploaded');
      }

      if (req.files.passport) {
        passportFile = req.files.passport[0];
        const passportUpload = bucket.file(`passports/${full_name}/${passportFile.originalname}`);
        await passportUpload.save(passportFile.buffer);
        passportURL = await passportUpload.getSignedUrl({
          action: 'read',
          expires: '03-01-2500'
        });
        passportURL = passportURL[0];
        console.log('Passport successfully uploaded');
      }
    } else {
      console.log('No files uploaded');
    }
    
    let generateid = 2024000;
    const strid = String(generateid)

    

    const icardPath = await generateIdCard(passportFile.buffer, strid, full_name, emailid, phone);
    

    if (icardPath) {
      const icardFile = fs.readFileSync(icardPath);
      const icardUpload = bucket.file(`Icards/${full_name}/${full_name}.pdf`);
      await icardUpload.save(icardFile);
      icardURL = await icardUpload.getSignedUrl({
        action: 'read',
        expires: '03-01-2500'
      });
      icardURL = icardURL[0];
      generateid++;
      console.log('Icards successfully uploaded');
    }

    await newRegistration.save();

    const mailOptions = {
      from: 'internship@orionstechelite.com',
      to: emailid,
      subject: 'Welcome to the OTE Bootcamp & Internship Program!',
      html: `<p>Dear ${full_name},</p>
             <p>Welcome to the Orions Tech Elite Bootcamp & Internship Program! We are thrilled to have you on board and excited to guide you on your journey to becoming a skilled developer.</p>
             <h3>Program Details:</h3>
             <ul>
               <li>Start Date: 27-06-2024</li>
               <li>Duration: 20 Days of Live Classes + 30 Days of 24/7 Support</li>
               <li>Class Schedule: Daily live sessions followed by one-on-one interactive sessions</li>
               <li>Support: 24/7 assistance via WhatsApp and email</li>
             </ul>
             <h3>What to Expect:</h3>
             <ul>
               <li>Intensive Training: Advanced-level HTML, CSS, basic JavaScript, and Version Control (Git & GitHub)</li>
               <li>Real-World Projects: Develop business landing pages and e-commerce websites</li>
               <li>Personalized Mentorship: One-on-one guidance from experienced developers</li>
               <li>Performance Evaluations: Regular assessments to track your progress</li>
               <li>Networking Opportunities: Connect with industry professionals and peers</li>
               <li>AI Integration Skills: Learn to use AI to enhance your coding efficiency</li>
               <li>Premium Courses Access: Enjoy development courses worth over ₹50,000</li>
               <li>Lifetime Developer Community Support: Continuous support from a dedicated community of developers</li>
             </ul>
             <h3>Online Deliverables:</h3>
             <ul>
               <li>Signed Internship Offer Letter: Official document confirming your internship</li>
               <li>Completion Certificate: Acknowledging your achievements and skills</li>
             </ul>
             <p>To complete your enrollment, please proceed with the payment via the following link:</p>
             <p><a href="https://razorpay.com/payment-button/pl_OMK7J8miJ4n9mI/view/?utm_source=payment_button&utm_medium=button&utm_campaign=payment_button">Payment Page Link</a></p>
             <p>After completing the payment, please fill out the detailed form to provide us with necessary information and preferences for the program:</p>
             <p><a href="https://orionstechelite.com/OTE-Internship.html">Detailed Form Link</a></p>
             <p>We are excited to embark on this journey with you and look forward to helping you achieve your career goals. Should you have any questions or need assistance, feel free to reach out to us at any time.</p>
             <p>Best Regards,</p>
             <p>Orions Tech Elite<br>
             contact@orionstechelite.com<br>
             +91-9103774717</p>
             <p>Welcome aboard, and let’s get started on building your future together!</p>
             <p>---</p>
             <p>Note: If you have not registered for this program or believe this email was sent to you by mistake, please contact us immediately.</p>`,
      attachments: [
        {
          filename: `${full_name}.pdf`,
          path: icardPath
        }
      ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.redirect(`https://orionstechelite.com/`); // Redirect to a success page
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.listen(2010, () => {
  console.log("Server is running on port 2010");
});
