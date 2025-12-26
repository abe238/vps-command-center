# VPS SSH Hardening Guide

This guide walks through creating a non-root deploy user on your Hostinger VPS.

**Server:** 72.60.28.52 (srv944870.hstgr.cloud)

## TL;DR - Recommended Approach

1. **Do Steps 1-6:** Create `deploy` user with sudo + docker access
2. **Skip Step 7:** Keep root SSH working as backup
3. **Daily use:** `ssh hostinger-vps-deploy` then `sudo -i` when you need root
4. **Emergency:** Hostinger console at hpanel.hostinger.com

This gives you security benefits without lockout risk.

---

## Risk Assessment

| Step | Risk Level | Lockout Potential |
|------|------------|-------------------|
| Create deploy user | LOW | None |
| Add SSH key to deploy user | LOW | None |
| Test deploy user SSH | LOW | None |
| Add deploy user to sudoers | MEDIUM | Low (root still works) |
| Disable root SSH login | **HIGH** | **YES - can lock you out** |

---

## Prerequisites

Before starting, ensure you have:
- [ ] Current SSH access working (`ssh hostinger-vps-auto`)
- [ ] Hostinger panel access as backup (hpanel.hostinger.com)
- [ ] Your public SSH key ready

---

## Step 1: Create Deploy User

**Risk: LOW** - Root access still works, nothing can break.

```bash
# Connect as root
ssh hostinger-vps-auto

# Create deploy user with home directory
useradd -m -s /bin/bash deploy

# Set a strong password (you'll need this for sudo)
passwd deploy
# Enter a strong password when prompted
```

**Verification:**
```bash
# Should show deploy user exists
id deploy
# Expected: uid=1001(deploy) gid=1001(deploy) groups=1001(deploy)

# Should show home directory exists
ls -la /home/deploy
```

---

## Step 2: Set Up SSH Key for Deploy User

**Risk: LOW** - Root access still works.

```bash
# Still on VPS as root, create .ssh directory
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Add your public key (use your actual key)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMBPX3v8MHMh7rL82+hVMKhgN9Fi1JvzyyL1Crb1uikw automation-key" >> /home/deploy/.ssh/authorized_keys

# Set correct permissions
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

**Verification:**
```bash
# Check permissions are correct
ls -la /home/deploy/.ssh/
# Expected:
# drwx------ 2 deploy deploy 4096 ... .
# -rw------- 1 deploy deploy  ... authorized_keys

cat /home/deploy/.ssh/authorized_keys
# Should show your public key
```

---

## Step 3: Test Deploy User SSH Access

**Risk: LOW** - This is a critical test before proceeding.

**STOP HERE AND TEST FROM YOUR LOCAL MACHINE:**

Open a NEW terminal window (keep root session open!) and run:

```bash
# From your LOCAL machine, test SSH as deploy user
ssh -i ~/.ssh/id_ed25519_automation_new deploy@72.60.28.52
```

**Expected result:** You should get a shell prompt as `deploy@srv944870:~$`

**If this fails:**
- Check the key path is correct
- Verify authorized_keys content on VPS
- Check file permissions again
- DO NOT proceed to next steps

---

## Step 4: Add Deploy User to Sudoers

**Risk: MEDIUM** - Gives deploy user root privileges via sudo.

```bash
# Back on VPS as root
# Add deploy to sudo group
usermod -aG sudo deploy

# Verify group membership
groups deploy
# Expected: deploy : deploy sudo
```

**Verification (from deploy user session):**
```bash
# In your deploy SSH session, test sudo
sudo whoami
# Enter the password you set in Step 1
# Expected: root
```

**If sudo doesn't work:**
- Verify group membership: `groups`
- Log out and back in as deploy user
- Check /etc/sudoers hasn't been corrupted

---

## Step 5: Configure Docker Access for Deploy User

**Risk: LOW** - Required for container management.

```bash
# As root on VPS
usermod -aG docker deploy

# Verify
groups deploy
# Expected: deploy : deploy sudo docker
```

**Verification (as deploy user, after logging out and back in):**
```bash
# Log out and back in as deploy, then:
docker ps
# Should list running containers without sudo
```

---

## Step 6: Update Local SSH Config

**Risk: LOW** - Local machine configuration only.

On your LOCAL machine, add to `~/.ssh/config`:

```
Host hostinger-vps-deploy
    HostName 72.60.28.52
    User deploy
    IdentityFile ~/.ssh/id_ed25519_automation_new
    StrictHostKeyChecking no
```

**Verification:**
```bash
# Test the new config
ssh hostinger-vps-deploy "whoami && docker ps --format '{{.Names}}' | head -3"
# Expected: deploy, then container names
```

---

## Step 7: Disable Root SSH Login (OPTIONAL)

> **You can skip this step entirely.** After completing Steps 1-6, you have:
> - A working `deploy` user with sudo access
> - `sudo -i` to become root anytime
> - Hostinger console as emergency backup
>
> **Skipping this step means:** Root SSH still works, but you have `deploy` as your main user.
> This is a valid security posture - you're no longer *always* root.

**RISK: HIGH - THIS CAN LOCK YOU OUT**

### Pre-flight Checklist

Before proceeding, confirm ALL of these:

- [ ] `ssh hostinger-vps-deploy` works
- [ ] `sudo whoami` returns `root` as deploy user
- [ ] `docker ps` works as deploy user
- [ ] You have Hostinger panel access as backup
- [ ] You have the deploy user password written down

### Backup Current Config

```bash
# As root on VPS
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d)
```

### Make the Change

```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Find and change these lines:
# PermitRootLogin yes
# to:
PermitRootLogin no

# Also ensure these are set:
PubkeyAuthentication yes
PasswordAuthentication no
```

### Test Config Before Applying

```bash
# Validate SSH config syntax
sshd -t
# Expected: No output means success
# If errors appear, fix them before continuing!
```

### Apply Changes (Point of No Return for Root)

```bash
# Reload SSH (not restart - allows recovery)
systemctl reload sshd
```

### Immediate Verification

**KEEP YOUR ROOT SESSION OPEN** and in a NEW terminal:

```bash
# This should FAIL now
ssh root@72.60.28.52
# Expected: Permission denied

# This should WORK
ssh hostinger-vps-deploy
# Expected: Login successful as deploy
```

---

## Recovery Procedures

### If Locked Out via SSH

**Option 1: Hostinger VPS Console**
1. Log into hpanel.hostinger.com
2. Go to VPS → Manage
3. Click "Console" or "VNC Console"
4. Log in as root with your root password
5. Fix /etc/ssh/sshd_config:
   ```bash
   sed -i 's/PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
   systemctl reload sshd
   ```

**Option 2: Hostinger Support**
- Contact Hostinger support to reset SSH access
- They can access the server console

### If sudo Broken

If you can SSH as deploy but sudo doesn't work:

1. Use Hostinger console to log in as root
2. Run: `usermod -aG sudo deploy`
3. Verify: `grep sudo /etc/group`

### Rollback SSH Changes

If you still have root access:
```bash
cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config
systemctl reload sshd
```

---

## Post-Hardening Verification

Run this comprehensive check after completing all steps:

```bash
echo "=== SSH Hardening Verification ==="

# Test deploy access
ssh hostinger-vps-deploy "echo '✅ SSH as deploy: OK'"

# Test sudo
ssh hostinger-vps-deploy "sudo whoami | grep -q root && echo '✅ Sudo access: OK'"

# Test docker
ssh hostinger-vps-deploy "docker ps >/dev/null 2>&1 && echo '✅ Docker access: OK'"

# Verify root is blocked
ssh -o BatchMode=yes -o ConnectTimeout=5 root@72.60.28.52 2>&1 | grep -q "Permission denied" && echo "✅ Root SSH blocked: OK"

echo "=== Verification Complete ==="
```

---

## Update GitHub Actions Secrets

After confirming everything works, update your CI/CD:

1. Go to GitHub repo → Settings → Secrets
2. Update `VPS_USER` from `root` to `deploy`
3. Verify deployments still work

---

## Summary

| What Changed | Before | After |
|--------------|--------|-------|
| SSH User | root | deploy |
| Root SSH | Allowed | Blocked |
| Sudo | N/A | Via password |
| Docker | Root only | deploy group |

**Security improvements:**
- Attackers can't directly target root account
- Failed root logins are immediately rejected
- All privileged actions require explicit sudo
- Audit trail for sudo commands in /var/log/auth.log

---

## Container Security: Non-Root Users

### Current Status

| Container | Runs As | Should Be | Priority |
|-----------|---------|-----------|----------|
| coolify-* (6) | root | root (required) | N/A |
| livekit | root | livekit (1000) | MEDIUM |
| perf_mgmt_postgres | root | postgres (70) | HIGH |
| managerhub-redis | root | redis (999) | HIGH |

### TODO: Fix perf_mgmt_postgres

**Risk: MEDIUM** - May need to fix volume permissions.

```bash
# 1. Check current volume permissions
ssh hostinger-vps-auto 'docker volume inspect perf_mgmt_postgres_data'

# 2. Update docker-compose.yml - add user directive
#    In /root/docker-compose.yml, find perf_mgmt_postgres and add:
#    user: "70:70"

# 3. Fix volume permissions if needed
ssh hostinger-vps-auto 'docker run --rm -v perf_mgmt_postgres_data:/data alpine chown -R 70:70 /data'

# 4. Restart container
ssh hostinger-vps-auto 'docker compose -f /root/docker-compose.yml up -d perf_mgmt_postgres'

# 5. Verify
ssh hostinger-vps-auto 'docker exec perf_mgmt_postgres id'
# Expected: uid=70(postgres)
```

### TODO: Fix managerhub-redis

**Risk: LOW** - Redis typically has no persistent data issues.

```bash
# 1. Update docker-compose.yml - add user directive
#    user: "999:999"

# 2. Restart
ssh hostinger-vps-auto 'docker compose -f /root/docker-compose.yml up -d managerhub-redis'

# 3. Verify
ssh hostinger-vps-auto 'docker exec managerhub-redis id'
# Expected: uid=999(redis)
```

### TODO: Fix livekit

**Risk: MEDIUM** - Check if livekit supports non-root.

```bash
# 1. Check livekit docs for non-root support
# 2. If supported, add to docker-compose.yml:
#    user: "1000:1000"

# 3. Test in non-production first
```

### Containers That MUST Run as Root

These containers legitimately require root privileges:

| Container | Why Root Required |
|-----------|------------------|
| coolify | Docker socket access for container management |
| coolify-proxy | Bind ports 80/443 (privileged ports) |
| coolify-sentinel | Docker event monitoring |
| coolify-realtime | Docker socket access |
| coolify-db | Coolify's internal database |
| coolify-redis | Coolify's internal cache |

### Verification Script

Run this to check container user status:

```bash
ssh hostinger-vps-auto 'for c in $(docker ps --format "{{.Names}}"); do
  user=$(docker inspect $c --format "{{.Config.User}}")
  echo "$c: ${user:-root}"
done'
```
