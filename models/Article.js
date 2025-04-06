const mongoose = require("mongoose");
const createDomPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const marked = require("marked");
// this will sanitize the user input to prevent XSS
const dompurify = createDomPurify(new JSDOM().window);

const articleSchema = new mongoose.Schema({
  postId: {
    required: true,
    type: String,
  },
  username: {
    required: true,
    type: String,
  },
  content: {
    required: true,
    type: String
  },
  comment: {
    required: true,
    type: String,
  },
});

// this will run before it save in the database
articleSchema.pre("validate", function (next) {
  if (this.username && this.comment) {
    this.comment = dompurify.sanitize(this.comment);
    this.username = dompurify.sanitize(this.username);
  }

  next();
});

module.exports = mongoose.model("Article", articleSchema);
