import express from "express";

import sql from "../db.js";
import { verify_jwt } from "../libs/common.js";

const router = express.Router();

/**
 * 설문조사 참여
 */
router.post("/participate", async (req, res) => {
  try {
    const { research_id, submission_date } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`insert into participant_research 
        (user_id, research_id, submission_date)
      values
        (
        ${verify_access_token.user_id}, 
        ${research_id}, 
        ${new Date(submission_date)}
        )`;

    await sql`update research
    set participant_research_count = participant_research_count + 1
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
 * 참여 설문 조회
 */
router.post("/get_participant_research_arr", async (req, res) => {
  try {
    const { user_id, research_id } = req.body.data;

    const sql_participant_research = await sql`select 
      participant_research.user_id, 
      participant_research.research_id, 
      users.user_img
    from participant_research
    left join users
    on participant_research.user_id = users.id 
    where 
       ${
         user_id === ""
           ? sql`TRUE`
           : sql`participant_research.user_id = ${user_id}`
       } 
      and 
      ${
        research_id === ""
          ? sql`TRUE`
          : sql`participant_research.research_id = ${research_id}`
      }`;

    res.json({
      status: "ok",
      data: {
        participant_research_arr: sql_participant_research,
      },
    });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "유저 데이터를 불러오지 못했습니다.",
    });
  }
});

/**
 * 참여 유저 조회
 */
router.post("/get_participant_user_arr", async (req, res) => {
  try {
    const { research_id } = req.body.data;

    const sql_participant_user_arr = await sql`select 
      users.id,
      users.nickname,
      users.gender,
      users.year_of_birth,
      users.self_introduction,
      users.user_img,
      users.rating_research,
      CASE WHEN count(user_hashtag.hashtag) > 0 
        THEN array_agg(json_build_object('id', user_hashtag.id, 'hashtag', user_hashtag.hashtag) ) 
        ELSE ARRAY[]::json[] 
        END as hashtag_arr
    from participant_research
    left join users
      on participant_research.user_id = users.id 
    left join user_hashtag 
      on users.id = user_hashtag.user_id  
    where participant_research.research_id = ${research_id}
    group by users.id`;

    res.json({
      status: "ok",
      data: {
        participant_user_arr: sql_participant_user_arr,
      },
    });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({
      status: "error",
      message: "유저 데이터를 불러오지 못했습니다.",
    });
  }
});

export default router;
