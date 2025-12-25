# VPS Command Center

Mission control dashboard for VPS infrastructure monitoring, security, and management.

![Dashboard Preview](docs/preview.png)

## Features

- **Container Monitoring**: Real-time status, CPU, memory, network metrics for all Docker containers
- **Security Audit**: Non-root user compliance tracking, vulnerability alerts
- **Cron Job Visibility**: Scheduled tasks status, last run times, success/failure tracking
- **Health Checks**: Endpoint monitoring with response times and uptime stats
- **Industrial Design**: Dark theme mission-control aesthetic with live status indicators

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Docker API integration
- Server-Sent Events for real-time updates

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Deployment

This project uses GitHub Actions for CI/CD:

1. Push to `main` branch triggers build
2. Docker image pushed to GitHub Container Registry
3. VPS pulls and deploys via SSH

### Required GitHub Secrets

- `VPS_HOST` - VPS IP address
- `VPS_SSH_KEY` - SSH private key for `deploy` user

### VPS Security Setup

The deployment uses a dedicated `deploy` user (not root) for security:

```bash
# On VPS as root:
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
ln -sf /root/docker-compose.yml /home/deploy/docker-compose.yml
```

### VPS Configuration

Add the service to `/root/docker-compose.yml`:

```yaml
vps-command-center:
  image: ghcr.io/abe238/vps-command-center:latest
  container_name: root-vps-command-center-1
  restart: always
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - /var/log:/host-logs:ro
  labels:
    - traefik.enable=true
    - traefik.http.routers.vps-dashboard.rule=Host(`vps.srv944870.hstgr.cloud`)
    - traefik.http.routers.vps-dashboard.tls=true
    - traefik.http.routers.vps-dashboard.tls.certresolver=mytlschallenge
    - traefik.http.services.vps-dashboard.loadbalancer.server.port=3000
  networks:
    - coolify
```

## Adding New Apps

Edit `src/config/apps.ts` to add new applications:

```typescript
{
  id: 'my-app',
  name: 'My Application',
  type: 'docker',
  container: { name: 'root-my-app-1' },
  health: {
    endpoint: 'https://my-app.domain.com',
    method: 'http',
    expectedStatus: 200,
  },
  metrics: { enabled: true, collectInterval: 30 },
  domain: 'my-app.domain.com',
  tags: ['frontend'],
}
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main dashboard
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Design system
│   └── api/              # API routes (planned)
├── components/
│   ├── Header.tsx
│   ├── ContainerCard.tsx
│   ├── SecurityPanel.tsx
│   ├── CronJobPanel.tsx
│   └── StatusLED.tsx
├── config/
│   └── apps.ts           # App registry
├── lib/
│   └── docker.ts         # Docker API client
└── types/
    └── index.ts          # TypeScript types
```

## License

Private - All rights reserved
