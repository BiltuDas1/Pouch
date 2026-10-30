import { Suspense } from "react";
import { modules } from "../utils/loader";
import { useNavigate } from "react-router";

export default function AllModules() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-[repeat(auto-fill,16rem)] gap-4 justify-center">
      {modules.map((module) => (
        <ul
          key={module.name}
          className="h-44 bg-background-secondary rounded-md flex flex-col text-text-primary px-6.25 py-6.25 font-sans gap-1 hover:outline-2 outline-card-hover"
          onClick={() => navigate(`/mod/${module.name}`)}
          title={module.description ?? ""}
        >
          <li>
            <Suspense>
              <module.icon
                height={50}
                width={50}
                color="var(--color-text-secondary)"
              />
            </Suspense>
          </li>
          <li className="font-bold text-lg">{module.title}</li>
          {module.description && (
            <li className="text-sm text-text-secondary line-clamp-2">
              {module.description}
            </li>
          )}
        </ul>
      ))}
    </div>
  );
}
