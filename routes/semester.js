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
 * 학기를 비교해서 정렬해준다.
 */
const compare_semester = (a, b) => {
  const a_year = parseInt(a.semester.split(" ")[0].replace("년", ""));
  const a_semester = a.semester.split(" ")[1];

  const b_year = parseInt(b.semester.split(" ")[0].replace("년", ""));
  const b_semester = b.semester.split(" ")[1];

  const order = ["1학기", "여름학기", "2학기", "겨울학기"];

  if (a_year !== b_year) {
    return b_year - a_year;
  } else {
    return order.indexOf(a_semester) - order.indexOf(b_semester);
  }
};

/**
 * 학기 리스트 조회
 */
router.post("/get_semester_list", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const semesters = await db
      .collection("semester")
      .find({
        user_id: verify_access_token.user_id,
      })
      .toArray();

    const semester_list = semesters
      .map((semester) => ({
        semester_id: semester._id,
        semester_name: semester.semester_name,
        semester: semester.semester,
        default_semester: semester.default_semester,
      }))
      .sort(compare_semester);

    if (semester_list) {
      res.json({
        status: "ok",
        data: {
          semester_list,
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
 * 기본 캘린더 설정
 * : 1.모든 캘린더 default_semester false로 변경
 * : 2.내가 선택한 캘린더 default semester만 true로 변경
 */
router.post("/set_default_semester", async (req, res) => {
  try {
    const { default_semester_id } = req.body.data;
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");

    const verify_access_token = verify_jwt(token);

    await db.collection("semester").updateMany(
      {
        user_id: verify_access_token.user_id,
      },
      { $set: { default_semester: "false" } }
    );

    await db.collection("semester").updateOne(
      { _id: ObjectId(default_semester_id) },
      {
        $set: { default_semester: "true" },
      }
    );

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

/**
 * 캘린더 추가
 */
router.post("/add_semester", async (req, res) => {
  try {
    const { semester_name, semester, default_semester } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const new_semester = await db.collection("semester").insertOne({
      user_id: verify_access_token.user_id,
      semester_name: semester_name,
      semester: semester,
      default_semester: default_semester,
    });

    if (new_semester) {
      res.json({
        status: "ok",
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
 * 캘린더 삭제
 */
router.post("/delete_semester", async (req, res) => {
  try {
    const { semester_id } = req.body.data;

    const delete_semester = await db.collection("semester").deleteOne({
      _id: ObjectId(semester_id),
    });

    if (delete_semester) {
      res.json({
        status: "ok",
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

export default router;
