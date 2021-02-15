const mongoose = require("mongoose");
const createDomPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const marked = require("marked");

// this will sanitize the user input to prevent XSS
const dompurify = createDomPurify(new JSDOM().window);

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  markdown: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  sanitizedHtml: {
    type: String,
    required: true,
  },
});

// this will run before it save in the database
articleSchema.pre("validate", function (next) {
  if (this.markdown) {
    this.sanitizedHtml = dompurify.sanitize(marked(this.markdown));
  }

  next();
});

module.exports = mongoose.model("Article", articleSchema);
