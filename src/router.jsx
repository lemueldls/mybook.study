import { BookFilled, HomeFilled } from "@ant-design/icons";

import { createBrowserRouter } from "react-router-dom";

import AppLayout from "./layouts/app";

import HomePage from "./routes/home";
import TextbooksPage from "./routes/textbooks";

import LandingPage from "./routes/landing";

export const appRoutes = [
  {
    path: "/app",
    name: "Home",
    icon: <HomeFilled />,
    element: <HomePage />
  },
  {
    path: "/app/textbooks",
    name: "Textbooks",
    icon: <BookFilled />,
    element: <TextbooksPage />
  }
];

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/app", element: <AppLayout />, children: appRoutes }
]);
