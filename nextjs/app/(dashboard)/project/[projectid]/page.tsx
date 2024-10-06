import ProjectDetailView from "@/components/project-detail/ProjectDetailView";
import { getProject } from "@/server/queries";
import { notFound } from "next/navigation";
import React from "react";

interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  try {
    console.log('Fetching project with ID:', params.projectId);
    const project = await getProject(params.projectId);
    console.log('Fetched Project:', project);

    if (!project) {
      console.error('Project not found, returning 404');
      return notFound();
    }

    return (
      <div className="p-2 sm:p-4 md:p-6 lg:p-8 mt-2">
        <ProjectDetailView project={project} />
      </div>
    );
  } catch (error) {
    console.error('Error fetching project:', error);
    return notFound();
  }
}
