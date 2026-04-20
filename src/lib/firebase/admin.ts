import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Firebase Admin SDK 초기화 (서버 사이드 전용)
function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // 1순위: FIREBASE_SERVICE_ACCOUNT_JSON 환경변수 (JSON 문자열)
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (envJson) {
    return initializeApp({
      credential: cert(JSON.parse(envJson)),
      projectId,
    });
  }

  // 2순위: 프로젝트 루트의 service-account.json 파일
  const keyPath = join(process.cwd(), "service-account.json");
  if (existsSync(keyPath)) {
    const key = JSON.parse(readFileSync(keyPath, "utf-8"));
    return initializeApp({
      credential: cert(key),
      projectId,
    });
  }

  throw new Error(
    "Firebase Admin 인증 실패: service-account.json 파일이 필요합니다.\n" +
    "Firebase Console > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성 후\n" +
    "프로젝트 루트에 service-account.json 으로 저장하세요."
  );
}

const app = initAdmin();
export const adminDb = getFirestore(app);
