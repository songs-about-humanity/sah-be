const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const { prompts } = require('./models/Prompts');


app.use(require('cors')());

app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));
app.use(express.json());

app.use('/api/v1/users', require('./routes/song-search'));

app.use(require('./middleware/not-found'));
app.use(require('./middleware/error'));

const rooms = {};

/// socket.on('CREATE')
// generates id for room, adds it to rooms object (e.g. {'ABCD' : {host: socket.id, participants: []}})
// ALSO do socket.join()

// socket.on('JOIN')
// takes in the id as a parameter from emitter, looks for id in the object, adds socket.id to participants array

// socket.on()
io.sockets.on('connection', socket => {
  //socket.on is to set up a listener

  socket.on('CREATE', (data) => {
    const randomIndex = Math.floor(Math.random() * prompts.length);
    const usedPrompts = [randomIndex];
    console.log(prompts);

    socket.emit('CODE', data.room_id);

    rooms[data.room_id] = {
      host: { id: socket.id, name: data.username },
      participants: [{ id: socket.id, name: data.username, score: 0, hasSelected: false }],
      token: data.token,
      songQueue: [],
      currentPrompt: prompts[randomIndex],
      usedPrompts: usedPrompts,
      judge: { id: socket.id, name: data.username },
      round: 0
    };

    console.log(rooms);

    socket.join(data.room_id);
    io.sockets.in(data.room_id).emit('ROOM_INFO', { room_id: data.room_id, room: rooms[data.room_id] });

  });

  socket.on('JOIN', (data) => {
    socket.join(data.room_id);
    const currentParticipants = rooms[data.room_id].participants;
    currentParticipants.push({ id: socket.id, name: data.name, score: 0, hasSelected: false });
    console.log(rooms);
    io.sockets.in(data.room_id).emit('ROOM_INFO', { room_id: data.room_id, room: rooms[data.room_id] });
  });

  socket.on('ROOM', (room) => {
    socket.join(room);
    // io.to.(id).emit, sends message to everyone in the room w/o having to iterate through array of participants
  });

  socket.on('LEAVE_ROOM', (room_id) => {
    socket.emit('RESET');
    socket.leave(room_id);
  });

  socket.on('CHOICE', ({ room_id, songData }) => {
    const currentQueue = rooms[room_id].songQueue;

    currentQueue.push({ songData, participant: socket.id });

    const updatedParticipants = rooms[room_id].participants.map(participant => {
      if(participant.id === socket.id) return { ...participant, hasSelected: true };
      return participant;
    });

    rooms[room_id] = { ...rooms[room_id], participants: updatedParticipants };

    io.sockets.in(room_id).emit('ROOM_INFO', { room_id, room: rooms[room_id] });
  });

  socket.on('PLAY', ({ room_id, songData }) => {
    io.sockets.in(room_id).emit('PLAY_SONG', songData);
  });
  
  socket.on('PAUSE', (room_id) => {
    io.sockets.in(room_id).emit('PAUSE');
  });

  

  socket.on('WINNER', ({ room_id, winner }) => {

    console.log('WINNER' + room_id, winner);
    let randomIndex = Math.floor(Math.random() * prompts.length);
    while(rooms[room_id].usedPrompts.includes(randomIndex)) {
      randomIndex = Math.floor(Math.random() * prompts.length);
    }


    const updatedScore = rooms[room_id].participants.map(participant => {

      if(participant.id === winner) {
        if(participant.score + 1 === 2) io.sockets.in(room_id).emit('GAME_WINNER', participant);
        return { ...participant, hasSelected: false, score: participant.score + 1 
        };
      }
      return { ...participant, hasSelected: false };
    });

    const newRound = rooms[room_id].round + 1;

    const nextJudge = updatedScore.length <= newRound ? rooms[room_id].participants[newRound % updatedScore.length] : rooms[room_id].participants[newRound];

    rooms[room_id] = { ...rooms[room_id], songQueue: [], judge: nextJudge, participants: updatedScore, round: newRound, currentPrompt: prompts[randomIndex] };

    io.sockets.in(room_id).emit('ROOM_INFO', { room_id, room: rooms[room_id] });
  });
});

module.exports = server;
