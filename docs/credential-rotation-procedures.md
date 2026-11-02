# Credential Rotation Procedures

This document provides detailed step-by-step procedures for rotating all credentials used in the video production pipeline.

## Rotation Schedule

| Credential | Rotation Frequency | Priority |
|-----------|-------------------|----------|
| Groq API Key | Every 90 days | HIGH |
| Gemini API Key | Every 90 days | MEDIUM |
| PostgreSQL Password | Every 180 days | HIGH |
| Worker API Token | Every 90 days | MEDIUM |
| Publish Webhook URL | On provider change | LOW |

## General Rotation Process

For all credentials, follow this sequence:

1. **Generate new credential** in service dashboard
2. **Update environment variable** (keep old one temporarily)
3. **Restart services** to load new credential
4. **Test authentication** with new credential
5. **Monitor for errors** (24 hours)
6. **Revoke old credential** after confirmed success
7. **Document rotation** in credential log

## Service-Specific Procedures

### 1. Groq API Key Rotation

**Services affected:** Script generation, fact-checking

**Downtime risk:** MEDIUM (production workflows will fail)

**Procedure:**

1. **Generate new key:**
   - Go to https://console.groq.com/keys
   - Click "Create API Key"
   - Name: `production-key-2026-09-09` (use date)
   - Copy the key immediately (shown only once)

2. **Update environment variable:**
   ```bash
   # Linux/Docker
   export GROQ_API_KEY_NEW=gsk_new_key_here
   
   # Verify old key still works
   curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models
   
   # Replace old with new
   export GROQ_API_KEY=gsk_new_key_here
   ```

3. **Restart services:**
   ```bash
   sudo systemctl restart video-mcp video-worker
   ```

4. **Test authentication:**
   ```bash
   # Test via curl
   curl -X POST https://api.groq.com/openai/v1/chat/completions \
     -H "Authorization: Bearer $GROQ_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "llama-3.1-70b-versatile",
       "messages": [{"role": "user", "content": "Test"}],
       "max_tokens": 10
     }'
   
   # Expected: Valid response with content
   ```

5. **Test in pipeline:**
   - Run `npm run doctor` to verify the key is accepted
   - Run `npm run make -- --topic "test" --no-publish` for a live check
   - Check `usage.ndjson` for successful LLM calls

6. **Monitor (24 hours):**
   - Check for 401/403 errors in logs
   - Monitor pipeline success rate

7. **Revoke old key:**
   - Return to https://console.groq.com/keys
   - Find old key (by date or name)
   - Click "Delete" or "Revoke"
   - Confirm deletion

8. **Document:**
   - Update credential inventory
   - Add rotation date, new key name (not value)
   - Note any issues encountered

---

### 2. Publish Webhook URL Rotation

**Services affected:** `publish_video` tool (webhook channel), `REVIEW_NOTIFY_URL`

**Downtime risk:** LOW (file delivery continues; only webhook channel is affected)

**Procedure:**

1. **Generate new endpoint at your webhook receiver** (n8n, Make, Zapier, or custom):
   - Create or re-configure the webhook node
   - Copy the new URL

2. **Update environment variable:**
   ```bash
   export PUBLISH_WEBHOOK_URL=https://your-receiver.example.com/new-webhook-path
   # And if used:
   export REVIEW_NOTIFY_URL=https://your-receiver.example.com/review-notify
   ```

3. **Restart the MCP / Worker service:**
   ```bash
   sudo systemctl restart video-mcp video-worker
   ```

4. **Test:**
   ```bash
   curl -s -X POST http://127.0.0.1:3210 \
     -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"publish_video","arguments":{"productionId":"test","channels":["webhook"]}}}'
   ```

5. **Document:**
   - Update credential/config inventory
   - Note rotation date

---

### 3. Gemini API Key Rotation

**Services affected:** Research workflow, fact-checking

**Downtime risk:** MEDIUM (research will fail)

**Procedure:**

1. **Generate new key:**
   - Go to https://aistudio.google.com/app/apikey
   - Click "Create API Key"
   - Select project (or create new)
   - Copy key

2. **Update environment variable:**
   ```bash
   export GEMINI_API_KEY=AIzaSy_new_key_here
   ```

3. **Restart services:**
   ```bash
   sudo systemctl restart video-mcp video-worker
   ```

5. **Test authentication:**
   ```bash
   curl "https://generativelanguage.googleapis.com/v1/models?key=$GEMINI_API_KEY"
   # Expected: List of models
   ```

6. **Test fact-checking workflow:**
   - Run research workflow
   - Verify Gemini responses
   - Check for rate limit issues

7. **Delete old key:**
   - Return to https://aistudio.google.com/app/apikey
   - Find old key
   - Click delete icon
   - Confirm

8. **Document:**
   - Update credential inventory
   - Note rotation date

---

### 4. PostgreSQL Password Rotation

**Services affected:** State persistence, observability, all workflows

**Downtime risk:** CRITICAL (entire pipeline fails)

**Procedure:**

1. **Plan maintenance window:**
   - Schedule 30-minute window
   - Notify stakeholders
   - Pause all video production

2. **Generate new password:**
   ```bash
   # Generate strong password
   openssl rand -base64 32
   ```

3. **Update PostgreSQL:**
   ```sql
   -- Connect as postgres superuser
   psql -U postgres
   
   -- Change password
   ALTER USER pipeline_user WITH PASSWORD 'new_secure_password_here';
   
   -- Verify
   \du
   ```

4. **Update environment variables:**
   ```bash
   # Update connection string
   export DATABASE_URL=postgresql://pipeline_user:new_password@localhost:5432/video_pipeline
   
   # Or update individual variables
   export DB_PASSWORD=new_password_here
   ```

5. **Update application configs:**
   - Update `.env` file
   - Update Docker secrets
   - Update any hardcoded configs (SHOULD NOT EXIST)

6. **Restart all services:**
   ```bash
   sudo systemctl restart video-mcp video-worker
   ```

7. **Test database connection:**
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1;"
   # Expected: Returns 1
   ```

8. **Test workflows:**
   - Run simple workflow
   - Verify state persistence
   - Check usage_events logging

9. **Monitor (1 hour):**
   - Check for connection errors
   - Verify all services reconnected
   - Test workflow execution

10. **Document:**
    - Update credential inventory
    - Note rotation date
    - Update disaster recovery docs

---

### 5. Worker API Token Rotation

**Services affected:** Render worker communication

**Downtime risk:** HIGH (rendering will fail)

**Procedure:**

1. **Generate new token:**
   ```bash
   # Generate secure random token
   openssl rand -hex 32
   ```

2. **Update worker configuration:**
   ```bash
   # On worker machine
   export WORKER_API_TOKEN=new_token_here
   systemctl restart worker
   ```

3. **Update MCP server configuration:**
   ```bash
   export INTERNAL_API_TOKEN=new_token_here
   sudo systemctl restart video-mcp video-worker
   ```

4. **Test worker communication:**
   ```bash
   curl -H "Authorization: Bearer $WORKER_API_TOKEN" \
     http://worker-host:8080/health
   # Expected: {"status": "healthy"}
   ```

5. **Test job submission:**
   - Submit test rendering job
   - Verify worker accepts and processes
   - Check job completion

6. **Document:**
   - Update credential inventory
   - Note rotation date

---

## Emergency Rotation

If a credential is compromised:

1. **IMMEDIATE:** Revoke old credential (service may go down)
2. **Generate new credential** (highest priority)
3. **Update environment variables**
4. **Restart services**
5. **Test critical workflows**
6. **Monitor for abuse** of old credential
7. **Document incident** with:
   - Compromise date/time
   - Scope of exposure
   - Actions taken
   - Impact assessment

---

## Validation Checklist

After ANY rotation:

- [ ] New credential works in test curl/API call
- [ ] Environment variable updated in `.env` and any service dashboard (Render, etc.)
- [ ] Services restarted (`sudo systemctl restart video-mcp video-worker`)
- [ ] `npm run doctor` passes with new credential
- [ ] No authentication errors in logs (check 1 hour)
- [ ] Old credential revoked/deleted
- [ ] Credential inventory updated
- [ ] Team notified of rotation

---

## Automation Opportunities

Future improvements:

1. **Automated rotation scripts:**
   ```bash
   #!/bin/bash
   # rotate-groq.sh
   # Automates Groq key rotation
   ```

2. **Credential expiry monitoring:**
   - Alert 7 days before rotation due
   - Automated expiry detection

3. **Zero-downtime rotation:**
   - Dual-credential support
   - Gradual transition period

4. **Audit logging:**
   - Log all rotation events
   - Track who rotated what and when

---

## Troubleshooting

### Issue: Service won't start after rotation

**Symptoms:**
- Worker crashes on startup
- "Invalid credential" errors
- `npm run doctor` shows a red ✖ for the provider

**Solutions:**
1. Check environment variable is set: `echo $GROQ_API_KEY`
2. Verify no typos in credential value
3. Check credential format (Bearer prefix, etc.)
4. Revert to old credential temporarily
5. Check service logs for specific error

### Issue: Intermittent authentication failures

**Symptoms:**
- Some requests succeed, others fail
- 401 errors appear randomly

**Solutions:**
1. Check if old credential still active (timing issue)
2. Verify all service instances restarted
3. Check for credential caching
4. Look for multiple credential configs

### Issue: Old credential still works after revocation

**Symptoms:**
- Successfully revoked but still authenticates

**Solutions:**
1. Some services have revocation delay (up to 5 minutes)
2. Check if credential cached by service
3. Verify revocation in service dashboard
4. Contact service support if persists >1 hour

---

## References

- Environment template: `docs/env.template`
- Deployment guide: `docs/deployment.md`
- Security policy: `SECURITY.md`
- Emergency contacts: (add team contacts here)
