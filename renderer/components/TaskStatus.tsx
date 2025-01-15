import React from "react";
import { CircleCheck, Loader, Pause, RedoDot } from "lucide-react";

const TaskStatus = ({ file, checkKey, skip = false }) => {
  if (skip) return <RedoDot className="size-4" />;
  if (file[checkKey] === "loading") {
    return <Loader className="animate-spin" />;
  }
  if (file[checkKey] === "done") {
    return <CircleCheck className="size-4" />;
  }
  return <Pause className="size-4" />;
};

export default TaskStatus;
