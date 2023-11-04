import { initializeApp } from "firebase/app";

import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getStorage, connectStorageEmulator } from "firebase/storage";

import { emulators } from "../firebase.json";

const firebaseConfig = {
  apiKey: "AIzaSyADqGU1uUnrEwTz3jpWSttZpubXZOse0mk",
  authDomain: "edtech-18363.firebaseapp.com",
  databaseURL: "https://edtech-18363-default-rtdb.firebaseio.com",
  projectId: "edtech-18363",
  storageBucket: "edtech-18363.appspot.com",
  messagingSenderId: "872149031968",
  appId: "1:872149031968:web:df32ba0e10941d0d153045",
  measurementId: "G-GQW3W55LGJ"
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
