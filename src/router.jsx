import { BookFilled, HomeFilled } from "@ant-design/icons";

import { createBrowserRouter } from "react-router-dom";

import LandingPage from "./routes/landing";
import LoginPage from "./routes/login";

import AppLayout from "./layouts/app";
import HomePage from "./routes/home";
import TextbooksPage from "./routes/textbooks";

export const appRoutes = [
  {
    path: "/app",
    name: "Home",
    icon: <HomeFilled />,
    element: <HomePage />,
  },
  {
    path: "/app/textbooks",
    name: "Textbooks",
    icon: <BookFilled />,
    element: <TextbooksPage />,
  },
];

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/app", element: <AppLayout />, children: appRoutes },
]);
