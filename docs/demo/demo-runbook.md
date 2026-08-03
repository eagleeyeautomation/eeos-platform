# Flagship Demo Runbook

## Before the meeting

- Confirm Core, Identity, Railway, PostgreSQL, MySQL, and Redis health.
- Sign in with the approved MFA-protected Platform Administrator.
- Open Demo Center and confirm the Summit tenant is classified Synthetic.
- Reset once if a clean baseline is needed, then launch the guided presentation.
- Confirm presenter notes and fullscreen behavior on the presentation display.

## During the meeting

- Keep synthetic labeling visible.
- Use guided or self-guided mode only.
- Do not enter real customer information.
- Do not perform email, SMS, CRM, financial, or connector writes.
- Treat workflow approval as a governed internal state transition; external execution must remain blocked.

## After the meeting

- Complete or exit the presentation.
- Reset only when another baseline run is required.
- Review browser console and runtime logs without recording secrets or private contents.
