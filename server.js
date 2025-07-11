const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const path = require("path");
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authroutes');
const addressRoutes = require('./routes/addressRoute');
const categoryRoutes = require('./routes/categoryRoutes');



dotenv.config();

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: '*' }
});



app.set('io', io);

app.use(cors());
app.use(express.json()); // ✅ Keep this for all routes. Don't wrap in a condition.

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Error:', err));





// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', authRoutes);
app.use('/api', addressRoutes);
app.use('/api', categoryRoutes);




io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});




const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

