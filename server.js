const articleRouter = require("./routes/article");
const mongoose = require("mongoose");
const express = require("express");
const Article = require("./models/Article");
const markdown = require("./markdown");
const methodOverride = require("method-override");
const app = express();

require("dotenv/config");

// connect database
mongoose.connect(
  process.env.DB_CONN,
  { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true },
  () => {
    console.log("Database connected!!");
  }
);

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
// Middlewares
app.use(methodOverride("_method")); // it is used to call methods like Delete or put
app.use(express.urlencoded({ extended: false })); // this will let us use the request body of any post request

// reading markdown files

app.get("/", async (req, res) => {
  const allArticles = markdown.readDir("./markdown/"); // fetching all files

  const articleInfo = await markdown.parseMarkdownDetails(allArticles); // parsing info
  res.render("index", { articles: articleInfo });
});

app.get("/about", (req, res) => {
  res.render("about");
});

// using article router after /articles
app.use("/articles", articleRouter);
app.listen(3000);
