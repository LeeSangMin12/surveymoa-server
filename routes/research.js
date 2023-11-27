import express from "express";
import { default as mongodb } from "mongodb";
import dotenv from "dotenv";

import { verify_jwt, s3_file_upload } from "../libs/common.js";

dotenv.config(); //env 파일 가져오기
const { DB_URL, ENV } = process.env;

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

const sort_assignment = (assignment_list) => {
  const sorted_list = assignment_list
    .map((assignment) => {
      const assignment_d_day = calculate_d_day_assignment(assignment);
      return {
        ...assignment,
        assignment_d_day: assignment_d_day,
      };
    })
    .sort((a, b) => {
      if (a.completion_status === "true") return 1;
      if (b.completion_status === "true") return -1;

      //a와 b 모두 완료 상태가 아닌 경우 d-day 기준으로 정렬. d-day가 작은 것이 앞으로
      return a.assignment_d_day - b.assignment_d_day;
    });

  return sorted_list;
};

const calculate_d_day_assignment = (assignment) => {
  const today = new Date(); //시간차이 구하는 거라 둘 다 서버시간 일 테니, 한국시간 적용 안해줬음.
  const comparison_date = new Date(assignment.registration_date);

  today.setHours(0, 0, 0, 0); //시간 차이 제거
  comparison_date.setHours(0, 0, 0, 0); ////시간 차이 제거

  // 두 날짜의 차이(밀리초 단위)를 구함
  let difference_millie_seconds = comparison_date - today;

  // 밀리초 단위의 차이를 일(day) 단위로 변환
  let difference_in_days = difference_millie_seconds / (1000 * 60 * 60 * 24);

  return difference_in_days;
};

/**
 * 설문 조사 등록
 */
router.post(
  "/regi_research",
  s3_file_upload("research/img").array("img_arr"),
  async (req, res) => {
    try {
      const {
        category,
        title,
        participant_count,
        participant_obj,
        recruitment_num,
        min_age,
        max_age,
        gender,
        deadline,
        form_link,
        desc,
      } = req.body;
      const file_url = req.files;

      const token = req.header("Authorization").replace(/^Bearer\s+/, "");
      const verify_access_token = verify_jwt(token);

      const uploaded_file = file_url.map((val) => ({
        name: Buffer.from(val.originalname, "latin1").toString("utf8"),
        size: val.size,
        uri: val.location,
      }));

      await db.collection("research").insertOne({
        user_id: verify_access_token.user_id,
        category,
        title,
        participant_count,
        participant_obj: JSON.parse(participant_obj),
        recruitment_num,
        min_age,
        max_age,
        gender,
        deadline,
        form_link,
        desc,
        img_arr: uploaded_file,
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
  }
);

/**
 * 설문 조사 수정
 */
router.post(
  "/edit_research",
  s3_file_upload("research/img").array("img_arr"),
  async (req, res) => {
    try {
      const {
        research_id,
        category,
        title,
        participant_count,
        participant_obj,
        recruitment_num,
        min_age,
        max_age,
        gender,
        deadline,
        form_link,
        desc,
      } = req.body;
      const file_url = req.files;

      const token = req.header("Authorization").replace(/^Bearer\s+/, "");
      const verify_access_token = verify_jwt(token);

      const uploaded_file = file_url.map((val) => ({
        name: Buffer.from(val.originalname, "latin1").toString("utf8"),
        size: val.size,
        uri: val.location,
      }));

      await db.collection("research").updateOne(
        {
          _id: ObjectId(research_id),
        },
        {
          $set: {
            user_id: verify_access_token.user_id,
            category,
            title,
            participant_count,
            participant_obj: JSON.parse(participant_obj),
            recruitment_num,
            min_age,
            max_age,
            gender,
            deadline,
            form_link,
            desc,
            img_arr: uploaded_file,
          },
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
  }
);

/**
 * 설문조사 가져오기
 */
router.post("/get_research", async (req, res) => {
  try {
    const { research_id } = req.body.data;

    const research = await db.collection("research").findOne({
      _id: ObjectId(research_id),
    });

    const research_obj = {
      user_id: research.user_id,
      category: research.category,
      title: research.title,
      participant_count: research.participant_count,
      participant_obj: research.participant_obj,
      recruitment_num: research.recruitment_num,
      min_age: research.min_age,
      max_age: research.max_age,
      gender: research.gender,
      deadline: research.deadline,
      form_link: research.form_link,
      desc: research.desc,
      img_arr: research.img_arr,
    };

    res.json({
      status: "ok",
      data: research_obj,
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
 * 설문조사 리스트 가져오기
 */
router.post("/get_research_arr", async (req, res) => {
  try {
    const { category } = req.body.data;

    let research_arr;
    if (category === "전체") {
      research_arr = await db.collection("research").find().toArray();
    } else {
      research_arr = await db
        .collection("research")
        .find({
          category: category,
        })
        .toArray();
    }

    res.json({
      status: "ok",
      data: research_arr,
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
 * 설문조사 삭제
 */
router.post("/delete_research", async (req, res) => {
  const { research_id } = req.body.data;
  try {
    await db.collection("research").deleteOne({ _id: ObjectId(research_id) });

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

router.post(
  "/edit_assignment",
  s3_file_upload("assignment/add").array("file_list"),
  async (req, res) => {
    try {
      const {
        assignment_id,
        semester_id,
        completion_status,
        registration_date,
        assignment_name,
        professor_name,
        assignment_description,
      } = req.body;
      const file_url = req.files;

      const token = req.header("Authorization").replace(/^Bearer\s+/, "");
      const verify_access_token = verify_jwt(token);

      const uploaded_file = file_url.map((val) => ({
        name: Buffer.from(val.originalname, "latin1").toString("utf8"),
        size: val.size,
        uri: val.location,
      }));

      await db.collection("assignment").updateOne(
        { _id: ObjectId(assignment_id) },
        {
          $set: {
            user_id: verify_access_token.user_id,
            semester_id,
            completion_status,
            registration_date: registration_date,
            assignment_name,
            professor_name,
            assignment_description,
            file_list: uploaded_file,
          },
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
  }
);

router.post("/set_completion_status", async (req, res) => {
  try {
    const { assignment_id, completion_status } = req.body.data;

    await db
      .collection("assignment")
      .updateOne(
        { _id: ObjectId(assignment_id) },
        { $set: { completion_status } }
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

router.post("/delete_assignment", async (req, res) => {
  const { assignment_id } = req.body.data;
  try {
    await db
      .collection("assignment")
      .deleteOne({ _id: ObjectId(assignment_id) });

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

router.post("/search_assignment", async (req, res) => {
  try {
    const { university_grade, university_class } = req.body.data;

    const assignment_list = await db
      .collection("daedong_2023_2_assignment")
      .find({
        $and: [
          { university_grade: university_grade },
          { university_class: university_class },
        ],
      })
      .toArray();

    const sort_assignment_list = sort_assignment(assignment_list).map(
      (val) => ({
        assignment_id: val._id,
        registration_date: val.registration_date,
        assignment_name: val.assignment_name,
        professor_name: val.professor_name,
        assignment_description: val.assignment_description,
        file_list: val.file_list,
        assignment_d_day: val.assignment_d_day,
        classfication: val.classfication,
        is_checked: "false",
      })
    );

    res.json({
      status: "ok",
      data: sort_assignment_list,
    });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.post("/add_assignment_list", async (req, res) => {
  try {
    const { assignment_list, semester_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    for (let i = 0; i < assignment_list.length; i++) {
      await db.collection("assignment").insertOne({
        user_id: verify_access_token.user_id,
        semester_id: semester_id,
        completion_status: "false",
        registration_date: assignment_list[i].registration_date,
        assignment_name: assignment_list[i].assignment_name,
        professor_name: assignment_list[i].professor_name,
        assignment_description: assignment_list[i].assignment_description,
        file_list: [],
      });
    }

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
 * 찜한 조사 리스트 가져오기
 */
router.post("/get_like_research_arr", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user_info = await db
      .collection("login")
      .findOne({ _id: ObjectId(verify_access_token.user_id) });

    const like_research_obj = user_info.like_research_obj || {};

    res.json({
      status: "ok",
      data: {
        like_research_obj,
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
 * 조사 찜 기능
 */
router.post("/like_research", async (req, res) => {
  try {
    const { research_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db.collection("login").updateOne(
      { _id: ObjectId(verify_access_token.user_id) },
      {
        $push: { like_research_obj: research_id },
        $inc: { like_research_count: 1 },
      }
    );

    //훗날 좋아요 기반으로 알고리즘으로 순위시스템 넣을수도 있기에 추가(빨리 sql 써야지)
    await db.collection("research").updateOne(
      { _id: ObjectId(research_id) },
      {
        $push: { like_user_obj: verify_access_token.user_id },
        $inc: { like_user_count: 1 },
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
 * 조사 찜 취소
 */
router.post("/unlike_research", async (req, res) => {
  try {
    const { research_id } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await db.collection("login").updateOne(
      { _id: ObjectId(verify_access_token.user_id) },
      {
        $pull: { like_research_obj: research_id },
        $inc: { like_research_count: -1 },
      }
    );

    //훗날 좋아요 기반으로 알고리즘으로 순위시스템 넣을수도 있기에 추가(빨리 sql 써야지)
    await db.collection("research").updateOne(
      { _id: ObjectId(research_id) },
      {
        $pull: { like_user_obj: verify_access_token.user_id },
        $inc: { like_user_count: -1 },
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

export default router;
