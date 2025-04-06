const fs = require("fs");
const readline = require("readline");
const CryptoJs = require("crypto-js");

function parseInfo(all3lines) {
  const regFilename = new RegExp(/(.+\.md)$/g);
  const regTitle = new RegExp(/^(Title|title)/g);
  const regDate = new RegExp(/^(Date|date)/g);
  const regDesc = new RegExp(/^(Description|description)/g);
  const regImg = new RegExp(/^(Image|image)/g);
  const regLevel = new RegExp(/^(Level|level)/g);
  const allInfo = {};
  
  for (const line of all3lines) {
    if (regFilename.test(line)) {
      const id = CryptoJs.MD5(line).toString();
      allInfo["postId"] = id;
      allInfo["filename"] = line.replace(/(\.md)$/g, "");
    }
    if (regTitle.test(line)) {
      const titleStr = line.replace(/^(Title:\s|title:\s)/g, "");
      allInfo["title"] = titleStr;
    }
    if (regDate.test(line)) {
      const dateStr = line.replace(/^(Date:\s|date:\s)/g, "");
      allInfo["date"] = dateStr;
    }
    if (regDesc.test(line)) {
      const descStr = line.replace(/^(Description:\s|description:\s)/g, "");
      allInfo["desc"] = descStr;
    }
    if (regImg.test(line)) {
      allInfo["img"] = line.replace(/^(Image:\s|image:\s)/g, "");
    }
    if (regLevel.test(line)) {
      const titleStr = line.replace(/^(Level:\s|level:\s)/g, "");
      allInfo["level"] = titleStr;
    }
  }
  return allInfo;
}

const markdown = {
  // reads all the files in a directory and returns a list
  readDir(dir) {
    try {
      let files = fs.readdirSync(dir);
      return files;
    } catch (e) {
      console.error("Error reading directory:", e);
    }
  },

  // parse the title,date,description from array of files
  async parseMarkdownDetails(files) {
    const allArticlesInfo = [];
    
    for (let file of files) {
      const fileStream = fs.createReadStream(`./markdown/${file}`);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let i = 1;
      const all3lines = [];
      all3lines.push(file);
      
      for await (const line of rl) {
        if (i === 6) break;
        all3lines.push(line);
        i++;
      }
      
      allArticlesInfo.push(parseInfo(all3lines));
    }

    return allArticlesInfo;
  },
};

module.exports = markdown;
