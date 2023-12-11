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
        recruitment_num,
        min_age,
        max_age,
        gender,
        cost_per_person,
        deadline,
        contact,
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

      await db.collection("examine_research").insertOne({
        user_id: verify_access_token.user_id,
        category,
        title,
        recruitment_num: Number(recruitment_num),
        min_age,
        max_age,
        gender,
        cost_per_person,
        deadline,
        contact,
        form_link,
        desc,
        img_arr: uploaded_file,
        participate_user_arr: [],
        participate_user_count: 0,
        rating_user_arr: [],
        rating_user_count: 0,
        like_user_arr: [],
        like_user_count: 0,
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
        recruitment_num,
        min_age,
        max_age,
        gender,
        cost_per_person,
        deadline,
        contact,
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
            recruitment_num: Number(recruitment_num),
            min_age,
            max_age,
            gender,
            cost_per_person,
            deadline,
            contact,
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
      recruitment_num: research.recruitment_num,
      min_age: research.min_age,
      max_age: research.max_age,
      gender: research.gender,
      cost_per_person: research.cost_per_person,
      deadline: research.deadline,
      contact: research.contact,
      form_link: research.form_link,
      desc: research.desc,
      img_arr: research.img_arr,
      participate_user_arr: research.participate_user_arr,
      participate_user_count: research.participate_user_count,
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
 * 설문조사 리스트 카테고리 별로 가져오기
 */
router.post("/get_research_arr_category", async (req, res) => {
  try {
    const { category, last_research_id } = req.body.data;

    const research_filter =
      last_research_id === ""
        ? {}
        : { _id: { $lt: ObjectId(last_research_id) } };

    const category_research_filter =
      last_research_id === ""
        ? { category: category }
        : { _id: { $lt: ObjectId(last_research_id) }, category: category };

    let research_arr;
    if (category === "전체") {
      research_arr = await db
        .collection("research")
        .find(research_filter)
        .sort({ _id: -1 })
        .limit(10)
        .toArray();
    } else {
      research_arr = await db
        .collection("research")
        .find(category_research_filter)
        .sort({ _id: -1 })
        .limit(10)
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
 * 설문조사 리스트 유저 아이디 별로 가져오기
 */
router.post("/get_research_arr_by_user_id", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const research_arr = await db
      .collection("research")
      .find({
        user_id,
      })
      .sort({ _id: -1 })
      .toArray();

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
 * 설문조사 리스트 설문조사 아이디 별로 가져오기
 */
router.post("/get_research_arr_by_research_id", async (req, res) => {
  try {
    const { participate_research_arr } = req.body.data;

    const now_research_arr = await Promise.all(
      participate_research_arr.map(async (research_id) => {
        return await db.collection("research").findOne({
          _id: ObjectId(research_id),
        });
      })
    );

    res.json({
      status: "ok",
      data: now_research_arr,
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
 * 설문조사 참여
 */
router.post("/participate_research", async (req, res) => {
  try {
    const { research_id, cost_per_person } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user_info = await db
      .collection("login")
      .findOne({ _id: ObjectId(verify_access_token.user_id) });

    //유저가 참여한 설문
    await db.collection("login").updateOne(
      { _id: ObjectId(verify_access_token.user_id) },
      {
        $push: {
          participate_research_arr: research_id,
          accumulated_money_arr: {
            reason: "participate_research",
            research_id: research_id,
            cost_per_person: Number(cost_per_person),
            date: new Date(),
          },
        },
        $inc: {
          participate_research_count: 1,
          accumulated_money: Number(cost_per_person),
        },
      }
    );

    //참여자 수
    await db.collection("research").updateOne(
      { _id: ObjectId(research_id) },
      {
        $push: {
          participate_user_arr: {
            user_id: verify_access_token.user_id,
            user_img: user_info.user_img,
          },
        },
        $inc: { participate_user_count: 1 },
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
 * 평점 등록
 */
router.post("/regi_rating", async (req, res) => {
  try {
    const {
      user_img,
      nickname,
      research_id,
      evaluation_user_id,
      rating_val,
      rating_desc,
    } = req.body.data;

    const user_info = await db.collection("login").findOne({
      _id: ObjectId(evaluation_user_id),
    });

    const now_rating_research = user_info.rating_research;
    const rating_research =
      (now_rating_research * user_info.rating_research_count + rating_val) /
      (user_info.rating_research_count + 1);

    await db.collection("login").updateOne(
      { _id: ObjectId(evaluation_user_id) },
      {
        $set: {
          rating_research: rating_research.toFixed(1),
        },
        $push: {
          rating_research_arr: {
            user_img,
            nickname,
            research_id,
            rating_val,
            rating_desc,
            date: new Date(),
          },
        },
        $inc: { rating_research_count: 1 },
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
 * 평점 등록
 */
router.post("/edit_rating", async (req, res) => {
  try {
    const {
      evaluation_user_id,
      user_img,
      nickname,
      rating_prev_val,
      rating_val,
      rating_desc,
      rating_idx,
    } = req.body.data;

    const user_info = await db.collection("login").findOne({
      _id: ObjectId(evaluation_user_id),
    });

    const now_rating_research = user_info.rating_research;
    const rating_research =
      (now_rating_research * user_info.rating_research_count -
        rating_prev_val +
        rating_val) /
      user_info.rating_research_count;

    await db.collection("login").updateOne(
      { _id: ObjectId(evaluation_user_id) },
      {
        $set: {
          rating_research: rating_research.toFixed(1),
          [`rating_research_arr.${rating_idx}.user_img`]: user_img,
          [`rating_research_arr.${rating_idx}.nickname`]: nickname,
          [`rating_research_arr.${rating_idx}.rating_val`]: rating_val,
          [`rating_research_arr.${rating_idx}.rating_desc`]: rating_desc,
          [`rating_research_arr.${rating_idx}.date`]: new Date(),
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
        $push: { like_research_arr: research_id },
        $inc: { like_research_count: 1 },
      }
    );

    //훗날 좋아요 기반으로 알고리즘으로 순위시스템 넣을수도 있기에 추가(빨리 sql 써야지)
    await db.collection("research").updateOne(
      { _id: ObjectId(research_id) },
      {
        $push: { like_user_arr: verify_access_token.user_id },
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
 * 찜한 조사 리스트 가져오기
 */
router.post("/get_like_research_arr", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const user_info = await db
      .collection("login")
      .findOne({ _id: ObjectId(verify_access_token.user_id) });

    const like_research_arr = user_info.like_research_arr;

    res.json({
      status: "ok",
      data: {
        like_research_arr,
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
        $pull: { like_research_arr: research_id },
        $inc: { like_research_count: -1 },
      }
    );

    //훗날 좋아요 기반으로 알고리즘으로 순위시스템 넣을수도 있기에 추가(빨리 sql 써야지)
    await db.collection("research").updateOne(
      { _id: ObjectId(research_id) },
      {
        $pull: { like_user_arr: verify_access_token.user_id },
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

/**
 * 구글 폼 정보 가져오기
 */
router.post("/get_form_info", async (req, res) => {
  try {
    const form_info = await fetch(
      "https://docs.google.com/forms/u/0/d/e/1FAIpQLSd_c_UHtj5cOMX7u1b9aA9dSg67e2eDxWRGKgy-vXi7kthtdg/formResponse"
    )
      .then((response) => response.text())
      .then((data) => {
        return data;
        // 가져온 문서에 대한 처리 작업을 수행합니다.
      })
      .catch((error) => {
        // 오류 처리
        console.log("문서를 가져오는 중 오류가 발생했습니다.", error);
      });

    res.json({
      status: "ok",
      data: {
        form_info,
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
