import { initializeApp } from "firebase/app";

import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getStorage, connectStorageEmulator } from "firebase/storage";

import { emulators } from "../firebase.json";

const firebaseConfig = {
  apiKey: "AIzaSyBfv7fQdHmGDc0tx1u19I3o9_b5SjnBTWU",
  authDomain: "my-book-study.firebaseapp.com",
  databaseURL: "https://my-book-study-default-rtdb.firebaseio.com",
  projectId: "my-book-study",
  storageBucket: "my-book-study.appspot.com",
  messagingSenderId: "37977634356",
  appId: "1:37977634356:web:39cb39b22fecfdb00e7c61"
};

initializeApp(firebaseConfig);

export const auth = getAuth();
export const functions = getFunctions();
export const database = getDatabase();
export const storage = getStorage();

if (import.meta.env.DEV) {
  connectAuthEmulator(
    auth,
    `http://${emulators.auth.host || "127.0.0.1"}:${emulators.auth.port}`,
    { disableWarnings: true }
  );

  connectFunctionsEmulator(
    functions,
    emulators.functions.host || "127.0.01",
    emulators.functions.port || 3003
  );

  connectDatabaseEmulator(
    database,
    emulators.database.host || "127.0.01",
    emulators.database.port || 3004
  );

  connectStorageEmulator(
    storage,
    emulators.storage.host || "127.0.01",
    emulators.storage.port || 3006
  );
}
