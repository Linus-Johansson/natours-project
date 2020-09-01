//staring file
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const app = require("./app");
const DB = process.env.DATABASE;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB Connection successful!"));
// 1) START SERVER
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listens on port ${port}`);
});
