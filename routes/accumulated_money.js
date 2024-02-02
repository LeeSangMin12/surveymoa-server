import express from "express";

import sql from "../db.js";
import { verify_jwt } from "../libs/common.js";

const router = express.Router();

/**
 * 돈 적립
 */
router.post("/accumulate", async (req, res) => {
  try {
    const { research_id, cost_per_person, submission_date } = req.body.data;

    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    await sql`insert into accumulated_money
      (user_id,
      research_id,
      cost_per_person,
      submission_date)
    values
      (${verify_access_token.user_id},
        ${research_id},
        ${cost_per_person},
        ${new Date(submission_date)})`;

    await sql`update users
      set accumulated_money = accumulated_money 
      ${
        cost_per_person > 0
          ? sql`+ ${cost_per_person}`
          : sql`- ${cost_per_person}`
      }
      where id = ${verify_access_token.user_id}`;

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
 * 적립금 조회
 */
router.post("/get_accumulated_money_arr", async (req, res) => {
  try {
    const token = req.header("Authorization").replace(/^Bearer\s+/, "");
    const verify_access_token = verify_jwt(token);

    const sql_accumulated_money_arr = await sql`select 
      accumulated_money.id, 
      accumulated_money.cost_per_person, 
      accumulated_money.submission_date,
      research.title
    from accumulated_money
    left join research
      on accumulated_money.research_id = research.id 
    where accumulated_money.user_id = ${verify_access_token.user_id}
    ORDER BY accumulated_money.id desc`;

    res.json({
      status: "ok",
      data: {
        accumulated_money_arr: sql_accumulated_money_arr,
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
