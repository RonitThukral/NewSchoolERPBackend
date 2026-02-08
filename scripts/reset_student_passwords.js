const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to DB
mongoose.connect(process.env.LOCAL_DB_CONNECT, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Defined minimal Student Schema for update
const studentSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' }
}, { strict: false });

const Student = mongoose.model('students', studentSchema);

const resetPasswords = async () => {
    try {
        const students = await Student.find({ role: 'student' });
        console.log(`Found ${students.length} students to update.`);

        let updatedCount = 0;
        for (const student of students) {
            if (student.userID) {
                const hashedPassword = await bcrypt.hash(student.userID, 10);
                await Student.updateOne(
                    { _id: student._id },
                    { $set: { password: hashedPassword } }
                );
                updatedCount++;
                if (updatedCount % 10 === 0) console.log(`Updated ${updatedCount} students...`);
            }
        }

        console.log(`Successfully updated ${updatedCount} student passwords to their userID.`);
        process.exit(0);
    } catch (error) {
        console.error('Error updating passwords:', error);
        process.exit(1);
    }
};

resetPasswords();
