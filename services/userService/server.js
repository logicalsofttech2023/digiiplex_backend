import express from "express";

const app = express();

const userService = {
  getUsers: (req, res) => {
    res.json({ users: [] });
  }
};

app.get("/", (req, res) => {
  res.json({ service: "User Service running" });
});

app.get("/users", userService.getUsers);

app.listen(3002, () => {
  console.log("User Service running on 3002");
});