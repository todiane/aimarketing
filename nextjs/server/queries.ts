"server-only";

import { auth } from "@clerk/nextjs/server";
import { db } from "./db";
import {
  Project,
  projectsTable,
  Template,
  templatesTable,
  subscriptionsTable,
} from "./db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import stripe from "@/lib/stripe";

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

  // Verify the user exists
  if (!userId) {
    throw new Error("User not found");
  }

  const project = await db.query.projectsTable.findFirst({
    where: (project, { eq, and }) =>
      and(eq(project.id, projectId), eq(project.userId, userId)),
  });

  return project;
}

export async function getTemplatesForUser(): Promise<Template[]> {
  // Figure out who the user is
  const { userId } = auth();

  // Verify the user exists
  if (!userId) {
    throw new Error("User not found");
  }

  // Fetch templates from database
  const projects = await db.query.templatesTable.findMany({
    where: eq(templatesTable.userId, userId),
    orderBy: (templates, { desc }) => [desc(templates.updatedAt)],
  });

  return projects;
}

export async function getTemplate(id: string): Promise<Template | undefined> {
  // Figure out who the user is
  const { userId } = auth();

  // Verify the user exists
  if (!userId) {
    throw new Error("User not found");
  }

  const template = await db.query.templatesTable.findFirst({
    where: (template, { eq, and }) =>
      and(eq(template.id, id), eq(template.userId, userId)),
  });

  return template;
}

export async function getUserSubscription(): Promise<Stripe.Subscription | null> {
  const { userId } = auth();
  if (!userId) {
    throw new Error("User not found");
  }

  try {
    const subscription = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, userId),
    });

    if (!subscription) {
      console.log("No stripe subscription found for user", userId);
      return null;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    return stripeSubscription;
  } catch (error) {
    // If the subscription doesn't exist or there's an error, log it and return null
    if (
      error instanceof Stripe.errors.StripeError &&
      error.code === "resource_missing"
    ) {
      console.log("Subscription not found in Stripe.");
      return null;
    }

    console.error("Error fetching subscription from Stripe:", error);
    throw new Error("Failed to retrieve subscription details.");
  }
}
