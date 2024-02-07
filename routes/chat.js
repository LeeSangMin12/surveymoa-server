import express from "express";
import { default as mongodb } from "mongodb";
import dotenv from "dotenv";

import { verify_jwt } from "../libs/common.js";
import sql from "../db.js";

dotenv.config(); //env 파일 가져오기
const { DB_URL } = process.env;

const router = express.Router();
const MongoClient = mongodb.MongoClient;
let db;

MongoClient.connect(
  DB_URL,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) throw err;

    db = client.db("survey_moa");
  }
);

/**
 * 채팅 저장
 */
export const store_chat = async (message) => {
  await db.collection("chat").insertOne({
    room_id: message.room_id,
    msg: message.msg,
    user_id: message.user_id,
    date: message.date,
  });
};

/**
 * 채팅룸 참가
 */
router.post("/participant_chatroom", async (req, res) => {
  try {
    const { participant_user_id, created } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const is_exist_chatroom_sql = await sql`select
      id from chat_room
      where participant_user_id = ${participant_user_id} and 
        user_id=${verify_access_token.user_id}`;

    if (is_exist_chatroom_sql.length === 0) {
      const new_chatroom = await sql`insert into chat_room
        (user_id, participant_user_id, created)
      values
        (${verify_access_token.user_id},
        ${participant_user_id},
        ${new Date(created)})
      returning id`;

      res.json({
        status: "ok",
        data: {
          chatroom_id: new_chatroom[0].id,
        },
      });
    } else {
      res.json({
        status: "ok",
        data: {
          chatroom_id: is_exist_chatroom_sql[0].id,
        },
      });
    }
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * 채팅룸 리스트 조회
 */
router.post("/get_chatroom_arr", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const chatroom_arr_sql = await sql`
    select
      chat_room.id,
      chat_room.user_id,
      chat_room.participant_user_id,
      users.nickname,
      users.user_img,
      firebase.notification_token
    from chat_room
    left join users on case 
      when chat_room.user_id = ${verify_access_token.user_id} 
        then chat_room.participant_user_id = users.id
      when chat_room.participant_user_id = ${verify_access_token.user_id} 
        then chat_room.user_id = users.id
      end
    left join firebase
      on chat_room.user_id = firebase.user_id
    where users.nickname is not null
    group by chat_room.id, users.nickname, users.user_img, firebase.notification_token
    order by chat_room.id desc
  `;

    res.json({
      status: "ok",
      data: {
        chatroom_arr: chatroom_arr_sql,
      },
    });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

/**
 * 채팅 리스트 조회
 */
router.post("/get_chat_arr", async (req, res) => {
  try {
    const { chatroom_id } = req.body.data;

    const chat_arr = await db
      .collection("chat")
      .find({
        room_id: chatroom_id,
      })
      .toArray();

    res.json({
      status: "ok",
      data: {
        chat_arr,
      },
    });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
