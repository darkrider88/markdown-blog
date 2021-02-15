const Article = require("../models/Article");

const express = require("express");
const router = express.Router();

router.get("/new", (req, res) => {
  res.render("articles/new", { article: new Article() });
});

router.get("/edit/:id", async (req, res) => {
  const article = await Article.findById(req.params.id);
  res.render("articles/edit", { article: article });
});

// to get the article
router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (article == null) res.redirect("/"); //if no article is present
    res.render("articles/show", { article: article });
  } catch (e) {
    console.log(e);
  }
});

// to save the article
router.post(
  "/",
  (req, res, next) => {
    req.article = new Article();
    next(); // to go to the next function
  },
  saveAndRedirectArticle("new")
);

router.put(
  "/:id",
  async (req, res, next) => {
    req.article = await Article.findById(req.params.id);
    next(); // to go to the next function
  },
  saveAndRedirectArticle("edit")
);

function saveAndRedirectArticle(path) {
  return async (req, res) => {
    let articleToSave = req.article;
    articleToSave.title = req.body.title;
    articleToSave.description = req.body.description;
    articleToSave.markdown = req.body.markdown;

    try {
      articleToSave = await articleToSave.save();
      res.redirect(`/articles/${articleToSave.id}`);
    } catch (e) {
      res.render(`articles/${path}`, { article: articleToSave }); //if error this will bring back to new article with the vaulues you entered
    }
  };
}

router.delete("/:id", async (req, res) => {
  await Article.findByIdAndDelete(req.params.id);
  res.redirect("/");
});
module.exports = router;
