"use client";

import { PipelineBoard } from "@/components/admin/pipeline/board";

export default function PipelinePage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-medium">Pipeline</h1>
      <PipelineBoard />
    </div>
  );
}
