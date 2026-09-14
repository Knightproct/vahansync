# Vahana Fleet OS

Vahana is an India-focused fleet operations ERP foundation for operators who need one place to manage vehicles, components, workshop inventory, maintenance, costs, and compliance documents.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal. The production build can be verified with:

```bash
npm run build
```

## Product foundation

The current frontend prototype covers:

- Fleet health and active vehicle monitoring
- Vehicle register with depots, drivers, health, and route status
- Preventive maintenance queue and work-order planning
- Workshop parts catalogue and reorder visibility
- Document vault with expiry status
- Operating cost, fuel, maintenance, and expense views

The next implementation layers should add persistent storage, authentication and roles, telematics integrations, GST-ready finance workflows, vendor portals, and mobile workflows for drivers and workshop technicians.
