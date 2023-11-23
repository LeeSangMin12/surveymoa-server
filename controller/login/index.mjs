// app.get("/accesstoken", (req, res) => {
//   try {
//     const token = req.cookies.access_token;
//     const data = jwt.verify(token, ACCESS_SECRET);
  
//     const userData = userData.filter(item => {
//       return item.email === data.email;
//     })[0];

//     const {password, ...others} = userData;
  
//     res.status(200).json(others);
//   } catch (err) {
//     res.status(500).json(err);
//   }
// });

/**
 * refresh token을 이용해 access token을 갱신
 */
const update_access_token = (req, res) => {
  try {
    const token = req.cookies.access_token;
    const data = jwt.verify(token, ACCESS_SECRET);
  
    const userData = userData.filter(item => {
      return item.email === data.email;
    })[0];

    const {password, ...others} = userData;
  
    res.status(200).json(others);
  } catch (err) {
    res.status(500).json(err);
  }
}

//access token을 갱신
app.get("/refreshtoken", (req, res) => {
  try {
    const token = req.cookies.refresh_token;
    const data = jwt.verify(token, REFRESH_SECRET);

    const userData = userDatabase.filter(item => {
      return item.email === data.email;
    })[0]

    //accesstoken 새로 발급
    const su_access_token = jwt.sign({
      _id: userData._id,
      username: userData.user_name,
      email: userData.email
    }, ACCESS_SECRET, {
      expiresIn: "10m",
      issuer: "SangMin",
    });

    db.collection("login").updateOne(
      { email: email_address },
      { $set: { su_refresh_token: su_refresh_token } }
    );

    res.json({
      su_access_token: su_access_token,
      user_id: user_info._id
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get("/login/success", () => {
  try {
    const token = req.cookies.access_token;
    const data = jwt.verify(token, process.env.ACCESS_SECRET);
    
    const user_data = userDatabase.filter(item => {
      return item.email === data.email;
    })[0];

    res.status(200).json(error)
  } catch (err){
    res.status(500).json(err)
  }
});