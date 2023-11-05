import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { router } from "../router";
import { PageContainer } from "@ant-design/pro-components";
import { Button } from "antd";

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
      <Button onClick={login}>Login</Button>
    </PageContainer>
  );
}
