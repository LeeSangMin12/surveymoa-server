import express from "express";

import sql from "../db.js";

const router = express.Router();

/**
 * 평점 등록
 */
router.post("/registry", async (req, res) => {
  try {
    const {
      user_id,
      rated_user_id,
      research_id,
      rating_val,
      rating_desc,
      submission_date,
    } = req.body.data;

    await sql`insert into rating_research
      (user_id, research_id, rating_val, rating_desc, submission_date, rated_user_id)
    values
      (
        ${user_id},
        ${research_id},
        ${rating_val},
        ${rating_desc},
        ${new Date(submission_date)},
        ${rated_user_id}
      )`;

    const rating_user_sql = await sql`select
          rating_research,
          rating_research_count 
        from users
        where id = ${rated_user_id}`;

    const now_rating_research = rating_user_sql[0].rating_research;
    const rating_research_count = rating_user_sql[0].rating_research_count;
    const calculate_rating_research =
      (now_rating_research * rating_research_count + rating_val) /
      (rating_research_count + 1);

    await sql`update users
    set rating_research = ${calculate_rating_research.toFixed(1)},
        rating_research_count = rating_research_count + 1
    where id = ${rated_user_id}`;

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
 * 유저 평점 조회
 */
router.post("/get_rating_user_arr", async (req, res) => {
  try {
    const { rated_user_id, research_id } = req.body.data;

    const sql_rating_user_arr = await sql`select 
      id,
      user_id, 
      research_id, 
      rating_val, 
      rating_desc, 
      submission_date,
      rated_user_id
    from rating_research
    where 
        ${
          rated_user_id === ""
            ? sql`TRUE`
            : sql`rating_research.rated_user_id = ${rated_user_id}`
        } 
      and 
        ${
          research_id === ""
            ? sql`TRUE`
            : sql`rating_research.research_id = ${research_id}`
        }
      ORDER BY rating_research.id desc
      `;

    res.json({
      status: "ok",
      data: {
        rating_user_arr: sql_rating_user_arr,
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
 * 받은 평점 조회
 */
router.post("/get_rated_user_arr", async (req, res) => {
  try {
    const { rated_user_id } = req.body.data;

    const sql_rated_user_arr = await sql`select 
      rating_research.id,
      rating_research.user_id, 
      rating_research.research_id, 
      rating_research.rating_val, 
      rating_research.rating_desc, 
      rating_research.submission_date,
      rating_research.rated_user_id,
      users.nickname,
      users.user_img 
    from rating_research
    left join users
      on rating_research.user_id = users.id 
    where rating_research.rated_user_id = ${rated_user_id}
    ORDER BY rating_research.id desc`;

    res.json({
      status: "ok",
      data: {
        rated_user_arr: sql_rated_user_arr,
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
 * 평점 수정
 */
router.post("/edit", async (req, res) => {
  try {
    const {
      rating_research_id,
      rated_user_id,
      rating_prev_val,
      rating_val,
      rating_desc,
      submission_date,
    } = req.body.data;

    await sql`update rating_research set
      rating_val=${rating_val},
      rating_desc=${rating_desc},
      submission_date=${new Date(submission_date)}
      where id=${rating_research_id}`;

    const rating_user_sql = await sql`select
          rating_research,
          rating_research_count
        from users
        where id = ${rated_user_id}`;

    const now_rating_research = rating_user_sql[0].rating_research;
    const rating_research_count = rating_user_sql[0].rating_research_count;
    const calculate_rating_research =
      (now_rating_research * rating_research_count -
        rating_prev_val +
        rating_val) /
      rating_research_count;

    await sql`update users
    set rating_research = ${calculate_rating_research.toFixed(1)}
    where id = ${rated_user_id}`;

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
