const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
// const bodyParser = require("body-parser")
const app = express()
const Routes = require("./routes/route.js")
const serverless = require('serverless-http')
const http = require('http');
const socketIo = require('socket.io');
const Student = require('./models/studentSchema.js');
const Subject = require('./models/subjectSchema.js');


const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", // Your frontend URL
        methods: ["GET", "POST"]
    }
}); // Integrate Socket.IO with the HTTP server and set CORS

const PORT = process.env.PORT || 5000

dotenv.config();

app.use(express.json({ limit: '10mb' }))
app.use(cors())

mongoose
    .connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(console.log("Connected to MongoDB"))
    .catch((err) => console.log("NOT CONNECTED TO NETWORK", err))

app.use('/', Routes);

// app.get('/', (req, res) => {
//     res.send("Hello World")
// })


// app.listen(PORT, () => {
//     console.log(`Server started at port no. ${PORT}`)
// })


// Socket.IO connection
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('send_message', async (obj2, subjectID, date) => {

        try {

            for (const key in obj2) {

                const subName = subjectID;
                const status = obj2[key];

                const student = await Student.findById(key);
                if (!student) { socket.emit('student_not_found', { message: 'Student not found' });return;}

                const subject = await Subject.findById(subjectID);
                const existingAttendance = student.attendance.find(
                    (a) =>
                        a.date.toDateString() === new Date(date).toDateString() &&
                        a.subName.toString() === subName
                );
                if (existingAttendance) {
                    existingAttendance.status = status;
                } else {
                    // Check if the student has already attended the maximum number of sessions
                    const attendedSessions = student.attendance.filter(
                        (a) => a.subName.toString() === subName
                    ).length;
                    if(attendedSessions >= subject.sessions){socket.emit('max_attendance_reached',{ message: 'Maximum attendance limit reached' });return; }
                    student.attendance.push({ date, status, subName });
                }

                const result = await student.save();
            }
        } catch (error) {
            console.error('Error finding student:', error);
        }


        io.emit('receive_message', obj2);


    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server started at port no. ${PORT}`);
});




// app.get('/.netlify/functions/index',(req,res)=>{
//     return res.json({
//         messages: "Hello World!21"
//     })
// })
// const handler = serverless(app);

// module.exports.handler = async(event,context)=>{
//     const result = await handler(event,context);
//     return result;
// }









