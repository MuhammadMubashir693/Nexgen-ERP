import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  createTaskSchema,
  taskIdParamSchema,
  taskListQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "./task.validation";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
  updateTaskStatus,
} from "./task.service";

export async function listTasksController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = taskListQuerySchema.parse(req.query);
    const result = await listTasks(req.user!, query);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list tasks";
    res.status(400).json({ success: false, message });
  }
}

export async function getTaskController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = taskIdParamSchema.parse(req.params);
    const task = await getTaskById(id);
    res.json({
      success: true,
      task,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not get task";
    res.status(404).json({ success: false, message });
  }
}

export async function createTaskController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = createTaskSchema.parse(req.body);
    const task = await createTask(req.user!, input);
    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create task";
    res.status(400).json({ success: false, message });
  }
}

export async function updateTaskController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = taskIdParamSchema.parse(req.params);
    const input = updateTaskSchema.parse(req.body);
    const task = await updateTask(id, input);
    res.json({
      success: true,
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update task";
    res.status(400).json({ success: false, message });
  }
}

export async function updateTaskStatusController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = taskIdParamSchema.parse(req.params);
    const input = updateTaskStatusSchema.parse(req.body);
    const task = await updateTaskStatus(id, input);
    res.json({
      success: true,
      message: "Task status updated successfully",
      task,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update task status";
    res.status(400).json({ success: false, message });
  }
}

export async function deleteTaskController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = taskIdParamSchema.parse(req.params);
    const result = await deleteTask(id);
    res.json({
      success: true,
      message: "Task deleted successfully",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete task";
    res.status(400).json({ success: false, message });
  }
}
