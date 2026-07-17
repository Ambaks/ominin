"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VOD_POLL_INTERVAL_MS } from "./constants";
import { rowToJob, type ClipperJob } from "./types";

export function usePollJob(jobId: string | null): {
  job: ClipperJob | null;
  loading: boolean;
  error: string | null;
} {
  const [job, setJob] = useState<ClipperJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIdRef = useRef<string | null>(null);

  const fetchJob = useCallback((id: string) => {
    const supabase = createClient();
    supabase
      .from("clipper_jobs")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error: queryError }) => {
        if (activeIdRef.current !== id) return;
        if (queryError) {
          setError(queryError.message);
          return;
        }
        const mapped = rowToJob(data);
        setJob(mapped);
        setError(null);
        if (mapped.status === "termine" || mapped.status === "echec") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      });
  }, []);

  useEffect(() => {
    activeIdRef.current = jobId;

    if (!jobId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    fetchJob(jobId);
    intervalRef.current = setInterval(() => fetchJob(jobId), VOD_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, fetchJob]);

  const loading = jobId != null && job == null && error == null;

  return { job: jobId ? job : null, loading, error };
}
