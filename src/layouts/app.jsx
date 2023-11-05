import { useEffect, useState } from "react";
import { Outlet, redirect } from "react-router-dom";

import { auth } from "../firebase";
import { signInAnonymously } from "firebase/auth";
import { useAuthStatus } from "../hooks/auth";

import { notification, Button, Spin, Dropdown } from "antd";
import {
  DefaultFooter,
  PageContainer,
  ProLayout,
  SettingDrawer
} from "@ant-design/pro-components";
import { LoginOutlined, LogoutOutlined, SmileTwoTone } from "@ant-design/icons";

import { router, appRoutes } from "../router";

export default function AppLayout() {
  const { checkingStatus, loggedIn } = useAuthStatus();

  const [notificationApi, contextHolder] = notification.useNotification();

  const [settings, setSetting] = useState({
    fixSiderbar: true,
    layout: "side",
    splitMenus: false,
    navTheme: "light",
    contentWidth: "Fluid",
    colorPrimary: "#13C2C2",
    siderMenuType: "group",
    fixedHeader: false
  });
  const [pathname, setPathname] = useState(location.pathname);

  const [avatarProps, setAvatarProps] = useState();

  const [user, setUser] = useState(auth.currentUser);
  useEffect(() => auth.onAuthStateChanged(setUser), []);

  useEffect(() => {
    if (!checkingStatus && !loggedIn) router.navigate("/login");
  }, [loggedIn, checkingStatus, notificationApi]);

  useEffect(() => void router.navigate(pathname), [pathname]);
  router.subscribe(({ pathname }) => setPathname(pathname));

  useEffect(() => {
    if (!user) return;

    setAvatarProps({
      src: user.photoURL,
      title: user.displayName,
      render: (_props, avatar) => {
        return auth.currentUser ? (
          <Dropdown
            menu={{
              items: [
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "Logout",
                  onClick: () => auth.signOut()
                }
              ]
            }}
          >
            {avatar}
          </Dropdown>
        ) : (
          <Button onClick={signInAnonymously(auth)}>Login</Button>
        );
      }
    });
  }, [user]);

  function actionsRender({ collapsed, isMobile }) {
    return user
      ? []
      : [
          <Button
            key="login"
            type="primary"
            title="Login"
            icon={<LoginOutlined />}
            onClick={() => signInAnonymously(auth)}
          >
            {(collapsed && !isMobile) || "Login"}
          </Button>
        ];
  }

  function menuItemRender(item, dom) {
    return <div onClick={() => setPathname(item.path || "/")}>{dom}</div>;
  }

  function footerRender() {
    return <DefaultFooter copyright="Dream Team" />;
  }

  return (
    <ProLayout
      title="mybook.study"
      logo={<SmileTwoTone twoToneColor={settings.colorPrimary} />}
      route={{ routes: appRoutes.filter((route) => route.icon) }}
      location={{ pathname }}
      avatarProps={avatarProps}
      actionsRender={actionsRender}
      menuItemRender={menuItemRender}
      footerRender={footerRender}
      {...settings}
    >
      <PageContainer
        className="h-screen"
        title={appRoutes.find((route) => route.path === pathname)?.name}
      >
        {contextHolder}
        {checkingStatus ? <Spin /> : loggedIn ? <Outlet /> : <></>}
      </PageContainer>

      <SettingDrawer
        enableDarkTheme
        settings={settings}
        onSettingChange={setSetting}
        getContainer={(e) => document.querySelector("#root") || e}
      />
    </ProLayout>
  );
}
