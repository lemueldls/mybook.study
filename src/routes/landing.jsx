import { useState } from "react";
import {
  DefaultFooter,
  PageContainer,
  ProLayout,
  SettingDrawer
} from "@ant-design/pro-components";
import { Button, Typography, Card } from "antd";
import { Link } from "react-router-dom";
import {
  LoginOutlined,
  LogoutOutlined,
  SmileTwoTone,
  RocketTwoTone
} from "@ant-design/icons";

export default function LandingPage() {
  const [settings, setSettings] = useState({
    fixSiderbar: true,
    layout: "top",
    splitMenus: false,
    navTheme: "light",
    contentWidth: "Fixed",
    colorPrimary: "#1890ff",
    siderMenuType: "group",
    fixedHeader: false
  });

  function footerRender() {
    return <DefaultFooter copyright="Dream Team 2023" />;
  }

  function heroRender() {
    return (
      <div className="flex-col h-screen w-full">
        <div className="flex-col flex-justify-around w-full">
          <div className="flex p-16 gap-4 justify-center">
            <div className="flex flex-col p-12">
              <span className="text-6xl font-bold">MyBook</span>
              <span className="text-3xl pt-1.875rem line-height: 2.6rem">
                Artificial Intelligence <br /> textbook learning assistant
              </span>
            </div>

            <div className="flex w-300px h-300px items-center justify-center">
              <img src="/heroBook.png" className="w-full h-auto" />
            </div>
          </div>
          <div className="flex-col justify-center mt-2rem">
            <span className="flex text-4xl justify-center pb-2rem opacity-75%">
              Supercharge Your Learning with AI
            </span>
            <div className="flex justify-center gap-4rem">
              <div className="w-250px">
                <p className="text-1.25rem text-center opacity-75%">
                  Embrace an AI-facilitated, personalized learning expedition.
                </p>
              </div>
              <div className="w-250px">
                <p className="text-1.25rem text-center opacity-75%">
                  Utilized active recall to improve retention
                </p>
              </div>
              <div className="w-250px">
                <p className="text-1.25rem text-center opacity-75%">
                  Harness the time-saving potential of AI-generated flashcards.
                </p>
              </div>
            </div>
          </div>
          {/* <div className="flex w-50% items-center flex-justify-center"></div> */}
        </div>
      </div>
    );
  }

  return (
    <ProLayout
      title="MyBook"
      logo={<SmileTwoTone twoToneColor={settings.colorPrimary} />}
      actionsRender={() => [
        <Link to="/app">
          <Button type="primary" icon={<LoginOutlined />}>
            Sign in
          </Button>
        </Link>
      ]}
      footerRender={footerRender}
      {...settings}
    >
      <div className="flex p-0 w-full justify-center">{heroRender()}</div>
    </ProLayout>
  );
}
