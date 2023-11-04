import "virtual:uno.css";
// import "@unocss/reset/tailwind-compat.css";

import React from "react";
import ReactDOM from "react-dom/client";

import { RouterProvider } from "react-router-dom";
import { router } from "./router";

import {
  DefaultFooter,
  PageContainer,
  ProConfigProvider,
  ProLayout,
  SettingDrawer
} from "@ant-design/pro-components";
import { Button, ConfigProvider, Dropdown } from "antd";

import enUS from "antd/locale/en_US";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ProConfigProvider>
      <ConfigProvider locale={enUS}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </ProConfigProvider>
  </React.StrictMode>
);
