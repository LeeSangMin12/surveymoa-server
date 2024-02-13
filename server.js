import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { createServer } from "http";
import { Server } from "socket.io";
import admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import service_account from "./libs/service_account_key.json" assert { type: "json" };

import chat_router, { store_chat } from "./routes/chat.js";
import check_router from "./routes/check.js";
import firebase_router from "./routes/firebase.js";
import like_research_router from "./routes/like_research.js";
import like_user_router from "./routes/like_user.js";
import login_router from "./routes/login.js";
import participant_research_router from "./routes/participant_research.js";
import rating_research_router from "./routes/rating_research.js";
import research_router from "./routes/research.js";
import user_hashtag_router from "./routes/user_hashtag.js";
import user_router from "./routes/user.js";
import withdrawal_router from "./routes/withdrawal.js";

dotenv.config(); //env 파일 가져오기
const { PORT, CORS, FIREBASE_PROJECT_ID } = process.env;

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  cors({
    origin: CORS,
    credentials: true,
  })
);

//firebase
initializeApp({
  credential: admin.credential.cert(service_account),
  projectId: FIREBASE_PROJECT_ID,
});

//socket.io
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use("/chat", chat_router);
app.use("/check", check_router);
app.use("/firebase", firebase_router);
app.use("/like_research", like_research_router);
app.use("/like_user", like_user_router);
app.use("/login", login_router);
app.use("/rating_research", rating_research_router);
app.use("/participant_research", participant_research_router);
app.use("/research", research_router);
app.use("/user_hashtag", user_hashtag_router);
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

    // send_alarm(message);
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

const send_alarm = (msg) => {
  let target_token = msg.notification_token;

  const message = {
    notification: {
      title: msg.nickname,
      body: msg.msg,
    },
    token: target_token,
  };

  getMessaging()
    .send(message)
    .then((response) => {
      // Response is a message ID string.
      console.log("Successfully sent message:", response);
    })
    .catch((error) => {
      console.log("Error sending message:", error);
    });
};

server.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
