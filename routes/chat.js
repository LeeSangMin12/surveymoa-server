import express from "express";
import { default as mongodb } from "mongodb";
import dotenv from "dotenv";

import { verify_jwt } from "../libs/common.js";

dotenv.config(); //env 파일 가져오기
const { DB_URL } = process.env;

const router = express.Router();
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;
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
    room_id: ObjectId(message.room_id),
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
    const { particiapnt_user_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const is_exist_chatroom = await db.collection("chatroom").findOne({
      particiapnt_user_id: particiapnt_user_id,
    });

    if (is_exist_chatroom) {
      res.json({
        status: "ok",
        data: {
          chatroom_id: is_exist_chatroom._id,
        },
      });
    } else {
      const chatroom = await db.collection("chatroom").insertOne({
        user_id: verify_access_token.user_id,
        particiapnt_user_id: particiapnt_user_id,
        date: new Date(),
      });
      res.json({
        status: "ok",
        data: {
          chatroom_id: chatroom.ops[0]._id,
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
router.post("/get_chat_arr", async (req, res) => {
  try {
    const { chatroom_id } = req.body.data;

    const chat_arr = await db
      .collection("chat")
      .find({
        room_id: ObjectId(chatroom_id),
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

/**
 * 채팅룸 정보 조회
 */
router.post("/get_chatroom_user", async (req, res) => {
  try {
    const { chatroom_id } = req.body.data;
    let participant_user_id = "";

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const chatroom_info = await db.collection("chatroom").findOne(
      { _id: ObjectId(chatroom_id) },
      {
        projection: {
          user_id: 1,
          particiapnt_user_id: 1,
        },
      }
    );

    if (
      verify_access_token.user_id !== chatroom_info.user_id &&
      verify_access_token.user_id !== chatroom_info.particiapnt_user_id
    ) {
      return res.json({
        status: "false",
      });
    }

    //내가 만든 채팅방일때
    if (chatroom_info.user_id === verify_access_token.user_id) {
      participant_user_id = chatroom_info.particiapnt_user_id;
    } else {
      //만듬당한 채팅방일때
      participant_user_id = chatroom_info.user_id;
    }

    const chatroom_user_obj = await db.collection("login").findOne(
      { _id: ObjectId(participant_user_id) },
      {
        projection: {
          nickname: 1,
          user_img: 1,
        },
      }
    );

    res.json({
      status: "ok",
      data: { chatroom_user_obj },
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
 * 채팅룸 리스트 조회
 */
router.post("/get_chatroom_arr", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const chatroom_arr = await db
      .collection("chatroom")
      .find({
        $or: [
          { user_id: verify_access_token.user_id },
          { particiapnt_user_id: verify_access_token.user_id },
        ],
      })
      .sort({ _id: -1 })
      .toArray();

    res.json({
      status: "ok",
      data: {
        chatroom_arr,
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
