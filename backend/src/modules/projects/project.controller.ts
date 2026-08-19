import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  projectIdParamSchema,
  projectListQuerySchema,
  createProjectSchema,
  updateProjectSchema,
} from "./project.validation";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjectsStats,
  listProjects,
  updateProject,
} from "./project.service";

export async function listProjectsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = projectListQuerySchema.parse(req.query);
    const result = await listProjects(req.user!, query);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list projects";
    res.status(400).json({ success: false, message });
  }
}

export async function getProjectController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = projectIdParamSchema.parse(req.params);
    const project = await getProjectById(id);
    res.json({
      success: true,
      project,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not get project";
    res.status(404).json({ success: false, message });
  }
}

export async function createProjectController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = createProjectSchema.parse(req.body);
    const project = await createProject(req.user!, input);
    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create project";
    res.status(400).json({ success: false, message });
  }
}

export async function updateProjectController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = projectIdParamSchema.parse(req.params);
    const input = updateProjectSchema.parse(req.body);
    const project = await updateProject(id, input);
    res.json({
      success: true,
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update project";
    res.status(400).json({ success: false, message });
  }
}

export async function deleteProjectController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = projectIdParamSchema.parse(req.params);
    const result = await deleteProject(id);
    res.json({
      success: true,
      message: "Project deleted successfully",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete project";
    res.status(400).json({ success: false, message });
  }
}

export async function getProjectsStatsController(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const stats = await getProjectsStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not get project statistics";
    res.status(500).json({ success: false, message });
  }
}
