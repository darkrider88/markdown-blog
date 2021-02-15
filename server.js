const articleRouter = require("./routes/article");
const mongoose = require("mongoose");
const express = require("express");
const Article = require("./models/Article");
const methodOverride = require("method-override");
const app = express();
require("dotenv/config");

// connect database
mongoose.connect(
  process.env.DB_CONN,
  { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true },
  () => {
    console.log("Database connected");
  }
);

app.set("view engine", "ejs");

// Middlewares
app.use(methodOverride("_method")); // it is used to call methods like Delete or put
app.use(express.urlencoded({ extended: false })); // this will let us use the request body of any post request

app.get("/", async (req, res) => {
  const articles = await Article.find({}); // fetching all the articles
  res.render("articles/index", { articles: articles });
});

// using article router after /articles
app.use("/articles", articleRouter);
app.listen(3000);
