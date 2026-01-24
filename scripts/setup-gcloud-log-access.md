# Setting Up gcloud CLI Log Access

## Option 1: Authenticate Your User Account (Recommended)

Run this command in your terminal to authenticate:

```bash
gcloud auth login shubhashish@kweka.ai
```

This will open a browser window for you to authenticate. After authentication, you'll be able to read logs.

## Option 2: Grant Service Account Log Reading Permissions

If you want the service account to be able to read logs, grant it the `roles/logging.viewer` role:

```bash
# First, authenticate with an account that has IAM admin permissions
gcloud auth login

# Then grant the service account log viewer role
gcloud projects add-iam-policy-binding cc-ems-dev \
  --member="serviceAccount:github-actions-deployer@intelli-dev.iam.gserviceaccount.com" \
  --role="roles/logging.viewer"
```

## Option 3: Use Application Default Credentials

If you have a service account key file:

```bash
gcloud auth activate-service-account --key-file=/path/to/service-account-key.json
```

## Option 4: Use Cloud Console Web UI

You can also check logs directly in the browser:
1. Go to: https://console.cloud.google.com/logs/query?project=cc-ems-dev
2. Use this query:
   ```
   resource.type=cloud_run_revision 
   resource.labels.service_name="cc-ems-backend" 
   jsonPayload.message=~"Stats calculation"
   ```

## Quick Test After Authentication

Once authenticated, test with:

```bash
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name="cc-ems-backend" AND severity="ERROR"' \
  --limit 5 \
  --project cc-ems-dev \
  --freshness=1h
```
