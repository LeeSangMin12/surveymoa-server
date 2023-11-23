import express from "express";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const request = (req, res) => {
  const parse_req = req.body.data;
  console.log(parse_req);

  const su_access_token = req.header("Authorization").replace(/^Bearer\s+/, "");
  console.log(su_access_token, su_access_token);


  res.send("안뇽");


}
export default request;