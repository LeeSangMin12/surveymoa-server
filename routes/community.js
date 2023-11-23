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
 * 커뮤니티 정보 가져오기
 */
router.post("/get_community", async (req, res) => {
  try {
    const { department } = req.body.data;

    const community_info = await db.collection("community").findOne({
      department: department,
    });

    if (community_info === null) {
      //커뮤니티가 신청 학과가 없을때
      res.json({
        status: "ok",
        data: {
          application_num: 0,
        },
      });
    } else {
      res.json({
        status: "ok",
        data: {
          application_num: community_info.total_count,
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
 * 학과 커뮤니티 신청
 */
router.post("/apply_community", async (req, res) => {
  try {
    const { department } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const community_info = await db.collection("community").findOne({
      department: department,
    });

    if (community_info === null) {
      //커뮤니티 신청 학과가 개설되지 않았을때
      await db.collection("community").insertOne({
        department: department,
        volunteer: [verify_access_token.user_id],
        total_count: 1,
      });

      res.json({
        status: "ok",
      });
    } else {
      const check_apply_user = await db
        .collection("community")
        .find({
          volunteer: verify_access_token.user_id,
        })
        .toArray();

      if (check_apply_user.length >= 1) {
        res.json({
          status: "already_applied",
        });
      } else {
        await db.collection("community").updateOne(
          { department: department },
          {
            $push: { volunteer: verify_access_token.user_id },
            $inc: { total_count: 1 },
          }
        );

        res.json({
          status: "ok",
        });
      }
    }
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
