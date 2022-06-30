import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { IMessage, IUser } from './users/user.interface';
import cors from 'cors'
import 'dotenv/config'

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors);


const server = http.createServer(app)
const io = new Server(server, {cors: {origin: process.env.FRONT_URL}})
let users: IUser[] = [];


io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error("invalid username"));
  } else {
    if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return next(new Error("username already used !"));
    } else {
      socket["username"] = username;
    }
  }

  next();
});


io.on("connection", async (socket: Socket) => {
  // fetch existing users
  users = []
  for (let [id, socket] of io.of("/").sockets) {
    users.push({
      userID: id,
      username: socket['username'],
    });
  }

  // send list of users already connected
  socket.emit('othersUserConnected', users.filter(u => u.userID !== socket.id))

  // notify existing users
  socket.broadcast.emit("user connected", {
    userID: socket.id,
    username: socket['username'],
  });


  // forward the private message to the right recipient
  socket.on("private message", (data : IMessage) => {
    socket.to(data.to).emit('private message', data);
  });

  //user disconnect manually
  socket.on('bye', ()=>{
    socket.disconnect()
  })

  // notify users upon disconnection
  socket.on("disconnect", () => {
    users = users.filter(u => u.userID !== socket.id)
    socket.broadcast.emit("user disconnected", socket.id);
  });
});


server.listen(PORT, () =>
  console.log(`server listening at http://localhost:${PORT}`)
);


