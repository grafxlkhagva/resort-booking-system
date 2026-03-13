# `git push` шууд ажиллахаар тохируулах

`git push` (эсвэл `git push origin main`) нь нэвтрэлт асуухаагүй, тайлбаргүйгээр ажиллахын тулд доорх алхмуудыг **нэг удаа** хийгээрэй.

---

## 1. `git push` — аргументгүй ажиллах

`main` салбар `origin/main`-тай холбогдсон тул `git push` гэж бичихэд л хангалттай. Хэрэв заримдаа `origin main` гэж бичдэг бол аль алинаар нь ажиллана.

---

## 2. Нэвтрэлт (credential) — нэг удаа оруулаад хадгалах

Одоо **HTTPS** (`https://github.com/...`) ашиглаж байгаа тул push хийх бүрт username/нууц асуудаг. Үүнийг **macOS Keychain**-д хадгалахаар тохируулбал, анхны амжилттай нэвтрэлтийн дараа дахин асуухгүй.

**Terminal нээгээд доорх хоёрыг ажиллуулна:**

```bash
# Нэвтрэлтийг macOS Keychain-д хадгалах
git config --global credential.helper osxkeychain

# push-ийн default (одоогийн салбарыг upstream рүү түлхэх)
git config --global push.default simple
```

---

## 3. Анхны push — Personal Access Token (PAT) ашиглах

GitHub **и-мэйл/нууц үг**-ээр HTTPS push хийхээ больсон. **Personal Access Token** ашиглах ёстой.

### Token үүсгэх

1. **GitHub** → **Settings** (профайл дээрх) → **Developer settings** → **Personal access tokens** → **Tokens (classic)** эсвэл **Fine-grained tokens**
2. **Generate new token**
3. **Note:** `resort-booking-system` (эсвэл дурын нэр)
4. **Expiration:** 90 days эсвэл No expiration
5. **Scopes:** `repo` (бүх эсвэл `public_repo` хангалттай)
6. **Generate** → **Token-ийг нэг удаа хуулж хадгална** (дараа дахин харагдахгүй)

### Анхны push хийх

```bash
cd /Users/lkhagvasurenotgonbayar/Documents/Systems/resort-booking-system
git push
```

- **Username:** `grafxlkhagva` (эсвэл GitHub-ийн username)
- **Password:** Дээрх **Token** (нууц үгийн оронд)

Энэ нэг удаагийн нэвтрэлтийн дараа `credential.helper=osxkeychain` нь түүнийг хадгална, дараагийн `git push`-ууд нэвтрэлт асуухгүй.

---

## 4. (Сонголт) SSH ашиглах — нууц үг/Token огт оруулахгүй

SSH түлх тохируулбал `git push` нь нэвтрэлт асуухгүй, token хадгалах шаардлагагүй.

### 4.1. SSH түлх үүсгэх

```bash
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519 -N ""
```

(Хүсвэл `-N ""`-ийг хасаад нууц үг оруулж болно.)

### 4.2. GitHub-д нэмэх

```bash
# Илгээх түлхийг хэвлэх
cat ~/.ssh/id_ed25519.pub
```

Үр дүнг **бүхэлд нь** хуулна. Дараа нь:

- **GitHub** → **Settings** → **SSH and GPG keys** → **New SSH key**
- **Title:** `MacBook` (эсвэл дурын)
- **Key:** хуулсан `ssh-ed25519 AAAA...` гэсэн мөр
- **Add SSH key**

### 4.3. Төслийн remote-ийг SSH болгох

```bash
cd /Users/lkhagvasurenotgonbayar/Documents/Systems/resort-booking-system
git remote set-url origin git@github.com:grafxlkhagva/resort-booking-system.git
git remote -v
```

Үүний дараа `git push` нь SSH-ээр явагдана, токен оруулах шаардлагагүй.

---

## Товч

| Хэлбэр | Командууд | Дараагийн `git push` |
|--------|-----------|------------------------|
| **HTTPS + Keychain** | `git config --global credential.helper osxkeychain` + анхны push-д token оруулах | Нэвтрэлт асуухгүй |
| **SSH** | SSH түлх үүсгэж GitHub-д нэмээд `git remote set-url origin git@github.com:grafxlkhagva/resort-booking-system.git` | Нэвтрэлт асуухгүй |

Хоёуланг нь хийсэн ч болно; SSH нь урт хугацаанд илүү ашиглахад тохиромжтой.
