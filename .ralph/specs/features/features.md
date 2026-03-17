# Application Features

## 1. Authentication
- User sign up and login using Email and Password.
- Cookie-based session storage.
- Protected routes requiring authentication.

## 2. Car Management
- Users can create, read, update, and delete vehicles.
- Users can share cars with others, defining roles (`owner` vs `driver`).
- View comprehensive car details.

## 3. Maintenance Tracking
- Track maintenance records for each car (e.g., oil change, tire rotation).
- Log mileage, cost, date, vendor, and description for each record.
- Show history timeline of maintenance for a given vehicle.

## 4. Location-Aware Alerts & Maintenance Due Logic
- Compare recent maintenance vs standard intervals (time/miles) to identify "Due" maintenance.
- Overpass API Integration: Server route (`/api/nearby-services?lat=&lon=&radius=5000`) queries Overpass for nearby repair shops (`shop=car_repair` and `amenity=car_repair`).
- Utilize HTML Geolocation API to find user's current location.
- Show an alert/banner if a user's car has maintenance due AND they are near a service station.

**Maintenance Due Logic (Pseudocode):**
```
for each car user has access to:
  for each maintenance type (e.g. oil_change):
    lastRecord = most recent MaintenanceRecord of that type
    if lastRecord.mileage + intervalMiles < car.currentMileage
       OR lastRecord.date + intervalMonths < today:
      add to "due" list
```

## 5. PWA (Progressive Web App)
- Configured via `@vite-pwa/remix`.
- Valid Web App Manifest.
- Installable via "Add to Home Screen".
- Offline capable (caching static assets and key responses).
