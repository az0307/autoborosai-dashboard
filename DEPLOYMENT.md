# Deployment Guide for autoborosai.com.au

**Domain:** autoborosai.com.au
**Owner:** BAKER, AARON JAMES REGINALD
**ABN:** 15870917390
**Active Period:** 25/11/25 - 25/11/26

---

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended)

**Why Vercel?**
- Zero-config Next.js hosting
- Automatic HTTPS & SSL
- Global CDN (Sydney region available)
- Free SSL certificates
- Custom domain setup included
- Built-in CI/CD

**Steps:**

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd nexus-agent-dashboard
   vercel --prod
   ```

4. **Add Custom Domain:**
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Add `autoborosai.com.au`
   - Vercel will provide DNS records

5. **Configure DNS at your registrar:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

6. **Environment Variables:**
   - Add `.env.production` variables in Vercel Dashboard
   - Settings → Environment Variables

---

### Option 2: GitHub Pages (Static Export)

**Steps:**

1. **Update `next.config.js` for static export:**
   ```javascript
   module.exports = {
     output: 'export',
     images: {
       unoptimized: true,
     },
   }
   ```

2. **Build static site:**
   ```bash
   npm run build
   ```

3. **Deploy to GitHub Pages:**
   - Create GitHub repo
   - Push code
   - Enable GitHub Pages in repo settings
   - Configure custom domain to `autoborosai.com.au`

4. **DNS Configuration:**
   ```
   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153

   Type: CNAME
   Name: www
   Value: yourusername.github.io
   ```

---

### Option 3: Custom VPS (Full Control)

**Requirements:**
- Ubuntu/Debian server
- Node.js 18+
- Nginx
- PM2

**Steps:**

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

3. **Start with PM2:**
   ```bash
   pm2 start npm --name "nexus-dashboard" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name autoborosai.com.au www.autoborosai.com.au;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **SSL with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d autoborosai.com.au -d www.autoborosai.com.au
   ```

---

## 🔒 Security Checklist (AutoborosAI Standards)

Before deploying:

- [ ] `.env.production` configured (no secrets committed)
- [ ] Environment variables set in hosting platform
- [ ] HTTPS/SSL enabled
- [ ] Security headers configured (see `vercel.json`)
- [ ] API endpoints use HTTPS
- [ ] WebSocket uses WSS (secure)
- [ ] No hardcoded secrets in code
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation active

---

## 📋 Pre-Deployment Checklist

- [ ] Update API URLs in `.env.production`
- [ ] Test build locally: `npm run build && npm start`
- [ ] Verify all images load
- [ ] Check all links work
- [ ] Test on mobile devices
- [ ] Run lighthouse audit
- [ ] Enable analytics (optional)
- [ ] Set up monitoring (optional)

---

## 🌐 DNS Configuration

**Registrar:** Check your domain registrar's DNS settings

**Required Records:**

| Type  | Name | Value                    | TTL  |
|-------|------|--------------------------|------|
| A     | @    | [Your hosting IP]        | 3600 |
| CNAME | www  | autoborosai.com.au       | 3600 |
| TXT   | @    | ABN=15870917390          | 3600 |

---

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to autoborosai.com.au

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 📊 Post-Deployment

1. **Verify deployment:**
   - Visit https://autoborosai.com.au
   - Check all features work
   - Test WebSocket connection
   - Verify API integration

2. **Monitor:**
   - Set up uptime monitoring
   - Configure error tracking
   - Enable analytics

3. **Performance:**
   - Run Google Lighthouse
   - Check Core Web Vitals
   - Optimize if needed

---

## 🆘 Troubleshooting

**Build fails:**
- Check Node.js version (18+)
- Run `npm ci` to clean install
- Check for TypeScript errors

**Domain not resolving:**
- Wait 24-48 hours for DNS propagation
- Check DNS with `nslookup autoborosai.com.au`
- Verify records at registrar

**API connection fails:**
- Check CORS settings
- Verify API URL in environment variables
- Ensure API is deployed and accessible

---

## 📞 Support

For deployment issues:
- Domain: Contact your registrar
- Hosting: Check platform documentation
- Code: Review CLAUDE.md in project

---

**Built with AutoborosAI Standards**
Security-first • Type-safe • Production-ready
