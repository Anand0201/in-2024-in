// model/user.js

const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  emailid: { type: String, required: true },
  phone: { type: String, required: true },
  program: { type: String, required: true },
  semester: { type: String, required: true },
  college: { type: String, required: true },
  discipline: { type: String, required: true }
});

const Student = mongoose.model('Student', registrationSchema);

module.exports = Student;
