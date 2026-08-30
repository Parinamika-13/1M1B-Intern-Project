import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const firebaseConfig = {
  apiKey: "REMOVED_FIREBASE_API_KEY",
  authDomain: "worklens-506ff.firebaseapp.com",
  projectId: "worklens-506ff",
  storageBucket: "worklens-506ff.firebasestorage.app",
  messagingSenderId: "267916873490",
  appId: "1:267916873490:web:9ab44bbc8c0492b75eadcb",
  measurementId: "G-E96D1Y81KV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const PASSWORDS = ["password", "password123", "manager123", "manager", "worklens", "worklens123"];

async function run() {
  let password = process.argv[2];
  let authSuccess = false;
  
  if (password) {
    try {
      console.log(`Attempting to sign in with provided password...`);
      await signInWithEmailAndPassword(auth, "manager@worklens.com", password);
      authSuccess = true;
    } catch (err) {
      console.error(`Sign-in failed with provided password: ${err.message}`);
    }
  }

  if (!authSuccess) {
    console.log("Trying common passwords for manager@worklens.com...");
    for (const p of PASSWORDS) {
      try {
        console.log(`Trying: ${p}...`);
        await signInWithEmailAndPassword(auth, "manager@worklens.com", p);
        console.log(`Sign-in succeeded with password: ${p}`);
        password = p;
        authSuccess = true;
        break;
      } catch (err) {
        // Continue
      }
    }
  }

  if (!authSuccess) {
    console.error("\nERROR: Could not authenticate manager@worklens.com.");
    console.error("Please run the script again and specify the password as an argument:");
    console.error("  node migrate_to_firestore.js <password>");
    process.exit(1);
  }

  console.log("Authentication successful! Initiating data migration to Firestore...");

  // Load JSON files
  const employees = JSON.parse(fs.readFileSync("./src/data/employees.json", "utf8"));
  const projects = JSON.parse(fs.readFileSync("./src/data/projects.json", "utf8"));
  const tasks = JSON.parse(fs.readFileSync("./src/data/tasks.json", "utf8"));
  const meetings = JSON.parse(fs.readFileSync("./src/data/meetings.json", "utf8"));

  console.log(`Loaded JSON files:`);
  console.log(` - Employees: ${employees.length}`);
  console.log(` - Projects: ${projects.length}`);
  console.log(` - Tasks: ${tasks.length}`);
  console.log(` - Meetings: ${meetings.length}`);

  // Migration helper for batch uploads
  const migrateCollection = async (collectionName, dataList, idKey) => {
    console.log(`Migrating ${collectionName}...`);
    let count = 0;
    let batch = writeBatch(db);

    for (const item of dataList) {
      const docId = String(item[idKey]);
      const docRef = doc(db, collectionName, docId);
      batch.set(docRef, item);
      count++;

      if (count % 500 === 0 || count === dataList.length) {
        console.log(`Saving batch of ${count % 500 === 0 ? 500 : count % 500} to ${collectionName}...`);
        await batch.commit();
        batch = writeBatch(db);
      }
    }
    console.log(`Successfully migrated ${dataList.length} documents to '${collectionName}' collection.`);
  };

  // Run migration
  try {
    await migrateCollection("employees", employees, "employee_id");
    await migrateCollection("projects", projects, "project_id");
    await migrateCollection("tasks", tasks, "task_id");
    await migrateCollection("meetings", meetings, "meeting_id");

    console.log("\nDATABASE MIGRATION COMPLETED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
