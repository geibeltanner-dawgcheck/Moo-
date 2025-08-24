# DAWGCHECK Training Simulator

DAWGCHECK Training Simulator is a static HTML5/CSS/JavaScript Progressive Web Application (PWA) that simulates an insurance application workflow. It provides a comprehensive 20-step stepper interface for training purposes and includes dynamic product selection, premium calculation, autosave functionality, and offline capabilities.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Run the Application
- No build process required - this is a static web application with no dependencies.
- Serve the application locally using a static web server:
  - `python3 -m http.server 8080` - takes <1 second to start
  - OR `npx http-server -p 8080` - takes 5-10 seconds for first run (downloads package), <1 second for subsequent runs
- Open browser to `http://localhost:8080/` for main DAWGCHECK interface
- Open browser to `http://localhost:8080/wizard.html` for alternate Mutual of Omaha wizard interface
- NEVER CANCEL these server commands - they run continuously until stopped with Ctrl+C or stop_bash tool

### Validation
- Always manually test the application after making changes to HTML, CSS, or JavaScript files.
- ALWAYS validate the complete stepper workflow by:
  1. Fill in required fields in "Producer Information" (First and Last name are required minimum)
  2. Click "Next ▸" to advance through steps - validation prevents progression if required fields are missing
  3. Verify stepper shows checkmarks for completed steps
  4. Test at least 3-4 steps to ensure navigation works correctly
- Test PWA functionality:
  - Verify manifest.json loads correctly: `curl http://localhost:8080/manifest.json`
  - Check service worker registration in browser DevTools -> Application -> Service Workers
  - Test offline functionality by stopping server and reloading page
- Always test both interfaces: main application (`index.html`) and wizard (`wizard.html`)
- No formal test suite exists - manual testing is required for all changes

### Known Issues to be Aware of
- **Icon mismatch**: manifest.json references `assets/icons/dawgcheck-192.png` and `dawgcheck-512.png` but actual files are `assets/icons/icon-192.png` and `icon-512.png`. This causes 404 errors for PWA icons but does not break functionality.
- **Missing logo**: `index.html` references `assets/icons/dawgcheck-logo.png` which returns 404, but layout still works.
- These 404 errors are expected and do not indicate problems with your changes unless you've modified asset references.

## Common Tasks

### File Structure
```
/home/runner/work/Moo-dawg/Moo-dawg/
├── index.html          # Main DAWGCHECK application (31KB)
├── wizard.html         # Alternate Mutual of Omaha interface (3KB) 
├── app.js             # Main application logic (18KB)
├── Nijnu.js           # Additional JavaScript functionality (11KB)
├── wizard.js          # Wizard-specific logic (1KB)
├── styles.css         # CSS styling (5KB)
├── manifest.json      # PWA manifest
├── service-worker.js  # Service worker for offline functionality (1KB)
├── README.md          # Repository documentation
└── assets/
    ├── icon-192.png   # PWA icon (300KB)
    ├── icon-512.png   # PWA icon (1.5MB)
    └── icons          # Empty file (legacy)
```

### Key Application Features
- **20-step workflow**: Producer Information → Proposed Insured → Confirm Identity → HIPAA → ... → eSignature
- **Validation system**: Built-in form validation prevents progression without required fields
- **Autosave**: Uses localStorage to persist form data automatically
- **Dynamic products**: State-based product selection and premium calculation
- **PWA functionality**: Offline support, installable, service worker caching
- **Responsive design**: Works on desktop and mobile devices with orientation handling

### Making Changes
- **HTML changes**: Edit `index.html` for main interface or `wizard.html` for wizard
- **Styling changes**: Edit `styles.css` - uses CSS custom properties and grid layout
- **JavaScript logic**: 
  - Main application logic in `app.js` (stepper, validation, form handling)
  - Additional utilities in `Nijnu.js` (autosave, routing, PWA features)
  - Wizard logic in `wizard.js`
- **PWA configuration**: Edit `manifest.json` for app metadata, `service-worker.js` for caching

### Timing Expectations
- Static server startup: <1 second (Python) or <1 second after first run (npx)
- Page load time: <100ms for all pages
- Application is fully functional immediately - no build or compilation delays
- File modifications take effect immediately on browser refresh

### Deployment Notes  
- Pure static files - can be deployed to any web server
- No server-side processing required
- For production PWA deployment, consider using tools like:
  - Bubblewrap for Android app packaging
  - PWABuilder for cross-platform app generation
- Ensure proper HTTPS for PWA installation in production

## Repo Contents Summary

### ls -la (repo root)
```
total 108
drwxr-xr-x 4 runner docker  4096 Aug 24 15:35 .
drwxr-xr-x 3 runner docker  4096 Aug 24 15:34 ..
drwxr-xr-x 7 runner docker  4096 Aug 24 15:35 .git
-rw-r--r-- 1 runner docker 10847 Aug 24 15:35 Nijnu.js
-rw-r--r-- 1 runner docker  2492 Aug 24 15:35 README.md
-rw-r--r-- 1 runner docker 18444 Aug 24 15:35 app.js
drwxr-xr-x 2 runner docker  4096 Aug 24 15:35 assets
-rw-r--r-- 1 runner docker 31217 Aug 24 15:35 index.html
-rw-r--r-- 1 runner docker   409 Aug 24 15:35 manifest.json
-rw-r--r-- 1 runner docker  1109 Aug 24 15:35 service-worker.js
-rw-r--r-- 1 runner docker  4512 Aug 24 15:35 styles.css
-rw-r--r-- 1 runner docker  2862 Aug 24 15:35 wizard.html
-rw-r--r-- 1 runner docker  1058 Aug 24 15:35 wizard.js
```

### Key Code Locations
- **Stepper navigation**: Search for `stepOrder` array in `app.js` for step sequence
- **Validation logic**: Look for `validateCurrentStep()` function in `app.js`
- **Form autosave**: Search for `autosave()` function in `Nijnu.js`
- **PWA caching**: Check `service-worker.js` for cached assets list
- **State management**: Look for `state` object in `app.js`
- **Styling**: CSS custom properties defined at top of `styles.css`
