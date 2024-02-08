import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config(); //env 파일 가져오기
const { DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD } = process.env;

const sql = postgres({
  host: DB_HOST, // Postgres ip address[s] or domain name[s]
  port: DB_PORT, // Postgres server port[s]
  database: DB_DATABASE, // Name of database to connect to
  username: DB_USERNAME, // Username of database user
  password: DB_PASSWORD, // Password of database user
});

export default sql;
