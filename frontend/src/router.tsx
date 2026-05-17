import { createBrowserRouter, Navigate, redirect } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import OAuthCallback from "@/pages/auth/OAuthCallback";
import ForbiddenPage from "@/pages/auth/Forbidden";
import Dashboard from "@/pages/dashboard";
import ModelsPage from "@/pages/models";
import TasksPage from "@/pages/tasks";
import CreateTask from "@/pages/tasks/CreateTask";
import ResultDetail from "@/pages/results/ResultDetail";
import CompareResults from "@/pages/results/CompareResults";
import DatasetsPage from "@/pages/datasets";
import AdminPage from "@/pages/admin";
import MyTeamPage from "@/pages/team";
import { apiClient } from "@/api/client";
import { isLandingPageEnabled } from "@/runtime-config";

function LandingIndex() {
  return isLandingPageEnabled() ? <Landing /> : <Navigate to="/login" replace />;
}

function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    return redirect("/login");
  }
  return null;
}

async function taskOrResultLoader({ params, request }: LoaderFunctionArgs) {
  const id = params.id;
  const isTaskRoute = request.url.includes("/tasks/");
  
  if (!id) {
    return { result: null, stats: null, task: null, samplesPage: null, isTask: isTaskRoute };
  }

  try {
    let resultId = id;
    let taskData = null;

    if (isTaskRoute) {
      const taskRes = await apiClient.get(`/tasks/${id}`);
      taskData = taskRes.data;
      
      const isCompleted = taskData.status === "completed";
      const hasResults = isCompleted;

      if (hasResults) {
        const resultsRes = await apiClient.get(`/results/task/${id}`);
        if (resultsRes.data && resultsRes.data.length > 0) {
          resultId = resultsRes.data[0].id;
        } else {
          return { result: null, stats: null, task: taskData, samplesPage: null, isTask: true };
        }
      } else {
        return { result: null, stats: null, task: taskData, samplesPage: null, isTask: true };
      }
    }

    const resultRes = await apiClient.get(`/results/${resultId}`);

    if (!taskData) {
      const taskRes = await apiClient.get(`/tasks/${resultRes.data.task_id}`);
      taskData = taskRes.data;
    }

    return {
      result: resultRes.data,
      stats: null,
      task: taskData,
      samplesPage: null,
      isTask: isTaskRoute
    };
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      return redirect("/login");
    }
    throw err;
  }
}

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      {
        index: true,
        element: <LandingIndex />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "login/oauth2/callback",
        element: <OAuthCallback />,
      },
      {
        path: "forbidden",
        element: <ForbiddenPage />,
      },
      {
        element: <MainLayout />,
        loader: requireAuth,
        children: [
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "models",
            element: <ModelsPage />,
          },
          {
            path: "datasets",
            element: <DatasetsPage />,
          },
          {
            path: "tasks",
            element: <TasksPage />,
          },
          {
            path: "tasks/create",
            element: <CreateTask />,
          },
          {
            path: "tasks/:id",
            element: <ResultDetail />,
            loader: taskOrResultLoader,
          },
          {
            path: "results/compare",
            element: <CompareResults />,
          },
          {
            path: "results/:id",
            element: <ResultDetail />,
            loader: taskOrResultLoader,
          },
          {
            path: "admin",
            element: <AdminPage />,
          },
          {
            path: "team",
            element: <MyTeamPage />,
          },
        ],
      },
    ],
  },
]);
