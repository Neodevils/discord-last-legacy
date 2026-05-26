# Last Legacy 2 Discord Activity

Ruffle ile `LastLegacy2.swf` dosyasini calistiran Vite tabanli Discord Activity kabugu.

## Yerel calistirma

```bash
npm install
npm run dev
```

Oyun yerelde `http://127.0.0.1:5173` adresinde acilir.

## Discord Activity ayari

1. `.env.example` dosyasini `.env` olarak kopyalayin.
2. `VITE_DISCORD_CLIENT_ID` degerini Discord Developer Portal'daki Application Client ID ile doldurun.
3. Activity icin HTTPS bir URL kullanin. Discord Activity'ler iframe icinde calisir ve Discord proxy/CSP kurallari uygular.
4. Developer Portal'da Activity URL mapping olarak yayin URL'nizi ekleyin.

SWF dosyasi `public/LastLegacy2.swf`, Ruffle runtime dosyalari ise `npm install` sonrasi `public/ruffle/` altina kopyalanir.
