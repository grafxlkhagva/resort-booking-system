# Төслийг шинээр суулгах заавар (Setup Guide)

Энэхүү төслийг өөр компьютер эсвэл шинэ орчинд хуулж ажиллуулах алхамчилсан заавар.

## 1. Шаардлагатай зүйлс (Prerequisites)
- [Node.js](https://nodejs.org/) (v18 буюу түүнээс дээш хувилбар)
- [Git](https://git-scm.com/)

## 2. Төслийг татах (Clone)
Компьютер дээрээ Terminal нээгээд дараах тушаалыг бичнэ:

```bash
git clone https://github.com/grafxlkhagva/resort-booking-system.git
cd resort-booking-system
```

## 3. Сангуудыг суулгах (Install Dependencies)
Төслийн хавтсанд орсны дараа шаардлагатай сангуудыг суулгана:

```bash
npm install
```

## 4. Тохиргооны файл үүсгэх (.env.local)
Төслийн root хавтсанд `.env.local` нэртэй файл үүсгэж, Firebase тохиргоогоо оруулна.
Дор хаяж дараах утгууд байх шаардлагатай:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> **Санамж:** Эдгээр утгуудыг Firebase Console -> Project Settings хэсгээс авна.

## 5. Firebase Тохиргоо (Firebase Console)
Хэрэв та цоо шинэ Firebase төсөл ашиглах гэж байгаа бол дараах зүйлсийг идэвхжүүлээрэй:
1.  **Authentication**: `Email/Password` provider-ийг идэвхжүүлэх.
2.  **Firestore Database**: Database үүсгэх (Start in production mode).
3.  **Storage**: Зураг хадгалахад хэрэгтэй (Start in production mode).

### Анхны Админ үүсгэх
Систем рүү нэвтрээд, Firebase Console дээрээс `users` collection дотор тухайн хэрэглэгчийн document дээр `role: 'admin'` гэсэн талбар нэмж өгснөөр Админ эрхтэй болно.

## 6. Програмыг ажиллуулах (Run)
Хөгжүүлэлтийн горимд ажиллуулах:

```bash
npm run dev
```
Вэб хөтөч дээр [http://localhost:3000](http://localhost:3000) хаягаар орно.

## 7. Production Build (Серверт байршуулах үед)

```bash
npm run build
npm start
```

## 8. GitHub руу `git push` шууд ажиллуулах

`git push` нь нэвтрэлт асуухгүй, аргументгүй ажиллахаар тохируулах: [PUSH_SETUP.md](./PUSH_SETUP.md).

---
**Асуух зүйл гарвал:**
Хэрэв ямар нэгэн алдаа гарвал `.env.local` файл зөв эсэх болон `node_modules` зөв суусан эсэхийг шалгаарай.
