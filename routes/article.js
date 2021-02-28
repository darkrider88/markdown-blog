const Article = require("../models/Article");
const express = require("express");
const marked = require("marked");
const fs = require("fs");
const markdown = require("../markdown");
const createDomPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const router = express.Router();

// this will sanitize the file to prevent XSS
const dompurify = createDomPurify(new JSDOM().window);

router.get("/:id", async (req, res) => {
  try {
    // checking if file exists
    if (!fs.existsSync(`./markdown/${req.params.id}.md`)) {
      return res.status(404).send("<h1>Not found</h1>");
    }

    //getting the title from the file
    // the parseMarkdownDetails() only takes array so converting our file name to array
    const articleInfo = await markdown.parseMarkdownDetails(
      Array(`${req.params.id}.md`)
    );

    //read file convert to array by line breaks and then remove first 4 lines
    let content = fs
      .readFileSync(`./markdown/${req.params.id}.md`, "utf8")
      .split("\n");
    let i = 0;
    while (i < 4) {
      content.shift();
      i++;
    }
    content = content.join("\n"); // joining the array

    // getting all the comments
    const comments = await Article.find({ postId: articleInfo[0].postId });

    res.render("post", {
      content: dompurify.sanitize(marked(content)),
      title: articleInfo[0].title, // articleInfo is array of json hence can't access directly
      postId: articleInfo[0].postId,
      comments: comments,
    });
  } catch (e) {
    res.redirect("/");
  }
});

router.post("/comment", async (req, res) => {
  try {
    const commentToSave = {
      postId: req.body.postId,
      username: req.body.username,
      comment: req.body.comment,
    };

    const com = new Article(commentToSave);
    await com.save();
    res.redirect("back");
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
