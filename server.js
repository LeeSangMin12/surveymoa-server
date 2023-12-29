import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import chat_router from "./routes/chat.js";
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

app.use("/chat", chat_router);
app.use("/check", check_router);
app.use("/login", login_router);
app.use("/research", research_router);
app.use("/user", user_router);
app.use("/withdrawal", withdrawal_router);

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
