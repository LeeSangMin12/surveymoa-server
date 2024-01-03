import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { createServer } from "http";
import { Server } from "socket.io";

import chat_router, { store_chat } from "./routes/chat.js";
import check_router from "./routes/check.js";
import login_router from "./routes/login.js";
import research_router from "./routes/research.js";
import user_router from "./routes/user.js";
import withdrawal_router from "./routes/withdrawal.js";

dotenv.config(); //env 파일 가져오기
const { PORT, CORS } = process.env;

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  cors({
    origin: CORS,
    credentials: true,
  })
);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use("/chat", chat_router);
app.use("/check", check_router);
app.use("/login", login_router);
app.use("/research", research_router);
app.use("/user", user_router);
app.use("/withdrawal", withdrawal_router);

io.on("connection", (socket) => {
  console.log("새로운 사용자가 연결되었습니다.");

  socket.on("request_join", (chatroom_id) => {
    socket.join(chatroom_id);
  });

  socket.on("message", (message) => {
    io.to(message.room_id).emit("message_reception", {
      msg: message.msg,
      user_id: message.user_id,
      date: message.date,
    });

    store_chat(message);
  });

  socket.on("leave_chatrooom", (chatroom_id) => {
    socket.leave(chatroom_id);
    console.log("사용자와의 연결이 종료되었습니다.");
  });

  socket.on("disconnect", () => {
    console.log("disconnect " + socket.id); // undefined
  });
});

server.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
