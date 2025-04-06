const articleRouter = require("./routes/article");
const mongoose = require("mongoose");
const express = require("express");
const Article = require("./models/Article");
const markdown = require("./markdown");
const methodOverride = require("method-override");
const app = express();

require("dotenv/config");
 // user : rider
// password: kmJQvPJboL2jhNM6

const db_uri = "mongodb+srv://rider:kmJQvPJboL2jhNM6@markdown.kt5b9.mongodb.net/?retryWrites=true&w=majority&appName=Markdown";
// connect database
mongoose.connect(
  process.env.DB_CONN || db_uri
  // { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }
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
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server is listening on port: 3000')
});
