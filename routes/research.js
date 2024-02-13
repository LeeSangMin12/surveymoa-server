import express from "express";
import dotenv from "dotenv";

import sql from "../db.js";
import { verify_jwt, s3_file_upload } from "../libs/common.js";

dotenv.config(); //env 파일 가져오기

const router = express.Router();

/**
 * 승인 조사 리스트 조회
 * @param {*} last_research_id
 * @returns research_arr
 */
const get_research_arr = async (category, last_research_id) => {
  const research_arr = await sql`select 
      id,
      category,
      title,
      recruitment_num,
      min_age,
      max_age,
      gender,
      cost_per_person,
      deadline,
      img_arr,
      participant_research_count
    from approval_research
    WHERE ${
      category === "전체"
        ? last_research_id === ""
          ? sql`TRUE`
          : sql`id < ${last_research_id}`
        : last_research_id === ""
        ? sql`category = ${category}`
        : sql`id < ${last_research_id} and category = ${category}`
    }
    ORDER BY id desc
    limit 10`;

  return research_arr;
};

/**
 * 조사 등록
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
        form_link,
        contact,
        research_explanation,
      } = req.body;
      const file_url = req.files;

      const token = req.header("Authorization").replace(/^Bearer\s+/, "");
      const verify_access_token = verify_jwt(token);

      const uploaded_file = file_url.map((val) => ({
        name: Buffer.from(val.originalname, "latin1").toString("utf8"),
        size: val.size,
        uri: val.location,
      }));

      await sql`insert into research
        (
        user_id,
        category,
        title,
        recruitment_num,
        min_age,
        max_age,
        gender,
        cost_per_person,
        deadline,
        form_link,
        contact,
        research_explanation,
        img_arr
        )
      values
        (
          ${verify_access_token.user_id},
          ${category},
          ${title},
          ${Number(recruitment_num)},
          ${min_age},
          ${max_age},
          ${gender},
          ${Number(cost_per_person)},
          ${new Date(deadline)},
          ${form_link},
          ${contact},
          ${research_explanation},
          ${uploaded_file}
        )`;

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
 * 승인 조사 리스트 카테고리별로 가져오기
 */
router.post("/get_research_arr_by_category", async (req, res) => {
  try {
    const {
      category,
      last_research_id, //무한스크롤에 필요
    } = req.body.data;

    const research_arr = await get_research_arr(category, last_research_id);

    res.json({
      status: "ok",
      data: { research_arr },
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
 * 승인 조사 가져오기
 */
router.post("/get_research_obj", async (req, res) => {
  try {
    const { research_id } = req.body.data;

    const sql_research_obj = await sql`select 
      id,
      user_id,
      category,
      title,
      recruitment_num,
      min_age,
      max_age,
      gender,
      cost_per_person,
      deadline,
      form_link,
      research_explanation,
      img_arr,
      participant_research_count
    from approval_research
    where id = ${research_id}`;

    res.json({
      status: "ok",
      data: { research_obj: sql_research_obj[0] },
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
 * 유저가 만든 승인 조사 리스트 가져오기
 */
router.post("/get_make_research_arr", async (req, res) => {
  try {
    const { user_id } = req.body.data;

    const sql_research_arr = await sql`select 
      id,
      category,
      title,
      recruitment_num,
      min_age,
      max_age,
      gender,
      cost_per_person,
      deadline,
      img_arr,
      participant_research_count
    from approval_research
    where user_id = ${user_id}
    ORDER BY id desc`;

    res.json({
      status: "ok",
      data: { make_research_arr: sql_research_arr },
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
 * 승인 조사 리스트 id배열로 가져오기
 */
router.post("/get_research_arr_by_research_id_arr", async (req, res) => {
  try {
    const { research_id_arr } = req.body.data;

    const sql_research_arr = await sql`select 
      id,
      category,
      title,
      recruitment_num,
      min_age,
      max_age,
      gender,
      cost_per_person,
      deadline,
      img_arr,
      participant_research_count
    from approval_research
    where id in ${sql(research_id_arr)}
    ORDER BY id desc`;

    res.json({
      status: "ok",
      data: { research_arr: sql_research_arr },
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
 * 조사 리스트 조회
 */
router.post("/get_research_arr", async (req, res) => {
  const research_arr_sql = await sql`select 
    id,
    category,
    title,
    recruitment_num,
    min_age,
    max_age,
    gender,
    cost_per_person,
    deadline,
    img_arr,
    participant_research_count,
    approval,
    approve_date,
    contact
  from research`;

  res.json({
    status: "ok",
    data: {
      research_arr: research_arr_sql,
    },
  });
});

/**
 * 조사 승인
 */
router.post("/approve", async (req, res) => {
  try {
    const { research_id, approve_date } = req.body.data;

    await sql`update research 
    set approval = ${true},
        approve_date = ${new Date(approve_date)}
    where id = ${research_id}`;

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
 * 조사 승인 취소
 */
router.post("/unapprove", async (req, res) => {
  try {
    const { research_id, approve_date } = req.body.data;

    await sql`update research 
    set approval = ${false},
        approve_date = ${new Date(approve_date)}
    where id = ${research_id}`;

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
