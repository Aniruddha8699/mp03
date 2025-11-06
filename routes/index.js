/*
 * Connect all of your endpoints together here.
 */
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Task = require("../models/task");

// helper for parsing query strings
function parseQuery(req) {
  const q = {};
  if (req.query.where) q.where = JSON.parse(req.query.where);
  if (req.query.sort) q.sort = JSON.parse(req.query.sort);
  if (req.query.select) q.select = JSON.parse(req.query.select);
  q.skip = req.query.skip ? parseInt(req.query.skip) : 0;
  q.limit = req.query.limit ? parseInt(req.query.limit) : 100;
  q.count = req.query.count === "true";
  return q;
}

/* ---------------- USERS ROUTES ---------------- */

// GET /api/users
router.get("/users", async (req, res) => {
  try {
    const q = parseQuery(req);
    if (q.count) {
      const count = await User.countDocuments(q.where || {});
      return res.status(200).json({ message: "OK", data: count });
    }
    const users = await User.find(q.where || {})
      .sort(q.sort)
      .select(q.select)
      .skip(q.skip)
      .limit(q.limit || 0);
    res.status(200).json({ message: "OK", data: users });
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", data: err });
  }
});

// POST /api/users
router.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email)
      return res.status(400).json({ message: "Name and Email required", data: null });

    const newUser = new User(req.body);
    const saved = await newUser.save();
    res.status(201).json({ message: "User created", data: saved });
  } catch (err) {
    res.status(500).json({ message: "Error creating user", data: err });
  }
});

// GET /api/users/:id
router.get("/users/:id", async (req, res) => {
  try {
    const q = parseQuery(req);
    const user = await User.findById(req.params.id).select(q.select);
    if (!user) return res.status(404).json({ message: "User not found", data: null });
    res.status(200).json({ message: "OK", data: user });
  } catch (err) {
    res.status(500).json({ message: "Error fetching user", data: err });
  }
});

// PUT /api/users/:id
router.put("/users/:id", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email)
      return res.status(400).json({ message: "Name and Email required", data: null });

    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ message: "User not found", data: null });
    res.status(200).json({ message: "User updated", data: user });
  } catch (err) {
    res.status(500).json({ message: "Error updating user", data: err });
  }
});

// DELETE /api/users/:id
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found", data: null });

    await Task.updateMany(
      { assignedUser: req.params.id },
      { assignedUser: "", assignedUserName: "unassigned" }
    );

    res.status(200).json({ message: "User deleted", data: user });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user", data: err });
  }
});

/* ---------------- TASKS ROUTES ---------------- */

// GET /api/tasks
router.get("/tasks", async (req, res) => {
  try {
    const q = parseQuery(req);
    if (q.count) {
      const count = await Task.countDocuments(q.where || {});
      return res.status(200).json({ message: "OK", data: count });
    }
    const tasks = await Task.find(q.where || {})
      .sort(q.sort)
      .select(q.select)
      .skip(q.skip)
      .limit(q.limit);
    res.status(200).json({ message: "OK", data: tasks });
  } catch (err) {
    res.status(500).json({ message: "Error fetching tasks", data: err });
  }
});

// POST /api/tasks
router.post("/tasks", async (req, res) => {
  try {
    const { name, deadline } = req.body;
    if (!name || !deadline)
      return res.status(400).json({ message: "Name and Deadline required", data: null });

    const task = new Task(req.body);
    const saved = await task.save();

    if (task.assignedUser) {
      await User.findByIdAndUpdate(task.assignedUser, { $push: { pendingTasks: saved._id } });
    }

    res.status(201).json({ message: "Task created", data: saved });
  } catch (err) {
    res.status(500).json({ message: "Error creating task", data: err });
  }
});

// GET /api/tasks/:id
router.get("/tasks/:id", async (req, res) => {
  try {
    const q = parseQuery(req);
    const task = await Task.findById(req.params.id).select(q.select);
    if (!task) return res.status(404).json({ message: "Task not found", data: null });
    res.status(200).json({ message: "OK", data: task });
  } catch (err) {
    res.status(500).json({ message: "Error fetching task", data: err });
  }
});

// PUT /api/tasks/:id
router.put("/tasks/:id", async (req, res) => {
  try {
    const { name, deadline } = req.body;
    if (!name || !deadline)
      return res.status(400).json({ message: "Name and Deadline required", data: null });

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Task not found", data: null });

    if (updated.assignedUser) {
      await User.findByIdAndUpdate(updated.assignedUser, { $addToSet: { pendingTasks: updated._id } });
    }

    res.status(200).json({ message: "Task updated", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Error updating task", data: err });
  }
});

// DELETE /api/tasks/:id
router.delete("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found", data: null });

    if (task.assignedUser) {
      await User.findByIdAndUpdate(task.assignedUser, { $pull: { pendingTasks: task._id } });
    }

    res.status(200).json({ message: "Task deleted", data: task });
  } catch (err) {
    res.status(500).json({ message: "Error deleting task", data: err });
  }
});

module.exports = router;
