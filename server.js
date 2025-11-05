const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidv4 } = require('uuid');
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, { debug: true });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

app.use('/peerjs', peerServer);

const roomPasswords = {}; 

app.get('/', (req, res) => {
  res.render('home');
});

app.post('/create-room', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.redirect('/');
  }
  const roomId = uuidv4();
  roomPasswords[roomId] = password;
  res.redirect(`/join?roomId=${roomId}&username=${encodeURIComponent(username)}`);
});

app.get('/join', (req, res) => {
  const { roomId, username } = req.query;
  if (!roomId || !username) {
    return res.redirect('/');
  }
  res.render('join', { roomId, username });
});

app.post('/verify-password', (req, res) => {
  const { roomId, password, username } = req.body;
  if (!roomId || !password || !username) {
    return res.json({ success: false });
  }

  if (roomPasswords[roomId] === password) {
    
    return res.json({ success: true, redirectUrl: `/${roomId}?username=${encodeURIComponent(username)}` });
  } else {
    return res.json({ success: false });
  }
});

app.get('/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const username = req.query.username || 'Anonymous';
  if (!roomPasswords[roomId]) {
    return res.redirect('/'); 
  }
  res.render('room', { roomId, username });
});

const usersInRoom = {};

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId, username) => {
    socket.join(roomId);
    if (!usersInRoom[roomId]) usersInRoom[roomId] = {};
    usersInRoom[roomId][userId] = username;

    socket.to(roomId).emit('user-connected', userId, username);

    io.to(roomId).emit('participants-update', Object.values(usersInRoom[roomId]));

    socket.on('message', msg => {
  socket.to(roomId).emit('createMessage', msg);
});


    socket.on('disconnect', () => {
      if (usersInRoom[roomId]) {
        delete usersInRoom[roomId][userId];
        socket.to(roomId).emit('user-disconnected', userId);
        io.to(roomId).emit('participants-update', Object.values(usersInRoom[roomId]));
      }
    });
  });
});


const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

