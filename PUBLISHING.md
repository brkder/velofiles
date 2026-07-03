# 🚀 VeloFiles'ı GitHub'da Yayınlama Rehberi

Bu rehber, zip'i çıkardıktan sonra projeyi GitHub'da yayınlayıp otomatik
release (kurulum dosyaları) almanı adım adım anlatır.
**Tüm komutlar tek satırdır** — kopyala, PowerShell'e yapıştır, Enter.

> Not: `USERNAME` yazan yerlere kendi GitHub kullanıcı adını yaz.

---

## 0️⃣ Gerekli araçlar (bir kere kurulur)

Zaten kuruluysa atla. Kurulu mu diye kontrol:

```powershell
git --version; gh --version; node --version; pnpm --version
```

Eksik olanları kur (her satır ayrı komut):

```powershell
winget install --id Git.Git -e
```

```powershell
winget install --id GitHub.cli -e
```

```powershell
winget install --id OpenJS.NodeJS.LTS -e
```

```powershell
npm install -g pnpm
```

> ⚠️ Kurulumlardan sonra PowerShell'i **kapatıp yeniden aç** (PATH yenilensin).

---

## 1️⃣ Zip'i çıkar ve klasöre gir

Zip'i örneğin `C:\Users\bdere\Downloads\VeloFiles` klasörüne çıkar, sonra:

```powershell
cd C:\Users\bdere\Downloads\VeloFiles
```

---

## 2️⃣ Bağımlılıkları kur ve ikonları üret

CI (GitHub'ın derleme sunucusu) `src-tauri\icons\` klasörü olmadan derleyemez.
Bu yüzden ikonlar repoya **mutlaka** eklenmeli.

```powershell
pnpm install
```

Elinde 1024×1024 bir logo varsa onu kullan:

```powershell
pnpm tauri icon C:\yol\senin-logon.png
```

Logon yoksa düz mavi bir ikon üretip kullan (tek satır):

```powershell
powershell -NoProfile -Command "Add-Type -AssemblyName System.Drawing; $b=New-Object System.Drawing.Bitmap 1024,1024; $g=[System.Drawing.Graphics]::FromImage($b); $g.Clear([System.Drawing.Color]::FromArgb(79,140,255)); $g.Dispose(); $b.Save((Join-Path (Get-Location) 'app-icon.png')); $b.Dispose()"
```

```powershell
pnpm tauri icon .\app-icon.png
```

Kontrol — `True` yazmalı:

```powershell
Test-Path src-tauri\icons\icon.ico
```

---

## 3️⃣ GitHub CLI ile giriş yap

```powershell
gh auth login
```

Sorulara şöyle cevap ver (ok tuşları + Enter):
1. **GitHub.com**
2. **HTTPS**
3. Authenticate Git with your GitHub credentials? → **Yes**
4. **Login with a web browser** → ekrandaki kodu kopyala → Enter → tarayıcıda kodu yapıştır → onayla

Kontrol:

```powershell
gh auth status
```

---

## 4️⃣ Git deposunu oluştur ve ilk commit

```powershell
git init
```

```powershell
git add .
```

```powershell
git commit -m "VeloFiles v0.1.0 - initial release"
```

```powershell
git branch -M main
```

---

## 5️⃣ GitHub'da repoyu oluştur ve gönder (tek komut!)

`gh` hem repoyu oluşturur hem push eder:

```powershell
gh repo create velofiles --public --source . --push --description "Blazing-fast, open-source, multilingual file explorer for Windows. Rust + Tauri + React."
```

> Farklı bir isim istersen `velofiles` yerine onu yaz.

Tarayıcıda aç ve kontrol et:

```powershell
gh repo view --web
```

---

## 6️⃣ Actions izinlerini kontrol et (30 saniye)

Release workflow'unun release oluşturabilmesi için:

1. GitHub'da repo sayfası → **Settings** → **Actions** → **General**
2. En altta **Workflow permissions** → **Read and write permissions** seç → **Save**

---

## 7️⃣ Release'i tetikle 🎉

Versiyon etiketi atınca GitHub otomatik derlemeye başlar:

```powershell
git tag v0.1.0
```

```powershell
git push origin v0.1.0
```

Derleme durumunu izle (veya repo sayfasında **Actions** sekmesi):

```powershell
gh run watch
```

⏱️ İlk derleme ~10-15 dakika sürer (Rust'ı sıfırdan derliyor; sonrakiler cache sayesinde daha hızlı).

---

## 8️⃣ Release'i yayınla

Derleme bitince:

1. Repo sayfası → **Releases** → taslak (Draft) **"VeloFiles v0.1.0"** göreceksin
2. İçinde `.msi` ve `-setup.exe` kurulum dosyaları hazır olacak
3. İstersen notları düzenle → **Publish release** butonuna bas

Artık README'deki **Download** bölümü otomatik olarak bu release'e işaret ediyor. 🎊

---

## 🔁 Sonraki sürümler nasıl yayınlanır?

Kod değişikliklerini yaptıktan sonra sırayla:

```powershell
git add .
```

```powershell
git commit -m "Yeni ozellikler ve duzeltmeler"
```

```powershell
git push
```

`src-tauri\tauri.conf.json` ve `src-tauri\Cargo.toml` içindeki `version` değerini yükselt (örn. `0.2.0`), commit'le, sonra:

```powershell
git tag v0.2.0
```

```powershell
git push origin v0.2.0
```

Gerisi otomatik.

---

## 🛟 Sorun giderme

| Sorun | Çözüm |
|---|---|
| `winget` bulunamadı | Microsoft Store'dan "App Installer" kur veya araçları sitelerinden indir |
| `gh: command not found` | PowerShell'i kapatıp yeniden aç |
| Actions derlemesi "icons" hatası veriyor | 2. adımı atlamışsın: ikonları üret, `git add .` + commit + push, etiketi silip yeniden at: `git tag -d v0.1.0; git push origin :refs/tags/v0.1.0; git tag v0.1.0; git push origin v0.1.0` |
| Release oluşmadı (403 hatası) | 6. adımdaki **Read and write permissions** ayarını yap, etiketi yukarıdaki gibi silip yeniden at |
| `pnpm tauri icon` dosya bulamıyor | Yol yanlış; `Test-Path .\app-icon.png` ile kontrol et |

İyi yayınlar! ⚡
