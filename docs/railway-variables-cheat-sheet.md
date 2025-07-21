# Railway Config Quick-Check (variable and reference variable Cheat-Sheet)

Follow this 8-step checklist every time you push or deploy a Railway project.

---

### 1. Pull the latest code

```bash
git pull origin main
```

---

### 2. Open the three files that matter

- `railway.toml` or `railway.json`
- `Dockerfile` (if you use one)
- Your main entry file (`server.js`, `app.py`, etc.)

---

### 3. Find or add the port line

| Language / Framework | Snippet to look for / insert                                 |
| -------------------- | ------------------------------------------------------------ | --- | ----------------- |
| Node.js (Express)    | `app.listen(process.env.PORT                                 |     | 3000, '0.0.0.0')` |
| Next.js              | `"start": "next start --hostname 0.0.0.0 --port $PORT"`      |
| Python (Flask)       | `app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)))` |
| Python (Uvicorn)     | `uvicorn main:app --host 0.0.0.0 --port $PORT`               |

🔍 **Checklist**

- [ ] Uses `process.env.PORT` / `$PORT` / `os.getenv("PORT")`
- [ ] Binds to `0.0.0.0` (or `::` for IPv6)
- [ ] **No hard-coded port** like `3000` or `5000` alone

---

### 4. Verify inter-service URLs

Replace any hard-coded hostnames or ports with Railway reference variables:

| Instead of …                 | Use …                                                  |
| ---------------------------- | ------------------------------------------------------ |
| `http://localhost:4000`      | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` |
| `https://my-api.example.com` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}`               |

🔍 **Checklist**

- [ ] All internal traffic uses `http://` + `railway.internal` names
- [ ] All public traffic uses `https://` + `RAILWAY_PUBLIC_DOMAIN`
- [ ] **No** plain `localhost`, `127.0.0.1`, or raw IP addresses

---

### 5. CORS quick-scan (backend)

Look for CORS middleware and ensure it contains:

```js
// Node.js / Express example
app.use(
  cors({
    origin: [process.env.FRONTEND_URL], // or array of allowed origins
    credentials: true,
  })
);
```

🔍 **Checklist**

- [ ] Origin list includes the exact deployed frontend URL(s)
- [ ] `credentials: true` if you send cookies / auth headers
- [ ] **Not** `origin: "*"` in production

---

### 6. WebSocket sanity check

Client-side connection string must match protocol:

| Frontend origin        | WebSocket URL                               |
| ---------------------- | ------------------------------------------- |
| `https://…`            | `wss://<backend>.up.railway.app/socket.io/` |
| `http://localhost` dev | `ws://localhost:<port>/socket.io/`          |

🔍 **Checklist**

- [ ] **Never** mix `https` page with `ws://` (blocked by browser)
- [ ] **Server-side** Socket.IO or WS library also has CORS/origin validation

---

### 7. Dockerfile (if used)

Dockerfile should expose the port and accept build-time args:

```dockerfile
ARG PORT
EXPOSE ${PORT}
CMD ["node", "server.js"]
```

🔍 **Checklist**

- [ ] Uses `ARG PORT` if you need the port at build time
- [ ] `EXPOSE` matches `$PORT`
- [ ] Final `CMD` starts the app without hard-coding port

---

### 8. Deploy & test loop

```bash
railway up
```

After each deploy:

- Open the **Railway dashboard → Service → Logs**
- Confirm: `Listening on 0.0.0.0:<PORT>` (or `[::]:<PORT>`)
- Hit the public URL or internal endpoint and verify 200/101 responses
- Check browser console for CORS or WebSocket errors

---

**Done?** ✅ Commit the fixed files and push.
