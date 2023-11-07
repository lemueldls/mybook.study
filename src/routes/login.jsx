import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { router } from "../router";
import { PageContainer } from "@ant-design/pro-components";
import { Button } from "antd";
import { GoogleOutlined } from "@ant-design/icons";

export default function LoginPage() {
  async function login() {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");

    const { user } = await signInWithPopup(auth, provider);
    if (user) router.navigate("/app");
  }

  return (
    <PageContainer>
      <div className="flex justify-center items-center w-full h-100vh">
        <Button
          type="primary"
          icon={<GoogleOutlined />}
          onClick={login}
          size="large"
        >
          Sign in with Google
        </Button>
      </div>
    </PageContainer>
  );
}
