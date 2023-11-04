import { useEffect, useState } from "react";

import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export function useAuthStatus() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setLoggedIn(!!user);
        setCheckingStatus(false);
      }),
    []
  );

  return { loggedIn, checkingStatus };
}
