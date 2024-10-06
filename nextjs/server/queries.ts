"server-only";

import { auth } from "@clerk/nextjs/server";
import { db } from "./db";
import { Project, projectsTable } from "./db/schema";
import { eq } from "drizzle-orm";

export function getProjectsForUser(): Promise<Project[]> {
  // Figure out who the user is
  const { userId } = auth();

  // Verify the user exists
  if (!userId) {
    throw new Error("User not found");
  }

  // Fetch projects from database
  const projects = db.query.projectsTable.findMany({
    where: eq(projectsTable.userId, userId),
    orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
  });

  return projects;
}

export async function getProject(projectId: string) {
  // Figure out who the user is
  const { userId } = auth();
  console.log('userId', userId);
  // Verify the user exists
  if (!userId) {
    throw new Error("User not found");
  }
  console.log('projectId', projectId);
  const project = await db.query.projectsTable.findFirst({
    where: (project, { eq, and }) =>
      and(eq(project.id, projectId), eq(project.userId, userId)),
  });
  console.log('project', project);
  return project;
}
