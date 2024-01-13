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
 * 출금 정보 가져오기
 */
router.post("/get_withdrawal_obj", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const withdrawal_obj = await db.collection("login").findOne(
      { _id: ObjectId(verify_access_token.user_id) },
      {
        projection: {
          _id: 0,
          accumulated_money_arr: 1,
          accumulated_money: 1,
        },
      }
    );

    res.json({
      status: "ok",
      data: {
        withdrawal_obj: withdrawal_obj,
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
 * 출금 신청 여부 가져오기
 */
router.post("/is_application_withdrawal", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const withdrawal_info = await db.collection("withdrawal").findOne({
      user_id: verify_access_token.user_id,
    });

    if (withdrawal_info === null) {
      res.json({
        status: "no_withdrawal",
      });
    } else {
      res.json({
        status: "wating_withdrawal",
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
 * 출금 신청
 */
router.post("/application_withdrawal", async (req, res) => {
  try {
    const { bank_name, account_number } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db.collection("withdrawal").insertOne({
      user_id: verify_access_token.user_id,
      bank_name: bank_name,
      account_number: account_number,
    });

    res.json({
      status: "ok",
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
